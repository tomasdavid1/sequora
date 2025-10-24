import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outreachPlanId, channel = 'SMS' } = body;

    if (!outreachPlanId) {
      return NextResponse.json(
        { error: 'Outreach plan ID is required' },
        { status: 400 }
      );
    }

    // Get outreach plan details
    const { data: plan, error: planError } = await supabase
      .from('OutreachPlan')
      .select(`
        id,
        episode_id,
        preferred_channel,
        fallback_channel,
        window_start_at,
        window_end_at,
        max_attempts,
        timezone,
        language_code,
        include_caregiver,
        status,
        Episode (
          id,
          condition_code,
          Patient (
            id,
            first_name,
            last_name,
            primary_phone,
            email,
            preferred_channel
          )
        ),
        OutreachAttempt (
          id,
          attempt_number,
          scheduled_at,
          started_at,
          completed_at,
          status,
          channel
        )
      `)
      .eq('id', outreachPlanId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Outreach plan not found' },
        { status: 404 }
      );
    }

    // Check if we're within the outreach window
    const now = new Date();
    const windowStart = new Date(plan.window_start_at);
    const windowEnd = new Date(plan.window_end_at);

    if (now < windowStart || now > windowEnd) {
      return NextResponse.json(
        { error: 'Outside outreach window' },
        { status: 400 }
      );
    }

    // Check if plan is still active
    if (plan.status !== 'PENDING' && plan.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Outreach plan is not active' },
        { status: 400 }
      );
    }

    // Get next attempt number
    const completedAttempts = plan.OutreachAttempt?.filter(
      attempt => attempt.status === 'COMPLETED' || attempt.status === 'FAILED'
    ) || [];
    
    const nextAttemptNumber = completedAttempts.length + 1;

    if (nextAttemptNumber > plan.max_attempts) {
      // Mark plan as failed
      await supabase
        .from('OutreachPlan')
        .update({
          status: 'FAILED',
          exclusion_reason: 'MAX_ATTEMPTS_REACHED',
          updated_at: new Date().toISOString()
        })
        .eq('id', outreachPlanId);

      return NextResponse.json(
        { error: 'Maximum attempts reached' },
        { status: 400 }
      );
    }

    // Determine the channel to use
    const useChannel = channel === 'SMS' ? 'SMS' : plan.preferred_channel;

    // Get questions for the condition
    const { data: questions, error: questionsError } = await supabase
      .from('OutreachQuestion')
      .select('*')
      .eq('condition_code', plan.Episode.condition_code)
      .eq('active', true)
      .eq('language_code', plan.language_code)
      .order('id');

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found for condition' },
        { status: 404 }
      );
    }

    // Create outreach attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('OutreachAttempt')
      .insert({
        outreach_plan_id: outreachPlanId,
        attempt_number: nextAttemptNumber,
        scheduled_at: now.toISOString(),
        started_at: now.toISOString(),
        channel: useChannel,
        status: 'IN_PROGRESS',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error creating outreach attempt:', attemptError);
      return NextResponse.json(
        { error: 'Failed to create outreach attempt' },
        { status: 500 }
      );
    }

    // Generate the outreach message
    const message = generateOutreachMessage(
      plan.Episode.Patient,
      plan.Episode.condition_code,
      questions,
      nextAttemptNumber,
      plan.language_code
    );

    // Send the message (integrate with SMS/Voice service)
    const sendResult = await sendOutreachMessage(
      plan.Episode.Patient.primary_phone,
      message,
      useChannel,
      attempt.id
    );

    if (!sendResult.success) {
      // Mark attempt as failed
      await supabase
        .from('OutreachAttempt')
        .update({
          status: 'FAILED',
          reason_code: sendResult.error || 'SEND_FAILED',
          updated_at: new Date().toISOString()
        })
        .eq('id', attempt.id);

      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // Update attempt with provider message ID
    await supabase
      .from('OutreachAttempt')
      .update({
        provider_message_id: sendResult.messageId,
        updated_at: new Date().toISOString()
      })
      .eq('id', attempt.id);

    // Update plan status
    await supabase
      .from('OutreachPlan')
      .update({
        status: 'IN_PROGRESS',
        updated_at: new Date().toISOString()
      })
      .eq('id', outreachPlanId);

    // Create audit log
    await supabase
      .from('AuditLog')
      .insert({
        actor_type: 'SYSTEM',
        action: 'CREATE',
        entity_type: 'OutreachAttempt',
        entity_id: attempt.id,
        metadata: {
          outreach_plan_id: outreachPlanId,
          patient_id: plan.Episode.Patient.id,
          condition: plan.Episode.condition_code,
          channel: useChannel,
          attempt_number: nextAttemptNumber,
          message_id: sendResult.messageId
        },
        occurred_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        attemptNumber: nextAttemptNumber,
        channel: useChannel,
        message: message,
        messageId: sendResult.messageId,
        patientName: `${plan.Episode.Patient.first_name} ${plan.Episode.Patient.last_name}`,
        patientPhone: plan.Episode.Patient.primary_phone
      }
    });

  } catch (error) {
    console.error('Error in outreach orchestration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateOutreachMessage(
  patient: any,
  condition: string,
  questions: any[],
  attemptNumber: number,
  language: string
): string {
  
  const patientName = patient.first_name;
  const conditionName = getConditionName(condition);
  
  // Select 3-5 key questions for this attempt
  const selectedQuestions = selectQuestionsForAttempt(questions, attemptNumber);
  
  let message = `Hi ${patientName}! This is your ${conditionName} care team checking in. `;
  
  if (attemptNumber === 1) {
    message += `We hope you're doing well since your discharge. `;
  } else {
    message += `We're following up on your care. `;
  }
  
  message += `Please answer these quick questions:\n\n`;
  
  selectedQuestions.forEach((question, index) => {
    message += `${index + 1}. ${question.text}\n`;
    
    if (question.response_type === 'YES_NO') {
      message += `   Reply: YES or NO\n`;
    } else if (question.response_type === 'SINGLE_CHOICE') {
      message += `   Reply: ${question.choices.join(' or ')}\n`;
    } else if (question.response_type === 'NUMERIC') {
      message += `   Reply with number (${question.unit || ''})\n`;
    } else {
      message += `   Reply with your answer\n`;
    }
    message += `\n`;
  });
  
  message += `Thank you! Your responses help us provide the best care.`;
  
  return message;
}

function selectQuestionsForAttempt(questions: any[], attemptNumber: number): any[] {
  // Prioritize questions based on attempt number
  const priorityQuestions = questions.filter(q => 
    q.code.includes('WEIGHT') || 
    q.code.includes('BREATHING') || 
    q.code.includes('PAIN') ||
    q.code.includes('SYMPTOMS')
  );
  
  const otherQuestions = questions.filter(q => 
    !priorityQuestions.includes(q)
  );
  
  // First attempt: focus on critical questions
  if (attemptNumber === 1) {
    return priorityQuestions.slice(0, 3);
  }
  
  // Subsequent attempts: mix of priority and other questions
  const selected = [
    ...priorityQuestions.slice(0, 2),
    ...otherQuestions.slice(0, 3)
  ];
  
  return selected.slice(0, 5);
}

function getConditionName(condition: string): string {
  switch (condition) {
    case 'HF': return 'Heart Failure';
    case 'COPD': return 'COPD';
    case 'AMI': return 'Heart Attack Recovery';
    case 'PNA': return 'Pneumonia Recovery';
    default: return 'Health';
  }
}

async function sendOutreachMessage(
  phone: string,
  message: string,
  channel: string,
  attemptId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  // TODO: Integrate with actual SMS/Voice service (Twilio, etc.)
  // For now, we'll simulate the send
  
  console.log(`Sending ${channel} message to ${phone}:`, message);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate success/failure (90% success rate)
  if (Math.random() < 0.9) {
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    return {
      success: false,
      error: 'SIMULATED_SEND_FAILURE'
    };
  }
}
