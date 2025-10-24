import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TreatmentStatus } from '@prisma/client';

// Ensure environment variables are loaded
if (!process.env.OPEN_API_KEY && !process.env.OPENAI_API_KEY) {
  require('dotenv').config();
}

const BANDS = [
  { min: 0, max: 19, label: 'Good' },
  { min: 20, max: 33, label: 'Warning' },
  { min: 34, max: 58, label: 'Bad' },
];

function getBand(score: number) {
  return BANDS.find(b => score >= b.min && score <= b.max)?.label || 'Unknown';
}

export async function POST(req: NextRequest) {
  console.log('[API] /api/thread - Starting AI treatment generation');
  
  const body = await req.json();
  const { assistantId, userId, submissionId } = body as { assistantId: string; userId: string; submissionId?: string };
  
  const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[API] /api/thread - OpenAI API key not configured');
    return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
  }
  
  // Get assistant from DB
  const assistant = await prisma.assistant.findUnique({ where: { id: assistantId } });
  if (!assistant) {
    console.error('[API] /api/thread - Assistant not found:', assistantId);
    return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
  }
  
  // Get specific submission if provided, otherwise use latest
  let submission = null as any;
  if (submissionId) {
    submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { answers: { include: { question: true } } },
    });
    if (!submission) {
      console.error('[API] /api/thread - Provided submissionId not found:', submissionId);
      return NextResponse.json({ error: 'Submission not found' }, { status: 400 });
    }
    if (submission.userId !== userId) {
      console.error('[API] /api/thread - Submission does not belong to user:', { submissionUserId: submission.userId, userId });
      return NextResponse.json({ error: 'Submission does not belong to user' }, { status: 400 });
    }
  } else {
    submission = await prisma.submission.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { answers: { include: { question: true } } },
    });
  }
  
  if (!submission) {
    console.error('[API] /api/thread - No submission found for user:', userId);
    return NextResponse.json({ error: 'No submission found for user' }, { status: 400 });
  }
  
  console.log('[API] /api/thread - Processing submission:', submission.id);
  

  // Calculate section scores
  const sectionScores: Record<string, number> = {};
  for (const ans of submission.answers) {
    const cat = ans.question.category;
    const val = Number(ans.answer);
    if (!sectionScores[cat]) sectionScores[cat] = 0;
    sectionScores[cat] += isNaN(val) ? 0 : val;
  }
  

  
  // Build section bands
  const sectionBands = Object.entries(sectionScores).map(([cat, score]) => ({
    category: cat,
    score,
    band: getBand(score),
  }));
  

  
  // Map assessment scale to meaningful descriptions
  const scaleMapping = {
    0: { label: "Never", severity: "none" },
    2: { label: "Occasionally", severity: "mild" },
    4: { label: "Often", severity: "moderate" },
    6: { label: "Regularly", severity: "severe" }
  };
  
  // Build detailed symptom analysis with meaningful context
  const responsesByCategory: Record<string, Array<{question: string, answer: string, score: number}>> = {};
  
  for (const answer of submission.answers) {
    const category = answer.question.category;
    if (!responsesByCategory[category]) {
      responsesByCategory[category] = [];
    }
    
    responsesByCategory[category].push({
      question: answer.question.text,
      answer: answer.answer,
      score: Number(answer.answer) || 0
    });
  }
  

  
  // Build detailed symptom analysis with meaningful context
  const symptomAnalysis = Object.entries(responsesByCategory)
    .map(([category, responses]) => {
      const categoryScore = sectionScores[category];
      const categoryBand = getBand(categoryScore);
      
      const symptomDetails = responses.map(r => {
        const score = Number(r.answer) || 0;
        const scale = scaleMapping[score as keyof typeof scaleMapping] || { label: "Unknown", severity: "unknown" };
        
        return `• ${r.question}
  → Patient reports: ${scale.label} (${scale.severity} severity)
  → Clinical significance: ${score >= 4 ? "HIGH - requires attention" : score >= 2 ? "MODERATE - monitor" : "LOW - within normal range"}`;
      });
      
      return `## ${category.toUpperCase()} ASSESSMENT
**Overall Category Score: ${categoryScore} (${categoryBand} level)**
**Clinical Pattern Analysis:**
${symptomDetails.join('\n')}

**Category Summary:** ${
  categoryScore >= 34 ? "CRITICAL - Multiple severe symptoms requiring immediate intervention" :
  categoryScore >= 20 ? "WARNING - Moderate dysfunction requiring targeted treatment" :
  "GOOD - Minimal issues, focus on prevention and optimization"
}`;
    }).join('\n\n');
  
  // Get the active treatment prompt from the database (admin-managed)
  const activePrompt = await prisma.threadPrompt.findFirst({
    where: {
      type: 'TREATMENT',
      isActive: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  let treatmentRequirements = 'Create a targeted protocol addressing the specific symptoms reported. Reference the patient\'s actual responses and severity patterns in your recommendations.';
  
  if (activePrompt) {
    treatmentRequirements = activePrompt.prompt;
    console.log('[API] /api/thread - Using prompt:', activePrompt.name);
  } else {
    console.log('[API] /api/thread - Using fallback prompt');
  }

  const cfg = (activePrompt as any)?.config || {};

  // Get output length instructions
  const outputLengthInstructions = {
    brief: 'Provide concise recommendations with 1-2 sentences per section.',
    standard: 'Provide comprehensive recommendations with detailed explanations.',
    detailed: 'Provide extensive recommendations with thorough explanations, multiple options, and detailed rationale.'
  };

  // Get tone instructions
  const toneInstructions = {
    neutral: 'Use a balanced, professional tone.',
    clinical: 'Use precise medical terminology and clinical language.',
    coach: 'Use encouraging, supportive language as a health coach would.'
  };

  // Build comprehensive clinical prompt using admin-managed treatment requirements
  let prompt = `You are a functional medicine practitioner AI. Generate a personalized treatment plan based on this comprehensive patient assessment.

${cfg.tone ? toneInstructions[cfg.tone as keyof typeof toneInstructions] || toneInstructions.neutral : toneInstructions.neutral}
${cfg.outputLength ? outputLengthInstructions[cfg.outputLength as keyof typeof outputLengthInstructions] || outputLengthInstructions.standard : outputLengthInstructions.standard}

**PATIENT SYMPTOM ANALYSIS:**
${symptomAnalysis}

**SCORING METHODOLOGY:**
- Scale: 0=Never, 2=Occasionally, 4=Often, 6=Regularly
- Category Scoring: 0-19=Good, 20-33=Warning, 34-58=Bad
- Total responses analyzed: ${submission.answers.length}

**CLINICAL INTERPRETATION GUIDELINES:**
- Focus on patterns of high-frequency symptoms (4-6 scores)
- Address root causes revealed by symptom clusters  
- Prioritize categories in "Warning" or "Bad" ranges
- Consider interconnections between symptom categories
- Provide specific, actionable interventions based on symptom severity

  **TREATMENT PLAN REQUIREMENTS:**
  ${treatmentRequirements}
  
  ${cfg.includeNarrativeTemplate ? `
  ---
  STRUCTURE TEMPLATE (Narrative Sections):
  
  Personalized Treatment Plan: Client #
  
  Working Assessment: A concise, high-level overview of the client's current health status, highlighting key patterns, root-cause contributors, and how they interconnect. It distills complex symptom presentations, medical history, and lifestyle factors into a clear picture of what's driving dysfunction and why it's persisting—serving as the foundation for a targeted care plan.
  
  Likely Root Causes: An evidence-based summary of the primary root imbalances and mechanisms driving the client's symptoms. These are identified by connecting clinical presentation, history, and known physiological patterns, providing a roadmap for targeted intervention.
  
  Priorities: A focused list of the most time-sensitive or high-impact next steps to address first. This section distills the care plan into immediate actions—such as key appointments, referrals, or diagnostics—that will create momentum in the healing process and lay the groundwork for deeper interventions.
  
  Nutrition: Food quality, macros/micros, functional foods, therapeutic diets; includes histamine/low-FODMAP/AIP logic.
  - Recommends plate build, macro targets, fiber/phytonutrient goals, therapeutic diets, brand picks.
  - Reference Elimination Diet Guide, Nutrition Transcript, Foundations Nutrition PDF, Food Reactions Transcript, Root Causes Food Reactions PDF
  
  Movement & Recovery: Daily steps/NEAT, strength & zone-2, mobility, plus sleep hygiene & circadian basics.
  - Step target, 2-4×/week strength plan, zone-2 minutes, bedtime & AM-light routine.
  - Reference Exercise Transcript, Foundations Exercise PDF, Sleep Transcript, Foundations Sleep PDF
  
  Mind & Nervous System: Stress regulation, breathwork, mindfulness, community/purpose, trauma-informed notes.
  - Daily breath set, evening downshift, grounding/nature dose, body scan, somatic practices.
  - Reference Nervous System Guide, Nervous System Dysregulation Transcript, Root Causes Nervous System Dysregulation PDF
  
  Environment & Detox: Air/water/light exposures, home toxins, sun practices, plus Detox & Drainage (bowel regularity, binders, lymph, sauna/sweat).
  - AQI/HEPA plan, water filter + remineralization, sun safety & vitamin D, bowel regularity + binder cadence, sauna/cold.
  - Reference Drainage Guide, Environmental Toxins Transcript, Root Causes Environmental Toxins PDF, Air Transcript, Foundations Air PDF, Sunshine Transcript, Foundations Sunshine PDF, Hydration Transcript, Foundations Hydration PDF
  
  Targeted Support (Supplements & Therapeutics): Foundational and protocol tiered stacks tied to the other pillars/root-causes (e.g., berberine for diabetes, quercetin for histamine, sulforaphane for detox).
  - Condition-linked stacks with dosing and safety banners; cycles and "start low, go slow."
  - Reference Supplement Guidelines document and each guide
  
  Testing & Tracking (Labs & Wearables): Baseline and follow-ups (Vit D, fasting insulin, lipids, stool, advanced hormone labs when indicated) + CGM/Oura/WHOOP/Apple metrics and retest windows.
  - Which labs now vs later, CGM trial criteria, HRV/steps/sleep thresholds that change advice, retest timelines.
  - Reference Lab Guidelines document and each guide
  ---` : ''}${cfg.includeSampleNarrative ? `
  
  SAMPLE NARRATIVE (for style and content guidance; DO NOT copy verbatim):
  
  Personalized Treatment Plan: 0001
  
  Working Assessment: 38-year-old male with colitis, lower colon pain, ADHD, recurrent genital herpes (anal area), bloating/gas/indigestion, eczema, fungal overgrowth (toenail fungus, athlete's foot), and a history of gallbladder removal and multiple hernia repairs. His symptoms point to gut dysbiosis, viral persistence, fungal overgrowth, immune dysregulation, and nervous system imbalance. Emotional stress from work and relationships, combined with a history of digestive and immune challenges, are perpetuating inflammation, microbiome imbalance, and lowered antiviral defense. Gallbladder removal has impaired bile flow, affecting fat digestion and gut function.
  
  Likely Root Causes:
  - Gut dysbiosis & intestinal permeability → bloating, gas, eczema, ADHD-type symptoms
  - Chronic viral activity (HSV-2) → recurrent outbreaks, immune drain
  - Fungal overgrowth → toenail fungus, athlete's foot, eczema, gas/bloating
  - Post-cholecystectomy bile insufficiency → impaired fat digestion, dysbiosis
  - Nervous system dysregulation → gut motility issues, immune suppression under stress
  - Possible histamine intolerance → eczema, GI flares
  
  Priorities:
  - Consider scheduling an appointment with Dr. Lee for additional work up, prescriptions, and GI physical assessment.
  - Inquire about scheduling a colonoscopy with a gastroenterologist within your insurance network. Will likely need a referral.
  
  Nutrition: SCD or AIP elimination diet with structured reintroduction; protein 1.2–1.6 g/kg; 3–5 servings/week omega-3 fish; see provided guides.
  
  Movement & Recovery: Sleep hygiene (dim lights, cool room 65–68°F, minimize screens), etc.
  
  Mind & Nervous System: Mindful eating, acupuncture, NET, NuCalm trial.
  
  Environment & Detox: Mold testing options (IEP, ERMI, urine mycotoxins), HEPA + carbon filter, humidity 30–50%, hydration with minerals.
  
  Targeted Support: Foundational stack (NAC, D3/K2, fish oil, magnesium, gallbladder nutrients); Gut Phase 1/2 protocol.
  
  Testing & Tracking: Stool analysis, SIBO breath test, Vit D, A1c, fasting insulin, homocysteine, uric acid, hs-CRP; CGM trial criteria and retest windows.
  ---` : ''}
  
  Output in strict JSON that EXACTLY matches this schema (no extra keys, no prose outside JSON). ${cfg.referenceKnowledgeFiles ? 'When appropriate, include KnowledgeFile references by filename in knowledgeFilesUsed.' : ''}
  Critically, ensure that each pillar contains concrete, actionable recommendation items. For targeted_support include populated stacks with items (name, dose, frequency). For testing_tracking include labs array with baseline/orderNow/targetRange. Avoid leaving arrays empty when clinically indicated; prefer specific but safe defaults where appropriate.
  {
    "meta": {
      "schemaVersion": "2.0.0",
      "planNumber": "auto or '0001'",
      "userId": "string",
      "submissionId": "string",
      "threadId": "string",
      "treatmentId": "string (optional)",
      "createdAt": "ISO string",
      "model": "string (optional)",
      "openaiThreadId": "string (optional)"
    },
    "workingAssessment": {
      "summary": "1–3 paragraphs",
      "patterns": ["string"],
      "interconnections": ["string"]
    },
    "likelyRootCauses": [
      { "id": "string", "label": "string", "description": "string", "evidence": ["string"], "confidence": 0.0, "references": [{"filename":"string","title":"string"}] }
    ],
    "priorities": [
      { "id": "string", "title": "string", "type": "appointment|referral|diagnostic|action", "urgency": "immediate|short_term|long_term", "rationale": "string", "owner": "patient|doctor" }
    ],
    "pillars": {
      "nutrition": { "key": "nutrition", "goals": ["string"], "recommendations": [ { "id":"string","type":"nutrition","title":"string","description":"string","diets":["AIP"],"plateBuild":"string","fiber_g_per_day":30 } ] },
      "movement_recovery": { "key": "movement_recovery", "recommendations": [] },
      "mind_nervous_system": { "key": "mind_nervous_system", "recommendations": [] },
      "environment_detox": { "key": "environment_detox", "recommendations": [] },
      "targeted_support": { "key": "targeted_support", "recommendations": [ { "id":"string","type":"targeted_support","title":"string","stacks":[{"id":"string","name":"string","goal":"string","items":[{"name":"string","dose":"string","frequency":"string"}]}] } ] },
      "testing_tracking": { "key": "testing_tracking", "recommendations": [ { "id":"string","type":"testing_tracking","title":"string","labs":[{"name":"25-OH Vitamin D","baseline":true,"orderNow":true,"targetRange":"50–80 ng/dL"}] } ] }
    },
    "knowledgeFilesUsed": [{"filename":"string"}]
  }
  
  Base all recommendations on the actual symptom patterns and severity levels reported above. Never output anything outside this JSON.`;

  console.log('[API] /api/thread - Generated prompt length:', prompt.length);

  // Step 1: Create thread with user's message
  console.log('[API] /api/thread - Creating OpenAI thread');
  
  const threadRes = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  

  
  if (!threadRes.ok) {
    const err = await threadRes.text();
    console.error('[API] /api/thread - OpenAI thread creation failed:', threadRes.status, err);
    return NextResponse.json({ error: 'OpenAI thread error', details: err }, { status: 500 });
  }
  
  const openaiThread = await threadRes.json();
  console.log('[API] /api/thread - Thread created:', openaiThread.id);

  // Step 2: Start a run on that thread with the assistant_id
  console.log('[API] /api/thread - Starting AI run');
  
  const runRes = await fetch(`https://api.openai.com/v1/threads/${openaiThread.id}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      assistant_id: 'asst_LCZo6EIwWYmCFAP5Lk4v1Uv9', // Hardcoded assistant ID with files
      temperature: 0,
    }),
  });
  

  
  if (!runRes.ok) {
    const err = await runRes.text();
    console.error('[API] /api/thread - OpenAI run creation failed:', runRes.status, err);
    return NextResponse.json({ error: 'OpenAI run error', details: err }, { status: 500 });
  }
  
  const openaiRun = await runRes.json();
  console.log('[API] /api/thread - Run started:', openaiRun.id);

  // Step 3: Poll for run completion and get the AI's message (wait indefinitely until terminal state)
  console.log('[API] /api/thread - Starting polling for run completion (indefinite)...');
  let runStatus = openaiRun.status;
  let runId = openaiRun.id;
  let aiMessage: any = null;
  let attempt = 0;

  while (runStatus !== 'completed') {
    attempt += 1;
    console.log(`[API] /api/thread - Polling attempt ${attempt}, current status: ${runStatus}`);
    await new Promise(res => setTimeout(res, 1500));

    const runCheck = await fetch(`https://api.openai.com/v1/threads/${openaiThread.id}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    if (!runCheck.ok) {
      const errorText = await runCheck.text();
      console.error('[API] /api/thread - Run status check failed:', {
        status: runCheck.status,
        statusText: runCheck.statusText,
        error: errorText
      });
      break;
    }

    const runData = await runCheck.json();
    runStatus = runData.status;
    console.log(`[API] /api/thread - Run status updated to: ${runStatus}`);

    if (runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'expired') {
      console.error('[API] /api/thread - Run ended in terminal non-complete state:', runStatus);
      break;
    }

    if (runStatus === 'completed') {
      console.log('[API] /api/thread - Run completed, fetching messages...');
      // Get messages
      const msgRes = await fetch(`https://api.openai.com/v1/threads/${openaiThread.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
      });

      if (!msgRes.ok) {
        const errorText = await msgRes.text();
        console.error('[API] /api/thread - Failed to fetch messages:', {
          status: msgRes.status,
          statusText: msgRes.statusText,
          error: errorText
        });
        break;
      }

      const msgData = await msgRes.json();
      console.log('[API] /api/thread - Messages fetched, count:', msgData.data?.length || 0);

      // Find the latest assistant message
      const lastMsg = msgData.data?.reverse().find((m: any) => m.role === 'assistant');
      console.log('[API] /api/thread - Latest assistant message:', {
        found: !!lastMsg,
        role: lastMsg?.role,
        contentType: lastMsg?.content?.[0]?.type,
        contentLength: lastMsg?.content?.[0]?.text?.value?.length || 0
      });

      if (lastMsg && lastMsg.content?.[0]?.type === 'text') {
        try {
          const rawContent = lastMsg.content[0].text.value;

          // Helper function to extract JSON from markdown or plain text
          const extractJSON = (content: string) => {
            // First try direct parsing
            try {
              return JSON.parse(content);
            } catch {
              // If direct parsing fails, look for markdown code blocks
              const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
              if (jsonMatch && jsonMatch[1]) {
                return JSON.parse(jsonMatch[1].trim());
              }
              // If no markdown blocks found, try parsing the content as-is one more time
              return JSON.parse(content);
            }
          };

          aiMessage = extractJSON(rawContent);
          // Inject meta after parsing; we'll validate later
          if (aiMessage && typeof aiMessage === 'object') {
            aiMessage.meta = {
              schemaVersion: '2.0.0',
              planNumber: '0001',
              userId,
              submissionId: submission.id,
              threadId: openaiThread.id,
              createdAt: new Date().toISOString(),
              openaiThreadId: openaiThread.id,
            };
          }
        } catch (e) {
          aiMessage = {
            error: 'Failed to parse AI response',
            raw: lastMsg.content[0].text.value,
            parseError: e instanceof Error ? e.message : 'Unknown parsing error'
          };
        }
      }
    }
  }

  if (runStatus !== 'completed') {
    console.error('[API] /api/thread - Run ended without completion. Final status:', runStatus);
    aiMessage = { error: `Run ended without completion. Final status: ${runStatus}` };
  }
  
  console.log('[API] /api/thread - AI response received:', aiMessage);

  // TODO: Validate AI output against Zod schema
  // We intentionally defer import to avoid cold-start cost if not needed
  try {
    const { TreatmentPlanV2Schema } = await import('@/schemas/treatment-plan.zod');
    const parsed = TreatmentPlanV2Schema.safeParse(aiMessage);
    if (!parsed.success) {
      console.warn('[API] /api/thread - AI output failed schema validation:', parsed.error.flatten());
    } else {
      aiMessage = parsed.data;
    }
  } catch (e) {
    console.warn('[API] /api/thread - Zod schema validation skipped:', e);
  }
  
  // Store thread in DB with submission link
  console.log('[API] /api/thread - Storing thread in database...');
  const thread = await prisma.thread.create({
    data: ({
      openaiId: openaiThread.id,
      assistantId,
      userId,
      initialMessage: prompt,
      // Use scalar FK to avoid nested relation write issues with older Prisma Client
      submissionId: submission.id,
    } as any),
  });
  
  console.log('[API] /api/thread - Thread stored in DB:', { 
    threadId: thread.id, 
    openaiId: thread.openaiId
  });
  
  // Store treatment plan in DB if AI message was parsed
  let treatment = null;
  if (aiMessage && !aiMessage.error) {
    console.log('[API] /api/thread - Creating treatment with userId:', userId);
    console.log('[API] /api/thread - Submission userId for comparison:', submission.userId);
    
    // Ensure meta.threadId reflects DB thread id
    try {
      if (aiMessage && aiMessage.meta) {
        aiMessage.meta.threadId = thread.id;
      }
    } catch {}

    treatment = await prisma.treatment.create({
      data: ({
        userId, // Using the userId from the original request
        source: 'ai',
        planJson: aiMessage,
        status: TreatmentStatus.PENDING,
        // Use scalar FKs to ensure compatibility with current Prisma Client
        threadId: thread.id,
        submissionId: submission.id,
      } as any),
    });
    
    console.log('[API] /api/thread - Treatment plan stored in DB:', { 
      treatmentId: treatment.id, 
      treatmentUserId: treatment.userId,
      status: treatment.status,
      relationshipChain: `submission(${submission.id.slice(0,8)}) → thread(${thread.id.slice(0,8)}) → treatment(${treatment.id.slice(0,8)})`
    });
  } else {
    console.log('[API] /api/thread - No treatment plan stored due to AI response error');
  }
  
  console.log('[API] /api/thread - Complete flow finished successfully');
  
  // Return response in format expected by questionnaire API
  const finalResponse = {
    threadId: thread?.id,
    runId: openaiRun?.id,
    status: treatment?.status || TreatmentStatus.PENDING,
    // Also include full objects for debugging
    thread,
    run: openaiRun,
    prompt,
    sectionBands,
    plan: aiMessage,
    treatment
  };
  
  console.log('[API] /api/thread - Returning final response:', {
    threadId: finalResponse.threadId,
    runId: finalResponse.runId,
    status: finalResponse.status,
    hasTreatment: !!finalResponse.treatment,
    hasPlan: !!finalResponse.plan
  });
  
  return NextResponse.json(finalResponse);
} 