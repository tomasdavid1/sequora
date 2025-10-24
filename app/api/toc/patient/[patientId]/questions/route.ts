import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const { patientId } = params;
    const body = await request.json();
    const { question } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Get patient's latest episode
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select('id, condition_code')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Patient episode not found' },
        { status: 404 }
      );
    }

    // Analyze the question to determine if it should be escalated
    const shouldEscalate = await analyzeQuestionForEscalation(question, episode.condition_code);
    
    let answer = '';
    let status = 'ANSWERED';
    let escalated = false;

    if (shouldEscalate) {
      // Create escalation task
      await supabase
        .from('EscalationTask')
        .insert({
          episode_id: episode.id,
          reason_codes: ['PATIENT_QUESTION_ESCALATION'],
          severity: 'MODERATE',
          priority: 'NORMAL',
          status: 'OPEN',
          sla_due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      status = 'ESCALATED';
      escalated = true;
      answer = 'Your question has been escalated to a nurse. You will receive a call within 2 hours.';
    } else {
      // Generate AI response
      answer = await generateAIResponse(question, episode.condition_code);
    }

    // Create communication message
    const { data: message, error: messageError } = await supabase
      .from('CommunicationMessage')
      .insert({
        episode_id: episode.id,
        patient_id: patientId,
        direction: 'INBOUND',
        channel: 'APP',
        template_code: 'PATIENT_QUESTION',
        body_hash: `question_${Date.now()}`,
        contains_phi: true,
        status: 'RESPONDED',
        responded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating communication message:', messageError);
      return NextResponse.json(
        { error: 'Failed to log question' },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase
      .from('AuditLog')
      .insert({
        actor_type: 'PATIENT',
        action: 'CREATE',
        entity_type: 'CommunicationMessage',
        entity_id: message.id,
        metadata: {
          question: question,
          escalated: escalated,
          condition: episode.condition_code
        },
        occurred_at: new Date().toISOString()
      });

    const questionData = {
      id: message.id,
      text: question,
      timestamp: message.created_at,
      status: status,
      answer: answer
    };

    return NextResponse.json({
      success: true,
      question: questionData,
      escalated: escalated
    });

  } catch (error) {
    console.error('Error processing patient question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function analyzeQuestionForEscalation(question: string, condition: string): Promise<boolean> {
  // Simple keyword-based escalation logic
  // In a real implementation, this would use a more sophisticated NLP model
  
  const urgentKeywords = [
    'chest pain', 'chest pressure', 'heart attack', 'stroke',
    'can\'t breathe', 'shortness of breath', 'emergency',
    'severe pain', 'bleeding', 'fever', 'confusion',
    'dizzy', 'fainting', 'unconscious'
  ];

  const medicationKeywords = [
    'medication', 'medicine', 'drug', 'pill', 'dosage',
    'side effect', 'allergic', 'interaction'
  ];

  const questionLower = question.toLowerCase();

  // Always escalate urgent keywords
  if (urgentKeywords.some(keyword => questionLower.includes(keyword))) {
    return true;
  }

  // Escalate medication questions for safety
  if (medicationKeywords.some(keyword => questionLower.includes(keyword))) {
    return true;
  }

  // Escalate if question is very long (might be complex)
  if (question.length > 200) {
    return true;
  }

  // For now, escalate 30% of questions to ensure human oversight
  return Math.random() < 0.3;
}

async function generateAIResponse(question: string, condition: string): Promise<string> {
  // Simple template-based responses
  // In a real implementation, this would use an LLM with condition-specific knowledge
  
  const responses = {
    HF: [
      "For heart failure, it's important to monitor your weight daily and watch for swelling. If you have concerns about your symptoms, please contact your healthcare team.",
      "Remember to take your medications as prescribed and follow your low-sodium diet. Any changes in your breathing or swelling should be reported to your doctor.",
      "Heart failure management focuses on medication adherence, daily weight monitoring, and recognizing warning signs. Contact your care team if symptoms worsen."
    ],
    COPD: [
      "For COPD, it's important to use your inhalers as prescribed and avoid triggers like smoke and air pollution. Practice your breathing exercises regularly.",
      "COPD management includes proper inhaler technique, staying active within your limits, and knowing when to seek help for breathing difficulties.",
      "Remember to keep your rescue inhaler with you and use it as directed. Contact your doctor if you experience increased shortness of breath."
    ],
    AMI: [
      "After a heart attack, recovery takes time. Follow your medication schedule, eat a heart-healthy diet, and gradually increase your activity as approved by your doctor.",
      "Heart attack recovery involves medication adherence, lifestyle changes, and recognizing warning signs of another heart attack. Call 911 for chest pain or pressure.",
      "Take your recovery one day at a time. Follow your doctor's recommendations for activity, diet, and medications. Don't hesitate to call if you have concerns."
    ],
    PNA: [
      "Pneumonia recovery requires rest, proper hydration, and taking all antibiotics as prescribed. Contact your doctor if symptoms worsen or return.",
      "Focus on getting plenty of rest and fluids. Use breathing exercises to help clear your lungs. Call your doctor if you develop a fever or increased breathing difficulty.",
      "Pneumonia recovery can take several weeks. Be patient with yourself and don't rush your recovery. Contact your healthcare team if you have concerns."
    ]
  };

  const conditionResponses = responses[condition as keyof typeof responses] || [
    "Thank you for your question. For specific medical advice, please contact your healthcare provider directly.",
    "I understand your concern. Please reach out to your care team for personalized medical guidance.",
    "Your question is important. For the best medical advice, please consult with your healthcare provider."
  ];

  // Return a random response for the condition
  return conditionResponses[Math.floor(Math.random() * conditionResponses.length)];
}
