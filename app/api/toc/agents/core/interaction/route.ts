import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { 
  ProtocolAssignment, 
  Episode, 
  OutreachResponse, 
  OutreachResponseInsert,
  EscalationTask,
  EscalationTaskInsert
} from '@/types';

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

    // 1. Load protocol assignment for this episode (optional for testing)
    const protocolAssignment = await loadProtocolAssignment(episodeId, supabase);
    
    if (!protocolAssignment) {
      console.log('No protocol assignment found - running in test mode without protocols');
    }

    // 2. Parse the patient input using LLM (with or without protocol context)
    const parsedResponse = await parsePatientInputWithProtocol(patientInput, protocolAssignment);
    
    // 3. Evaluate rules DSL to get decision hint (optional)
    const decisionHint = protocolAssignment ? 
      await evaluateRulesDSL(parsedResponse, protocolAssignment) : 
      null;
    
    // 4. Generate AI response with tool calling
    const aiResponse = await generateAIResponseWithTools(
      parsedResponse, 
      protocolAssignment, 
      decisionHint,
      patientId,
      episodeId
    );
    
    // 5. Get or create AgentInteraction record
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
            decisionHint,
            protocolAssignment: protocolAssignment?.id
          }
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
      

      await supabase
        .from('AgentMessage')
        .insert({
          agent_interaction_id: activeInteractionId,
          message_type: 'USER',
          role: 'user',
          content: patientInput,
          sequence_number: nextSequence,
          timestamp: new Date().toISOString()
        });

      // 7. Store AI response message
      await supabase
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

      // 8. Update interaction with message count (don't mark completed yet - ongoing conversation)
      const { data: allMessages } = await supabase
        .from('AgentMessage')
        .select('id')
        .eq('agent_interaction_id', activeInteractionId);
        
      await supabase
        .from('AgentInteraction')
        .update({
          metadata: {
            ...(interaction?.metadata as any || {}),
            lastMessageAt: new Date().toISOString(),
            messageCount: allMessages?.length || 0
          }
        })
        .eq('id', activeInteractionId);
    }

    // 9. Handle tool calls from AI response
    const toolResults = await handleToolCalls(aiResponse.toolCalls, patientId, episodeId, supabase);

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
async function loadProtocolAssignment(episodeId: string, supabase: any) {
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
async function createProtocolAssignment(episodeId: string, supabase: any) {
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
async function parsePatientInputWithProtocol(input: string, protocolAssignment: any) {
  try {
    // If no protocol assignment, use basic parsing
    if (!protocolAssignment) {
      return getMockParsedResponse(input, 'HF'); // Default to HF for testing
    }

    // Call the existing OpenAI model layer with protocol context
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/models/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'generate_response',
        input: {
          condition: protocolAssignment.condition_code,
          patientResponses: input,
          context: `Parse this patient input for a ${protocolAssignment.condition_code} patient with ${protocolAssignment.education_level} education level in a TOC program. Extract symptoms, severity, intent, and sentiment.`,
          responseType: 'patient_response'
        }
      })
    });

    const result = await response.json();
    
    if (result.success) {
      return parseAIResponse(result.response, input, protocolAssignment.condition_code);
    } else {
      return getMockParsedResponse(input, protocolAssignment.condition_code);
    }
  } catch (error) {
    console.error('Error calling OpenAI for patient input parsing:', error);
    return getMockParsedResponse(input, protocolAssignment?.condition_code || 'HF');
  }
}

// Evaluate rules DSL to get decision hint
async function evaluateRulesDSL(parsedResponse: any, protocolAssignment: any) {
  // Get the rules DSL from the protocol assignment
  const rulesDSL = protocolAssignment.protocol_config?.rules || {};
  
  // Evaluate red flags
  const redFlags = rulesDSL.red_flags || [];
  for (const rule of redFlags) {
    if (evaluateRuleCondition(rule.if, parsedResponse)) {
      return {
        action: 'FLAG',
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
        action: 'CLOSE',
        reason: 'Patient is doing well'
      };
    }
  }
  
  // Default to ask more questions
  return {
    action: 'ASK_MORE',
    questions: ['How are you feeling today?', 'Any new symptoms?']
  };
}

// Evaluate a single rule condition
function evaluateRuleCondition(condition: any, parsedResponse: any): boolean {
  if (condition.any_text) {
    const inputText = parsedResponse.rawInput?.toLowerCase() || '';
    return condition.any_text.some((text: string) => 
      inputText.includes(text.toLowerCase())
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
  parsedResponse: any, 
  protocolAssignment: any, 
  decisionHint: any,
  patientId: string,
  episodeId: string
) {
  try {
    // If no protocol assignment, use basic AI response
    if (!protocolAssignment) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/models/openai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'generate_response_with_tools',
          input: {
            condition: 'HF', // Default for testing
            educationLevel: 'medium',
            patientResponses: parsedResponse.rawInput,
            decisionHint: null,
            context: `You are a post-discharge nurse assistant. Respond to the patient's input in a helpful, empathetic way.`,
            responseType: 'patient_response_with_tools'
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          response: result.response,
          toolCalls: result.toolCalls || []
        };
      }
    } else {
      // Call OpenAI with tool calling enabled
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
            context: `You are a post-discharge nurse assistant for a ${protocolAssignment.condition_code} patient with ${protocolAssignment.education_level} education level. Use the decision hint to guide your response and call appropriate tools.`,
            responseType: 'patient_response_with_tools'
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          response: result.response,
          toolCalls: result.toolCalls || []
        };
      }
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
async function handleToolCalls(toolCalls: any[], patientId: string, episodeId: string, supabase: any) {
  const results = [];
  
  for (const toolCall of toolCalls) {
    try {
      let result;
      
      switch (toolCall.name) {
        case 'raise_flag':
          result = await handleRaiseFlag(toolCall.parameters, patientId, episodeId, supabase);
          break;
        case 'ask_more':
          result = await handleAskMore(toolCall.parameters, patientId, episodeId, supabase);
          break;
        case 'log_checkin':
          result = await handleLogCheckin(toolCall.parameters, patientId, episodeId, supabase);
          break;
        case 'handoff_to_nurse':
          result = await handleHandoffToNurse(toolCall.parameters, patientId, episodeId, supabase);
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
async function handleRaiseFlag(parameters: any, patientId: string, episodeId: string, supabase: any) {
  const { flagType, severity, rationale } = parameters;
  
  // Create escalation task
  const { data: task, error } = await supabase
    .from('EscalationTask')
    .insert({
      episode_id: episodeId,
      reason_codes: [flagType],
      severity: severity.toUpperCase(),
      priority: severity === 'high' ? 'URGENT' : severity === 'medium' ? 'HIGH' : 'NORMAL',
      status: 'OPEN',
      sla_due_at: new Date(Date.now() + getSLAMinutes(severity) * 60 * 1000).toISOString(),
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

async function handleAskMore(parameters: any, patientId: string, episodeId: string, supabase: any) {
  const { questions } = parameters;
  
  // Store questions for follow-up
  const { data: followUp, error } = await supabase
    .from('FollowUpQuestion')
    .insert({
      episode_id: episodeId,
      questions: questions,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating follow-up questions:', error);
    return { success: false, error: error.message };
  }

  return { success: true, followUpId: followUp.id };
}

async function handleLogCheckin(parameters: any, patientId: string, episodeId: string, supabase: any) {
  const { result, summary } = parameters;
  
  // Log the check-in result
  const { data: checkin, error } = await supabase
    .from('CheckInLog')
    .insert({
      episode_id: episodeId,
      result: result,
      summary: summary,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging check-in:', error);
    return { success: false, error: error.message };
  }

  return { success: true, checkinId: checkin.id };
}

async function handleHandoffToNurse(parameters: any, patientId: string, episodeId: string, supabase: any) {
  const { reason } = parameters;
  
  // Create high-priority escalation task
  const { data: task, error } = await supabase
    .from('EscalationTask')
    .insert({
      episode_id: episodeId,
      reason_codes: ['NURSE_HANDOFF'],
      severity: 'HIGH',
      priority: 'URGENT',
      status: 'OPEN',
      sla_due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      notes: reason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating nurse handoff task:', error);
    return { success: false, error: error.message };
  }

  return { success: true, taskId: task.id };
}

// Generate fallback response
function generateFallbackResponse(decisionHint: any, protocolAssignment: any) {
  if (decisionHint && decisionHint.action === 'FLAG') {
    return `I understand your concern. Based on what you've shared, I'm connecting you with a nurse who will call you within the next few hours to discuss your symptoms and provide guidance. Please don't hesitate to call 911 if you feel you need immediate medical attention.`;
  }
  
  if (decisionHint && decisionHint.action === 'ASK_MORE') {
    return `I'd like to ask you a few more questions to better understand how you're doing. ${decisionHint.questions.join(' ')}`;
  }
  
  if (decisionHint && decisionHint.action === 'CLOSE') {
    const condition = protocolAssignment?.condition_code || 'health condition';
    return `Thank you for checking in! It sounds like you're doing well with your ${condition} management. Remember to take your medications as prescribed and call your doctor if you have any concerns. Take care!`;
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
    if (lowerInput.includes('breath') || lowerInput.includes('shortness')) symptoms.push('shortness_of_breath');
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
