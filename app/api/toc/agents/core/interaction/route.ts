import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { 
  ProtocolAssignment, 
  Episode, 
  OutreachResponse, 
  OutreachResponseInsert,
  EscalationTask,
  EscalationTaskInsert,
  ConditionCode
} from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';

type SupabaseAdmin = SupabaseClient<Database>;

// Type definitions for the interaction system
interface ParsedResponse {
  intent: string;
  symptoms: string[];
  severity: string;
  questions: string[];
  sentiment: string;
  confidence: number;
  rawInput: string;
  painScore?: number;
  weightChange?: string;
  medicationAdherence?: string;
  temperature?: number;
  breathingStatus?: string;
  complications: string[];
  aiResponse?: string;
}

interface DecisionHint {
  action: 'FLAG' | 'ASK_MORE' | 'CLOSE';
  flagType?: string;
  severity?: string;
  reason?: string;
  followUp?: string[];
  questions?: string[];
}

interface AIResponse {
  response: string;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
}

interface ToolResult {
  tool: string;
  parameters: Record<string, unknown>;
  result: {
    success: boolean;
    taskId?: string;
    followUpId?: string;
    checkinId?: string;
    error?: string;
  };
}

// Core interaction agent that handles patient responses and determines next actions
// Enhanced with protocol system, rules DSL, and tool calling

export async function POST(request: NextRequest) {
  try {
    const { 
      patientId, 
      episodeId, 
      patientInput, 
      condition, 
      interactionType = 'TEXT', // TEXT, VOICE, or APP
      interactionId = null // Existing interaction to continue
    } = await request.json();

    if (!patientId || !episodeId || !patientInput) {
      return NextResponse.json(
        { error: 'Patient ID, Episode ID, and patient input are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Load or create protocol assignment for this episode
    let protocolAssignment = await loadProtocolAssignment(episodeId, supabase);
    
    if (!protocolAssignment) {
      console.log('No protocol assignment found - creating one now');
      protocolAssignment = await createProtocolAssignment(episodeId, supabase);
      
      if (!protocolAssignment) {
        return NextResponse.json(
          { error: 'Failed to create protocol assignment. Episode may not exist or have invalid condition code.' },
          { status: 400 }
        );
      }
    }

    // 2. Parse the patient input using LLM with protocol context
    const parsedResponse = await parsePatientInputWithProtocol(patientInput, protocolAssignment);
    
    // 3. Evaluate rules DSL to get decision hint
    const decisionHint = await evaluateRulesDSL(parsedResponse, protocolAssignment);
    
    // 4. Check if this patient has been contacted before in this episode
    const { data: previousInteractions } = await supabase
      .from('AgentInteraction')
      .select('id')
      .eq('episode_id', episodeId)
      .order('started_at', { ascending: false })
      .limit(5);
    
    const hasBeenContactedBefore = (previousInteractions?.length || 0) > 0;
    const isFirstMessageInCurrentChat = !interactionId;
    
    console.log('📞 [Interaction] Contact history:', {
      episodeId,
      previousInteractionsCount: previousInteractions?.length || 0,
      hasBeenContactedBefore,
      isFirstMessageInCurrentChat
    });
    
    // 5. Check if decision hint requires immediate escalation
    let aiResponse;
    let forcedToolCalls: ToolCall[] = [];
    
    if (decisionHint.action === 'FLAG') {
      console.log('🚨 [Interaction] CRITICAL FLAG TRIGGERED - Forcing immediate escalation');
      console.log('🚨 Flag Type:', decisionHint.flagType);
      console.log('🚨 Severity:', decisionHint.severity);
      
      // Determine which tool to call based on severity
      const toolName = decisionHint.severity === 'critical' ? 'handoff_to_nurse' : 'raise_flag';
      
      // Create patient-friendly message based on severity
      let escalationMessage = '';
      if (decisionHint.severity === 'critical') {
        escalationMessage = `Thank you for letting me know. I'm going to have one of our nurses reach out to you right away to help with this. They should contact you within the next 30 minutes. If your symptoms get worse or you feel you need immediate help, please call 911 or go to the emergency room.`;
      } else if (decisionHint.severity === 'high') {
        escalationMessage = `I appreciate you sharing this with me. A nurse will give you a call within the next 2 hours to check in and provide guidance. In the meantime, if anything gets worse, don't hesitate to call 911 or visit the emergency room.`;
      } else {
        escalationMessage = `Thanks for letting me know. I've made a note for our care team to follow up with you. If you have any concerns in the meantime, please reach out to your healthcare provider.`;
      }
      
      forcedToolCalls = [{
        name: toolName,
        parameters: {
          patientId: patientId,
          reason: decisionHint.reason || `${decisionHint.flagType}: ${decisionHint.severity} severity`,
          flagType: decisionHint.flagType,
          severity: decisionHint.severity
        }
      }];
      
      aiResponse = {
        response: escalationMessage,
        toolCalls: forcedToolCalls
      };
      
      console.log('🚨 [Interaction] Forced tool call:', toolName);
    } else {
      // Normal AI generation with tools
      aiResponse = await generateAIResponseWithTools(
        parsedResponse, 
        protocolAssignment, 
        decisionHint,
        patientId,
        episodeId,
        isFirstMessageInCurrentChat,
        hasBeenContactedBefore
      );
    }
    
    // 6. Get or create AgentInteraction record
    let existingInteractionId = interactionId;
    let interaction = null;
    
    if (existingInteractionId) {
      // Continue existing interaction
      const { data: existing } = await supabase
        .from('AgentInteraction')
        .select('*')
        .eq('id', existingInteractionId)
        .single();
      interaction = existing;
    } else {
      // Create new interaction
      const { data: newInteraction, error: interactionError } = await supabase
        .from('AgentInteraction')
        .insert({
          patient_id: patientId,
          episode_id: episodeId,
          agent_config_id: null,
          interaction_type: interactionType === 'VOICE' ? 'VOICE_CALL' : 'SMS',
          status: 'IN_PROGRESS',
          external_id: null,
          started_at: new Date().toISOString(),
          metadata: {
            condition,
            decisionHint: decisionHint as any,
            protocolAssignment: protocolAssignment?.id
          } as any
        })
        .select()
        .single();

      if (interactionError) {
        console.error('Error creating AgentInteraction:', interactionError);
      }
      
      interaction = newInteraction;
      existingInteractionId = newInteraction?.id;
    }

    const activeInteractionId = existingInteractionId;

    // 6. Store user message
    if (activeInteractionId) {
      // Get next sequence number
      const { data: existingMessages } = await supabase
        .from('AgentMessage')
        .select('sequence_number')
        .eq('agent_interaction_id', activeInteractionId)
        .order('sequence_number', { ascending: false })
        .limit(1);
      
      const nextSequence = (existingMessages?.[0]?.sequence_number || 0) + 1;
      

      const { error: userMsgError } = await supabase
        .from('AgentMessage')
        .insert({
          agent_interaction_id: activeInteractionId,
          message_type: 'USER',
          role: 'user',
          content: patientInput,
          sequence_number: nextSequence,
          timestamp: new Date().toISOString()
        });

      if (userMsgError) {
        console.error('❌ [Interaction] Error saving user message:', userMsgError);
      } else {
        console.log('✅ [Interaction] User message saved. Sequence:', nextSequence);
      }

      // 7. Store AI response message
      const { error: aiMsgError } = await supabase
        .from('AgentMessage')
        .insert({
          agent_interaction_id: activeInteractionId,
          message_type: 'ASSISTANT',
          role: 'assistant',
          content: aiResponse.response,
          sequence_number: nextSequence + 1,
          tokens_used: 0,
          function_name: aiResponse.toolCalls?.[0]?.name || null,
          function_arguments: aiResponse.toolCalls?.[0]?.parameters || null,
          model_used: 'gpt-4',
          timestamp: new Date().toISOString()
        });

      if (aiMsgError) {
        console.error('❌ [Interaction] Error saving AI message:', aiMsgError);
      } else {
        console.log('✅ [Interaction] AI message saved. Sequence:', nextSequence + 1);
      }

      // 8. Update interaction with message count (don't mark completed yet - ongoing conversation)
      const { data: allMessages } = await supabase
        .from('AgentMessage')
        .select('id')
        .eq('agent_interaction_id', activeInteractionId);
        
      await supabase
        .from('AgentInteraction')
        .update({
          metadata: {
            ...(interaction?.metadata as Record<string, unknown> || {}),
            lastMessageAt: new Date().toISOString(),
            messageCount: allMessages?.length || 0
          }
        })
        .eq('id', activeInteractionId);
    }

    // 9. Handle tool calls from AI response
    const toolResults = await handleToolCalls(aiResponse.toolCalls, patientId, episodeId, supabase, activeInteractionId);

    return NextResponse.json({
      success: true,
      parsedResponse,
      decisionHint,
      aiResponse: aiResponse.response,
      toolResults,
      interactionId: activeInteractionId,
      message: aiResponse.response
    });

  } catch (error) {
    console.error('Error in core interaction agent:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Load protocol assignment for episode
async function loadProtocolAssignment(episodeId: string, supabase: SupabaseAdmin) {
  const { data: assignment, error } = await supabase
    .from('ProtocolAssignment')
    .select(`
      *,
      Episode!inner(condition_code, education_level)
    `)
    .eq('episode_id', episodeId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error loading protocol assignment:', error);
    return null;
  }

  return assignment;
}

// Create protocol assignment for an episode
async function createProtocolAssignment(episodeId: string, supabase: SupabaseAdmin) {
  try {
    // First, get the episode details
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select('condition_code, education_level')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      console.error('Error fetching episode:', episodeError);
      return null;
    }

    // Get protocol config using the database function
    const { data: protocolConfig, error: configError } = await supabase
      .rpc('get_protocol_config', {
        condition_code_param: episode.condition_code,
        education_level_param: episode.education_level || 'medium'
      });

    if (configError) {
      console.error('Error getting protocol config:', configError);
      return null;
    }

    // Create the protocol assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('ProtocolAssignment')
      .insert({
        episode_id: episodeId,
        condition_code: episode.condition_code,
        education_level: episode.education_level || 'medium',
        protocol_config: protocolConfig,
        is_active: true
      })
      .select(`
        *,
        Episode!inner(condition_code, education_level)
      `)
      .single();

    if (assignmentError) {
      console.error('Error creating protocol assignment:', assignmentError);
      return null;
    }

    return assignment;
  } catch (error) {
    console.error('Error in createProtocolAssignment:', error);
    return null;
  }
}

// Parse patient input with protocol context
async function parsePatientInputWithProtocol(input: string, protocolAssignment: ProtocolAssignment) {
  try {
    console.log('🔍 [Parser] Requesting structured symptom extraction from AI');
    
    // Call OpenAI directly with structured output request
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/models/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'parse_patient_input',
        input: {
          condition: protocolAssignment.condition_code,
          educationLevel: protocolAssignment.education_level,
          patientInput: input,
          requestStructuredOutput: true
        }
      })
    });

    const result = await response.json();
    console.log('📊 [Parser] AI extracted:', result.parsed);
    
    if (result.success && result.parsed) {
      // Use structured AI output directly
      return {
        ...result.parsed,
        rawInput: input,
        confidence: result.parsed.confidence || 0.85
      };
    } else {
      console.warn('⚠️ [Parser] Falling back to regex extraction');
      return getMockParsedResponse(input, protocolAssignment.condition_code);
    }
  } catch (error) {
    console.error('❌ [Parser] Error calling AI for parsing:', error);
    return getMockParsedResponse(input, protocolAssignment.condition_code);
  }
}

// Evaluate rules DSL to get decision hint
async function evaluateRulesDSL(parsedResponse: ParsedResponse, protocolAssignment: ProtocolAssignment): Promise<DecisionHint> {
  // Get the rules DSL from the protocol assignment
  const rulesDSL = (protocolAssignment.protocol_config as any)?.rules || {};
  
  // Evaluate red flags
  const redFlags = rulesDSL.red_flags || [];
  for (const rule of redFlags) {
    if (evaluateRuleCondition(rule.if, parsedResponse)) {
      return {
        action: 'FLAG' as const,
        flagType: rule.flag.type,
        severity: rule.flag.severity,
        reason: rule.flag.message || `Triggered ${rule.flag.type} flag`,
        followUp: rule.flag.follow_up || []
      };
    }
  }
  
  // Check closures
  const closures = rulesDSL.closures || [];
  for (const closure of closures) {
    if (evaluateRuleCondition(closure.if, parsedResponse)) {
      return {
        action: 'CLOSE' as const,
        reason: 'Patient is doing well'
      };
    }
  }
  
  // Default to ask more questions
  return {
    action: 'ASK_MORE' as const,
    questions: ['How are you feeling today?', 'Any new symptoms?']
  };
}

// Evaluate a single rule condition
function evaluateRuleCondition(condition: Record<string, unknown>, parsedResponse: any): boolean {
  if (condition.any_text && Array.isArray(condition.any_text)) {
    const inputText = parsedResponse.rawInput?.toLowerCase() || '';
    const extractedSymptoms = (parsedResponse.symptoms || []).join(' ').toLowerCase();
    const combinedText = `${inputText} ${extractedSymptoms}`;
    
    // Check if any pattern matches either raw input OR extracted symptoms
    return (condition.any_text as string[]).some((text: string) => 
      combinedText.includes(text.toLowerCase())
    );
  }
  
  if (condition.pain_score_gte && parsedResponse.painScore) {
    return parsedResponse.painScore >= condition.pain_score_gte;
  }
  
  if (condition.pain_score_lte && parsedResponse.painScore) {
    return parsedResponse.painScore <= condition.pain_score_lte;
  }
  
  if (condition.no_symptoms) {
    return parsedResponse.symptoms.length === 0;
  }
  
  if (condition.weight_stable) {
    return parsedResponse.weightChange === 'stable';
  }
  
  if (condition.medication_adherent) {
    return parsedResponse.medicationAdherence === 'adherent';
  }
  
  if (condition.temperature_gte && parsedResponse.temperature) {
    return parsedResponse.temperature >= condition.temperature_gte;
  }
  
  if (condition.temperature_normal) {
    return parsedResponse.temperature < 100.4;
  }
  
  if (condition.breathing_ok) {
    return !parsedResponse.symptoms.includes('shortness_of_breath');
  }
  
  if (condition.breathing_stable) {
    return parsedResponse.breathingStatus === 'stable';
  }
  
  if (condition.no_exacerbation) {
    return !parsedResponse.symptoms.includes('exacerbation');
  }
  
  if (condition.no_complications) {
    return parsedResponse.complications.length === 0;
  }
  
  return false;
}

// Generate AI response with tool calling
async function generateAIResponseWithTools(
  parsedResponse: ParsedResponse, 
  protocolAssignment: ProtocolAssignment, 
  decisionHint: DecisionHint,
  patientId: string,
  episodeId: string,
  isFirstMessageInCurrentChat: boolean = false,
  hasBeenContactedBefore: boolean = false
) {
  try {
    // Build context based on patient contact history
    let conversationContext: string;
    
    if (!hasBeenContactedBefore) {
      // TRUE FIRST CONTACT - Never spoken to this patient before
      conversationContext = `This is your VERY FIRST contact with this patient since their hospital discharge for ${protocolAssignment.condition_code}. Introduce yourself warmly as their post-discharge care coordinator. Explain that you'll be checking in with them regularly during their recovery.`;
    } else if (isFirstMessageInCurrentChat) {
      // RETURNING PATIENT - New chat but patient has been contacted before
      conversationContext = `This patient has been contacted before as part of their post-discharge care. This is a NEW follow-up check-in. Greet them warmly and ask how they've been doing since your last contact. DO NOT introduce yourself as if it's the first time - they know who you are.`;
    } else {
      // CONTINUING CURRENT CONVERSATION
      conversationContext = `You are continuing an ONGOING conversation with this patient in their current check-in. Continue naturally from the previous messages.`;
    }
    
    // Call OpenAI with tool calling enabled
    console.log(`🤖 [AI Generation] Calling OpenAI with tools for ${protocolAssignment.condition_code} patient`);
    console.log(`🤖 [AI Generation] First message in chat: ${isFirstMessageInCurrentChat}`);
    console.log(`🤖 [AI Generation] Patient contacted before: ${hasBeenContactedBefore}`);
    console.log(`🤖 [AI Generation] Decision hint:`, decisionHint);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/models/openai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'generate_response_with_tools',
          input: {
            condition: protocolAssignment.condition_code,
            educationLevel: protocolAssignment.education_level,
            patientResponses: parsedResponse.rawInput,
            decisionHint: decisionHint,
            context: `You are a post-discharge nurse assistant for a ${protocolAssignment.condition_code} patient with ${protocolAssignment.education_level} education level. ${conversationContext} Use the decision hint to guide your response and call appropriate tools.`,
            responseType: 'patient_response_with_tools',
            isFirstMessageInCurrentChat: isFirstMessageInCurrentChat,
            hasBeenContactedBefore: hasBeenContactedBefore
          }
        })
      });

    const result = await response.json();
    
    console.log(`🤖 [AI Generation] Response received. Success: ${result.success}`);
    console.log(`🤖 [AI Generation] Tool calls:`, result.toolCalls || []);
    
    if (result.success) {
      return {
        response: result.response,
        toolCalls: result.toolCalls || []
      };
    }
  } catch (error) {
    console.error('Error generating AI response with tools:', error);
  }

  // Fallback response
  return {
    response: generateFallbackResponse(decisionHint, protocolAssignment),
    toolCalls: []
  };
}

// Handle tool calls from AI response
async function handleToolCalls(toolCalls: ToolCall[] | undefined, patientId: string, episodeId: string, supabase: SupabaseAdmin, interactionId?: string): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  
  if (!toolCalls || toolCalls.length === 0) {
    return results;
  }
  
  for (const toolCall of toolCalls) {
    try {
      let result;
      
      switch (toolCall.name) {
        case 'raise_flag':
          result = await handleRaiseFlag(toolCall.parameters, patientId, episodeId, supabase, interactionId);
          break;
        case 'ask_more':
          result = await handleAskMore(toolCall.parameters, patientId, episodeId, supabase);
          break;
        case 'log_checkin':
          result = await handleLogCheckin(toolCall.parameters, patientId, episodeId, supabase);
          break;
        case 'handoff_to_nurse':
          result = await handleHandoffToNurse(toolCall.parameters, patientId, episodeId, supabase, interactionId);
          break;
        default:
          result = { success: false, error: 'Unknown tool' };
      }
      
      results.push({
        tool: toolCall.name,
        parameters: toolCall.parameters,
        result
      });
    } catch (error) {
      console.error(`Error handling tool call ${toolCall.name}:`, error);
      results.push({
        tool: toolCall.name,
        parameters: toolCall.parameters,
        result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }
  
  return results;
}

// Tool handlers
async function handleRaiseFlag(parameters: Record<string, unknown>, patientId: string, episodeId: string, supabase: SupabaseAdmin, interactionId?: string) {
  const { flagType, severity, rationale } = parameters;
  const severityStr = String(severity);
  const flagTypeStr = String(flagType);
  
  // Create escalation task
  const { data: task, error } = await supabase
    .from('EscalationTask')
    .insert({
      episode_id: episodeId,
      agent_interaction_id: interactionId || null,
      reason_codes: [flagTypeStr],
      severity: severityStr.toUpperCase() as any,
      priority: (severityStr === 'high' ? 'URGENT' : severityStr === 'medium' ? 'HIGH' : 'NORMAL') as any,
      status: 'OPEN' as any,
      sla_due_at: new Date(Date.now() + getSLAMinutes(severityStr) * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating escalation task:', error);
    return { success: false, error: error.message };
  }

  return { success: true, taskId: task.id };
}

async function handleAskMore(parameters: Record<string, unknown>, patientId: string, episodeId: string, supabase: SupabaseAdmin) {
  const { questions } = parameters;
  
  // TODO: FollowUpQuestion table doesn't exist yet - needs migration
  // For now, just return success without storing
  console.log('TODO: Store follow-up questions in FollowUpQuestion table:', questions);
  
  return { success: true, followUpId: undefined };
}

async function handleLogCheckin(parameters: Record<string, unknown>, patientId: string, episodeId: string, supabase: SupabaseAdmin) {
  const { result, summary } = parameters;
  
  // TODO: CheckInLog table doesn't exist yet - needs migration
  // For now, just return success without storing
  console.log('TODO: Store check-in log in CheckInLog table:', { result, summary });
  
  return { success: true, checkinId: undefined };
}

async function handleHandoffToNurse(parameters: Record<string, unknown>, patientId: string, episodeId: string, supabase: SupabaseAdmin, interactionId?: string) {
  const { reason, flagType } = parameters;
  const reasonStr = String(reason || 'Patient requires immediate attention');
  const flagTypeStr = String(flagType || 'NURSE_HANDOFF');
  
  // Create high-priority escalation task
  const { data: task, error } = await supabase
    .from('EscalationTask')
    .insert({
      episode_id: episodeId,
      agent_interaction_id: interactionId || null,
      reason_codes: [flagTypeStr, reasonStr],
      severity: 'CRITICAL',
      priority: 'URGENT',
      status: 'OPEN',
      sla_due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating nurse handoff task:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ [Handoff] Escalation task created:', task.id);
  return { success: true, taskId: task.id };
}

// Generate fallback response
function generateFallbackResponse(decisionHint: DecisionHint, protocolAssignment: ProtocolAssignment) {
  if (decisionHint.action === 'FLAG') {
    return `I understand your concern. Based on what you've shared, I'm connecting you with a nurse who will call you within the next few hours to discuss your symptoms and provide guidance. Please don't hesitate to call 911 if you feel you need immediate medical attention.`;
  }
  
  if (decisionHint.action === 'ASK_MORE') {
    return `I'd like to ask you a few more questions to better understand how you're doing. ${decisionHint.questions?.join(' ') || ''}`;
  }
  
  if (decisionHint.action === 'CLOSE') {
    return `Thank you for checking in! It sounds like you're doing well with your ${protocolAssignment.condition_code} management. Remember to take your medications as prescribed and call your doctor if you have any concerns. Take care!`;
  }
  
  return `Thank you for checking in. How are you feeling today?`;
}

// Parse AI response to extract structured data
function parseAIResponse(aiResponse: string, input: string, condition: string) {
  // Extract structured information from AI response
  const symptoms = extractSymptoms(input, condition);
  const severity = extractSeverity(input);
  const questions = extractQuestions(input);
  
  return {
    intent: extractIntent(input),
    symptoms,
    severity,
    questions,
    sentiment: extractSentiment(input),
    confidence: 0.85, // High confidence for AI parsing
    aiResponse: aiResponse,
    rawInput: input,
    painScore: extractPainScore(input),
    weightChange: extractWeightChange(input),
    medicationAdherence: extractMedicationAdherence(input),
    temperature: extractTemperature(input),
    breathingStatus: extractBreathingStatus(input),
    complications: extractComplications(input)
  };
}

// Fallback mock parsing
function getMockParsedResponse(input: string, condition: string) {
  return {
    intent: extractIntent(input),
    symptoms: extractSymptoms(input, condition),
    severity: extractSeverity(input),
    questions: extractQuestions(input),
    sentiment: extractSentiment(input),
    confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
    rawInput: input,
    painScore: extractPainScore(input),
    weightChange: extractWeightChange(input),
    medicationAdherence: extractMedicationAdherence(input),
    temperature: extractTemperature(input),
    breathingStatus: extractBreathingStatus(input),
    complications: extractComplications(input)
  };
}

// Additional helper functions for parsing
function extractPainScore(input: string): number {
  const lowerInput = input.toLowerCase();
  const painMatch = lowerInput.match(/(\d+)\s*(out of|\/)\s*10/);
  if (painMatch) return parseInt(painMatch[1]);
  
  if (lowerInput.includes('severe') || lowerInput.includes('very bad')) return 8;
  if (lowerInput.includes('moderate') || lowerInput.includes('somewhat')) return 5;
  if (lowerInput.includes('mild') || lowerInput.includes('slight')) return 2;
  return 0;
}

function extractWeightChange(input: string): string {
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('gained') || lowerInput.includes('heavier')) return 'increased';
  if (lowerInput.includes('lost') || lowerInput.includes('lighter')) return 'decreased';
  if (lowerInput.includes('same') || lowerInput.includes('stable')) return 'stable';
  return 'unknown';
}

function extractMedicationAdherence(input: string): string {
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('missed') || lowerInput.includes('forgot') || lowerInput.includes('ran out')) return 'non-adherent';
  if (lowerInput.includes('taking') || lowerInput.includes('regular')) return 'adherent';
  return 'unknown';
}

function extractTemperature(input: string): number {
  const lowerInput = input.toLowerCase();
  const tempMatch = lowerInput.match(/(\d+\.?\d*)\s*(degrees?|°|fahrenheit|f)/);
  if (tempMatch) return parseFloat(tempMatch[1]);
  
  if (lowerInput.includes('fever') || lowerInput.includes('hot')) return 101;
  if (lowerInput.includes('normal') || lowerInput.includes('fine')) return 98.6;
  return 0;
}

function extractBreathingStatus(input: string): string {
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('can\'t breathe') || lowerInput.includes('struggling')) return 'distressed';
  if (lowerInput.includes('shortness') || lowerInput.includes('difficulty')) return 'impaired';
  if (lowerInput.includes('normal') || lowerInput.includes('fine')) return 'stable';
  return 'unknown';
}

function extractComplications(input: string): string[] {
  const complications = [];
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('infection') || lowerInput.includes('sepsis')) complications.push('infection');
  if (lowerInput.includes('bleeding') || lowerInput.includes('blood')) complications.push('bleeding');
  if (lowerInput.includes('allergic') || lowerInput.includes('reaction')) complications.push('allergic_reaction');
  if (lowerInput.includes('exacerbation') || lowerInput.includes('flare')) complications.push('exacerbation');
  
  return complications;
}

// Keep the existing helper functions that are still needed
function getSLAMinutes(severity: string): number {
  const slaMinutes = { 'CRITICAL': 30, 'HIGH': 120, 'MODERATE': 240, 'LOW': 480 };
  return slaMinutes[severity as keyof typeof slaMinutes] || 480;
}

// Helper functions for parsing (simplified for protocol system)
function extractIntent(input: string): string {
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('question') || lowerInput.includes('ask')) return 'QUESTION';
  if (lowerInput.includes('symptom') || lowerInput.includes('feel')) return 'SYMPTOM_REPORT';
  if (lowerInput.includes('medication') || lowerInput.includes('med')) return 'MEDICATION_QUESTION';
  return 'GENERAL';
}

function extractSymptoms(input: string, condition: string): string[] {
  const symptoms = [];
  const lowerInput = input.toLowerCase();
  
  // Condition-specific symptom extraction
  if (condition === 'HF') {
    // CRITICAL: Chest pain for HF patients (possible MI)
    if ((lowerInput.includes('chest') && (lowerInput.includes('pain') || lowerInput.includes('hurt') || lowerInput.includes('ache'))) || 
        ((lowerInput.includes('pain') || lowerInput.includes('hurt')) && lowerInput.includes('chest')) ||
        lowerInput.includes('chest pressure') ||
        lowerInput.includes('chest discomfort') ||
        lowerInput.includes('chest tightness') ||
        lowerInput.includes('heart pain')) {
      symptoms.push('chest pain');
    }
    // Breathing symptoms
    if (lowerInput.includes('breath') || lowerInput.includes('shortness')) symptoms.push('shortness_of_breath');
    if (lowerInput.includes('can\'t breathe') || lowerInput.includes('cannot breathe')) symptoms.push('breathing difficulty');
    // Weight/swelling
    if (lowerInput.includes('weight') || lowerInput.includes('gain')) symptoms.push('weight_gain');
    if (lowerInput.includes('swell') || lowerInput.includes('ankle')) symptoms.push('swelling');
  }
  
  if (condition === 'COPD') {
    if (lowerInput.includes('cough')) symptoms.push('increased_cough');
    if (lowerInput.includes('breath') || lowerInput.includes('shortness')) symptoms.push('shortness_of_breath');
  }
  
  if (condition === 'AMI') {
    if (lowerInput.includes('chest') || lowerInput.includes('pain')) symptoms.push('chest_pain');
    if (lowerInput.includes('pressure') || lowerInput.includes('squeezing')) symptoms.push('chest_pressure');
  }
  
  if (condition === 'PNA') {
    if (lowerInput.includes('fever') || lowerInput.includes('temperature')) symptoms.push('fever');
    if (lowerInput.includes('cough')) symptoms.push('cough');
  }
  
  return symptoms;
}

function extractSeverity(input: string): string {
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('severe') || lowerInput.includes('very bad') || lowerInput.includes('emergency')) return 'high';
  if (lowerInput.includes('moderate') || lowerInput.includes('somewhat')) return 'moderate';
  if (lowerInput.includes('mild') || lowerInput.includes('slight')) return 'low';
  return 'moderate';
}

function extractQuestions(input: string): string[] {
  // Extract questions from patient input
  const questions: string[] = [];
  if (input.includes('?')) {
    const questionParts = input.split('?');
    questionParts.forEach(part => {
      if (part.trim()) questions.push(part.trim() + '?');
    });
  }
  return questions;
}

function extractSentiment(input: string): string {
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('worried') || lowerInput.includes('concerned') || lowerInput.includes('scared')) return 'concerned';
  if (lowerInput.includes('confused') || lowerInput.includes('don\'t understand')) return 'confused';
  if (lowerInput.includes('good') || lowerInput.includes('fine') || lowerInput.includes('better')) return 'positive';
  return 'neutral';
}
