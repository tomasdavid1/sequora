import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Episode, Patient, OutreachResponse, OutreachAttempt, EscalationTask, ContactChannel, RedFlagRule, ConditionCode } from '@/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY,
});

// Core agent interface
interface CheckInRequest {
  patientId: string;
  condition: string;
  responses: PatientResponse[];
  channel: 'SMS' | 'VOICE' | 'WHATSAPP';
  sessionId: string;
}

interface PatientResponse {
  questionCode: string;
  questionText: string;
  responseText: string;
  responseType: 'TEXT' | 'YES_NO' | 'NUMERIC' | 'SINGLE_CHOICE' | 'MULTI_CHOICE';
  timestamp: string;
}

interface CheckInResult {
  success: boolean;
  severity: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  redFlagCode: string;
  reasoning: string;
  escalationTaskId?: string;
  nextActions: string[];
  responseToPatient: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body: CheckInRequest = await request.json();
    const { patientId, condition, responses, channel, sessionId } = body;

    console.log(`🔍 Core agent processing check-in for patient ${patientId} via ${channel}`);

    // 1. Validate and store responses
    const storedResponses = await storePatientResponses(patientId, sessionId, responses);

    // 2. Analyze responses for red flags
    const analysis = await analyzeResponsesForRedFlags(condition, responses);

    // 3. Create escalation task if needed
    let escalationTaskId;
    if (analysis.severity !== 'NONE') {
      escalationTaskId = await createEscalationTask(patientId, analysis, sessionId);
    }

    // 4. Generate response for patient
    const patientResponse = await generatePatientResponse(condition, analysis, channel);

    // 5. Determine next actions
    const nextActions = determineNextActions(analysis, escalationTaskId);

    const result: CheckInResult = {
      success: true,
      severity: analysis.severity,
      redFlagCode: analysis.redFlagCode,
      reasoning: analysis.reasoning,
      escalationTaskId,
      nextActions,
      responseToPatient: patientResponse
    };

    console.log(`✅ Core agent completed check-in: ${analysis.severity} severity`);

    return NextResponse.json({ result });

  } catch (error) {
    console.error('❌ Core agent error:', error);
    return NextResponse.json(
      { error: 'Core agent processing failed' },
      { status: 500 }
    );
  }
}

async function storePatientResponses(
  patientId: string, 
  sessionId: string, 
  responses: PatientResponse[]
): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  
  // Get the latest episode for this patient
  const { data: episode, error: episodeError } = await supabase
    .from('Episode')
    .select('id')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (episodeError || !episode) {
    throw new Error('No episode found for patient');
  }

  // Store responses
  const responseInserts = responses.map(response => ({
    outreach_attempt_id: sessionId, // Using sessionId as attempt ID
    question_code: response.questionCode,
    question_version: 1,
    response_type: response.responseType,
    value_text: response.responseText,
    captured_at: response.timestamp,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { data: storedResponses, error: responseError } = await supabase
    .from('OutreachResponse')
    .insert(responseInserts)
    .select();

  if (responseError) {
    throw new Error('Failed to store patient responses');
  }

  return storedResponses;
}

async function analyzeResponsesForRedFlags(
  condition: string, 
  responses: PatientResponse[]
): Promise<{
  severity: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  redFlagCode: string;
  reasoning: string;
}> {
  const supabase = getSupabaseAdmin();
  
  // Get red flag rules for the condition
  const { data: redFlagRules, error: rulesError } = await supabase
    .from('RedFlagRule')
    .select('*')
    .eq('condition_code', condition as ConditionCode)
    .eq('active', true);

  if (rulesError) {
    console.error('Error fetching red flag rules:', rulesError);
    return {
      severity: 'NONE',
      redFlagCode: 'NONE',
      reasoning: 'Unable to analyze - rules not found'
    };
  }

  // Prepare context for LLM analysis
  const context = `
You are a medical AI assistant analyzing patient responses for ${condition} in a Transition of Care program.

CONDITION CONTEXT:
${getConditionContext(condition)}

RED FLAG RULES:
${redFlagRules?.map((rule: Record<string, unknown>) => `
- ${rule.rule_code}: ${rule.description}
  Severity: ${rule.severity}
  Action: ${rule.action_hint}
`).join('\n')}

PATIENT RESPONSES:
${responses.map(r => `
Question: ${r.questionText}
Response: ${r.responseText}
`).join('\n')}

Analyze these responses and determine:
1. Severity level (NONE, LOW, MODERATE, HIGH, CRITICAL)
2. Most relevant red flag code
3. Brief reasoning for your decision

Respond in JSON format:
{
  "severity": "NONE|LOW|MODERATE|HIGH|CRITICAL",
  "redFlagCode": "rule_code_or_NONE",
  "reasoning": "brief explanation"
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant specializing in Transition of Care analysis. Always respond with valid JSON."
        },
        {
          role: "user",
          content: context
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(response);
    
    // Validate the response
    const validSeverities = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
    if (!validSeverities.includes(analysis.severity)) {
      analysis.severity = 'NONE';
    }

    return {
      severity: analysis.severity,
      redFlagCode: analysis.redFlagCode || 'NONE',
      reasoning: analysis.reasoning || 'No specific reasoning provided'
    };

  } catch (error) {
    console.error('Error in LLM analysis:', error);
    
    // Fallback to rule-based analysis
    return fallbackRuleBasedAnalysis(responses, condition, redFlagRules);
  }
}

async function createEscalationTask(
  patientId: string, 
  analysis: Record<string, unknown>, 
  sessionId: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  
  // Get the latest episode for this patient
  const { data: episode, error: episodeError } = await supabase
    .from('Episode')
    .select('id')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (episodeError || !episode) {
    throw new Error('No episode found for patient');
  }

  const { data: task, error: taskError} = await supabase
    .from('EscalationTask')
    .insert({
      episode_id: episode.id,
      source_attempt_id: sessionId,
      reason_codes: [String(analysis.redFlagCode)],
      severity: analysis.severity as any,
      priority: getPriorityFromSeverity(String(analysis.severity)) as any,
      status: 'OPEN' as any,
      sla_due_at: getSLADueTime(String(analysis.severity)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (taskError) {
    throw new Error('Failed to create escalation task');
  }

  return task.id;
}

async function generatePatientResponse(
  condition: string, 
  analysis: Record<string, unknown>, 
  channel: 'SMS' | 'VOICE' | 'WHATSAPP'
): Promise<string> {
  
  if (analysis.severity === 'CRITICAL') {
    return "Thank you for your responses. A nurse will call you within 30 minutes to discuss your care.";
  }
  
  if (analysis.severity === 'HIGH') {
    return "Thank you for your responses. A nurse will call you within 2 hours to follow up on your care.";
  }
  
  if (analysis.severity === 'MODERATE') {
    return "Thank you for your responses. A nurse will call you within 4 hours to discuss your care.";
  }
  
  // For LOW or NONE severity
  const responses = {
    HF: "Thank you for your responses. Continue taking your medications as prescribed and monitor your weight daily. Contact us if you have any concerns.",
    COPD: "Thank you for your responses. Continue using your inhalers as prescribed and avoid triggers. Contact us if you have breathing difficulties.",
    AMI: "Thank you for your responses. Continue following your heart-healthy diet and taking medications as prescribed. Contact us if you have chest pain.",
    PNA: "Thank you for your responses. Continue resting and taking your antibiotics as prescribed. Contact us if your symptoms worsen."
  };
  
  return responses[condition as keyof typeof responses] || 
    "Thank you for your responses. Continue following your care plan and contact us if you have any concerns.";
}

function determineNextActions(analysis: Record<string, unknown>, escalationTaskId?: string): string[] {
  const actions = [];
  
  if (escalationTaskId) {
    actions.push(`Escalation task created: ${escalationTaskId}`);
  }
  
  if (analysis.severity === 'CRITICAL') {
    actions.push('Immediate nurse callback required');
    actions.push('Consider ED referral');
  } else if (analysis.severity === 'HIGH') {
    actions.push('Nurse callback within 2 hours');
    actions.push('Schedule follow-up appointment');
  } else if (analysis.severity === 'MODERATE') {
    actions.push('Nurse callback within 4 hours');
  } else {
    actions.push('Continue routine monitoring');
  }
  
  return actions;
}

// Helper functions
function getConditionContext(condition: string): string {
  switch (condition) {
    case 'HF':
      return `
Heart Failure Red Flags:
- Weight gain of 3+ pounds in 1 day or 5+ pounds in 1 week
- Increased shortness of breath
- Swelling in feet, ankles, or legs
- Difficulty sleeping due to breathing problems
- Persistent cough or wheezing
- Fatigue or weakness
- Confusion or memory problems
`;
    case 'COPD':
      return `
COPD Red Flags:
- Increased shortness of breath
- Change in sputum color or amount
- Fever or signs of infection
- Increased use of rescue inhaler
- Difficulty sleeping due to breathing
- Swelling in feet or ankles
- Confusion or drowsiness
`;
    case 'AMI':
      return `
Post-Heart Attack Red Flags:
- Chest pain or pressure
- Pain in arms, back, neck, or jaw
- Shortness of breath
- Nausea or vomiting
- Cold sweat
- Feeling lightheaded or dizzy
- Irregular heartbeat
`;
    case 'PNA':
      return `
Pneumonia Recovery Red Flags:
- Fever returns or gets worse
- Increased breathing difficulty
- Chest pain that worsens
- Coughing up blood
- Confusion or disorientation
- Inability to keep food/fluids down
- Blue lips or fingernails
`;
    default:
      return 'General medical red flags: severe pain, breathing difficulty, confusion, fever, bleeding, or any concerning symptoms.';
  }
}

function fallbackRuleBasedAnalysis(
  responses: PatientResponse[], 
  condition: string, 
  redFlagRules: RedFlagRule[] | null
): {
  severity: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  redFlagCode: string;
  reasoning: string;
} {
  
  const allResponses = responses.map(r => r.responseText.toLowerCase()).join(' ');
  
  // Check for critical keywords
  const criticalKeywords = ['chest pain', 'can\'t breathe', 'emergency', 'severe', 'unconscious'];
  if (criticalKeywords.some(keyword => allResponses.includes(keyword))) {
    return {
      severity: 'CRITICAL',
      redFlagCode: 'CRITICAL_SYMPTOMS',
      reasoning: 'Critical symptoms detected in patient responses'
    };
  }
  
  // Check for high severity keywords
  const highKeywords = ['pain', 'swelling', 'fever', 'dizzy', 'nausea'];
  if (highKeywords.some(keyword => allResponses.includes(keyword))) {
    return {
      severity: 'HIGH',
      redFlagCode: 'SYMPTOM_WORSENING',
      reasoning: 'Concerning symptoms reported by patient'
    };
  }
  
  return {
    severity: 'NONE',
    redFlagCode: 'NONE',
    reasoning: 'No red flags detected in patient responses'
  };
}

function getPriorityFromSeverity(severity: string): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
  switch (severity) {
    case 'CRITICAL': return 'URGENT';
    case 'HIGH': return 'HIGH';
    case 'MODERATE': return 'NORMAL';
    case 'LOW': return 'LOW';
    default: return 'NORMAL';
  }
}

function getSLADueTime(severity: string): string {
  const now = new Date();
  switch (severity) {
    case 'CRITICAL': 
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 minutes
    case 'HIGH': 
      return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
    case 'MODERATE': 
      return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours
    case 'LOW': 
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    default: 
      return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours
  }
}
