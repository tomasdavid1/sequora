import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
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
      console.error('❌ [Analysis] Database error fetching red flag rules:', rulesError);
      return NextResponse.json(
        { error: 'Failed to fetch red flag rules' },
        { status: 500 }
      );
    }

    if (!redFlagRules || redFlagRules.length === 0) {
      console.error(`❌ [Analysis] No red flag rules found for condition: ${condition}`);
      return NextResponse.json(
        { error: `No red flag rules configured for condition: ${condition}. Please configure rules in admin dashboard.` },
        { status: 500 }
      );
    }

    // Validate all responses have required fields
    for (const response of responses) {
      if (!response.questionCode) {
        console.error('❌ [Analysis] Response missing questionCode:', response);
        return NextResponse.json(
          { error: 'Invalid response data: questionCode is required' },
          { status: 400 }
        );
      }
      
      if (!response.responseType) {
        console.error('❌ [Analysis] Response missing responseType:', response);
        return NextResponse.json(
          { error: 'Invalid response data: responseType is required' },
          { status: 400 }
        );
      }

      // Validate question_version exists (required for audit trail)
      if (response.questionVersion === undefined || response.questionVersion === null) {
        console.error('❌ [Analysis] Response missing questionVersion:', response);
        return NextResponse.json(
          { error: 'Invalid response data: questionVersion is required' },
          { status: 400 }
        );
      }
    }

    // Analyze responses using LLM
    const analysisResult = await analyzeResponsesWithLLM(
      responses, 
      condition, 
      redFlagRules // No fallback - validated above
    );

    // Save outreach responses
    const responseInserts = responses.map((response: Record<string, unknown>) => ({
      outreach_attempt_id: outreachAttemptId,
      question_code: response.questionCode,
      question_version: response.questionVersion, // No fallback - validated above
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
  responses:  unknown[], 
  condition: string, 
  redFlagRules:  unknown[]
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
${redFlagRules.map((rule: any) => `
- ${rule.rule_code}: ${rule.description}
  Severity: ${rule.severity}
  Action: ${rule.action_hint}
`).join('\n')}

PATIENT RESPONSES:
${responses.map((r: any) => `
Question: ${r.questionText}
Response: ${r.valueText || r.valueNumber || r.valueChoice}
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
      console.error('❌ [Analysis] OpenAI returned no content');
      throw new Error('AI analysis failed: No response from OpenAI');
    }

    let analysis;
    try {
      analysis = JSON.parse(response);
    } catch (parseError) {
      console.error('❌ [Analysis] Failed to parse AI response as JSON:', response);
      throw new Error(`AI analysis failed: Invalid JSON response - ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    // Validate required fields
    if (!analysis.severity) {
      console.error('❌ [Analysis] AI response missing severity field:', analysis);
      throw new Error('AI analysis failed: Response missing severity field');
    }

    if (!analysis.redFlagCode) {
      console.error('❌ [Analysis] AI response missing redFlagCode field:', analysis);
      throw new Error('AI analysis failed: Response missing redFlagCode field');
    }

    if (!analysis.reasoning) {
      console.error('❌ [Analysis] AI response missing reasoning field:', analysis);
      throw new Error('AI analysis failed: Response missing reasoning field');
    }

    // Validate severity is valid
    const validSeverities = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
    if (!validSeverities.includes(analysis.severity)) {
      console.error('❌ [Analysis] AI returned invalid severity:', analysis.severity);
      throw new Error(`AI analysis failed: Invalid severity "${analysis.severity}". Must be one of: ${validSeverities.join(', ')}`);
    }

    return {
      severity: analysis.severity,
      redFlagCode: analysis.redFlagCode,
      reasoning: analysis.reasoning
    };

  } catch (error) {
    console.error('❌ [Analysis] LLM analysis error:', error);
    throw new Error(`Failed to analyze patient responses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
