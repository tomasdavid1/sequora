import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { OutreachResponse, RedFlagRule, ConditionCode } from '@/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { 
      outreachAttemptId, 
      responses, 
      condition, 
      patientId 
    } = body;

    if (!outreachAttemptId || !responses || !condition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the outreach attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('OutreachAttempt')
      .select(`
        id,
        outreach_plan_id,
        OutreachPlan!inner (
          episode_id,
          Episode!inner (
            id,
            condition_code,
            Patient!inner (
              id,
              first_name,
              last_name
            )
          )
        )
      `)
      .eq('id', outreachAttemptId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'Outreach attempt not found' },
        { status: 404 }
      );
    }

    // Get red flag rules for the condition
    const { data: redFlagRules, error: rulesError } = await supabase
      .from('RedFlagRule')
      .select('*')
      .eq('condition_code', condition)
      .eq('active', true);

    if (rulesError) {
      console.error('Error fetching red flag rules:', rulesError);
      return NextResponse.json(
        { error: 'Failed to fetch red flag rules' },
        { status: 500 }
      );
    }

    // Analyze responses using LLM
    const analysisResult = await analyzeResponsesWithLLM(
      responses, 
      condition, 
      redFlagRules || []
    );

    // Save outreach responses
    const responseInserts = responses.map((response: any) => ({
      outreach_attempt_id: outreachAttemptId,
      question_code: response.questionCode,
      question_version: response.questionVersion || 1,
      response_type: response.responseType,
      value_text: response.valueText,
      value_number: response.valueNumber,
      value_choice: response.valueChoice,
      value_multi_choice: response.valueMultiChoice,
      captured_at: new Date().toISOString(),
      red_flag_severity: analysisResult.severity,
      red_flag_code: analysisResult.redFlagCode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: responseError } = await supabase
      .from('OutreachResponse')
      .insert(responseInserts);

    if (responseError) {
      console.error('Error saving outreach responses:', responseError);
      return NextResponse.json(
        { error: 'Failed to save responses' },
        { status: 500 }
      );
    }

    // Create escalation task if needed
    let escalationTask = null;
    if (analysisResult.severity !== 'NONE') {
      const { data: task, error: taskError } = await supabase
        .from('EscalationTask')
        .insert({
          episode_id: (attempt as any).OutreachPlan?.Episode?.id,
          source_attempt_id: outreachAttemptId,
          reason_codes: [analysisResult.redFlagCode],
          severity: analysisResult.severity,
          priority: getPriorityFromSeverity(analysisResult.severity),
          status: 'OPEN',
          sla_due_at: getSLADueTime(analysisResult.severity),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (taskError) {
        console.error('Error creating escalation task:', taskError);
      } else {
        escalationTask = task;
      }
    }

    // Update outreach attempt status
    await supabase
      .from('OutreachAttempt')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', outreachAttemptId);

    // Create audit log
    await supabase
      .from('AuditLog')
      .insert({
        actor_type: 'SYSTEM',
        action: 'CREATE',
        entity_type: 'OutreachResponse',
        entity_id: outreachAttemptId,
        metadata: {
          condition,
          severity: analysisResult.severity,
          red_flag_code: analysisResult.redFlagCode,
          escalation_created: !!escalationTask,
          analysis_reasoning: analysisResult.reasoning
        },
        occurred_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      analysis: {
        severity: analysisResult.severity,
        redFlagCode: analysisResult.redFlagCode,
        reasoning: analysisResult.reasoning,
        escalationCreated: !!escalationTask,
        escalationTaskId: escalationTask?.id
      }
    });

  } catch (error) {
    console.error('Error in response analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function analyzeResponsesWithLLM(
  responses: any[], 
  condition: string, 
  redFlagRules: any[]
): Promise<{
  severity: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  redFlagCode: string;
  reasoning: string;
}> {
  
  // Prepare context for LLM
  const context = `
You are a medical AI assistant analyzing patient responses for ${condition} (${getConditionFullName(condition)}) 
in a Transition of Care program. Your job is to identify potential red flags that require nurse escalation.

CONDITION CONTEXT:
${getConditionContext(condition)}

RED FLAG RULES:
${redFlagRules.map(rule => `
- ${rule.rule_code}: ${rule.description}
  Severity: ${rule.severity}
  Action: ${rule.action_hint}
`).join('\n')}

PATIENT RESPONSES:
${responses.map(r => `
Question: ${r.questionText}
Response: ${r.valueText || r.valueNumber || r.valueChoice || 'No response'}
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

function fallbackRuleBasedAnalysis(
  responses: any[], 
  condition: string, 
  redFlagRules: any[]
): {
  severity: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  redFlagCode: string;
  reasoning: string;
} {
  
  // Simple keyword-based analysis as fallback
  const allResponses = responses.map(r => 
    (r.valueText || r.valueChoice || '').toLowerCase()
  ).join(' ');

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

  // Check for moderate keywords
  const moderateKeywords = ['tired', 'weak', 'difficulty', 'concern'];
  if (moderateKeywords.some(keyword => allResponses.includes(keyword))) {
    return {
      severity: 'MODERATE',
      redFlagCode: 'GENERAL_CONCERN',
      reasoning: 'Patient expressing concerns or mild symptoms'
    };
  }

  return {
    severity: 'NONE',
    redFlagCode: 'NONE',
    reasoning: 'No red flags detected in patient responses'
  };
}

function getConditionFullName(condition: string): string {
  switch (condition) {
    case 'HF': return 'Heart Failure';
    case 'COPD': return 'Chronic Obstructive Pulmonary Disease';
    case 'AMI': return 'Acute Myocardial Infarction';
    case 'PNA': return 'Pneumonia';
    default: return condition;
  }
}

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
