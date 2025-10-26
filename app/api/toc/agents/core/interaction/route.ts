import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { 
  ProtocolAssignment, 
  Episode,
  ConditionCode
} from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { 
  SeverityType,
  RiskLevelType,
  VALID_SEVERITIES,
  getSeverityFilterForRiskLevel,
  getPriorityFromSeverity,
  getSLAMinutesFromSeverity,
  isValidSeverity
} from '@/lib/enums';

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
  matchedPattern?: string; // Which text pattern triggered the rule
  ruleDescription?: string; // Database description of the rule
  followUp?: string[];
  questions?: string[];
}

// Extended type for ProtocolAssignment with nested relationships
type ProtocolAssignmentWithRelations = ProtocolAssignment & {
  Episode?: {
    condition_code: string;
    risk_level: string | null;
    Patient?: {
      education_level: string | null;
    };
  };
};

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
      interactionType = 'TEXT', 
      interactionId = null 
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
      console.log('📝 [Interaction] No protocol assignment found - creating one now');
      protocolAssignment = await createProtocolAssignment(episodeId, supabase);
    }

    // 2. Get conversation history if continuing an existing interaction
    let conversationHistory: Array<{role: string, content: string}> = [];
    if (interactionId) {
      const { data: messages } = await supabase
        .from('AgentMessage')
        .select('role, content')
        .eq('agent_interaction_id', interactionId)
        .order('sequence_number', { ascending: true })
        .limit(10); // Last 10 messages for context
      
      conversationHistory = messages || [];
      console.log('💬 [Interaction] Loaded conversation history:', conversationHistory.length, 'messages');
    }
    
    // 3. Load protocol configuration (AI decision parameters)
    const protocolConfig = await getProtocolConfig(
      protocolAssignment.condition_code,
      protocolAssignment.risk_level as RiskLevelType,
      supabase
    );
    
    // 4. Parse the patient input using LLM with protocol context AND conversation history
    const parsedResponse = await parsePatientInputWithProtocol(
      patientInput, 
      protocolAssignment,
      conversationHistory
    );
    
    // 5. Evaluate rules DSL to get decision hint (using protocol config)
    const decisionHint = await evaluateRulesDSL(parsedResponse, protocolAssignment, protocolConfig, supabase);
    
    // 6. Check if this patient has been contacted before in this episode
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
      const toolName = decisionHint.severity === 'CRITICAL' ? 'handoff_to_nurse' : 'raise_flag';
      
      // Create patient-friendly message based on severity
      let escalationMessage = '';
      if (decisionHint.severity === 'CRITICAL') {
        escalationMessage = `Thank you for letting me know. I'm going to have one of our nurses reach out to you right away to help with this. They should contact you within the next 30 minutes. If your symptoms get worse or you feel you need immediate help, please call 911 or go to the emergency room.`;
      } else if (decisionHint.severity === 'HIGH') {
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
        protocolConfig,
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
      // Create new interaction with protocol snapshots for audit trail
      // Get active protocol rules for snapshot
      const protocolRules = await getProtocolRules(
        protocolAssignment.condition_code,
        protocolAssignment.risk_level as RiskLevelType,
        supabase
      );
      
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
          protocol_config_snapshot: protocolConfig as any, // Snapshot AI decision parameters
          protocol_rules_snapshot: protocolRules as any, // Snapshot all active rules
          protocol_snapshot_at: new Date().toISOString(),
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
      Episode!inner(
        condition_code, 
        risk_level,
        Patient!inner(education_level)
      )
    `)
    .eq('episode_id', episodeId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('❌ [Protocol Assignment] Database error loading assignment for episode:', episodeId, error);
    throw new Error(`Failed to load protocol assignment: ${error.message}`);
  }

  if (!assignment) {
    return null; // This is OK - no assignment means we need to create one
  }

  return assignment;
}

// Create protocol assignment for an episode
async function createProtocolAssignment(episodeId: string, supabase: SupabaseAdmin) {
  // First, get the episode details
  const { data: episode, error: episodeError } = await supabase
    .from('Episode')
    .select('condition_code, risk_level')
    .eq('id', episodeId)
    .single();

  if (episodeError) {
    console.error('❌ [Protocol Assignment] Database error fetching episode:', episodeId, episodeError);
    throw new Error(`Failed to fetch episode data: ${episodeError.message}`);
  }

  if (!episode) {
    console.error('❌ [Protocol Assignment] Episode not found:', episodeId);
    throw new Error(`Episode ${episodeId} not found. Cannot create protocol assignment.`);
  }

  // Create the protocol assignment (just metadata, no rule duplication)
  const { data: assignment, error: assignmentError } = await supabase
    .from('ProtocolAssignment')
    .insert({
      episode_id: episodeId,
      condition_code: episode.condition_code,
      risk_level: episode.risk_level,
      is_active: true
    })
    .select(`
      *,
      Episode!inner(
        condition_code, 
        risk_level,
        Patient!inner(education_level)
      )
    `)
    .single();

  if (assignmentError) {
    console.error('❌ [Protocol Assignment] Database error creating assignment:', assignmentError);
    throw new Error(`Failed to create protocol assignment: ${assignmentError.message}`);
  }

  if (!assignment) {
    console.error('❌ [Protocol Assignment] Assignment creation returned no data');
    throw new Error('Protocol assignment creation failed - no data returned');
  }

  console.log('✅ [Protocol Assignment] Created for episode:', episodeId);
  return assignment;
}

// Query protocol configuration (AI decision parameters) from database
async function getProtocolConfig(conditionCode: ConditionCode, riskLevel: RiskLevelType, supabase: SupabaseAdmin) {
  const { data: config, error } = await supabase
    .from('ProtocolConfig')
    .select('*')
    .eq('condition_code', conditionCode)
    .eq('risk_level', riskLevel)
    .eq('active', true)
    .single();

  if (error) {
    console.error(`❌ [Protocol Config] Database error fetching config for ${conditionCode} + ${riskLevel}:`, error);
    throw new Error(`Failed to load protocol configuration: ${error.message}`);
  }

  if (!config) {
    console.error(`❌ [Protocol Config] No active config found for ${conditionCode} + ${riskLevel}`);
    throw new Error(`No protocol configuration found for ${conditionCode} at ${riskLevel} risk level. Please configure protocols in the admin dashboard.`);
  }

  console.log(`⚙️ [Protocol Config] Loaded config for ${conditionCode} + ${riskLevel}`, {
    critical_threshold: config.critical_confidence_threshold,
    low_threshold: config.low_confidence_threshold,
    vague_symptoms_count: config.vague_symptoms?.length || 0
  });

  return config;
}

// Query protocol rules from ProtocolContentPack based on condition and risk level
async function getProtocolRules(conditionCode: ConditionCode, riskLevel: RiskLevelType, supabase: SupabaseAdmin) {
  // Use the centralized severity filter from enums
  const severityFilter = getSeverityFilterForRiskLevel(riskLevel as RiskLevelType);

  // Query red flags (now using proper columns, not JSONB!)
  const { data: redFlagData, error: redFlagError } = await supabase
    .from('ProtocolContentPack')
    .select('rule_code, text_patterns, action_type, severity, message')
    .eq('condition_code', conditionCode)
    .eq('rule_type', 'RED_FLAG')
    .in('severity', severityFilter)
    .eq('active', true);

  if (redFlagError) {
    console.error('❌ [Protocol Rules] Database error fetching red flags:', redFlagError);
    throw new Error(`Failed to load red flag rules: ${redFlagError.message}`);
  }

  // Query closures
  const { data: closureData, error: closureError } = await supabase
    .from('ProtocolContentPack')
    .select('rule_code, text_patterns, action_type, message')
    .eq('condition_code', conditionCode as any)
    .eq('rule_type', 'CLOSURE')
    .eq('active', true);

  if (closureError) {
    console.error('❌ [Protocol Rules] Database error fetching closures:', closureError);
    throw new Error(`Failed to load closure rules: ${closureError.message}`);
  }

  // Validate we got data back
  if (!redFlagData) {
    console.error('❌ [Protocol Rules] Red flag query returned null');
    throw new Error('Failed to load red flag rules - database returned no data');
  }

  if (!closureData) {
    console.error('❌ [Protocol Rules] Closure query returned null');
    throw new Error('Failed to load closure rules - database returned no data');
  }

  // Transform to DSL format expected by evaluateRulesDSL
  const redFlags = redFlagData.map(rule => {
    if (!rule.rule_code || !rule.severity || !rule.message) {
      console.error('❌ [Protocol Rules] Invalid red flag rule:', rule);
      throw new Error(`Red flag rule missing required fields: ${JSON.stringify(rule)}`);
    }
    return {
      if: { any_text: rule.text_patterns },
      flag: {
        type: rule.rule_code,
        action: rule.action_type,
        severity: rule.severity,
        message: rule.message
      }
    };
  });

  const closures = closureData.map(rule => {
    if (!rule.rule_code || !rule.message) {
      console.error('❌ [Protocol Rules] Invalid closure rule:', rule);
      throw new Error(`Closure rule missing required fields: ${JSON.stringify(rule)}`);
    }
    return {
      if: { any_text: rule.text_patterns },
      then: {
        action: rule.action_type,
        message: rule.message
      }
    };
  });

  return {
    red_flags: redFlags,
    closures: closures
  };
}

// Parse patient input with protocol context
async function parsePatientInputWithProtocol(
  input: string, 
  protocolAssignment: ProtocolAssignmentWithRelations,
  conversationHistory: Array<{role: string, content: string}> = []
) {
  console.log('🔍 [Parser] Requesting structured symptom extraction from AI');
  console.log('💬 [Parser] Using', conversationHistory.length, 'previous messages for context');
  
  // Call OpenAI directly with structured output request
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/models/openai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'parse_patient_input',
      input: {
        condition: protocolAssignment.condition_code,
        educationLevel: (protocolAssignment.Episode as any)?.Patient?.education_level,
        patientInput: input,
        conversationHistory: conversationHistory,
        requestStructuredOutput: true
      }
    })
  });

  if (!response.ok) {
    console.error('❌ [Parser] AI API returned error status:', response.status);
    throw new Error(`AI parsing service unavailable (HTTP ${response.status}). Please try again.`);
  }

  const result = await response.json();
  console.log('📊 [Parser] AI extracted:', result.parsed);
  
  if (!result.success) {
    console.error('❌ [Parser] AI parsing failed:', result.error);
    throw new Error(`Failed to parse patient input: ${result.error || 'AI service error'}`);
  }

  if (!result.parsed) {
    console.error('❌ [Parser] AI returned success but no parsed data');
    throw new Error('AI parsing returned no data. Please try again.');
  }

  // Use structured AI output
  return {
    ...result.parsed,
    rawInput: input,
    confidence: result.parsed.confidence
  };
}

// Evaluate rules DSL to get decision hint with AI insights
async function evaluateRulesDSL(
  parsedResponse: ParsedResponse, 
  protocolAssignment: ProtocolAssignment, 
  protocolConfig: any, // From ProtocolConfig table
  supabase: SupabaseAdmin
): Promise<DecisionHint> {
  console.log('🧠 [Rules Engine] Evaluating with AI insights:', {
    symptoms: parsedResponse.symptoms,
    severity: parsedResponse.severity,
    confidence: parsedResponse.confidence,
    intent: parsedResponse.intent,
    sentiment: parsedResponse.sentiment
  });
  
  // Query rules directly from ProtocolContentPack (single source of truth)
  const rulesDSL = await getProtocolRules(
    protocolAssignment.condition_code, 
    protocolAssignment.risk_level as RiskLevelType,
    supabase
  );
  
  // Use database-driven thresholds instead of hardcoded values
  const CRITICAL_CONFIDENCE_THRESHOLD = protocolConfig.critical_confidence_threshold;
  const LOW_CONFIDENCE_THRESHOLD = protocolConfig.low_confidence_threshold;
  const VAGUE_SYMPTOMS = protocolConfig.vague_symptoms;
  
  if (!Array.isArray(VAGUE_SYMPTOMS)) {
    console.error('❌ [Rules Engine] vague_symptoms is not an array:', VAGUE_SYMPTOMS);
    throw new Error('Protocol configuration error: vague_symptoms must be an array');
  }
  
  console.log('⚙️ [Rules Engine] Using protocol config:', {
    critical_threshold: CRITICAL_CONFIDENCE_THRESHOLD,
    low_threshold: LOW_CONFIDENCE_THRESHOLD,
    vague_symptoms_count: VAGUE_SYMPTOMS.length,
    sentiment_boost: protocolConfig.enable_sentiment_boost
  });
  
  // ENHANCEMENT 1: AI Severity Override
  // If AI is very confident about critical severity, escalate immediately
  if (parsedResponse.severity === 'CRITICAL' && (parsedResponse.confidence || 0) > CRITICAL_CONFIDENCE_THRESHOLD) {
    console.log('🚨 [Rules Engine] AI detected CRITICAL severity with high confidence');
    return {
      action: 'FLAG' as const,
      flagType: 'AI_CRITICAL_ASSESSMENT',
      severity: 'CRITICAL',
      reason: `AI assessed as critical with ${Math.round((parsedResponse.confidence || 0) * 100)}% confidence`,
      followUp: []
    };
  }
  
  // ENHANCEMENT 2: Intent-based routing (configurable per protocol)
  if (protocolConfig.route_medication_questions_to_info && parsedResponse.intent === 'medication_question') {
    console.log('ℹ️ [Rules Engine] Medication question detected - routing to info');
    return {
      action: 'ASK_MORE' as const,
      questions: ['I can help with that. Can you tell me more about your medication question?'],
      reason: 'Routing to medication information'
    };
  }
  
  if (protocolConfig.route_general_questions_to_info && parsedResponse.intent === 'question') {
    console.log('ℹ️ [Rules Engine] General question detected - routing to info');
    return {
      action: 'ASK_MORE' as const,
      questions: ['I can help with that. Can you tell me more about your question?'],
      reason: 'Routing to appropriate information'
    };
  }
  
  // ENHANCEMENT 3: Low confidence + vague symptoms = clarify
  const hasVagueSymptom = (parsedResponse.symptoms || []).some(s => 
    VAGUE_SYMPTOMS.some((v: string) => s.toLowerCase().includes(v))
  );
  
  if ((parsedResponse.confidence || 1) < LOW_CONFIDENCE_THRESHOLD && hasVagueSymptom) {
    console.log('❓ [Rules Engine] Low confidence + vague symptoms - requesting clarification');
    return {
      action: 'ASK_MORE' as const,
      questions: generateClarifyingQuestions(parsedResponse, protocolAssignment.condition_code),
      reason: 'Need more specific information'
    };
  }
  
  // ENHANCEMENT 4: Evaluate red flags with enhanced matching
  const redFlags = rulesDSL.red_flags;
  
  if (!Array.isArray(redFlags)) {
    console.error('❌ [Rules Engine] red_flags is not an array:', redFlags);
    throw new Error('Protocol rules error: red_flags must be an array');
  }
  
  for (const rule of redFlags) {
    const ruleMatch = evaluateRuleCondition(rule.if, parsedResponse);
    if (ruleMatch.matched) {
      console.log('🎯 [Rules Engine] Rule matched:', rule.flag.type, 'Pattern:', ruleMatch.matchedPattern);
      
      // Validate rule has required fields
      if (!rule.flag.severity) {
        console.error('❌ [Rules Engine] Rule missing severity:', rule);
        throw new Error(`Protocol rule ${rule.flag.type} is missing severity field`);
      }
      
      if (!rule.flag.message) {
        console.error('❌ [Rules Engine] Rule missing message:', rule);
        throw new Error(`Protocol rule ${rule.flag.type} is missing message field`);
      }
      
      // ENHANCEMENT 5: Severity boost based on AI + sentiment (configurable)
      let finalSeverity = rule.flag.severity;
      if (protocolConfig.enable_sentiment_boost && 
          parsedResponse.severity === 'CRITICAL' && 
          parsedResponse.sentiment === 'distressed') {
        finalSeverity = protocolConfig.distressed_severity_upgrade;
        
        if (!finalSeverity) {
          console.error('❌ [Rules Engine] distressed_severity_upgrade is null');
          throw new Error('Protocol config missing distressed_severity_upgrade field');
        }
        
        console.log(`⬆️ [Rules Engine] Severity upgraded to ${finalSeverity.toUpperCase()} (AI + distressed sentiment)`);
      }
      
      return {
        action: 'FLAG' as const,
        flagType: rule.flag.type,
        severity: finalSeverity,
        reason: rule.flag.message,
        matchedPattern: ruleMatch.matchedPattern,
        ruleDescription: rule.flag.message,
        followUp: []
      };
    }
  }
  
  // Check closures (patient doing well)
  const closures = rulesDSL.closures;
  
  if (!Array.isArray(closures)) {
    console.error('❌ [Rules Engine] closures is not an array:', closures);
    throw new Error('Protocol rules error: closures must be an array');
  }
  for (const closure of closures) {
    const closureMatch = evaluateRuleCondition(closure.if, parsedResponse);
    if (closureMatch.matched) {
      console.log('✅ [Rules Engine] Patient doing well - closure condition met. Pattern:', closureMatch.matchedPattern);
      return {
        action: 'CLOSE' as const,
        reason: 'Patient is doing well',
        matchedPattern: closureMatch.matchedPattern
      };
    }
  }
  
  // Default to ask more questions (with empathy based on sentiment)
  const defaultQuestions = generateDefaultQuestions(parsedResponse, protocolAssignment.condition_code);
  return {
    action: 'ASK_MORE' as const,
    questions: defaultQuestions
  };
}

// Evaluate a single rule condition
function evaluateRuleCondition(condition: Record<string, unknown>, parsedResponse: any): { matched: boolean; matchedPattern?: string } {
  if (condition.any_text && Array.isArray(condition.any_text)) {
    // Priority order: normalized_text > extracted symptoms > raw input
    const normalizedText = parsedResponse.normalized_text?.toLowerCase() || '';
    const extractedSymptoms = (parsedResponse.symptoms || []).join(' ').toLowerCase();
    const inputText = parsedResponse.rawInput?.toLowerCase() || '';
    const combinedText = `${normalizedText} ${extractedSymptoms} ${inputText}`;
    
    // Check if any pattern matches and capture which one
    const matchedPattern = (condition.any_text as string[]).find((text: string) => 
      combinedText.includes(text.toLowerCase())
    );
    
    if (matchedPattern) {
      console.log('✅ [Rule Match] Pattern matched:', matchedPattern);
      return { matched: true, matchedPattern };
    }
    
    return { matched: false };
  }
  
  // Simple fallback for other condition types
  return { matched: false };
}

// Generate AI response with tool calling
async function generateAIResponseWithTools(
  parsedResponse: ParsedResponse, 
  protocolAssignment: ProtocolAssignmentWithRelations, 
  decisionHint: DecisionHint,
  patientId: string,
  episodeId: string,
  protocolConfig: any,
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
    
    
    
    // Build context from database-driven system prompt
    if (!protocolConfig.system_prompt) {
      console.error('❌ [Interaction] ProtocolConfig missing system_prompt:', {
        condition: protocolAssignment.condition_code,
        risk_level: protocolConfig.risk_level
      });
      throw new Error(`ProtocolConfig for ${protocolAssignment.condition_code} ${protocolConfig.risk_level} is missing system_prompt. Please configure in admin dashboard.`);
    }
    
    const fullContext = `${protocolConfig.system_prompt} ${conversationContext} Use the decision hint to guide your response and call appropriate tools.`;
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/models/openai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'generate_response_with_tools',
          input: {
            condition: protocolAssignment.condition_code,
            educationLevel: (protocolAssignment.Episode as Episode)?.Patient?.education_level,
            patientResponses: parsedResponse.rawInput,
            decisionHint: decisionHint,
            context: fullContext,
            responseType: 'patient_response_with_tools',
            isFirstMessageInCurrentChat: isFirstMessageInCurrentChat,
            hasBeenContactedBefore: hasBeenContactedBefore
          }
        })
      });

    if (!response.ok) {
      console.error('❌ [AI Generation] AI API returned error status:', response.status);
      throw new Error(`AI response generation failed: HTTP ${response.status}. Please try again.`);
    }

    const result = await response.json();
    
    console.log(`🤖 [AI Generation] Response received. Success: ${result.success}`);
    console.log(`🤖 [AI Generation] Tool calls:`, result.toolCalls || []);
    
    if (!result.success) {
      console.error('❌ [AI Generation] AI returned unsuccessful response:', result);
      throw new Error(`AI response generation failed: ${result.error || 'Unknown error'}`);
    }

    if (!result.response) {
      console.error('❌ [AI Generation] AI returned success but no response text');
      throw new Error('AI response generation failed: No response text returned');
    }

    return {
      response: result.response,
      toolCalls: result.toolCalls || []
    };

  } catch (error) {
    console.error('❌ [AI Generation] Error generating AI response with tools:', error);
    throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
      severity: severityStr.toUpperCase() as SeverityType,
      priority: getPriorityFromSeverity(severityStr.toUpperCase() as SeverityType),
      status: 'OPEN',
      sla_due_at: new Date(Date.now() + getSLAMinutesFromSeverity(severityStr.toUpperCase() as SeverityType) * 60 * 1000).toISOString(),
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
  
  if (!reason) {
    console.error('❌ [Handoff] Missing required parameter: reason');
    throw new Error('handoff_to_nurse requires reason parameter');
  }
  
  if (!flagType) {
    console.error('❌ [Handoff] Missing required parameter: flagType');
    throw new Error('handoff_to_nurse requires flagType parameter');
  }
  
  const reasonStr = String(reason);
  const flagTypeStr = String(flagType);
  
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

function extractSeverity(input: string): SeverityType {
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('severe') || lowerInput.includes('very bad') || lowerInput.includes('emergency')) return 'HIGH';
  if (lowerInput.includes('moderate') || lowerInput.includes('somewhat')) return 'MODERATE';
  if (lowerInput.includes('mild') || lowerInput.includes('slight')) return 'LOW';
  return 'MODERATE';
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

// Generate clarifying questions based on vague symptoms
function generateClarifyingQuestions(parsedResponse: any, condition: string): string[] {
  const questions: string[] = [];
  
  // If they mentioned discomfort but unclear what kind
  if (parsedResponse.symptoms?.some((s: string) => s.includes('discomfort'))) {
    questions.push("Can you be more specific about the discomfort? Is it more like pain, pressure, tightness, or something else?");
  }
  
  // If they said "off" or "weird"
  if (parsedResponse.symptoms?.some((s: string) => s.includes('off') || s.includes('weird'))) {
    questions.push("Can you describe what feels 'off'? Where do you feel it?");
  }
  
  // Condition-specific follow-ups
  if (condition === 'HF') {
    if (!questions.length) {
      questions.push("Can you tell me more about what you're experiencing? Is it related to breathing, swelling, or something else?");
    }
    questions.push("On a scale of 1-10, how severe is this feeling?");
  }
  
  if (condition === 'COPD') {
    questions.push("Is this affecting your breathing? Can you describe how?");
  }
  
  // Always ask for severity if we don't know
  if (!parsedResponse.painScore && questions.length < 2) {
    questions.push("How severe would you rate this on a scale of 1-10?");
  }
  
  return questions.slice(0, 3); // Max 3 questions at a time
}

// Generate default questions based on condition and sentiment
function generateDefaultQuestions(parsedResponse: any, condition: string): string[] {
  const sentiment = parsedResponse.sentiment || 'neutral';
  const questions: string[] = [];
  
  // Adjust empathy based on sentiment
  const prefix = sentiment === 'distressed' || sentiment === 'concerned' 
    ? "I understand you're concerned. " 
    : sentiment === 'positive' 
    ? "That's good to hear. " 
    : "";
  
  // Condition-specific questions
  if (condition === 'HF') {
    questions.push(`${prefix}How are you feeling today?`);
    questions.push("Have you noticed any changes in your breathing, swelling, or weight?");
  } else if (condition === 'COPD') {
    questions.push(`${prefix}How is your breathing today?`);
    questions.push("Have you needed to use your rescue inhaler more than usual?");
  } else if (condition === 'AMI') {
    questions.push(`${prefix}How are you feeling today?`);
    questions.push("Any chest discomfort, shortness of breath, or unusual fatigue?");
  } else if (condition === 'PNA') {
    questions.push(`${prefix}How are you feeling today?`);
    questions.push("How is your cough and breathing?");
  } else {
    questions.push(`${prefix}How are you feeling today?`);
    questions.push("Any new symptoms since we last talked?");
  }
  
  return questions;
}
