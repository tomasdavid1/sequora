import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Patient, Episode, OutreachPlan, OutreachAttempt, ConditionCode, ContactChannel } from '@/types';

// Orchestrator that coordinates between mock SMS/Voice services and the core interaction agent
// This is the main entry point for all TOC communications

export async function POST(request: NextRequest) {
  try {
    const { 
      action, 
      patientId, 
      episodeId, 
      channel = 'SMS', 
      patientInput,
      condition = 'HF'
    } = await request.json();

    if (!action || !patientId || !episodeId) {
      return NextResponse.json(
        { error: 'Action, Patient ID, and Episode ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    switch (action) {
      case 'INITIATE_OUTREACH':
        return await initiateOutreach(patientId, episodeId, channel, condition, supabase);
      
      case 'PROCESS_PATIENT_RESPONSE':
        return await processPatientResponse(patientId, episodeId, patientInput, condition, supabase);
      
      case 'SCHEDULE_FOLLOWUP':
        return await scheduleFollowup(patientId, episodeId, channel, condition, supabase);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in orchestrator:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Initiate outreach to a patient
async function initiateOutreach(patientId: string, episodeId: string, channel: string, condition: string, supabase: any) {
  try {
    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from('Patient')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get episode info
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select('*')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    // Generate outreach message based on condition and timing
    const message = generateOutreachMessage(condition, episode.discharge_at);
    
    // Send via appropriate channel
    let outreachResult;
    if (channel === 'SMS') {
      outreachResult = await sendMockSMS(patient.primary_phone, message, patientId, episodeId);
    } else if (channel === 'VOICE') {
      outreachResult = await sendMockVoice(patient.primary_phone, message, patientId, episodeId, condition);
    }

    // Create outreach attempt record
    const { data: attempt, error: attemptError } = await supabase
      .from('OutreachAttempt')
      .insert({
        outreach_plan_id: episodeId, // Simplified for now
        attempt_number: 1,
        scheduled_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        channel: channel,
        status: 'COMPLETED',
        connect: true,
        reason_code: 'COMPLETED',
        transcript_ref: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error creating outreach attempt:', attemptError);
    }

    return NextResponse.json({
      success: true,
      message: 'Outreach initiated successfully',
      channel,
      patientPhone: patient.primary_phone,
      outreachMessage: message,
      attemptId: attempt?.id,
      mock: true
    });

  } catch (error) {
    console.error('Error initiating outreach:', error);
    return NextResponse.json(
      { error: 'Failed to initiate outreach' },
      { status: 500 }
    );
  }
}

// Process patient response through the core interaction agent
async function processPatientResponse(patientId: string, episodeId: string, patientInput: string, condition: string, supabase: any) {
  try {
    // Call the core interaction agent
    const interactionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/agents/core/interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        episodeId,
        patientInput,
        condition,
        interactionType: 'TEXT'
      })
    });

    const interactionResult = await interactionResponse.json();

    if (!interactionResult.success) {
      return NextResponse.json(
        { error: 'Failed to process patient response' },
        { status: 500 }
      );
    }

    // Send response back to patient if needed
    let responseMessage = null;
    if (interactionResult.nextAction.action !== 'CLOSE') {
      responseMessage = interactionResult.nextAction.response;
      
      // Send response via SMS (mock)
      await sendMockSMS(
        'patient_phone_placeholder', // Would get from patient record
        responseMessage,
        patientId,
        episodeId
      );
    }

    return NextResponse.json({
      success: true,
      parsedResponse: interactionResult.parsedResponse,
      redFlags: interactionResult.redFlags,
      nextAction: interactionResult.nextAction,
      responseMessage,
      mock: true
    });

  } catch (error) {
    console.error('Error processing patient response:', error);
    return NextResponse.json(
      { error: 'Failed to process patient response' },
      { status: 500 }
    );
  }
}

// Schedule follow-up communication
async function scheduleFollowup(patientId: string, episodeId: string, channel: string, condition: string, supabase: any) {
  try {
    // Create a scheduled follow-up task
    const followupMessage = generateFollowupMessage(condition);
    
    // For now, just log the follow-up (in production, this would schedule with a job queue)
    console.log('📅 SCHEDULED FOLLOW-UP:');
    console.log(`Patient: ${patientId}`);
    console.log(`Episode: ${episodeId}`);
    console.log(`Channel: ${channel}`);
    console.log(`Message: ${followupMessage}`);
    console.log('---');

    return NextResponse.json({
      success: true,
      message: 'Follow-up scheduled successfully',
      followupMessage,
      mock: true
    });

  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    return NextResponse.json(
      { error: 'Failed to schedule follow-up' },
      { status: 500 }
    );
  }
}

// Helper functions
async function sendMockSMS(phone: string, message: string, patientId: string, episodeId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/mock-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phone,
      message,
      patientId,
      episodeId
    })
  });
  return response.json();
}

async function sendMockVoice(phone: string, script: string, patientId: string, episodeId: string, condition: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/mock-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phone,
      patientId,
      episodeId,
      script,
      condition
    })
  });
  return response.json();
}

function generateOutreachMessage(condition: string, dischargeDate: string): string {
  const daysSinceDischarge = Math.floor((Date.now() - new Date(dischargeDate).getTime()) / (1000 * 60 * 60 * 24));
  
  const messages = {
    'HF': `Hi! This is your care team checking in. It's been ${daysSinceDischarge} days since your discharge. How are you feeling? Any questions about your heart failure management?`,
    'COPD': `Hello! Your care team here. It's been ${daysSinceDischarge} days since you left the hospital. How's your breathing? Any concerns about your COPD?`,
    'AMI': `Hi there! We're checking in ${daysSinceDischarge} days after your heart attack. How are you doing? Any questions about your recovery?`,
    'PNA': `Hello! Your care team checking in ${daysSinceDischarge} days after your pneumonia treatment. How are you feeling? Any breathing concerns?`
  };
  
  return messages[condition as keyof typeof messages] || `Hi! This is your care team checking in ${daysSinceDischarge} days after your discharge. How are you feeling?`;
}

function generateFollowupMessage(condition: string): string {
  const messages = {
    'HF': "Just a friendly reminder to monitor your weight daily and watch for swelling. Call us if you have any concerns!",
    'COPD': "Remember to use your inhaler as prescribed and avoid triggers. We're here if you need us!",
    'AMI': "Keep taking your medications as prescribed and follow your cardiac rehab plan. Call if you have any chest pain!",
    'PNA': "Continue your breathing exercises and take your medications. Call if you develop fever or worsening cough!"
  };
  
  return messages[condition as keyof typeof messages] || "Just checking in to see how you're doing. Call us if you have any concerns!";
}