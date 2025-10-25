import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
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
      call_id,
      status,
      duration,
      recording_url,
      transcription,
      metadata,
      responses
    } = body;

    console.log('📞 Received RecallAI webhook:', { call_id, status });

    if (!call_id) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      );
    }

    // Find the outreach attempt by provider message ID
    const { data: attempt, error: attemptError } = await supabase
      .from('OutreachAttempt')
      .select(`
        id,
        outreach_plan_id,
        status,
        Episode (
          id,
          condition_code
        )
      `)
      .eq('provider_message_id', call_id)
      .single();

    if (attemptError || !attempt) {
      console.error('Outreach attempt not found for call ID:', call_id);
      return NextResponse.json(
        { error: 'Outreach attempt not found' },
        { status: 404 }
      );
    }

    // Update outreach attempt status
    let newStatus = 'COMPLETED';
    let reasonCode = 'COMPLETED';
    
    switch (status) {
      case 'completed':
        newStatus = 'COMPLETED';
        reasonCode = 'COMPLETED';
        break;
      case 'failed':
        newStatus = 'FAILED';
        reasonCode = 'CALL_FAILED';
        break;
      case 'no_answer':
        newStatus = 'NO_CONTACT';
        reasonCode = 'NO_ANSWER';
        break;
      case 'busy':
        newStatus = 'FAILED';
        reasonCode = 'BUSY';
        break;
      case 'declined':
        newStatus = 'DECLINED';
        reasonCode = 'DECLINED';
        break;
      default:
        newStatus = 'FAILED';
        reasonCode = 'UNKNOWN';
    }

    await supabase
      .from('OutreachAttempt')
      .update({
        status: newStatus,
        reason_code: reasonCode,
        completed_at: new Date().toISOString(),
        transcript_ref: recording_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', attempt.id);

    // If call was completed and we have responses, process them
    if (status === 'completed' && responses && responses.length > 0) {
      await processVoiceResponses(attempt.id, responses, (attempt.Episode as any).condition_code);
    }

    // Create communication message record
    await supabase
      .from('CommunicationMessage')
      .insert({
        episode_id: (attempt.Episode as any).id,
        patient_id: metadata?.patient_id,
        direction: 'OUTBOUND',
        channel: 'VOICE',
        template_code: 'VOICE_OUTREACH',
        body_hash: `voice_call_${call_id}`,
        contains_phi: true,
        status: newStatus === 'COMPLETED' ? 'DELIVERED' : 'FAILED',
        provider_message_id: call_id,
        sent_at: new Date().toISOString(),
        delivered_at: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
        failed_at: newStatus === 'FAILED' ? new Date().toISOString() : null,
        failure_reason: newStatus === 'FAILED' ? reasonCode : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Create audit log
    await supabase
      .from('AuditLog')
      .insert({
        actor_type: 'SYSTEM',
        action: 'UPDATE',
        entity_type: 'OutreachAttempt',
        entity_id: attempt.id,
        metadata: {
          call_id: call_id,
          status: status,
          duration: duration,
          recording_url: recording_url,
          transcription: transcription,
          responses_count: responses?.length || 0
        },
        occurred_at: new Date().toISOString()
      });

    console.log(`✅ Processed RecallAI webhook for call ${call_id}`);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing RecallAI webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processVoiceResponses(
  attemptId: string, 
  responses: any[], 
  condition: string
): Promise<void> {
  
  try {
    // Get questions for the condition to map responses
    const { data: questions, error: questionsError } = await supabase
      .from('OutreachQuestion')
      .select('*')
      .eq('condition_code', condition)
      .eq('active', true);

    if (questionsError || !questions) {
      console.error('Error fetching questions for voice responses:', questionsError);
      return;
    }

    // Process each response
    const responseInserts = responses.map((response, index) => {
      const question = questions[index] || questions[0]; // Fallback to first question
      
      return {
        outreach_attempt_id: attemptId,
        question_code: question.code,
        question_version: question.version || 1,
        response_type: question.response_type,
        value_text: response.text || response.transcript,
        value_number: response.number || null,
        value_choice: response.choice || null,
        value_multi_choice: response.choices || null,
        captured_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // Save responses
    const { error: responseError } = await supabase
      .from('OutreachResponse')
      .insert(responseInserts);

    if (responseError) {
      console.error('Error saving voice responses:', responseError);
      return;
    }

    // Analyze responses for red flags
    const analysisResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/agents/analyze-response`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        },
        body: JSON.stringify({
          outreachAttemptId: attemptId,
          responses: responses,
          condition: condition
        })
      }
    );

    if (!analysisResponse.ok) {
      console.error('Failed to analyze voice responses');
    }

  } catch (error) {
    console.error('Error processing voice responses:', error);
  }
}
