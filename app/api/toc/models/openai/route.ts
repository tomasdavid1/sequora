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
      responseType = 'patient_response' 
    } = input;

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
      patientResponses, 
      decisionHint, 
      context,
      isFirstMessageInCurrentChat,
      hasBeenContactedBefore
    } = input;
    
    const hint = decisionHint as any; // Type assertion for nested access
    
    console.log('🔧 [OpenAI Tools] First message in chat:', isFirstMessageInCurrentChat);
    console.log('🔧 [OpenAI Tools] Patient contacted before:', hasBeenContactedBefore);

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
      }
    ];

    // Build system prompt with protocol context
    const systemPrompt = `${context}

PATIENT EDUCATION LEVEL: ${educationLevel}
- LOW: Use very simple words (5th grade level). Short sentences. Avoid medical terms. Lots of reassurance.
- MEDIUM: Use clear, everyday language. Some medical terms OK if explained. Standard sentences.
- HIGH: Can use medical terminology. Patients understand more complex explanations. Professional tone.

CRITICAL INSTRUCTIONS:
- Provide a natural, conversational response to the patient
- Do NOT include function call syntax in your response text
- Call tools separately using the function calling feature
- Your text response should ONLY contain what the patient will read/hear

Decision Hint: ${JSON.stringify(hint)}

${hint.messageGuidance ? `\n📋 MESSAGE GUIDANCE:\n${hint.messageGuidance}\n` : ''}

Tool Usage (NOTE: patientId is already known - you don't need to provide it):
- raise_flag: When symptoms are concerning
- ask_more: When you need more information  
- log_checkin: When you've determined the patient is doing well
- handoff_to_nurse: When immediate attention needed

RESPONSE FORMAT:
1. Write your message to the patient (conversational, empathetic)
2. Call appropriate tools (the patient will NOT see the tool calls)
3. NEVER include [function.xxx] or JSON in your response text`;

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

    // Get the text response (might be null if only tool calls)
    let responseText = message.content || '';
    
    // If there's no text but there are tool calls, generate a fallback message
    if (!responseText && toolCalls.length > 0) {
      const toolName = toolCalls[0]?.name;
      if (toolName === 'ask_more') {
        responseText = "I'd like to understand your situation better. Can you answer a few questions for me?";
      } else if (toolName === 'raise_flag') {
        responseText = "I understand your concern. I'm connecting you with a nurse who will call you shortly to provide guidance.";
      } else if (toolName === 'handoff_to_nurse') {
        responseText = "I'm transferring you to a nurse right away to ensure you get the care you need.";
      } else if (toolName === 'log_checkin') {
        responseText = "Thank you for checking in! It sounds like you're doing well. Keep up the good work with your care plan.";
      } else {
        responseText = "I understand. Let me help you with that.";
      }
    }

    return NextResponse.json({
      success: true,
      response: responseText,
      toolCalls: toolCalls,
      type: 'response_with_tools'
    });

  } catch (error) {
    console.error('Error in response generation with tools:', error);
    return NextResponse.json(
      { error: 'Response generation with tools failed' },
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
    const { condition, educationLevel, patientInput, conversationHistory = [], protocolPatterns = [] } = input;
    const history = conversationHistory as Array<{role: string, content: string}>;
    const patterns = protocolPatterns as string[];
    
    console.log('🔍 [OpenAI Parser] Extracting structured data from:', patientInput);
    console.log('💬 [OpenAI Parser] With conversation context:', history.length, 'messages');
    console.log('🎯 [OpenAI Parser] Matching against', patterns.length, 'protocol patterns from database');
    
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
- Always convert "lbs" → "pounds" and preserve numbers (3 lbs → 3 pounds)
- Be liberal in matching - if it's close, include it
- Multiple patterns can match one input (e.g., "chest pain and can't breathe" → "chest pain, cant breathe")

Extract the following in JSON format:
{
  "symptoms": ["symptom1", "symptom2"],
  "severity": "${VALID_SEVERITIES.join('|')}",
  "intent": "symptom_report|question|medication|general",
  "sentiment": "positive|neutral|concerned|distressed",
  "confidence": 0.0-1.0,
  "normalized_text": "gained 3 pounds, chest pain"  // Use EXACT phrases from patterns above
}

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
