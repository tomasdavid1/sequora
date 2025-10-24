import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      outreachAttemptId, 
      patientPhone, 
      condition,
      questions 
    } = body;

    if (!outreachAttemptId || !patientPhone || !condition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get agent configuration for voice calls
    const { data: agentConfig, error: agentError } = await supabase
      .from('AgentConfig')
      .select('*')
      .eq('agent_type', 'OUTREACH_COORDINATOR')
      .eq('active', true)
      .single();

    if (agentError || !agentConfig) {
      return NextResponse.json(
        { error: 'Voice agent configuration not found' },
        { status: 404 }
      );
    }

    // Prepare the voice call script
    const callScript = generateVoiceCallScript(condition, questions, agentConfig);

    // Create RecallAI call
    const recallAIResponse = await createRecallAICall({
      phoneNumber: patientPhone,
      script: callScript,
      agentConfig: agentConfig,
      outreachAttemptId: outreachAttemptId
    });

    if (!recallAIResponse.success) {
      return NextResponse.json(
        { error: 'Failed to create RecallAI call' },
        { status: 500 }
      );
    }

    // Update outreach attempt with RecallAI call ID
    await supabase
      .from('OutreachAttempt')
      .update({
        provider_message_id: recallAIResponse.callId,
        channel: 'VOICE',
        updated_at: new Date().toISOString()
      })
      .eq('id', outreachAttemptId);

    // Create agent interaction record
    await supabase
      .from('AgentInteraction')
      .insert({
        agent_config_id: agentConfig.id,
        interaction_type: 'VOICE_CALL',
        status: 'INITIATED',
        external_id: recallAIResponse.callId,
        metadata: {
          patient_phone: patientPhone,
          condition: condition,
          outreach_attempt_id: outreachAttemptId,
          recall_ai_call_id: recallAIResponse.callId
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      callId: recallAIResponse.callId,
      status: 'INITIATED'
    });

  } catch (error) {
    console.error('Error creating voice call:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateVoiceCallScript(condition: string, questions: any[], agentConfig: any): string {
  const conditionName = getConditionName(condition);
  const agentName = agentConfig.name || 'Sarah';
  
  let script = `
Hello! This is ${agentName} calling from your ${conditionName} care team. 
I hope you're doing well since your discharge. I'm calling to check in on how you're feeling and ask a few quick questions about your recovery.

Is this a good time to talk for about 2-3 minutes?

[Wait for response]

Great! Let me ask you a few questions:

`;

  // Add questions to the script
  questions.forEach((question, index) => {
    script += `
Question ${index + 1}: ${question.text}

[Wait for response and acknowledge]

`;
  });

  script += `
Thank you so much for taking the time to answer these questions. Your responses help us provide the best care for you.

Is there anything else you'd like to ask me about your condition or care plan?

[Wait for response]

Perfect! If you have any concerns or questions in the future, please don't hesitate to call your care team. We're here to help.

Have a great day, and take care!

[End call]
`;

  return script;
}

async function createRecallAICall(params: {
  phoneNumber: string;
  script: string;
  agentConfig: any;
  outreachAttemptId: string;
}): Promise<{ success: boolean; callId?: string; error?: string }> {
  
  try {
    // TODO: Replace with actual RecallAI API integration
    // For now, we'll simulate the API call
    
    const recallAIRequest = {
      phone_number: params.phoneNumber,
      script: params.script,
      agent_name: params.agentConfig.name || 'Sarah',
      voice_settings: {
        voice_id: params.agentConfig.voice_id || 'default',
        speed: 1.0,
        pitch: 1.0
      },
      call_settings: {
        max_duration: 300, // 5 minutes
        recording_enabled: true,
        transcription_enabled: true
      },
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/webhooks/recall-ai`,
      metadata: {
        outreach_attempt_id: params.outreachAttemptId,
        condition: params.condition
      }
    };

    console.log('📞 Creating RecallAI call:', recallAIRequest);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success (90% success rate)
    if (Math.random() < 0.9) {
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`✅ RecallAI call created successfully: ${callId}`);
      
      return {
        success: true,
        callId: callId
      };
    } else {
      console.log('❌ RecallAI call creation failed');
      return {
        success: false,
        error: 'SIMULATED_API_FAILURE'
      };
    }

  } catch (error) {
    console.error('Error creating RecallAI call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
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
