import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { VALID_SEVERITIES } from '@/lib/enums';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI model layer for text response generation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      operation,
      input,
      options = {}
    } = body;

    console.log(`🤖 OpenAI model layer: ${operation}`);

    switch (operation) {
      case 'generate_response':
        return await handleGenerateResponse(input, options);
        
      case 'generate_response_with_tools':
        return await handleGenerateResponseWithTools(input, options);
        
      case 'analyze_sentiment':
        return await handleAnalyzeSentiment(input, options);
        
      case 'parse_patient_input':
        return await handleParsePatientInput(input, options);
        
      default:
        return NextResponse.json(
          { error: 'Unsupported operation' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ OpenAI model layer error:', error);
    return NextResponse.json(
      { error: 'Model processing failed' },
      { status: 500 }
    );
  }
}

async function handleGenerateResponse(input: Record<string, unknown>, options: Record<string, unknown>) {
  try {
    const { 
      condition, 
      patientResponses, 
      context, 
      responseType = 'patient_response',
      messages // For custom message arrays
    } = input;

    // Handle custom messages array (for summaries, etc.)
    if (messages && Array.isArray(messages)) {
      console.log('📝 [OpenAI] Using custom messages array for generation');
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages as any,
        temperature: (options.temperature as number) ?? 0.7,
        max_tokens: (options.max_tokens as number) ?? 500
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return NextResponse.json({
        success: true,
        response: response,
        type: 'custom'
      });
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (responseType) {
      case 'patient_response':
        systemPrompt = `You are a medical AI assistant providing responses to patients in a Transition of Care program for ${condition}. 
        Be empathetic, clear, and encouraging. Provide helpful information while encouraging them to contact their healthcare team for serious concerns.`;
        
        userPrompt = `Patient responses: ${JSON.stringify(patientResponses)}
        Context: ${context}
        
        Generate an appropriate response to the patient.`;
        break;
        
      case 'nurse_summary':
        systemPrompt = `You are a medical AI assistant creating summaries for nurses about patient interactions. 
        Be concise, clinical, and highlight any concerns or red flags.`;
        
        userPrompt = `Patient condition: ${condition}
        Patient responses: ${JSON.stringify(patientResponses)}
        Context: ${context}
        
        Create a summary for the nurse.`;
        break;
        
      case 'escalation_reason':
        systemPrompt = `You are a medical AI assistant explaining why a patient interaction was escalated to a nurse. 
        Be clear about the specific concerns and recommended actions.`;
        
        userPrompt = `Patient condition: ${condition}
        Patient responses: ${JSON.stringify(patientResponses)}
        Escalation reason: ${context}
        
        Explain why this was escalated and what the nurse should focus on.`;
        break;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return NextResponse.json({
      success: true,
      response: response,
      type: responseType
    });

  } catch (error) {
    console.error('Error in response generation:', error);
    return NextResponse.json(
      { error: 'Response generation failed' },
      { status: 500 }
    );
  }
}

async function handleGenerateResponseWithTools(input: Record<string, unknown>, options: Record<string, unknown>) {
  try {
    console.log('🔧 [OpenAI Tools] Handling generate_response_with_tools');
    const { 
      condition, 
      educationLevel,
      medications = [],
      patientResponses, 
      decisionHint, 
      context,
      isFirstMessageInCurrentChat,
      hasBeenContactedBefore,
      wellnessConfirmationCount = 0
    } = input;
    
    const hint = decisionHint as any; // Type assertion for nested access
    const medList = medications as any[]; // Medications array
    
    console.log('🔧 [OpenAI Tools] First message in chat:', isFirstMessageInCurrentChat);
    console.log('🔧 [OpenAI Tools] Patient contacted before:', hasBeenContactedBefore);
    console.log('🔧 [OpenAI Tools] Patient medications:', medList.length);

    // Define the tools available to the AI
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "raise_flag",
          description: "Raise a flag when patient symptoms require attention",
          parameters: {
            type: "object",
            properties: {
              flagType: { type: "string", description: "Type of flag (symptom_escalation, respiratory, etc.)" },
              severity: { type: "string", enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"], description: "Severity level" },
              rationale: { type: "string", description: "Brief explanation of why this flag was raised" }
            },
            required: ["flagType", "severity", "rationale"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "ask_more",
          description: "Ask follow-up questions to gather more information",
          parameters: {
            type: "object",
            properties: {
              questions: { 
                type: "array", 
                items: { type: "string" },
                minItems: 1,
                maxItems: 3,
                description: "List of follow-up questions to ask the patient"
              }
            },
            required: ["questions"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "log_checkin",
          description: "Log the check-in result when patient is doing well",
          parameters: {
            type: "object",
            properties: {
              result: { type: "string", enum: ["ASK_MORE", "FLAG", "CLOSE"], description: "Check-in result" },
              summary: { type: "string", description: "Brief summary of the check-in" }
            },
            required: ["result"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "handoff_to_nurse",
          description: "Hand off to a nurse when immediate attention is needed (CRITICAL situations only)",
          parameters: {
            type: "object",
            properties: {
              reason: { type: "string", description: "Reason for handoff to nurse (be specific about symptoms)" },
              flagType: { type: "string", description: "Type of red flag (e.g., HF_CHEST_PAIN, HF_BREATHING_WORSE)" }
            },
            required: ["reason", "flagType"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "count_wellness_confirmation",
          description: "ALWAYS call this after EVERY patient response to track wellness confirmations. Report whether patient's current response counts as a wellness confirmation.",
          parameters: {
            type: "object",
            properties: {
              isConfirmation: { 
                type: "boolean", 
                description: "Does this response count as a NEW wellness confirmation? True if patient specifically confirmed an area is normal (breathing, meds, no symptoms). False if vague ('I'm fine') or no new health info." 
              },
              areaConfirmed: {
                type: "string",
                description: "What specific health area was confirmed? (e.g., 'breathing', 'medications', 'no_new_symptoms'). Leave empty if not a confirmation."
              }
            },
            required: ["isConfirmation"]
          }
        }
      }
    ];

    // Build system prompt with protocol context
    const systemPrompt = `${context}

YOUR IDENTITY:
- Your name is Sarah (use this when patients ask for your name)
- You are a post-discharge care coordinator
- You work with the healthcare team to support patients after they leave the hospital

PATIENT EDUCATION LEVEL: ${educationLevel}
- LOW: Very simple words (5th grade). Short sentences. No medical terms. Reassuring.
- MEDIUM: Clear everyday language. Some medical terms OK if explained.
- HIGH: Medical terminology OK. More complex explanations.

💊 PATIENT'S MEDICATIONS:
${medList.length > 0 ? medList.map((med: any) => 
  `- ${med.name}${med.dosage ? ' ' + med.dosage : ''}${med.frequency ? ', ' + med.frequency : ''}${med.timing ? ' (' + med.timing + ')' : ''}`
).join('\n') : '- No medications on file'}

**Use this information to:**
- Ask about medication adherence heuristically ("Are you taking your medications as prescribed?")
- If patient mentions skipping meds or not taking them, probe for reason (cost, side effects, forgot)
- If they mention taking different meds or wrong doses, escalate
- Check if they're having side effects or issues with their medications

⚠️ BE CONCISE: Keep responses to 2-3 short sentences maximum. Patients appreciate brevity.

🚫🚫🚫 CRITICAL - NEVER INCLUDE THESE IN YOUR TEXT:
- NEVER write "Assistant to=functions..." or "[functions.xxx]" or "Functions:" in your response
- NEVER write JSON objects like {"isConfirmation": true} or {"flagType": "...", "severity": "..."} in your response text
- NEVER write ANY curly braces { } with quotes inside them in your response
- NEVER write function names or parameters in the message text
- The patient will SEE your text response - it must be PLAIN ENGLISH ONLY
- Use the proper tool calling feature - the system will handle function execution

✅ CORRECT WAY TO RESPOND:
Your text: "I see, thanks for letting me know. Swelling and weight gain can be signs of fluid buildup. Are you having any trouble breathing?"
Your tool calls: [Use the function calling feature - they will NOT appear in your text]

❌ WRONG - DO NOT DO THIS:
Your text: "I see, thanks for letting me know.
{
  "flagType": "weight_gain_swelling",
  "severity": "MODERATE"
}"

❌ ALSO WRONG:
"That's excellent! Assistant to=functions.count_wellness_confirmation Functions: {..."

CRITICAL INSTRUCTIONS:
- Provide a natural, conversational response to the patient
- Keep it SHORT - say what's needed, nothing more
- Your text response should ONLY contain what the patient will read/hear
- Function calls are handled separately - never mention them in your text

🚫 OUT OF SCOPE - DO NOT:
- Give medical advice (medication dosages, treatment changes, etc.)
- Provide pharmacy/prescription information
- Answer general health questions unrelated to their post-discharge condition
- Provide emotional counseling or therapy
- Make any promises about care you cannot fulfill

⚠️ EDGE CASES - HANDLE CAREFULLY:

1. OFF-TOPIC QUESTIONS ( pharmacy, insurance, unrelated health, etc):
   - Acknowledge briefly: "I understand your concern"
   - Redirect immediately: "Let me first check on your recovery. How are you feeling?"
   - DO NOT provide factual answers to off-topic questions

2. PATIENT WANTS TO END ("Busy", "Stop texting", "Not now", "Later"):
   - Acknowledge their request respectfully: "I understand you're busy"
   - BUT try to get ONE quick safety check before ending: "Before I go, quick question - any chest pain or breathing trouble?"
   - Make it EASY - ask a simple yes/no question about the most critical symptoms
   - If they refuse twice → respect their wishes and end gracefully
   - If they confirm they're OK → count as confirmation and end positively
   - If they mention a symptom → escalate appropriately regardless of being "busy"
   - Example: "I understand! Just one quick thing - any chest pain or trouble breathing? Then I'll let you go."

3. FOLLOW-UP PERSISTENCE (when patient is vague or uncertain):
   - If you asked about a symptom and patient says "I don't know" or is vague → DON'T give up
   - Stay focused on the SAME symptom - try alternative approaches:
     * Ask for comparison: "Is it worse than yesterday/last week?"
     * Ask for scale: "On a scale of 1-10, how bad is it?"
     * Ask for impact: "Is it affecting your daily activities?"
     * Ask for specifics: "When did you first notice it?"
   - Don't jump to asking about OTHER symptoms when patient is uncertain about the current one
   - Exhaust 2-3 different angles before moving on

4. INITIAL GREETINGS - NEVER GIVE ALL-CLEAR IMMEDIATELY:
   - When patient says "I'm doing alright/fine/okay" → This is NOT sufficient
   - You MUST ask at least 2-3 SPECIFIC follow-up questions about DIFFERENT areas:
     * Key symptoms specific to their condition (breathing, chest pain, swelling, etc.)
     * Medication adherence ("Are you taking your medications as prescribed?")
     * Warning signs ("Any fever, dizziness, or other concerns?")
   - DO NOT say "great, keep it up" or "glad you're doing well" until you've probed deeper
   - Example: Patient says "doing alright" → Ask about breathing, THEN medications, THEN any concerns

5. CONVERSATION PROGRESS - AVOID LOOPS:
   - After 3+ exchanges where patient confirms they're fine → You CAN conclude
   - Review the conversation history to see if you've already asked about breathing, meds, symptoms
   - DON'T repeat the same questions - if you've asked and they answered, move forward
   - After sufficient verification (3+ specific confirmations), it's OK to end positively

✅ WELLNESS CONFIRMATION TRACKING:
CURRENT WELLNESS CONFIRMATIONS: ${wellnessConfirmationCount}/3

A "wellness confirmation" counts when the patient gives a SPECIFIC answer to a SPECIFIC health question you asked.

**WHAT COUNTS AS A CONFIRMATION:**
✅ YOU ask: "Are you taking medications?" → THEY say: "Yes" = CONFIRMATION (medications)
✅ YOU ask: "How's your breathing?" → THEY say: "No nothing" / "Fine" / "Good" = CONFIRMATION (breathing)
✅ YOU ask: "Any weight gain?" → THEY say: "No" / "No nothing" = CONFIRMATION (weight)
✅ THEY volunteer: "BP 118/72, no swelling, walking daily, no chest pain" = MULTIPLE CONFIRMATIONS (vitals, activity, symptoms)

**WHAT DOES NOT COUNT:**
❌ Vague unsolicited "I'm fine" with no specific health areas mentioned
❌ Off-topic responses

**COMPREHENSIVE MESSAGES:**
If patient provides detailed status covering multiple areas (vitals, symptoms, activities), count EACH confirmed area separately:
- "No chest pain" = 1 confirmation
- "Taking meds" = 1 confirmation  
- "Breathing fine" = 1 confirmation
Call count_wellness_confirmation ONCE per area confirmed in their message.

**AFTER EACH PATIENT RESPONSE:**
1. Call count_wellness_confirmation for EACH specific area they confirmed
2. Check current count
3. If count ≥ 3 AND no red flags → call log_checkin to close
4. If count < 3 → ask about ONE more specific area you HAVEN'T asked about yet

**AVOID LOOPS - TRACK WHAT YOU'VE ASKED:**
Keep mental track of what you've already covered:
- Already asked about breathing? Don't ask again.
- Already asked about medications? Don't ask again.
- Already asked about weight/swelling? Don't ask again.
Move to DIFFERENT areas: chest pain, dizziness, fatigue, appetite, sleep, etc.

⚠️ CRITICAL PRECEDENCE RULE:
- RED FLAGS ALWAYS take precedence over closing
- Even at 3/3 confirmations, if patient mentions concerning symptoms → raise_flag or handoff_to_nurse
- Safety first: When in doubt between closing and flagging → FLAG

Decision Hint: ${JSON.stringify(hint)}

${hint.messageGuidance ? `\n📋 MESSAGE GUIDANCE:\n${hint.messageGuidance}\n` : ''}

Tool Usage (NOTE: patientId is already known - you don't need to provide it):
- count_wellness_confirmation: **CALL THIS FOR EACH AREA** the patient confirmed (may call multiple times per response)
  * If they confirmed 3 areas → call it 3 times with different areaConfirmed values
  * Examples: "breathing", "medications", "weight", "no_chest_pain", "activity_level", "swelling"
- raise_flag: For HIGH/MODERATE/LOW severity concerns that need follow-up (but not urgent)
- handoff_to_nurse: ONLY for CRITICAL emergencies (chest pain, severe breathing, life-threatening)
- ask_more: When you need more information before making a decision
- log_checkin: ONLY after reaching 3+ wellness confirmations AND no red flags detected

⚠️ TOOL PRECEDENCE:
1. handoff_to_nurse (if CRITICAL symptoms present)
2. raise_flag (if concerning symptoms present)
3. log_checkin (ONLY if 3 confirmations AND no flags)
Never call log_checkin if you're also calling raise_flag or handoff_to_nurse

⚠️ TONE BASED ON SEVERITY:
- CRITICAL (handoff_to_nurse): "A nurse will call you within [time]" - urgent but calm
- HIGH (raise_flag): "We're noting this and will follow up soon" - reassuring, NO specific timeframe
- MODERATE/LOW: "Thank you for letting me know" - very reassuring

🎯 RESPONSE FORMAT - READ CAREFULLY:
1. Write your message to the patient in PLAIN ENGLISH (conversational, empathetic)
2. Call tools using the proper function calling feature (separate from your text)
3. The patient will ONLY see your text message, NOT the function calls
4. NEVER write function syntax, JSON, or [function.xxx] in your text response

⚠️ PATIENT SEES THIS: "That's excellent! Your vitals look great."
⚠️ PATIENT NEVER SEES THIS: Tool calls happen behind the scenes

**EXAMPLE - Patient confirms multiple areas:**
Patient: "BP 118/72, taking meds, no swelling, breathing fine"
Your response: "That's wonderful! Your vitals look great and it sounds like you're managing well."
Your tool calls:
  - count_wellness_confirmation(isConfirmation: true, areaConfirmed: "vitals")
  - count_wellness_confirmation(isConfirmation: true, areaConfirmed: "medications")  
  - count_wellness_confirmation(isConfirmation: true, areaConfirmed: "no_swelling")
  - count_wellness_confirmation(isConfirmation: true, areaConfirmed: "breathing")
  - log_checkin(result: "CLOSE") ← Because we now have 4 confirmations (≥3)

**EXAMPLE - Short answer to specific question:**
You asked: "Are you taking your medications?"
Patient: "Yes"
Your response: "Great! How's your breathing been?"
Your tool calls:
  - count_wellness_confirmation(isConfirmation: true, areaConfirmed: "medications")`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Patient responses: ${patientResponses}
          
Context: ${context}

Generate a response to the patient and use appropriate tools based on the decision hint.`
        }
      ],
      tools: tools,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 500
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      throw new Error('No response from OpenAI');
    }

    // Extract tool calls if any
    const toolCalls = message.tool_calls?.map(toolCall => {
      if (toolCall.type === 'function') {
        return {
          name: toolCall.function.name,
          parameters: JSON.parse(toolCall.function.arguments)
        };
      }
      return null;
    }).filter(Boolean) || [];
    
    console.log('🔧 [OpenAI Tools] Extracted tool calls:', toolCalls.length);
    toolCalls.forEach((call: any) => {
      console.log(`  - ${call.name}:`, call.parameters);
    });

    // Get the text response - MUST have text for patient
    const responseText = message.content;
    
    // AI must always provide a text response to the patient
    if (!responseText) {
      console.error('❌ [OpenAI Tools] AI returned no text response');
      console.error('   Tool calls:', toolCalls);
      throw new Error('AI failed to generate patient message. AI must always provide text response along with tool calls.');
    }
    
    // SAFETY NET: Filter out any accidental function call syntax that slipped into the text
    // This should NEVER happen if the AI follows instructions, but just in case
    let cleanedResponse = responseText;
    
    // Remove patterns like "Assistant to=functions.xxx" or "[functions.xxx]" or "Functions: {...}"
    cleanedResponse = cleanedResponse.replace(/Assistant to=functions\.[^\s]+.*$/gm, '').trim();
    cleanedResponse = cleanedResponse.replace(/\[functions?\.[^\]]+\]/gi, '').trim();
    cleanedResponse = cleanedResponse.replace(/Functions?:\s*\{[^}]+\}/gi, '').trim();
    cleanedResponse = cleanedResponse.replace(/\[function\.[^\]]+\]/gi, '').trim();
    
    // Remove standalone JSON objects that look like tool parameters
    // Pattern: { "key": "value", ... } spanning multiple lines
    // Look for common tool parameter keys
    cleanedResponse = cleanedResponse.replace(/\{\s*"(flagType|severity|rationale|reason|isConfirmation|areaConfirmed|result|summary|questions)"[^}]*\}/gs, '').trim();
    
    // Remove any remaining curly brace blocks that span multiple lines and contain quotes
    cleanedResponse = cleanedResponse.replace(/\{[\s\S]*?"[^"]*"[\s\S]*?\}/g, '').trim();
    
    // Clean up multiple newlines/whitespace left after removal
    cleanedResponse = cleanedResponse.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    // If cleaning removed everything, log error but still return original
    if (cleanedResponse.length < 10 && responseText.length > 10) {
      console.error('⚠️ [OpenAI Tools] Response was mostly function syntax! Original:', responseText);
      console.error('⚠️ [OpenAI Tools] This means the AI is not following instructions properly');
      // Keep original to avoid losing all content, but this needs fixing
      cleanedResponse = responseText;
    }
    
    // Log if we had to clean anything
    if (cleanedResponse !== responseText) {
      console.warn('🧹 [OpenAI Tools] Cleaned function syntax from response');
      console.warn('   Original:', responseText.substring(0, 200));
      console.warn('   Cleaned:', cleanedResponse.substring(0, 200));
    }

    return NextResponse.json({
      success: true,
      response: cleanedResponse,
      toolCalls: toolCalls,
      type: 'response_with_tools'
    });

  } catch (error) {
    console.error('❌ [OpenAI Tools] Error in response generation:', error);
    
    // Extract detailed error info from OpenAI
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = (error as any)?.response?.data || (error as any)?.error || error;
    
    console.error('❌ [OpenAI Tools] Error details:', JSON.stringify(errorDetails, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Response generation with tools failed',
        details: errorMessage,
        openaiError: errorDetails
      },
      { status: 500 }
    );
  }
}

async function handleAnalyzeSentiment(input: Record<string, unknown>, options: Record<string, unknown>) {
  try {
    const { text, context } = input;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a medical AI assistant analyzing patient sentiment and emotional state. 
          Analyze the text for emotional indicators, stress levels, and overall mood. 
          Respond with a JSON object containing sentiment analysis.`
        },
        {
          role: "user",
          content: `Analyze this patient text for sentiment and emotional state:
          
          Text: "${text}"
          Context: ${context}
          
          Respond with JSON:
          {
            "sentiment": "positive|neutral|negative|concerning",
            "emotions": ["emotion1", "emotion2"],
            "stress_level": "low|moderate|high",
            "concern_indicators": ["indicator1", "indicator2"],
            "confidence": 0.0-1.0
          }`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const sentimentAnalysis = JSON.parse(response);

    return NextResponse.json({
      success: true,
      analysis: sentimentAnalysis
    });

  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    return NextResponse.json(
      { error: 'Sentiment analysis failed' },
      { status: 500 }
    );
  }
}

// Real-time API for streaming responses (if needed)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      operation,
      stream,
      input 
    } = body;

    if (operation === 'streaming_response') {
      return await handleStreamingResponse(input, stream);
    }

    return NextResponse.json(
      { error: 'Unsupported streaming operation' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ OpenAI streaming error:', error);
    return NextResponse.json(
      { error: 'Streaming processing failed' },
      { status: 500 }
    );
  }
}

async function handleStreamingResponse(input: Record<string, unknown>, stream: Record<string, unknown>) {
  try {
    const { condition, patientResponses, context } = input;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a medical AI assistant providing real-time responses to patients in a Transition of Care program for ${condition}. 
          Be empathetic, clear, and encouraging.`
        },
        {
          role: "user",
          content: `Patient responses: ${JSON.stringify(patientResponses)}
          Context: ${context}
          
          Generate a response to the patient.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true
    });

    // Handle streaming response
    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (error) {
    console.error('Error in streaming response:', error);
    return NextResponse.json(
      { error: 'Streaming response failed' },
      { status: 500 }
    );
  }
}

// Handle structured patient input parsing
async function handleParsePatientInput(input: Record<string, unknown>, options: Record<string, unknown>) {
  try {
    const { condition, educationLevel, patientInput, conversationHistory = [], protocolPatterns = [], patternsRequiringNumbers = [] } = input;
    const history = conversationHistory as Array<{role: string, content: string}>;
    const patterns = protocolPatterns as string[];
    const numericPatterns = patternsRequiringNumbers as string[];
    
    console.log('🔍 [OpenAI Parser] Extracting structured data from:', patientInput);
    console.log('💬 [OpenAI Parser] With conversation context:', history.length, 'messages');
    console.log('🎯 [OpenAI Parser] Matching against', patterns.length, 'protocol patterns from database');
    console.log('🔢 [OpenAI Parser] Patterns requiring numbers:', numericPatterns.length);
    
    // Define the schema for structured output
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

${patterns.length > 0 ? patterns.map(p => `- ${p}`).join('\n') : 'No patterns configured'}

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

Multiple patterns can match one input (e.g., "chest pain and can't breathe" → "chest pain, cant breathe")

Extract the following in JSON format:
{
  "symptoms": ["symptom1", "symptom2", "symptom3"],
  "severity": "${VALID_SEVERITIES.join('|')}",
  "intent": "symptom_report|question|medication|general",
  "sentiment": "positive|neutral|concerned|distressed",
  "confidence": 0.0-1.0,
  "normalized_text": "gained 3 pounds, chest pain"  // Use EXACT phrases from patterns above
}

⚠️ SYMPTOM EXTRACTION - BE COMPREHENSIVE:
Extract ALL symptoms mentioned, even if not in the patterns list:
- Common HF symptoms: chest pain, breathing trouble, swelling, weight gain, fatigue, dizziness
- GI symptoms: vomiting, nausea, appetite loss
- Neurological: dizziness, confusion, lightheadedness
- Always extract even if symptom isn't in patterns - it will be caught by AI severity assessment

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
- CRITICAL: Life-threatening (chest pain, severe breathing, altered mental status, severe orthostatic symptoms)
- HIGH: Multiple concerning symptoms, medication issues + symptoms, rapid changes, patient distress
- MODERATE: Isolated concerning symptom, mild symptom combinations, patient somewhat worried
- LOW: Mild isolated issue, patient stable

**Always ask yourself: "If I were the doctor, would I want to know about this RIGHT NOW?"**
If yes → Increase severity to at least MODERATE or HIGH.

Be liberal in detection - err on the side of safety for critical symptoms.
If patient mentions something that matches a pattern (even with different words), include it in normalized_text using the canonical pattern phrase.`;

    // Build messages array with conversation history
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
        content: `CONVERSATION HISTORY:\n${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\nNow analyzing the patient's latest message considering this context.`
      });
    }
    
    // Add current message
    messages.push({
      role: "user",
      content: `Patient's CURRENT message: "${patientInput}"\n\nExtract structured information in JSON format, considering the full conversation context above.`
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Supports JSON mode, faster and cheaper than gpt-4
      messages: messages as any,
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 300
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    console.log('📊 [OpenAI Parser] Raw response:', responseText);
    
    const parsed = JSON.parse(responseText);
    console.log('✅ [OpenAI Parser] Parsed:', parsed);

    return NextResponse.json({
      success: true,
      parsed: parsed,
      tokensUsed: completion.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('❌ Error in parse patient input:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Patient input parsing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
