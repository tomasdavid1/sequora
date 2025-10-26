import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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
              patientId: { type: "string", description: "Patient ID" },
              flagType: { type: "string", description: "Type of flag (symptom_escalation, respiratory, etc.)" },
              severity: { type: "string", enum: ["low", "medium", "high"], description: "Severity level" },
              rationale: { type: "string", description: "Brief explanation of why this flag was raised" }
            },
            required: ["patientId", "flagType", "severity", "rationale"]
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
              patientId: { type: "string", description: "Patient ID" },
              questions: { 
                type: "array", 
                items: { type: "string" },
                minItems: 1,
                maxItems: 3,
                description: "List of follow-up questions to ask the patient"
              }
            },
            required: ["patientId", "questions"]
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
              patientId: { type: "string", description: "Patient ID" },
              result: { type: "string", enum: ["ASK_MORE", "FLAG", "CLOSE"], description: "Check-in result" },
              summary: { type: "string", description: "Brief summary of the check-in" }
            },
            required: ["patientId", "result"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "handoff_to_nurse",
          description: "Hand off to a nurse when immediate attention is needed",
          parameters: {
            type: "object",
            properties: {
              patientId: { type: "string", description: "Patient ID" },
              reason: { type: "string", description: "Reason for handoff to nurse" }
            },
            required: ["patientId", "reason"]
          }
        }
      }
    ];

    // Build system prompt with protocol context
    const systemPrompt = `You are a post-discharge nurse assistant for a ${condition} patient with ${educationLevel} education level.

Goals:
1) Complete a focused check-in
2) Detect red flags early  
3) Escalate appropriately

CRITICAL INSTRUCTIONS:
- Provide a natural, conversational response to the patient
- Do NOT include function call syntax in your response text
- Call tools separately using the function calling feature
- Your text response should ONLY contain what the patient will read/hear

Style:
- Reading level: ${educationLevel} (low/medium/high)
- Tone: warm, caring, reassuring
- Use plain language, short sentences
- Always confirm understanding

Decision Hint: ${JSON.stringify(decisionHint)}

Tool Usage:
- raise_flag: When symptoms are concerning
- ask_more: When you need more information  
- log_checkin: When patient is doing well
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
