import { NextRequest, NextResponse } from 'next/server';
import { Medication } from '@/types';
import { EducationLevelType } from '@/lib/enums';
import { generateSummary } from './builders/summary-builder';
import { buildResponseMessages } from './builders/response-prompt-builder';
import { buildParseMessages } from './builders/parse-prompt-builder';
import { AI_TOOLS } from './builders/ai-tools';
import callOpenAI from './openai-wrapper';

// Export the combined parse and respond function for direct use
export async function parseAndRespondDirect(input: {
  condition: string;
  educationLevel: string;
  patientInput: string;
  conversationHistory?: Array<{role: string, content: string}>;
  protocolPatterns?: string[];
  patternsRequiringNumbers?: string[];
  symptomCategories?: Array<{category: string, patterns: string[], examples: string[]}>;
  severityMapping?: Record<string, { escalation: string; timeUrgency: string; examples: string[] }>;
  medications?: Array<{name: string, dosage?: string, frequency?: string, timing?: string}>;
  decisionHint: Record<string, unknown>;
  context: string;
  isFirstMessageInCurrentChat?: boolean;
  hasBeenContactedBefore?: boolean;
  wellnessConfirmationCount?: number;
  checklistQuestions?: Array<{category: string, question: string, follow_up?: string, is_critical?: boolean}>;
  currentSeverityThreshold?: string;
  languageCode?: string; // Patient's preferred language (EN, ES, OTHER)
  parsedResponse?: any; // Optional: if already parsed, skip duplicate parsing
}) {
  // Pass wellnessConfirmationCount to the combined handler
  const result = await handleParseAndRespond(input as any, {});
  const json = await result.json();
  return json;
}

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
      case 'generate_summary':
        const messages = (input.messages as Array<{role: string, content: string}>) || [];
        if (!Array.isArray(messages) || messages.length === 0) {
          return NextResponse.json(
            { error: 'Messages array is required for summary generation' },
            { status: 400 }
          );
        }
        return await generateSummary(messages, options);
        
      case 'parse_and_respond':
        return await handleParseAndRespond(input, options);
        
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

// Combined parse and respond - runs both operations in sequence
async function handleParseAndRespond(input: Record<string, unknown>, options: Record<string, unknown>) {
  try {
    // Step 1: Parse the patient input (skip if already parsed)
    let parsedResponse: any;
    
    if (input.parsedResponse) {
      // Reuse existing parsed response to avoid duplicate parsing
      console.log('🔄 [Parse & Respond] Reusing existing parsed response');
      parsedResponse = input.parsedResponse;
    } else {
      // Do fresh parse if not provided
      console.log('🔍 [Parse & Respond] Step 1: Parsing patient input');
      
      const parseInput = {
        condition: input.condition,
        educationLevel: input.educationLevel,
        patientInput: input.patientInput,
        conversationHistory: input.conversationHistory || [],
        protocolPatterns: input.protocolPatterns || [],
        patternsRequiringNumbers: input.patternsRequiringNumbers || [],
        symptomCategories: input.symptomCategories || [],
        severityMapping: input.severityMapping,
        wellnessConfirmationCount: input.wellnessConfirmationCount || 0
      };
      
      const parseMessages = buildParseMessages({
        condition: parseInput.condition as string,
        protocolPatterns: parseInput.protocolPatterns as string[],
        patternsRequiringNumbers: parseInput.patternsRequiringNumbers as string[],
        symptomCategories: parseInput.symptomCategories as Array<{category: string, patterns: string[], examples: string[]}>,
        conversationHistory: parseInput.conversationHistory as Array<{role: string, content: string}>,
        patientInput: parseInput.patientInput as string,
        severityMapping: parseInput.severityMapping as Record<string, { escalation: string; timeUrgency: string; examples: string[] }>,
        wellnessConfirmationCount: parseInput.wellnessConfirmationCount as number
      });

      const parseResult = await callOpenAI({
        params: {
          model: "gpt-4o-mini",
          messages: parseMessages as any,
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 300
        },
        validation: {
          requireValidJson: true, // Must be valid JSON
          requireTextContent: false, // JSON response, not conversational text
          allowToolCalls: false // No tool calls for parsing
        },
        retry: {
          maxAttempts: 2,
          enableFallback: false // No fallback for JSON parsing
        },
        operationLabel: 'Parse Patient Input'
      });

      const parseText = parseResult.textContent || '{}';
      console.log('📊 [Parse & Respond] Parsed response:', parseText);
      
      parsedResponse = JSON.parse(parseText);
      
      // Validate critical fields from AI parser
      if (!Array.isArray(parsedResponse.symptoms)) {
        throw new Error('AI parser must return symptoms array (can be empty)');
      }
      
      if (parsedResponse.confidence === undefined || parsedResponse.confidence === null) {
        throw new Error('AI parser must return confidence score (0.0-1.0)');
      }
    }

    // Step 2: Generate response based on parsed data
    console.log('🤖 [Parse & Respond] Step 2: Generating AI response with tools');
    
    const responseInput = {
      condition: input.condition,
      educationLevel: input.educationLevel,
      medications: input.medications || [],
      patientResponses: input.patientInput, // Use input.patientInput instead of parseInput.patientInput
      decisionHint: input.decisionHint,
      context: input.context,
      isFirstMessageInCurrentChat: input.isFirstMessageInCurrentChat,
      hasBeenContactedBefore: input.hasBeenContactedBefore,
      wellnessConfirmationCount: input.wellnessConfirmationCount || 0,
      checklistQuestions: input.checklistQuestions || [],
      conversationHistory: input.conversationHistory || [],
      coveredCategories: parsedResponse.coveredCategories || [],
      currentSeverityThreshold: input.currentSeverityThreshold,
      languageCode: input.languageCode
    };
    
    // Type hint and medications with proper types
    const hint = responseInput.decisionHint as Record<string, unknown>;
    const medList = (responseInput.medications || []) as Medication[];
    const checklistQ = (responseInput.checklistQuestions || []) as Array<{category: string, question: string, follow_up?: string, is_critical?: boolean}>;
    
    // Use AI tools from separate file
    const tools = AI_TOOLS;

    // Build complete messages array with system prompt, conversation history, and current response
    const history = responseInput.conversationHistory as Array<{role: string, content: string}>;
    
    console.log('📝 [Parse & Respond] Building response messages with decision hint:', JSON.stringify(hint).substring(0, 200));
    let responseMessages;
    try {
      responseMessages = buildResponseMessages({
        context: responseInput.context as string,
        educationLevel: responseInput.educationLevel as EducationLevelType,
        medications: medList,
        checklistQuestions: checklistQ,
        wellnessConfirmationCount: responseInput.wellnessConfirmationCount as number || 0,
        decisionHint: hint,
        conversationHistory: history,
        patientResponse: responseInput.patientResponses as string,
        coveredCategories: responseInput.coveredCategories as string[],
        currentSeverityThreshold: responseInput.currentSeverityThreshold as string,
        languageCode: responseInput.languageCode as string
      });
      console.log('✅ [Parse & Respond] Response messages built successfully');
    } catch (buildError) {
      console.error('❌ [Parse & Respond] Error building response messages:', buildError);
      throw new Error(`Failed to build response messages: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`);
    }

    console.log('🚀 [Parse & Respond] Calling OpenAI for response generation...');
    
    const responseResult = await callOpenAI({
      params: {
        model: "gpt-4",
        messages: responseMessages as any,
        tools: tools as any,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 500
      },
      validation: {
        requireTextContent: true, // MUST have text - patient needs a message
        requireValidJson: false,
        allowToolCalls: true // Tool calls are fine alongside text
      },
      retry: {
        maxAttempts: 2,
        enableFallback: true // If all retries fail, try without tools
      },
      operationLabel: 'Generate Patient Response'
    });
    
    console.log('✅ [Parse & Respond] OpenAI response received');
    
    const responseText = responseResult.textContent;
    const toolCalls = responseResult.toolCalls;
    const usedFallback = responseResult.usedFallback;
    
    console.log('🔧 [Parse & Respond] Tool calls:', toolCalls.length);
    if (usedFallback) {
      console.warn('⚠️ [Parse & Respond] Used fallback mode - no tool calls available');
    }
    
    // Text content should always exist due to validation
    if (!responseText) {
      throw new Error('AI failed to generate patient message after all retry attempts');
    }
    
    // SAFETY NET: Filter out any accidental function call syntax that slipped into the text
    let cleanedResponse = responseText;
    cleanedResponse = cleanedResponse.replace(/Assistant to=functions\.[^\s]+.*$/gm, '').trim();
    cleanedResponse = cleanedResponse.replace(/\[functions?\.[^\]]+\]/gi, '').trim();
    cleanedResponse = cleanedResponse.replace(/Functions?:\s*\{[^}]+\}/gi, '').trim();
    cleanedResponse = cleanedResponse.replace(/\[function\.[^\]]+\]/gi, '').trim();
    cleanedResponse = cleanedResponse.replace(/\{\s*"(flagType|severity|rationale|reason|isConfirmation|areaConfirmed|result|summary|questions)"[^}]*\}/gs, '').trim();
    cleanedResponse = cleanedResponse.replace(/\{[\s\S]*?"[^"]*"[\s\S]*?\}/g, '').trim();
    cleanedResponse = cleanedResponse.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    if (cleanedResponse.length < 10 && responseText.length > 10) {
      console.error('⚠️ [Parse & Respond] Response was mostly function syntax!');
      cleanedResponse = responseText;
    }
    
    if (cleanedResponse !== responseText) {
      console.warn('🧹 [Parse & Respond] Cleaned function syntax from response');
    }

    return NextResponse.json({
      success: true,
      parsed: parsedResponse,
      response: cleanedResponse,
      toolCalls: toolCalls,
      type: 'parse_and_respond',
      tokensUsed: responseResult.completion.usage?.total_tokens || 0,
      usedFallback: usedFallback, // Flag for monitoring if fallback was used
      retryAttempts: responseResult.retryAttempts // Number of retries needed
    });

  } catch (error) {
    console.error('❌ [Parse & Respond] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = (error as any)?.response?.data || (error as any)?.error || error;
    
    console.error('❌ [Parse & Respond] Error details:', JSON.stringify(errorDetails, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Parse and respond failed',
        details: errorMessage,
        openaiError: errorDetails
      },
      { status: 500 }
    );
  }
}

