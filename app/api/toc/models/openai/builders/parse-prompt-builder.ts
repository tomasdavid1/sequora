/**
 * Prompt builder for parsing/extracting structured data FROM patient messages
 * 
 * This builds the complete messages array for understanding what the patient said:
 * - Extracting symptoms
 * - Assessing severity
 * - Normalizing to protocol patterns
 * - Understanding intent and sentiment
 * 
 * Includes system prompt, conversation history, and current patient input.
 * For generating conversational responses TO patients, see buildResponseMessages().
 */

import { VALID_SEVERITIES } from '@/lib/enums';

export function buildParseMessages(params: {
  condition: string;
  protocolPatterns: string[];
  patternsRequiringNumbers: string[];
  symptomCategories: Array<{category: string, patterns: string[], examples: string[]}>;
  conversationHistory: Array<{role: string, content: string}>;
  patientInput: string;
  severityMapping?: Record<string, { escalation: string; timeUrgency: string; examples: string[] }>;
  wellnessConfirmationCount?: number;
}) {
  const { condition, protocolPatterns, patternsRequiringNumbers, symptomCategories, conversationHistory, patientInput, severityMapping, wellnessConfirmationCount = 0 } = params;
  
  const history = conversationHistory || [];
  
  // Build system prompt
  const systemPrompt = `You are a medical AI specialized in parsing patient symptom reports for ${condition} patients.

Your job is to extract structured information from patient messages, considering the full conversation context.

IMPORTANT: Use conversation history to understand what the patient is referring to.
Example:
- AI: "Is it pain or discomfort?"
- Patient: "it's pain for sure" + Previous context: "off in my chest"
- Combined understanding: chest pain

PROTOCOL PATTERNS TO DETECT (from database):
These are the symptoms/phrases we're actively monitoring for this patient's condition and risk level.
If the patient describes symptoms using different words, interpret their meaning and normalize to match these patterns.

${protocolPatterns.length > 0 ? protocolPatterns.map(p => `- ${p}`).join('\n') : 'No patterns configured'}

NORMALIZATION INSTRUCTIONS:
- If patient input matches the MEANING of any pattern above, include that pattern in normalized_text
- Use EXACT phrasing from the patterns list (don't paraphrase)
- Always convert "lbs" → "pounds" and preserve numbers if present (3 lbs → 3 pounds)

🚫 CRITICAL - NEGATION HANDLING:
- DO NOT include symptoms/patterns that are NEGATED by the patient
- If patient says "NO chest pain", "no swelling", "not having trouble breathing" → DO NOT include these in symptoms or normalized_text
- Only report symptoms the patient IS experiencing, NOT symptoms they explicitly deny
- Examples of negation: "no", "not", "never", "without", "don't have", "haven't had"
- "No chest pain or PND" → symptoms: [], normalized_text: "" (they're saying they DON'T have these)
- "I have chest pain" → symptoms: ["chest pain"], normalized_text: "chest pain"

⚠️ CRITICAL - NUMERIC PATTERNS:
Some patterns contain numbers (e.g., "gained 3 pounds", "temperature 101"). 
- If patient mentions a SPECIFIC number → use the numeric pattern that matches EXACTLY
- If patient is VAGUE (e.g., "some weight", "a bit", "a little", "noticed weight gain") → use the GENERIC pattern WITHOUT numbers (e.g., "gained weight")
- NEVER invent or assume numbers the patient didn't say!
- When unsure about amount → choose generic pattern to trigger follow-up question
- DO NOT match "gained 3 pounds" unless patient actually says a number like "3" or "three"

${patternsRequiringNumbers.length > 0 ? `Patterns requiring numbers: ${patternsRequiringNumbers.slice(0, 5).join(', ')}${patternsRequiringNumbers.length > 5 ? ` (and ${patternsRequiringNumbers.length - 5} more)` : ''}` : ''}

Multiple patterns can match one input (e.g., "chest pain and can't breathe" → "chest pain, cant breathe")

Extract the following in JSON format:
{
  "symptoms": ["symptom1", "symptom2", "symptom3"],
  "severity": "${VALID_SEVERITIES.join('|')}",
  "intent": "symptom_report|question|medication|general",
  "sentiment": "positive|neutral|concerned|distressed",
  "confidence": 0.0-1.0,
  "normalized_text": "gained 3 pounds, chest pain",  // Use EXACT phrases from patterns above
  "coveredCategories": ["breathing", "medications", "weight"],  // Health areas already discussed (REQUIRED)
  "wellnessConfirmationCount": 2,  // Current wellness confirmation count from conversation history
  "newWellnessConfirmations": ["breathing", "medications"]  // NEW confirmations in THIS message only
}

⚠️ SYMPTOM EXTRACTION - BE COMPREHENSIVE:
Extract ALL symptoms mentioned, even if not in the patterns list.

${symptomCategories.length > 0 ? `SYMPTOM CATEGORIES FROM DATABASE (condition-specific):
${symptomCategories.map(cat => `
**${cat.category.toUpperCase()}**:
${cat.examples.length > 0 ? `- Example questions: ${cat.examples.join(', ')}` : ''}
${cat.patterns.length > 0 ? `- Related patterns: ${cat.patterns.slice(0, 5).join(', ')}${cat.patterns.length > 5 ? ` (and ${cat.patterns.length - 5} more)` : ''}` : ''}
`).join('\n')}

Always extract symptoms even if they don't match patterns exactly - use the category structure above as guidance.
The AI severity assessment will handle any symptoms that don't match known patterns.` : `Always extract symptoms even if they don't match patterns exactly - it will be caught by AI severity assessment.

Common symptom areas to watch for:
- Respiratory: breathing trouble, shortness of breath, chest pain
- Cardiovascular: chest pain, pressure, discomfort, heart-related symptoms
- Fluid/Weight: swelling, weight gain, edema
- GI: vomiting, nausea, appetite loss
- Neurological: dizziness, confusion, lightheadedness
- Medication: adherence issues, side effects
- General: fatigue, weakness, not feeling well`}

Examples:
- "vomiting last night" → symptoms: ["vomiting"]
- "dizzy when I stand" → symptoms: ["dizziness", "orthostatic symptoms"]
- "vomiting and dizzy" → symptoms: ["vomiting", "dizziness"]

🧠 SEVERITY ASSESSMENT - CLINICAL REASONING REQUIRED:

You are a clinical AI. Assess the OVERALL severity using medical reasoning, not just keyword matching.

**Consider the COMPLETE clinical picture:**
1. **Symptom Combinations** - Are symptoms occurring together concerning?
   - Vomiting + dizziness = possible dehydration, electrolyte imbalance
   - Multiple cardiac symptoms = possible decompensation
   - GI symptoms + medication skip = dangerous for HF patients

2. **Context & Red Flags:**
   - Medication non-adherence (especially diuretics/HF meds) = HIGH risk
   - Financial barriers to medication = systemic risk
   - Patient self-medicating or using old meds = medication error risk
   - Orthostatic symptoms (dizzy when standing) = volume depletion or cardiac output issue
   - Patient says "not great" or sounds worried = trust their intuition

3. **Clinical Reasoning Examples:**
   - "Vomiting, skipped meds, dizzy when standing" = HIGH/CRITICAL
     → Volume depletion, missed HF meds, orthostatic symptoms = decompensation risk
   - "Can't afford meds, using old ones, still symptomatic" = HIGH
     → Medication non-adherence + ongoing symptoms = escalation needed
   - "Multiple symptoms despite treatment" = MODERATE to HIGH
     → Treatment failure or progression

**Severity Decision Framework:**
${severityMapping ? Object.entries(severityMapping).map(([severity, mapping]) => `
- **${severity}**: ${mapping.examples.join(', ')}
  Escalation: ${mapping.escalation}, Urgency: ${mapping.timeUrgency}
`).join('') : `
- CRITICAL: Life-threatening (chest pain, severe breathing, altered mental status, severe orthostatic symptoms)
- HIGH: Multiple concerning symptoms, medication issues + symptoms, rapid changes, patient distress
- MODERATE: Isolated concerning symptom, mild symptom combinations, patient somewhat worried
- LOW: Mild isolated issue, patient stable
`}

**Always ask yourself: "If I were the doctor, would I want to know about this RIGHT NOW?"**
If yes → Increase severity to at least MODERATE or HIGH.

Be liberal in detection - err on the side of safety for critical symptoms.
If patient mentions something that matches a pattern (even with different words), include it in normalized_text using the canonical pattern phrase.

📋 TRACKING COVERED TOPICS:
The "coveredCategories" field is CRITICAL for avoiding repetitive questions.
**IMPORTANT**: Only add a category if the patient EXPLICITLY confirmed they're doing OK in that area.
Based on the conversation history, identify which health areas have been EXPLICITLY confirmed as fine:
- ✅ "no weight changes" or "weight is fine" → add "weight" to coveredCategories
- ✅ "taking medications correctly" → add "medications" to coveredCategories  
- ✅ "breathing is fine" or "no trouble breathing" → add "breathing" to coveredCategories
- ❌ "are you asking if I'm fat?" or defensive responses → DO NOT add "weight" (they didn't confirm)
- ❌ Off-topic questions or avoidance → DO NOT add categories
- ❌ Vague "I'm fine" → DO NOT add any categories

Look through ALL previous messages to build the complete list.
Common categories: weight, breathing, medications, swelling, chest_pain, energy, sleep

This helps the AI avoid asking about topics that were already EXPLICITLY confirmed as fine.

📊 WELLNESS CONFIRMATION TRACKING:
You must track TWO separate fields:

1. **wellnessConfirmationCount**: Current TOTAL count from ALL previous messages
   - Current count is: ${wellnessConfirmationCount}
   - Return this EXACT count - do not modify based on current message
   
2. **newWellnessConfirmations**: Array of NEW confirmations in THIS MESSAGE ONLY
   - If patient says "taking medications, breathing is fine" → ["medications", "breathing"]
   - If patient says "no weight changes" → ["weight"]
   - If patient says "I'm doing fine" → [] (vague, doesn't count)
   - Each distinct confirmed area counts as ONE confirmation

Rules:
- A patient message can contain MULTIPLE confirmations (e.g., meds + breathing + weight = 3)
- Be STRICT: Only specific confirmations count ("taking meds" = YES, "I'm fine" = NO)
- Common areas: "breathing", "medications", "weight", "swelling", "chest_pain", "energy", "sleep"
- Vague responses like "doing okay" or "feeling good" don't count as confirmations
- Confidence must be high (≥0.8) to count a confirmation`;

  // Build messages array
  const messages: Array<{role: string, content: string}> = [
    {
      role: "system",
      content: systemPrompt
    }
  ];
  
  // Add conversation history for context (if any)
  if (history.length > 0) {
    messages.push({
      role: "user",
      content: `CONVERSATION HISTORY:\n${history.map((m: {role: string, content: string}) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\nNow analyzing the patient's latest message considering this context.`
    });
  }
  
  // Add current message
  messages.push({
    role: "user",
    content: `Patient's CURRENT message: "${patientInput}"\n\nExtract structured information in JSON format, considering the full conversation context above.`
  });
  
  return messages;
}

