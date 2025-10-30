import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Database } from '@/database.types';
import { AgentInteraction, ProtocolContentPack } from '@/types';

type ConditionCode = Database['public']['Enums']['condition_code'];
type RiskLevel = Database['public']['Enums']['risk_level'];

interface ConversationState {
  phase: 'greeting' | 'symptom_check' | 'follow_up' | 'closing';
  currentPosition: number;
  checklistProgress: Record<string, {
    asked: boolean;
    answered: boolean;
    answerText?: string;
    updatedAt: string;
  }>;
  wellnessConfirmations: number;
  redFlagsDetected: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { 
      interactionId, 
      patientInput, 
      conditionCode, 
      riskLevel,
      episodeId 
    } = await request.json();

    if (!interactionId || !conditionCode || !riskLevel) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Get current conversation state
    const conversationState = await getConversationState(interactionId, supabase);
    
    // 2. Get current question from ProtocolContentPack
    const currentQuestion = await getCurrentQuestion(
      conditionCode as ConditionCode,
      riskLevel as RiskLevel,
      conversationState.currentPosition,
      supabase
    );
    
    // 3. Parse patient input for symptoms/red flags
    const parsedInput = await parsePatientInput(patientInput, conditionCode, riskLevel);
    
    // 4. Update conversation state based on patient response
    await updateConversationState(interactionId, conversationState, parsedInput, currentQuestion, supabase);
    
    // 5. Make decision on next action
    const decision = await makeConversationDecision(
      conversationState,
      parsedInput,
      conditionCode as ConditionCode,
      riskLevel as RiskLevel,
      supabase
    );
    
    // 6. Generate appropriate response
    const response = await generateStructuredResponse(decision, conversationState, parsedInput);

    return NextResponse.json({
      success: true,
      decision,
      response,
      conversationState: {
        phase: conversationState.phase,
        currentPosition: conversationState.currentPosition,
        wellnessConfirmations: conversationState.wellnessConfirmations,
        redFlagsDetected: conversationState.redFlagsDetected
      }
    });

  } catch (error) {
    console.error('❌ Conversation checklist error:', error);
    return NextResponse.json(
      { error: 'Conversation checklist failed' },
      { status: 500 }
    );
  }
}

async function getConversationState(interactionId: string, supabase: any): Promise<ConversationState> {
  const { data: interaction } = await supabase
    .from('AgentInteraction')
    .select('current_checklist_position, checklist_progress, conversation_phase, metadata')
    .eq('id', interactionId)
    .single();

  if (!interaction) {
    throw new Error('Interaction not found');
  }

  const metadata = interaction.metadata || {};
  
  return {
    phase: interaction.conversation_phase || 'greeting',
    currentPosition: interaction.current_checklist_position || 1,
    checklistProgress: interaction.checklist_progress || {},
    wellnessConfirmations: metadata.wellnessConfirmationCount || 0,
    redFlagsDetected: metadata.redFlagsDetected || []
  };
}

async function getCurrentQuestion(
  conditionCode: ConditionCode,
  riskLevel: RiskLevel,
  position: number,
  supabase: any
): Promise<ProtocolContentPack | null> {
  // Get all questions and sort by rule_code to maintain consistent ordering
  const { data: questions } = await supabase
    .from('ProtocolContentPack')
    .select('*')
    .eq('condition_code', conditionCode)
    .eq('rule_type', 'CLARIFICATION')
    .eq('active', true)
    .order('rule_code');

  const question = questions?.[position] || null;

  return question;
}

async function parsePatientInput(input: string, conditionCode: string, riskLevel: string) {
  // This would call the existing parse_patient_input endpoint
  // For now, return a simplified structure
  return {
    symptoms: [],
    severity: 'NONE',
    intent: 'general',
    sentiment: 'neutral',
    confidence: 0.8,
    normalizedText: input
  };
}

async function updateConversationState(
  interactionId: string,
  state: ConversationState,
  parsedInput: any,
  currentQuestion: ProtocolContentPack | null,
  supabase: any
) {
  // Update wellness confirmations if patient gave positive response
  if (parsedInput.sentiment === 'positive' && parsedInput.intent === 'general') {
    state.wellnessConfirmations += 1;
  }

  // Update checklist progress for current question
  if (currentQuestion && currentQuestion.question_category) {
    state.checklistProgress[currentQuestion.question_category] = {
      asked: true,
      answered: true,
      answerText: parsedInput.normalizedText,
      updatedAt: new Date().toISOString()
    };
  }

  // Update database
  await supabase
    .from('AgentInteraction')
    .update({
      current_checklist_position: state.currentPosition,
      checklist_progress: state.checklistProgress,
      conversation_phase: state.phase,
      metadata: {
        wellnessConfirmationCount: state.wellnessConfirmations,
        redFlagsDetected: state.redFlagsDetected
      }
    })
    .eq('id', interactionId);
}

async function makeConversationDecision(
  state: ConversationState,
  parsedInput: any,
  conditionCode: ConditionCode,
  riskLevel: RiskLevel,
  supabase: any
) {
  
  // Check for red flags first
  if (parsedInput.severity === 'CRITICAL' || parsedInput.severity === 'HIGH') {
    return {
      action: 'escalate',
      reason: 'Critical or high severity symptoms detected',
      message: 'I need to connect you with a nurse right away. Please hold on.'
    };
  }

  // Check if we should close the conversation
  if (state.wellnessConfirmations >= 3 && state.phase === 'symptom_check') {
    const allCriticalAnswered = await checkAllCriticalQuestionsAnswered(
      conditionCode, 
      riskLevel, 
      state.checklistProgress, 
      supabase
    );
    
    if (allCriticalAnswered) {
      return {
        action: 'close',
        reason: 'Patient doing well and all critical questions answered',
        message: 'Thank you for the update! You\'re doing great. Please reach out if anything changes.',
        nextPhase: 'closing'
      };
    }
  }

  // Get next question in checklist
  const nextQuestion = await getNextQuestion(conditionCode, riskLevel, state.currentPosition, supabase);
  
  if (nextQuestion) {
    return {
      action: 'ask_question',
      question: nextQuestion,
      reason: `Asking question in checklist`,
      nextPhase: 'symptom_check'
    };
  }

  // If no more questions, check if we can close
  if (state.wellnessConfirmations >= 2) {
    return {
      action: 'close',
      reason: 'All questions asked and patient doing well',
      message: 'Thank you for the update! You\'re doing well. Please reach out if anything changes.',
      nextPhase: 'closing'
    };
  }

  // Default to asking follow-up questions
  return {
    action: 'follow_up',
    reason: 'Need more information to complete assessment',
    message: 'Can you tell me more about how you\'re feeling?'
  };
}

async function getNextQuestion(
  conditionCode: ConditionCode,
  riskLevel: RiskLevel,
  currentPosition: number,
  supabase: any
): Promise<ProtocolContentPack | null> {
  // Get all questions and sort by rule_code to maintain consistent ordering
  const { data: questions } = await supabase
    .from('ProtocolContentPack')
    .select('*')
    .eq('condition_code', conditionCode)
    .eq('rule_type', 'CLARIFICATION')
    .eq('active', true)
    .order('rule_code');

  const question = questions?.[currentPosition] || null;

  return question;
}

async function checkAllCriticalQuestionsAnswered(
  conditionCode: ConditionCode,
  riskLevel: RiskLevel,
  checklistProgress: Record<string, any>,
  supabase: any
): Promise<boolean> {
  const { data: criticalQuestions } = await supabase
    .from('ProtocolContentPack')
    .select('question_category')
    .eq('condition_code', conditionCode)
    .eq('rule_type', 'CLARIFICATION')
    .eq('is_critical', true)
    .eq('active', true);

  if (!criticalQuestions) return false;

  return criticalQuestions.every((q: any) => 
    checklistProgress[q.question_category]?.answered === true
  );
}

async function generateStructuredResponse(
  decision: any,
  state: ConversationState,
  parsedInput: any
): Promise<string> {
  // This would generate the actual response text
  // For now, return a simple message
  if (decision.action === 'ask_question' && decision.question) {
    return decision.question.question_text;
  }
  
  if (decision.message) {
    return decision.message;
  }
  
  return 'How are you feeling today?';
}
