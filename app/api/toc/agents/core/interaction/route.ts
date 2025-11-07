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
  ConditionCodeType,
  EducationLevelType,
  InteractionStatusType,
  InteractionType,
  MessageType,
  TaskStatusType,
  TaskPriorityType,
  RuleTypeType,
  ActionType,
  VALID_SEVERITIES,
  VALID_RULE_TYPES,
  VALID_ACTION_TYPES,
  getSeverityFilterForRiskLevel,
  getPriorityFromSeverity,
  getSLAMinutesFromSeverity,
  isValidSeverity,
  isValidActionType
} from '@/lib/enums';
import { parseAndRespondDirect } from '@/app/api/toc/models/openai/route';
import { emitEvent } from '@/lib/inngest/client';

type SupabaseAdmin = SupabaseClient<Database>;

// Type definitions for the interaction system
// DecisionActionType: Internal decision actions used by rules engine
// Different from ActionType (database enum) which is what's stored in ProtocolContentPack
type DecisionActionType = 'FLAG' | 'ASK_MORE' | 'CLOSE';

type IntentType = 'symptom_report' | 'medication_question' | 'general' | 'question';
type SentimentType = 'distressed' | 'concerned' | 'neutral' | 'positive';

interface ParsedResponse {
  intent: IntentType;
  symptoms: string[];
  severity: SeverityType;
  questions: string[];
  sentiment: SentimentType;
  confidence: number;
  rawInput: string;
  normalized_text?: string;
  complications: string[];
  aiResponse?: string;
  coveredCategories?: string[]; // Health areas already discussed (from AI parser)
  wellnessConfirmationCount?: number; // Wellness confirmation count from parser
  newWellnessConfirmations?: string[]; // NEW confirmations in this message only
}

interface DecisionHint {
  action: DecisionActionType; // Internal decision action (FLAG, ASK_MORE, CLOSE)
  flagType?: string;
  severity?: SeverityType;
  reason?: string;
  matchedPattern?: string; // Which text pattern triggered the rule
  ruleDescription?: string; // Database description of the rule
  followUp?: string[];
  questions?: string[];
  messageGuidance?: string; // Explicit guidance for AI on how to respond
}

// Extended type for ProtocolAssignment with nested relationships
type ProtocolAssignmentWithRelations = ProtocolAssignment & {
  Episode?: {
    condition_code: ConditionCodeType;
    risk_level: RiskLevelType | null;
    medications?: any; // JSONB array of medications
    Patient?: {
      education_level: EducationLevelType | null;
    };
  };
};



interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
}

// Typed metadata structure for AgentInteraction.metadata JSONB field
interface InteractionMetadata {
  condition?: string;
  decisionHint?: DecisionHint;
  protocolAssignment?: string;
  wellnessConfirmationCount?: number;
  lastMessageAt?: string;
  messageCount?: number;
  lastConfirmedArea?: string | null;
  lastConfirmedAt?: string;
  [key: string]: unknown; // Index signature for JSONB compatibility
}

interface ToolResult {
  tool: string;
  parameters: Record<string, unknown>;
  result: {
    success: boolean;
    taskId?: string;
    followUpId?: string;
    checkinId?: string;
    newCount?: number;  // For wellness confirmation tracking (internal only)
    error?: string;
  };
}

// Message guidance templates for different severity levels
const MESSAGE_GUIDANCE = {
  CRITICAL: (matchedPattern: string, conditionCode: string, slaHours: number) => 
    `URGENT CLOSURE: Patient showed "${matchedPattern}". Acknowledge the symptom. Explain briefly why this needs immediate attention for ${conditionCode}. Tell them a nurse will call within ${slaHours} hours. Stay calm but clear about the urgency. This ends the interaction.`,
  
  HIGH: (matchedPattern: string, conditionCode: string) => 
    `CLOSURE MESSAGE: Patient showed "${matchedPattern}". Acknowledge the symptom calmly. Explain in 1 sentence why we monitor this for ${conditionCode}. Say "We're noting this and will follow up with you soon." DO NOT mention timeframes or "nurse will call" - keep it reassuring. This ends the interaction.`,
  
  MODERATE: (matchedPattern: string) => 
    `CLOSURE MESSAGE: Patient showed "${matchedPattern}". Acknowledge it gently. Say "Thank you for letting me know. We're keeping track of this." Keep it light and reassuring. This ends the interaction.`,
  
  LOW: (matchedPattern: string) => 
    `CLOSURE MESSAGE: Patient showed "${matchedPattern}". Acknowledge it gently. Say "Thank you for letting me know. We're keeping track of this." Keep it light and reassuring. This ends the interaction.`,
  
  DOING_WELL: () => 
    `⚠️ IMPORTANT: Patient says they're doing well, BUT this is NOT enough to close yet! You MUST ask at least 2-3 specific follow-up questions about DIFFERENT areas (symptoms, medications, concerns) before ending. Acknowledge their response positively ("Glad to hear!"), then immediately ask about a specific symptom relevant to their condition. Only after confirming multiple specific areas should you conclude.`
} as const;

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

    // 1. Load protocol assignment for this episode (should always exist via DB trigger)
    const protocolAssignment = await loadProtocolAssignment(episodeId, supabase);
    
    if (!protocolAssignment) {
      console.error('❌ [Interaction] CRITICAL: No protocol assignment found for episode:', episodeId);
      return NextResponse.json({
        error: `No protocol assignment found for episode ${episodeId}. This should never happen - protocol assignments are auto-created via database trigger. Please check the Episode has condition_code and risk_level set.`
      }, { status: 500 });
    }
    
    // Note: Protocol assignments are automatically kept in sync with Episode via database triggers
    // No need to check for staleness - trigger handles updates when Episode condition/risk changes

    // 2. Get conversation history and wellness confirmation count if continuing an existing interaction
    let conversationHistory: Array<{role: string, content: string}> = [];
    let wellnessConfirmationCount = 0;
    
    if (interactionId) {
      const { data: messages } = await supabase
        .from('AgentMessage')
        .select('role, content')
        .eq('agent_interaction_id', interactionId)
        .order('sequence_number', { ascending: true })
        .limit(10); // Last 10 messages for context
      
      conversationHistory = messages || [];
      console.log('💬 [Interaction] Loaded conversation history:', conversationHistory.length, 'messages');
      
      // Get wellness confirmation count from existing interaction
      const { data: existing } = await supabase
        .from('AgentInteraction')
        .select('metadata')
        .eq('id', interactionId)
        .single();
        
      const existingMetadata = existing?.metadata as InteractionMetadata;
      wellnessConfirmationCount = existingMetadata?.wellnessConfirmationCount || 0;
      console.log('📊 [Interaction] Current wellness confirmation count:', wellnessConfirmationCount);
    }
    
    // 3. Validate risk_level exists
    if (!protocolAssignment.risk_level) {
      console.error('❌ [Interaction] Episode missing risk_level:', {
        episodeId,
        condition: protocolAssignment.condition_code
      });
      return NextResponse.json(
        { error: `Episode ${episodeId} is missing risk_level. Please set the risk level (LOW/MEDIUM/HIGH) for this episode in the admin dashboard.` },
        { status: 400 }
      );
    }
    
    // 4. Load protocol configuration (AI decision parameters)
    const protocolConfig = await getProtocolConfig(
      protocolAssignment.condition_code,
      protocolAssignment.risk_level as RiskLevelType,
      supabase
    );
    
    // 4. Load protocol patterns for AI parsing
    const protocolRules = await getProtocolRules(
      protocolAssignment.condition_code,
      protocolAssignment.risk_level as RiskLevelType,
      supabase
    );
    
    // Extract all text patterns for AI to understand what to detect
    const allPatterns = [
      ...protocolRules.red_flags.flatMap((r: any) => r.if.any_text || []),
      ...protocolRules.closures.flatMap((c: any) => c.if.any_text || [])
    ];
    
    // Extract patterns that require numeric clarification
    const patternsWithNumbers = protocolRules.red_flags
      .filter((r: any) => r.flag.numeric_follow_up)
      .flatMap((r: any) => r.if.any_text || [])
      .filter((p: string) => !/\d/.test(p)); // Generic patterns without numbers
    
    // Extract checklist questions for AI to use as inspiration
    const checklistQuestions = [
      ...protocolRules.red_flags
        .filter((r: any) => r.flag.question_text)
        .map((r: any) => ({
          category: r.flag.question_category,
          question: r.flag.question_text,
          follow_up: r.flag.follow_up_question,
          is_critical: r.flag.is_critical
        })),
      ...protocolRules.closures
        .filter((c: any) => c.then.question_text)
        .map((c: any) => ({
          category: c.then.question_category,
          question: c.then.question_text,
          follow_up: c.then.follow_up_question,
          is_critical: c.then.is_critical
        }))
    ];
    
    // Extract symptom categories dynamically from database (grouped by question_category)
    const symptomCategories: Record<string, { patterns: string[], examples: string[] }> = {};
    
    // Process red flags
    protocolRules.red_flags.forEach((r: any) => {
      const category = r.flag.question_category;
      if (category) {
        if (!symptomCategories[category]) {
          symptomCategories[category] = { patterns: [], examples: [] };
        }
        // Add patterns from this rule
        if (r.if.any_text && Array.isArray(r.if.any_text)) {
          symptomCategories[category].patterns.push(...r.if.any_text);
        }
        // Use question_text as an example description
        if (r.flag.question_text && !symptomCategories[category].examples.includes(r.flag.question_text)) {
          symptomCategories[category].examples.push(r.flag.question_text);
        }
      }
    });
    
    // Process closures
    protocolRules.closures.forEach((c: any) => {
      const category = c.then.question_category;
      if (category) {
        if (!symptomCategories[category]) {
          symptomCategories[category] = { patterns: [], examples: [] };
        }
        // Add patterns from this rule
        if (c.if.any_text && Array.isArray(c.if.any_text)) {
          symptomCategories[category].patterns.push(...c.if.any_text);
        }
        // Use question_text as an example description
        if (c.then.question_text && !symptomCategories[category].examples.includes(c.then.question_text)) {
          symptomCategories[category].examples.push(c.then.question_text);
        }
      }
    });
    
    // Convert to array format for easier use in prompts
    const symptomCategoriesArray = Object.entries(symptomCategories).map(([category, data]) => ({
      category,
      patterns: [...new Set(data.patterns)], // Remove duplicates
      examples: data.examples
    }));
    
    // 6. Check if this patient has been contacted before and fetch summaries
    const { data: allInteractions } = await supabase
      .from('AgentInteraction')
      .select('id, started_at, status, summary') // Include summary for conversation context
      .eq('episode_id', episodeId)
      .order('started_at', { ascending: false })
      .limit(10);
    
    // Check if ANY previous interaction exists (including current IN_PROGRESS one)
    const hasBeenContactedBefore = (allInteractions?.length || 0) > 0;
    const isFirstMessageInCurrentChat = !interactionId; // No interactionId = brand new chat
    
    // Build previous interaction context from COMPLETED interactions with summaries
    const completedInteractions = (allInteractions || []).filter((i: any) => 
      i.status === 'COMPLETED' || i.status === 'ESCALATED'
    );
    
    const interactionsWithSummaries = completedInteractions.filter((i: any) => i.summary);
    const previousSummaries = interactionsWithSummaries
      .map((i: any) => `[${new Date(i.started_at).toLocaleDateString()}] ${i.summary}`)
      .join('\n');
    
    console.log('📞 [Interaction] Contact history:', {
      episodeId,
      totalInteractions: allInteractions?.length || 0,
      completedInteractions: completedInteractions.length,
      interactionsWithSummaries: interactionsWithSummaries.length,
      hasBeenContactedBefore,
      isFirstMessageInCurrentChat,
      hasSummaries: previousSummaries.length > 0,
      previousSummariesPreview: previousSummaries.substring(0, 300) + '...',
      currentInteractionId: interactionId
    });
    
    // 5. Combined parse and respond - runs both operations in sequence without HTTP overhead
    console.log('🚀 [Interaction] Running combined parse and respond');
    
    // First, we need to get the parsed response to evaluate decision hint
    // So we do a minimal parse first
    const parsedResponse = await parsePatientInputForDecisionHint(
      patientInput,
      protocolAssignment,
      conversationHistory,
      allPatterns,
      patternsWithNumbers,
      symptomCategoriesArray,
      wellnessConfirmationCount
    );
    
    // Evaluate rules DSL to get decision hint (using protocol config)
    const decisionHint = await evaluateRulesDSL(parsedResponse, protocolAssignment, protocolConfig, supabase, wellnessConfirmationCount);
    
    // Build conversation context
    let conversationContext: string;
    if (!hasBeenContactedBefore) {
      conversationContext = `This is your VERY FIRST contact with this patient since their hospital discharge for ${protocolAssignment.condition_code}. Introduce yourself warmly as their post-discharge care coordinator. Explain that you'll be checking in with them regularly during their recovery.`;
    } else if (isFirstMessageInCurrentChat) {
      const historyContext = previousSummaries ? `\n\nPREVIOUS INTERACTIONS:\n${previousSummaries}\n\nUse this context to reference past issues (e.g., "How's the weight gain going?" or "Any improvement with the swelling?")` : '';
      conversationContext = `This patient has been contacted before as part of their post-discharge care. This is a NEW follow-up check-in. Greet them warmly and ask how they've been doing since your last contact. DO NOT introduce yourself as if it's the first time - they know who you are.${historyContext}`;
    } else {
      conversationContext = `You are continuing an ONGOING conversation with this patient in their current check-in. Continue naturally from the previous messages.`;
    }
    
    const fullContext = `${protocolConfig.system_prompt} ${conversationContext} Use the decision hint to guide your response and call appropriate tools.`;
    
    // Get medications
    const medications = protocolAssignment.Episode?.medications;
    const medList = (medications || []) as any[];
    
    // Now call the combined parse and respond function DIRECTLY
    // Pass the already-parsed response to avoid duplicate parsing
    const combinedResult = await parseAndRespondDirect({
      condition: protocolAssignment.condition_code,
      educationLevel: protocolAssignment.Episode?.Patient?.education_level,
      patientInput: patientInput,
      conversationHistory: conversationHistory,
      protocolPatterns: allPatterns,
      patternsRequiringNumbers: patternsWithNumbers,
      symptomCategories: symptomCategoriesArray,
      medications: medList,
      decisionHint: decisionHint as any,
      context: fullContext,
      isFirstMessageInCurrentChat: isFirstMessageInCurrentChat,
      hasBeenContactedBefore: hasBeenContactedBefore,
      wellnessConfirmationCount: wellnessConfirmationCount,
      checklistQuestions: checklistQuestions,
      currentSeverityThreshold: protocolAssignment.risk_level,
      languageCode: protocolAssignment.Episode?.Patient?.language_code || undefined,
      parsedResponse: parsedResponse // Pass the already-parsed response
    });
    
    if (!combinedResult.success) {
      console.error('❌ [Interaction] Combined parse and respond failed:', combinedResult.error);
      throw new Error(`AI processing failed: ${combinedResult.error || 'Unknown error'}`);
    }
    
    if (!combinedResult.response) {
      console.error('❌ [Interaction] No response from combined operation');
      throw new Error('AI failed to generate response');
    }
    
    // Build aiResponse object from combined result
    const aiResponse = {
      response: combinedResult.response,
      toolCalls: combinedResult.toolCalls || [],
      parsed: combinedResult.parsed
    };
    
    // The AI naturally generates appropriate messages based on decisionHint:
    // - FLAG → Explains symptom concern + nurse callback
    // - ASK_MORE → Asks clarifying questions
    // - CLOSE → Positive reinforcement
    
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
          interaction_type: (interactionType === 'VOICE' ? 'VOICE_CALL' : 'SMS') as InteractionType,
          status: 'IN_PROGRESS' as InteractionStatusType,
          external_id: null,
          started_at: new Date().toISOString(),
          protocol_config_snapshot: protocolConfig as any, // Snapshot AI decision parameters - JSONB allows any
          protocol_rules_snapshot: protocolRules as any, // Snapshot all active rules - JSONB allows any
          protocol_snapshot_at: new Date().toISOString(),
          metadata: {
            condition,
            decisionHint: decisionHint,
            protocolAssignment: protocolAssignment?.id,
            wellnessConfirmationCount: 0 // Track how many times patient confirmed they're doing well
          } as any // JSONB field - InteractionMetadata structure documented above
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
          message_type: 'USER' as MessageType,
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
          message_type: 'ASSISTANT' as MessageType,
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

      // 7.5. Send AI response via SMS if interaction is via SMS/text channel
      // Check if this is an SMS-based interaction (not the AI Tester UI)
      const isSMSInteraction = interactionType === 'SMS' || interactionType === 'TEXT';
      
      if (isSMSInteraction) {
        console.log('📱 [Interaction] Sending AI response via SMS');
        
        // Get patient phone number
        const { data: patient } = await supabase
          .from('Patient')
          .select('primary_phone')
          .eq('id', patientId)
          .single();

        if (patient?.primary_phone) {
          // Emit event to send SMS via Inngest
          await emitEvent('notification/send', {
            recipientPatientId: patientId,
            notificationType: 'PATIENT_RESPONSE',
            channel: 'SMS',
            messageContent: aiResponse.response,
            episodeId: episodeId,
            metadata: {
              interactionId: activeInteractionId,
              messageSequence: nextSequence + 1,
            },
          });
          
          console.log('✅ [Interaction] SMS notification event emitted');
        } else {
          console.warn('⚠️ [Interaction] Patient has no phone number, cannot send SMS');
        }
      }

      // 8. Update interaction with message count (don't mark completed yet - ongoing conversation)
      const { data: allMessages } = await supabase
        .from('AgentMessage')
        .select('id')
        .eq('agent_interaction_id', activeInteractionId);
      
      // Validate interaction exists before updating
      if (!interaction) {
        console.error('❌ [Interaction] Cannot update metadata - interaction not found');
        throw new Error('Interaction not found - cannot update metadata');
      }
        
      const currentMetadata = (interaction.metadata as InteractionMetadata) || {};
      
      await supabase
        .from('AgentInteraction')
        .update({
          metadata: {
            ...currentMetadata,
            lastMessageAt: new Date().toISOString(),
            messageCount: allMessages?.length || 0
          } as any // JSONB field - InteractionMetadata structure
        })
        .eq('id', activeInteractionId);
    }

    // 9. Handle tool calls from AI response
    const toolResults = await handleToolCalls(aiResponse.toolCalls, patientId, episodeId, supabase, activeInteractionId, aiResponse.parsed?.newWellnessConfirmations);

    // 10. Check if interaction should end and generate summary
    // End when: escalation happens (handoff/raise_flag) OR patient is doing well (log_checkin)
    console.log('🔍 [Interaction] Checking if should end:', {
      decisionHintAction: decisionHint.action,
      toolCalls: aiResponse.toolCalls?.map((t: any) => t.name),
      activeInteractionId
    });
    
    const shouldEndInteraction = decisionHint.action === 'FLAG' || 
                                  decisionHint.action === 'CLOSE' ||
                                  aiResponse.toolCalls?.some((t: any) => 
                                    t.name === 'handoff_to_nurse' || 
                                    t.name === 'raise_flag' || 
                                    t.name === 'log_checkin'
                                  );
    
    console.log('🔍 [Interaction] Should end interaction?', shouldEndInteraction);
    
    if (shouldEndInteraction && activeInteractionId) {
      console.log('📝 [Interaction] Generating summary - interaction ending');
      
      try {
        // Generate AI summary of the conversation
        const summary = await generateInteractionSummary(
          activeInteractionId,
          patientInput,
          aiResponse.response,
          decisionHint,
          supabase
        );
        
        console.log('📝 [Interaction] Summary generated:', summary);
        
        // Determine final status based on action type
        let finalStatus: InteractionStatusType = 'COMPLETED';
        if (decisionHint.action === 'FLAG') {
          finalStatus = 'ESCALATED' as InteractionStatusType; // Any escalation (handoff or raise_flag)
        } else if (decisionHint.action === 'CLOSE') {
          finalStatus = 'COMPLETED' as InteractionStatusType; // Patient doing well
        }
        
        console.log('📝 [Interaction] Updating interaction to status:', finalStatus);
        
        // Update interaction with summary and status
        const { error: updateError } = await supabase
          .from('AgentInteraction')
          .update({
            status: finalStatus,
            summary: summary,
            completed_at: new Date().toISOString()
          })
          .eq('id', activeInteractionId);
        
        if (updateError) {
          console.error('❌ [Interaction] Failed to update interaction:', updateError);
        } else {
          console.log(`✅ [Interaction] Marked as ${finalStatus} with summary: "${summary.substring(0, 50)}..."`);
          
          // Emit checkin/completed event if this was a successful check-in
          if (finalStatus === 'COMPLETED') {
            try {
              await emitEvent('checkin/completed', {
                interactionId: activeInteractionId,
                episodeId,
                patientId,
                severity: parsedResponse.severity || 'NONE',
                wellnessConfirmationCount: wellnessConfirmationCount,
                completedAt: new Date().toISOString(),
              });
              console.log('📤 [Interaction] Event emitted: checkin/completed');
            } catch (eventError) {
              console.error('⚠️ [Interaction] Failed to emit checkin/completed event:', eventError);
            }
          }
        }
      } catch (summaryError) {
        console.error('❌ [Interaction] Error generating/saving summary:', summaryError);
        // Still try to mark as completed even if summary fails
        await supabase
          .from('AgentInteraction')
          .update({
            status: (decisionHint.action === 'FLAG' ? 'ESCALATED' : 'COMPLETED') as InteractionStatusType,
            summary: `Error generating summary: ${summaryError}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', activeInteractionId);
      }
    }

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
        medications,
        Patient!inner(education_level, language_code)
      )
    `)
    .eq('episode_id', episodeId)
    .eq('is_active', true)
    .maybeSingle(); // Use maybeSingle() instead of single() - returns null instead of error when 0 rows

  if (error) {
    console.error('❌ [Protocol Assignment] Database error loading assignment for episode:', episodeId, error);
    throw new Error(`Failed to load protocol assignment: ${error.message}`);
  }

  if (!assignment) {
    console.error('❌ [Protocol Assignment] CRITICAL: No active assignment found for episode:', episodeId);
    console.error('This should never happen - protocol assignments are auto-created via database trigger');
    return null; // Will be caught by caller and return 500 error
  }
  
  // Validate critical relationships exist
  if (!assignment.Episode) {
    console.error('❌ [Protocol Assignment] Episode data missing from assignment');
    throw new Error('Protocol assignment missing Episode relationship - data integrity issue');
  }
  
  if (!assignment.Episode.Patient) {
    console.error('❌ [Protocol Assignment] Patient data missing from Episode');
    throw new Error('Episode missing Patient relationship - data integrity issue');
  }

  console.log('✅ [Protocol Assignment] Loaded:', assignment.condition_code, assignment.risk_level);
  return assignment;
}

// Note: Protocol assignment creation is now handled by database trigger
// See migration: 20251101000003_ensure_protocol_assignments.sql
// This function has been removed as protocol assignments are auto-created

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
    vague_symptoms_count: config.vague_symptoms?.length || 0,
    multiple_symptom_escalation: config.enable_multiple_symptom_escalation,
    symptom_threshold: config.multiple_symptom_threshold,
    moderate_concern_escalation: config.enable_moderate_concern_escalation
  });

  return config;
}

// Query protocol rules from ProtocolContentPack based on condition and risk level
async function getProtocolRules(conditionCode: ConditionCode, riskLevel: RiskLevelType, supabase: SupabaseAdmin) {
  // Use the centralized severity filter from enums
  const severityFilter = getSeverityFilterForRiskLevel(riskLevel as RiskLevelType);

  // Query red flags and clarifications (now using proper columns, not JSONB!)
  const redFlagRuleTypes: RuleTypeType[] = ['RED_FLAG', 'CLARIFICATION'];
  const { data: ruleData, error: ruleError } = await supabase
    .from('ProtocolContentPack')
    .select('rule_code, text_patterns, action_type, severity, message, numeric_follow_up_question, question_text, follow_up_question, question_category, is_critical')
    .eq('condition_code', conditionCode)
    .in('rule_type', redFlagRuleTypes)
    .in('severity', severityFilter)
    .eq('active', true);

  if (ruleError) {
    console.error('❌ [Protocol Rules] Database error fetching red flags and clarifications:', ruleError);
    throw new Error(`Failed to load red flag and clarification rules: ${ruleError.message}`);
  }

  // Query closures
  const { data: closureData, error: closureError } = await supabase
    .from('ProtocolContentPack')
    .select('rule_code, text_patterns, action_type, message, question_text, follow_up_question, question_category, is_critical')
    .eq('condition_code', conditionCode)
    .eq('rule_type', 'CLOSURE' as RuleTypeType)
    .eq('active', true);

  if (closureError) {
    console.error('❌ [Protocol Rules] Database error fetching closures:', closureError);
    throw new Error(`Failed to load closure rules: ${closureError.message}`);
  }

  // Validate we got data back
  if (!ruleData) {
    console.error('❌ [Protocol Rules] Rule query returned null');
    throw new Error('Failed to load rules - database returned no data');
  }

  if (!closureData) {
    console.error('❌ [Protocol Rules] Closure query returned null');
    throw new Error('Failed to load closure rules - database returned no data');
  }

  // Transform to DSL format expected by evaluateRulesDSL
  const redFlags = ruleData.map(rule => {
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
        message: rule.message,
        numeric_follow_up: rule.numeric_follow_up_question,
        question_text: rule.question_text,
        follow_up_question: rule.follow_up_question,
        question_category: rule.question_category,
        is_critical: rule.is_critical,
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
        message: rule.message,
        question_text: rule.question_text,
        follow_up_question: rule.follow_up_question,
        question_category: rule.question_category,
        is_critical: rule.is_critical,
      }
    };
  });

  return {
    red_flags: redFlags,
    closures: closures
  };
}

// Minimal parse function for decision hint evaluation (no HTTP call)
async function parsePatientInputForDecisionHint(
  input: string,
  protocolAssignment: ProtocolAssignmentWithRelations,
  conversationHistory: Array<{role: string, content: string}> = [],
  protocolPatterns: string[] = [],
  patternsRequiringNumbers: string[] = [],
  symptomCategories: any[] = [],
  wellnessConfirmationCount: number = 0
): Promise<ParsedResponse> {
  // Import OpenAI and builders at function level to avoid circular dependencies
  const { default: OpenAI } = await import('openai');
  const { buildParseMessages } = await import('@/app/api/toc/models/openai/builders/parse-prompt-builder');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  console.log('🔍 [Decision Parser] Extracting structured symptom data');
  
  const parseMessages = buildParseMessages({
    condition: protocolAssignment.condition_code,
    protocolPatterns: protocolPatterns,
    patternsRequiringNumbers: patternsRequiringNumbers,
    symptomCategories: symptomCategories,
    conversationHistory: conversationHistory,
    patientInput: input,
    wellnessConfirmationCount: wellnessConfirmationCount
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Supports JSON mode, faster and cheaper than gpt-4
    messages: parseMessages as any,
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 300
  });

  const responseText = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(responseText);
  
  console.log('📊 [Decision Parser] Parsed:', parsed);
  
  if (!Array.isArray(parsed.symptoms)) {
    throw new Error('AI parser must return symptoms array (can be empty)');
  }
  
  if (parsed.confidence === undefined || parsed.confidence === null) {
    throw new Error('AI parser must return confidence score (0.0-1.0)');
  }
  
  return {
    ...parsed,
    rawInput: input,
    confidence: parsed.confidence
  };
}

// Evaluate rules DSL to get decision hint with AI insights
async function evaluateRulesDSL(
  parsedResponse: ParsedResponse, 
  protocolAssignment: ProtocolAssignment, 
  protocolConfig: any, // From ProtocolConfig table
  supabase: SupabaseAdmin,
  wellnessConfirmationCount: number = 0 // Number of times patient has specifically confirmed they're doing well
): Promise<DecisionHint> {
  console.log('🧠 [Rules Engine] Evaluating with AI insights:', {
    symptoms: parsedResponse.symptoms,
    severity: parsedResponse.severity,
    confidence: parsedResponse.confidence,
    intent: parsedResponse.intent,
    sentiment: parsedResponse.sentiment,
    wellnessConfirmationCount: wellnessConfirmationCount
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
    sentiment_boost: protocolConfig.enable_sentiment_boost,
    multiple_symptom_escalation: protocolConfig.enable_multiple_symptom_escalation,
    moderate_concern_escalation: protocolConfig.enable_moderate_concern_escalation
  });
  
  // ENHANCEMENT 1: AI Severity Override - CRITICAL
  // If AI is very confident about critical severity, escalate immediately
  // Note: confidence is validated in parser - guaranteed to exist
  if (parsedResponse.severity === 'CRITICAL' && parsedResponse.confidence > CRITICAL_CONFIDENCE_THRESHOLD) {
    console.log('🚨 [Rules Engine] AI detected CRITICAL severity with high confidence');
      return {
      action: 'FLAG' as const,
      flagType: 'AI_CRITICAL_ASSESSMENT',
      severity: 'CRITICAL',
      reason: `AI assessed as critical with ${Math.round(parsedResponse.confidence * 100)}% confidence. Symptoms: ${parsedResponse.symptoms.join(', ')}`,
      messageGuidance: 'CLOSURE MESSAGE: Acknowledge the critical symptoms detected. Explain briefly why this is concerning for their condition. Let them know a nurse will contact them urgently. Be calm but clear about the seriousness.',
      followUp: []
    };
  }
  
  // ENHANCEMENT 1.5: AI Severity Override - HIGH with good confidence
  // Safety net: If AI detects HIGH severity with decent confidence, flag it even without pattern match
  if (parsedResponse.severity === 'HIGH' && parsedResponse.confidence > LOW_CONFIDENCE_THRESHOLD) {
    console.log('⚠️ [Rules Engine] AI detected HIGH severity - escalating as safety net');
    return {
      action: 'FLAG' as const,
      flagType: 'AI_HIGH_SEVERITY_ASSESSMENT',
      severity: 'HIGH',
      reason: `AI identified concerning symptoms requiring follow-up: ${parsedResponse.symptoms.join(', ')}`,
      messageGuidance: 'CLOSURE MESSAGE: Acknowledge the symptoms. Explain that we want to follow up on this to ensure they\'re okay. Say "We\'re noting this and will follow up with you soon." Keep it reassuring.',
      followUp: []
    };
  }
  
  // ENHANCEMENT 1.75: Multiple concerning symptoms safety net (now data-driven)
  // If patient reports multiple symptoms AND moderate+ severity, escalate (if enabled)
  // Note: symptoms array is validated in parser - guaranteed to exist
  const symptomCount = parsedResponse.symptoms.length;
  const symptomThreshold = protocolConfig.multiple_symptom_threshold || 2;
  const hasMultipleSymptoms = symptomCount >= symptomThreshold;
  const hasConcerningSeverity = ['MODERATE', 'HIGH', 'CRITICAL'].includes(parsedResponse.severity);
  const hasConcernedSentiment = ['concerned', 'distressed'].includes(parsedResponse.sentiment);
  
  if (protocolConfig.enable_multiple_symptom_escalation && hasMultipleSymptoms && hasConcerningSeverity && parsedResponse.confidence > LOW_CONFIDENCE_THRESHOLD) {
    console.log(`⚠️ [Rules Engine] Multiple symptoms (${symptomCount}) + ${parsedResponse.severity} severity - escalating as configured`);
    return {
      action: 'FLAG' as const,
      flagType: 'MULTIPLE_SYMPTOMS_MODERATE',
      severity: hasConcernedSentiment ? 'HIGH' : 'MODERATE',
      reason: `Patient reported multiple concerning symptoms: ${parsedResponse.symptoms.join(', ')}`,
      messageGuidance: hasConcernedSentiment 
        ? 'CLOSURE MESSAGE: Acknowledge all the symptoms they mentioned. Explain that we want to follow up on these. Say "We\'re noting this and will follow up with you soon." Be reassuring.'
        : 'CLOSURE MESSAGE: Acknowledge the symptoms. Thank them for letting you know. Say "We\'re keeping track of this." Keep it light but attentive.',
      followUp: []
    };
  }
  
  // ENHANCEMENT 1.8: MODERATE severity with concerning sentiment (now data-driven)
  // If AI assesses MODERATE severity AND patient sounds concerned/distressed, flag it (if enabled)
  if (protocolConfig.enable_moderate_concern_escalation && parsedResponse.severity === 'MODERATE' && hasConcernedSentiment && parsedResponse.confidence > LOW_CONFIDENCE_THRESHOLD) {
    console.log(`⚠️ [Rules Engine] MODERATE severity + ${parsedResponse.sentiment} sentiment - escalating as configured`);
    const decisionHint = {
      action: 'FLAG' as const,
      flagType: 'MODERATE_WITH_CONCERN',
      severity: 'MODERATE' as const,
      reason: `Patient expressed concern about symptoms: ${parsedResponse.symptoms.join(', ')}`,
      messageGuidance: 'CLOSURE MESSAGE: Acknowledge their concerns. Thank them for letting you know. Say "We\'re noting this and will keep track of how you\'re doing." Be empathetic and reassuring.',
      followUp: []
    };
    console.log(`📋 [Rules Engine] DecisionHint severity: ${decisionHint.severity} (AI may choose different severity in tool call)`);
    return decisionHint;
  }
  
  // ENHANCEMENT 2: Intent-based routing (configurable per protocol)
  if (protocolConfig.route_medication_questions_to_info && parsedResponse.intent === 'medication_question') {
    console.log('ℹ️ [Rules Engine] Medication question detected - routing to info');
      return {
      action: 'ASK_MORE' as const,
      questions: ['I can help with that. Can you tell me more about your medication question?'],
      reason: 'Routing to medication information',
      messageGuidance: 'ASK_MORE: Patient has medication question. Ask helpful follow-up questions to understand their medication concern. Keep monitoring their overall condition too.'
    };
  }
  
  if (protocolConfig.route_general_questions_to_info && parsedResponse.intent === 'question') {
    console.log('ℹ️ [Rules Engine] General question detected - routing to info');
  return {
      action: 'ASK_MORE' as const,
      questions: ['I can help with that. Can you tell me more about your question?'],
      reason: 'Routing to appropriate information',
      messageGuidance: 'ASK_MORE: Patient has general question. Provide helpful information while continuing to monitor their health status.'
    };
  }
  
  // ENHANCEMENT 3: Low confidence + vague symptoms = clarify
  // Note: symptoms array is validated in parser - guaranteed to exist
  const hasVagueSymptom = parsedResponse.symptoms.some(s => 
    VAGUE_SYMPTOMS.some((v: string) => s.toLowerCase().includes(v))
  );
  
  if (parsedResponse.confidence < LOW_CONFIDENCE_THRESHOLD && hasVagueSymptom) {
    console.log('❓ [Rules Engine] Low confidence + vague symptoms - requesting clarification');
    return {
      action: 'ASK_MORE' as const,
      questions: [], // AI will generate appropriate clarifying questions based on context
      reason: 'Need more specific information - vague symptoms detected',
      messageGuidance: 'ASK_MORE: Patient used vague words (discomfort, off, tired). Ask specific clarifying questions to understand exactly what they\'re experiencing. Be empathetic but thorough.'
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
      
      // CRITICAL: Check if matched pattern requires a number but input doesn't have it
      const patternHasNumber = /\d/.test(ruleMatch.matchedPattern || '');
      const inputHasNumber = /\d/.test(parsedResponse.rawInput);
      const normalizedHasNumber = /\d/.test(parsedResponse.normalized_text || '');
      
      if (patternHasNumber && !inputHasNumber && !normalizedHasNumber) {
        console.log('❓ [Rules Engine] Pattern requires number but input lacks specifics');
        console.log('   Pattern:', ruleMatch.matchedPattern);
        console.log('   Input:', parsedResponse.rawInput);
        
        // Use database-driven numeric follow-up question if available
        const followUpQuestion = rule.flag.numeric_follow_up || 
          "Can you be more specific about the amount? This will help me understand how urgent this is.";
        
        return {
          action: 'ASK_MORE' as const,
          questions: [followUpQuestion],
          reason: 'Need specific numeric detail for accurate assessment',
          messageGuidance: 'ASK_MORE: Patient mentioned symptom but without specific amount. Focus ONLY on getting the number - don\'t ask about other symptoms yet. The amount determines urgency.'
        };
      }
      
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
      
      // Use message guidance template based on severity
      const messageGuidance = finalSeverity === 'CRITICAL' 
        ? MESSAGE_GUIDANCE.CRITICAL(ruleMatch.matchedPattern || '', protocolAssignment.condition_code, getSLAMinutesFromSeverity(finalSeverity) / 60)
        : finalSeverity === 'HIGH'
        ? MESSAGE_GUIDANCE.HIGH(ruleMatch.matchedPattern || '', protocolAssignment.condition_code)
        : finalSeverity === 'MODERATE'
        ? MESSAGE_GUIDANCE.MODERATE(ruleMatch.matchedPattern || '')
        : MESSAGE_GUIDANCE.LOW(ruleMatch.matchedPattern || '');
      
      // Map database ActionType to internal DecisionActionType
      // Database: HANDOFF_TO_NURSE | RAISE_FLAG | ASK_MORE | LOG_CHECKIN
      // Internal: FLAG | ASK_MORE | CLOSE
      let decisionAction: DecisionActionType;
      if (rule.flag.action === 'HANDOFF_TO_NURSE' || rule.flag.action === 'RAISE_FLAG') {
        decisionAction = 'FLAG'; // Both escalations map to FLAG
      } else if (rule.flag.action === 'ASK_MORE') {
        decisionAction = 'ASK_MORE'; // Direct mapping
      } else if (rule.flag.action === 'LOG_CHECKIN') {
        decisionAction = 'CLOSE'; // Closure maps to CLOSE
      } else {
        console.warn(`⚠️ [Rules Engine] Unknown action_type: ${rule.flag.action}, defaulting to FLAG`);
        decisionAction = 'FLAG';
      }

      return {
        action: decisionAction,
        flagType: rule.flag.type,
        severity: finalSeverity,
        reason: rule.flag.message,
        matchedPattern: ruleMatch.matchedPattern,
        ruleDescription: rule.flag.message,
        messageGuidance: messageGuidance,
        followUp: decisionAction === 'ASK_MORE' ? [rule.flag.numeric_follow_up || 'Can you tell me more about that?'] : []
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
      // Check wellness confirmation count (tracked by AI via count_wellness_confirmation tool)
      // After 3+ confirmations, we can safely close
      if (wellnessConfirmationCount >= 3) {
        console.log('✅ [Rules Engine] Patient consistently reports doing well after', wellnessConfirmationCount, 'specific confirmations - safe to close. Pattern:', closureMatch.matchedPattern);
        return {
          action: 'CLOSE' as const,
          reason: 'Patient is doing well - verified with 3+ specific confirmations',
          matchedPattern: closureMatch.matchedPattern,
          messageGuidance: 'CLOSURE MESSAGE: Patient has confirmed they are doing well through multiple specific health questions (breathing, medications, symptoms). Provide brief positive encouragement and remind them to reach out if anything changes. This ends the interaction on a positive note.'
        };
      }
      
      console.log('✅ [Rules Engine] Patient says doing well but only', wellnessConfirmationCount, '/3 confirmations so far - need to verify with more specific questions. Pattern:', closureMatch.matchedPattern);
      // DON'T CLOSE YET - Patient saying "fine" is not enough. Ask specific questions first.
      return {
        action: 'ASK_MORE' as const,
        reason: `Patient reports feeling well - verifying with specific questions (${wellnessConfirmationCount}/3 confirmations)`,
        matchedPattern: closureMatch.matchedPattern,
        messageGuidance: MESSAGE_GUIDANCE.DOING_WELL()
      };
    }
  }
  
  // Default to ask more questions
  // Let AI generate appropriate questions based on system prompt - no hardcoded defaults!
  return {
    action: 'ASK_MORE' as const,
    questions: [], // AI will generate based on system prompt and decisionHint
    reason: 'No red flags detected yet - ask open-ended questions',
    messageGuidance: 'ASK_MORE: No red flags detected yet. Ask open-ended questions to check on their condition. Monitor for key symptoms based on your system prompt. Be conversational and supportive.'
  };
}

// Helper function to check if a pattern is negated in the text
function isPatternNegated(text: string, pattern: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  
  // Find the position of the pattern
  const patternIndex = lowerText.indexOf(lowerPattern);
  if (patternIndex === -1) return false;
  
  // Look at the 5 words before the pattern for negation words
  const beforeText = lowerText.substring(Math.max(0, patternIndex - 50), patternIndex);
  
  // Common negation patterns
  const negationWords = ['no', 'not', 'never', 'none', 'without', "don't", "doesnt", "didn't", "havent", "hasn't", "won't", "cant", "can\'t"];
  
  // Check if any negation word appears right before the pattern (within ~5 words)
  for (const negation of negationWords) {
    // Use word boundaries to avoid false matches (e.g., "now" containing "no")
    const negationRegex = new RegExp(`\\b${negation}\\b`, 'i');
    if (negationRegex.test(beforeText)) {
      // Additional check: make sure negation is close (not separated by sentence boundaries)
      const textBetween = beforeText.substring(beforeText.lastIndexOf(negation));
      // If there's a period or question mark between negation and pattern, it's likely a different sentence
      if (!/[.?!]/.test(textBetween)) {
        console.log(`🚫 [Rule Match] Pattern "${pattern}" is NEGATED by "${negation}" in context: "${beforeText}${lowerPattern}"`);
        return true;
      }
    }
  }
  
  return false;
}

// Evaluate a single rule condition
function evaluateRuleCondition(condition: Record<string, unknown>, parsedResponse: any): { matched: boolean; matchedPattern?: string } {
  if (condition.any_text && Array.isArray(condition.any_text)) {
    // Priority order: normalized_text > extracted symptoms > raw input
    // Note: symptoms array validated in parser - guaranteed to exist
    const normalizedText = parsedResponse.normalized_text?.toLowerCase() || '';
    const extractedSymptoms = parsedResponse.symptoms.join(' ').toLowerCase();
    const inputText = parsedResponse.rawInput?.toLowerCase() || '';
    const combinedText = `${normalizedText} ${extractedSymptoms} ${inputText}`;
    
    // Check if any pattern matches and capture which one
    const matchedPattern = (condition.any_text as string[]).find((text: string) => {
      const patternLower = text.toLowerCase();
      
      // First check if pattern exists
      if (!combinedText.includes(patternLower)) {
        return false;
      }
      
      // Then check if it's negated
      if (isPatternNegated(combinedText, text)) {
        console.log(`⏭️  [Rule Match] Skipping pattern "${text}" - negated by patient`);
        return false;
      }
      
      return true;
    });
    
    if (matchedPattern) {
      console.log('✅ [Rule Match] Pattern matched:', matchedPattern);
      return { matched: true, matchedPattern };
    }
    
    return { matched: false };
  }
  
  // Simple fallback for other condition types
  return { matched: false };
}

// Handle tool calls from AI response
async function handleToolCalls(toolCalls: ToolCall[] | undefined, patientId: string, episodeId: string, supabase: SupabaseAdmin, interactionId?: string, newWellnessConfirmations?: string[]): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  
  if (!toolCalls || toolCalls.length === 0) {
    return results;
  }
  
  for (const toolCall of toolCalls) {
    try {
      let result;
      
      switch (toolCall.name) {
        case 'count_wellness_confirmation':
          result = await handleWellnessConfirmation(toolCall.parameters, interactionId, supabase, newWellnessConfirmations);
          break;
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
// Handle wellness confirmation counting
async function handleWellnessConfirmation(parameters: Record<string, unknown>, interactionId?: string, supabase?: SupabaseAdmin, newWellnessConfirmations?: string[]) {
  const { isConfirmation, areaConfirmed } = parameters;
  
  if (!interactionId || !supabase) {
    console.log('📊 [Wellness Confirmation] No interaction ID - skipping count update');
    return { success: true };
  }
  
  // Get current interaction
  const { data: interaction, error: fetchError } = await supabase
    .from('AgentInteraction')
    .select('metadata')
    .eq('id', interactionId)
    .single();
    
  if (fetchError || !interaction) {
    console.error('❌ [Wellness Confirmation] Error fetching interaction:', fetchError);
    return { success: false, error: 'Could not fetch interaction' };
  }
  
  const metadata = (interaction.metadata as InteractionMetadata) || {};
  const currentCount = metadata.wellnessConfirmationCount || 0;
  
  // If we have newWellnessConfirmations from the parser, use that count
  // Otherwise fall back to the tool's isConfirmation parameter
  let countToAdd = 0;
  
  if (newWellnessConfirmations && newWellnessConfirmations.length > 0) {
    // Use the parser's newWellnessConfirmations array for accurate counting
    countToAdd = newWellnessConfirmations.length;
    console.log(`📊 [Wellness Confirmation] Multiple confirmations detected: ${newWellnessConfirmations.join(', ')} (${countToAdd} areas)`);
  } else if (isConfirmation) {
    // Fall back to single confirmation from tool call
    countToAdd = 1;
  }
  
  if (countToAdd > 0) {
    const newCount = currentCount + countToAdd;
    const areas = newWellnessConfirmations?.join(', ') || areaConfirmed || 'unspecified';
    console.log(`📊 [Wellness Confirmation] Incrementing count: ${currentCount} + ${countToAdd} = ${newCount}. Areas: ${areas}`);
    
    // Update metadata
    const { error: updateError } = await supabase
      .from('AgentInteraction')
      .update({
        metadata: {
          ...metadata,
          wellnessConfirmationCount: newCount,
          lastConfirmedArea: areas,
          lastConfirmedAt: new Date().toISOString()
        } as any // JSONB field - InteractionMetadata structure
      })
      .eq('id', interactionId);
      
    if (updateError) {
      console.error('❌ [Wellness Confirmation] Error updating metadata:', updateError);
      return { success: false, error: 'Could not update count' };
    }
    
    return { 
      success: true, 
      newCount: newCount
    };
  } else {
    console.log(`📊 [Wellness Confirmation] Response does NOT count as confirmation. Current count remains: ${currentCount}/3`);
    return { 
      success: true, 
      newCount: currentCount
    };
  }
}

async function handleRaiseFlag(parameters: Record<string, unknown>, patientId: string, episodeId: string, supabase: SupabaseAdmin, interactionId?: string) {
  const { flagType, severity, rationale } = parameters;
  const severityStr = String(severity);
  const flagTypeStr = String(flagType);
  
  console.log(`🚩 [RaiseFlag] Tool call parameters:`, {
    flagType: flagTypeStr,
    severity: severityStr,
    rationale: rationale || 'none',
    interactionId
  });
  
  // Validate interactionId is present (required for cascade delete)
  if (!interactionId) {
    console.error('❌ [RaiseFlag] Missing interactionId - cannot create task without interaction context');
    throw new Error('interactionId is required to create EscalationTask (needed for cascade delete)');
  }
  
  // Create escalation task
  const { data: task, error } = await supabase
    .from('EscalationTask')
    .insert({
      episode_id: episodeId,
      agent_interaction_id: interactionId, // Required - no null allowed
      reason_codes: [flagTypeStr],
      severity: severityStr.toUpperCase() as SeverityType,
      priority: getPriorityFromSeverity(severityStr.toUpperCase() as SeverityType),
      status: 'OPEN' as TaskStatusType,
      sla_due_at: new Date(Date.now() + getSLAMinutesFromSeverity(severityStr.toUpperCase() as SeverityType) * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [RaiseFlag] Error creating escalation task:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ [RaiseFlag] Task created:', task.id, 'linked to interaction:', interactionId);
  
  // Emit task/created event for Inngest workflows
  try {
    await emitEvent('task/created', {
      taskId: task.id,
      episodeId,
      patientId,
      priority: task.priority,
      severity: task.severity,
      reasonCodes: task.reason_codes || [],
      actionType: flagTypeStr,
      slaMinutes: getSLAMinutesFromSeverity(task.severity),
      createdAt: task.created_at || new Date().toISOString(),
    });
    console.log('📤 [RaiseFlag] Event emitted: task/created');
  } catch (eventError) {
    console.error('⚠️ [RaiseFlag] Failed to emit task/created event:', eventError);
    // Don't fail the request if event emission fails
  }
  
  // Check if risk level upgrade is needed based on severity
  try {
    await checkAndUpgradeRiskLevel(
      episodeId, 
      patientId,
      severityStr.toUpperCase() as SeverityType, 
      flagTypeStr,
      String(rationale || ''),
      supabase
    );
  } catch (upgradeError) {
    console.error('⚠️ [RaiseFlag] Failed to check/upgrade risk level:', upgradeError);
    // Don't fail the request if upgrade check fails
  }
  
  return { success: true, taskId: task.id };
}

// Check if episode risk level needs upgrading based on flag severity
async function checkAndUpgradeRiskLevel(
  episodeId: string,
  patientId: string,
  severity: SeverityType,
  flagType: string,
  rationale: string,
  supabase: SupabaseAdmin
) {
  // Fetch current episode risk level
  const { data: episode, error: episodeError } = await supabase
    .from('Episode')
    .select('risk_level')
    .eq('id', episodeId)
    .single();

  if (episodeError || !episode) {
    console.error('❌ [RiskUpgrade] Failed to fetch episode:', episodeError);
    return;
  }

  const currentRiskLevel = episode.risk_level as RiskLevelType;
  let newRiskLevel: RiskLevelType | null = null;

  // Determine if upgrade is needed based on severity
  // Rule: Always upgrade, never downgrade (downgrade is manual only)
  if (severity === 'CRITICAL') {
    // CRITICAL always upgrades to HIGH (most intensive monitoring)
    if (currentRiskLevel === 'LOW' || currentRiskLevel === 'MEDIUM') {
      newRiskLevel = 'HIGH';
    }
  } else if (severity === 'HIGH') {
    // HIGH severity upgrades LOW to MEDIUM
    if (currentRiskLevel === 'LOW') {
      newRiskLevel = 'MEDIUM';
    }
  }
  // MODERATE and LOW severities don't trigger auto-upgrades

  // If no upgrade needed, exit early
  if (!newRiskLevel) {
    console.log(`ℹ️ [RiskUpgrade] No upgrade needed. Current: ${currentRiskLevel}, Severity: ${severity}`);
    return;
  }

  console.log(`⬆️ [RiskUpgrade] Upgrading episode ${episodeId} from ${currentRiskLevel} to ${newRiskLevel} due to ${severity} severity flag`);

  // Perform the upgrade
  await upgradeEpisodeRiskLevel(
    episodeId,
    patientId,
    currentRiskLevel,
    newRiskLevel,
    `Auto-upgraded due to ${severity} severity flag: ${flagType}. ${rationale}`,
    supabase
  );
}

// Upgrade episode risk level and emit event for cascade effects
async function upgradeEpisodeRiskLevel(
  episodeId: string,
  patientId: string,
  oldRiskLevel: RiskLevelType,
  newRiskLevel: RiskLevelType,
  reason: string,
  supabase: SupabaseAdmin
) {
  const timestamp = new Date().toISOString();

  // Update episode risk level
  const { error: updateError } = await supabase
    .from('Episode')
    .update({
      risk_level: newRiskLevel,
      updated_at: timestamp
    })
    .eq('id', episodeId);

  if (updateError) {
    console.error('❌ [RiskUpgrade] Failed to update episode risk level:', updateError);
    throw new Error(`Failed to upgrade risk level: ${updateError.message}`);
  }

  console.log(`✅ [RiskUpgrade] Episode ${episodeId} risk level updated: ${oldRiskLevel} → ${newRiskLevel}`);

  // Log audit trail in AgentInteraction notes or create a system message
  // For now, we'll emit an event and let Inngest handle detailed logging
  
  // Emit episode/risk-upgraded event for Inngest workflows
  try {
    await emitEvent('episode/risk-upgraded', {
      episodeId,
      patientId,
      oldRiskLevel,
      newRiskLevel,
      reason,
      upgradedAt: timestamp,
      upgradedBy: 'SYSTEM_AUTO', // Indicates automatic upgrade
    });
    console.log(`📤 [RiskUpgrade] Event emitted: episode/risk-upgraded (${oldRiskLevel} → ${newRiskLevel})`);
  } catch (eventError) {
    console.error('⚠️ [RiskUpgrade] Failed to emit episode/risk-upgraded event:', eventError);
    // Don't fail the upgrade if event emission fails
  }
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
  
  if (!interactionId) {
    console.error('❌ [Handoff] Missing interactionId - cannot create task without interaction context');
    throw new Error('interactionId is required to create EscalationTask (needed for cascade delete)');
  }
  
  const reasonStr = String(reason);
  const flagTypeStr = String(flagType);
  
  // Create high-priority escalation task
  const { data: task, error } = await supabase
    .from('EscalationTask')
    .insert({
      episode_id: episodeId,
      agent_interaction_id: interactionId, // Required - no null allowed
      reason_codes: [flagTypeStr, reasonStr],
      severity: 'CRITICAL' as SeverityType,
      priority: 'URGENT' as TaskPriorityType,
      status: 'OPEN' as TaskStatusType,
      sla_due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [Handoff] Error creating nurse handoff task:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ [Handoff] Escalation task created:', task.id, 'linked to interaction:', interactionId);
  
  // Emit task/created event for Inngest workflows
  try {
    await emitEvent('task/created', {
      taskId: task.id,
      episodeId,
      patientId,
      priority: task.priority,
      severity: task.severity,
      reasonCodes: task.reason_codes || [],
      actionType: 'HANDOFF_TO_NURSE',
      slaMinutes: 30, // 30 minutes for handoffs
      createdAt: task.created_at || new Date().toISOString(),
    });
    console.log('📤 [Handoff] Event emitted: task/created');
  } catch (eventError) {
    console.error('⚠️ [Handoff] Failed to emit task/created event:', eventError);
    // Don't fail the request if event emission fails
  }
  
  return { success: true, taskId: task.id };
}



// Generate AI summary of interaction for future context
async function generateInteractionSummary(
  interactionId: string,
  lastPatientMessage: string,
  lastAIResponse: string,
  decisionHint: DecisionHint,
  supabase: SupabaseAdmin
): Promise<string> {
  try {
    // Fetch all messages from this interaction
    const { data: messages } = await supabase
      .from('AgentMessage')
      .select('role, content')
      .eq('agent_interaction_id', interactionId)
      .order('sequence_number', { ascending: true });
    
    if (!messages || messages.length === 0) {
      return `Patient contacted. ${decisionHint.action === 'FLAG' ? `Escalated: ${decisionHint.reason}` : 'Routine check-in completed.'}`;
    }

    // Generate summary using AI
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/models/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'generate_summary',
        input: {
          messages: [
            {
              role: 'system',
              content: `You are summarizing a patient interaction. Write ONLY a 2-3 sentence clinical summary. DO NOT give advice or instructions.

Format: "Patient reported [symptoms]. [What happened/action taken]."

Conversation:
${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Outcome: ${decisionHint.action === 'FLAG' ? `Escalated - ${decisionHint.reason}` : decisionHint.action === 'CLOSE' ? 'Patient doing well' : 'Ongoing monitoring'}

Write the summary now (2-3 sentences only):`
            }
          ]
        },
        options: {
          temperature: 0.3,
          max_tokens: 150
        }
      })
    });

    const result = await response.json();
    console.log('📝 [Summary] Raw API response:', result);
    
    if (!result.summary) {
      throw new Error('Summary generation returned empty response');
    }
    
    return result.summary;
  } catch (error) {
    console.error('Failed to generate summary:', error);
    throw new Error(`Failed to generate interaction summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
