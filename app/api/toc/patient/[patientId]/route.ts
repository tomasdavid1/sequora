import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Episode, Patient, EpisodeMedication, OutreachPlan, OutreachAttempt, EscalationTask } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { patientId } = params;

    // Get patient data with episode information
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select(`
        id,
        condition_code,
        discharge_at,
        Patient (
          id,
          first_name,
          last_name,
          primary_phone,
          email
        ),
        EpisodeMedication (
          id,
          name,
          dose,
          frequency,
          instructions
        ),
        Appointment (
          id,
          type,
          start_at,
          provider_name,
          status
        ),
        OutreachPlan (
          id,
          window_start_at,
          window_end_at,
          OutreachAttempt (
            id,
            scheduled_at,
            completed_at,
            status
          )
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const patient = episode.Patient;
    const daysSinceDischarge = Math.floor(
      (new Date().getTime() - new Date(episode.discharge_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get education content for the condition
    const educationContent = getEducationContent(episode.condition_code);

    // Get patient questions
    const { data: questions, error: questionsError } = await supabase
      .from('CommunicationMessage')
      .select('*')
      .eq('episode_id', episode.id)
      .eq('direction', 'INBOUND')
      .order('created_at', { ascending: false })
      .limit(10);

    // Determine risk level
    let riskLevel = 'LOW';
    if (daysSinceDischarge > 21) {
      riskLevel = 'HIGH';
    } else if (daysSinceDischarge > 14) {
      riskLevel = 'MEDIUM';
    }

    // Get next and last check-ins
    const outreachAttempts = episode.OutreachPlan?.[0]?.OutreachAttempt || [];
    const lastCheckIn = outreachAttempts
      .filter(attempt => attempt.status === 'COMPLETED')
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];

    const nextCheckIn = outreachAttempts
      .filter(attempt => attempt.status === 'PENDING' || attempt.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

    const patientData = {
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`,
      condition: episode.condition_code,
      conditionName: getConditionName(episode.condition_code),
      dischargeDate: episode.discharge_at,
      daysSinceDischarge,
      nextCheckIn: nextCheckIn?.scheduled_at || null,
      lastCheckIn: lastCheckIn?.completed_at || null,
      riskLevel,
      medications: episode.EpisodeMedication?.map(med => 
        `${med.name}${med.dose ? ` - ${med.dose}` : ''}${med.frequency ? ` (${med.frequency})` : ''}`
      ) || [],
      appointments: episode.Appointment?.map(apt => ({
        id: apt.id,
        type: apt.type,
        date: apt.start_at,
        provider: apt.provider_name || 'Provider',
        status: apt.status
      })) || []
    };

    return NextResponse.json({
      success: true,
      patient: patientData,
      education: educationContent
    });

  } catch (error) {
    console.error('Error fetching patient data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getConditionName(condition: string): string {
  switch (condition) {
    case 'HF': return 'Heart Failure';
    case 'COPD': return 'Chronic Obstructive Pulmonary Disease';
    case 'AMI': return 'Acute Myocardial Infarction (Heart Attack)';
    case 'PNA': return 'Pneumonia';
    default: return 'Condition';
  }
}

function getEducationContent(condition: string) {
  const educationContent = {
    HF: {
      condition: 'HF',
      title: 'Understanding Heart Failure',
      level: 'BASIC',
      content: `Heart failure means your heart isn't pumping blood as well as it should. This doesn't mean your heart has stopped working, but it needs some help.

Key things to know:
• Take your medications exactly as prescribed
• Weigh yourself daily at the same time
• Watch for swelling in your feet, ankles, or legs
• Call your doctor if you gain 3+ pounds in a day or 5+ pounds in a week
• Limit salt in your diet
• Stay active but don't overdo it

Warning signs to watch for:
• Shortness of breath that's getting worse
• Swelling that's new or getting worse
• Feeling more tired than usual
• Coughing or wheezing
• Feeling dizzy or lightheaded

If you experience any of these warning signs, contact your healthcare team immediately.`,
      topics: [
        'Medication Management',
        'Daily Weight Monitoring',
        'Diet and Nutrition',
        'Exercise Guidelines',
        'Warning Signs',
        'When to Call Your Doctor'
      ]
    },
    COPD: {
      condition: 'COPD',
      title: 'Living with COPD',
      level: 'BASIC',
      content: `COPD (Chronic Obstructive Pulmonary Disease) makes it harder to breathe. With proper care, you can manage your symptoms and stay active.

Important daily habits:
• Use your inhalers as prescribed
• Avoid smoke and air pollution
• Stay active with gentle exercises
• Eat a healthy diet
• Get your flu and pneumonia vaccines
• Practice breathing exercises

Managing flare-ups:
• Know your triggers (smoke, dust, cold air, infections)
• Have a plan for when symptoms get worse
• Keep your rescue inhaler with you
• Call your doctor if symptoms don't improve

Breathing techniques:
• Pursed-lip breathing: Breathe in through your nose, then breathe out slowly through pursed lips
• Diaphragmatic breathing: Focus on breathing with your belly, not your chest

Remember: Even small improvements in your breathing can make a big difference in your daily life.`,
      topics: [
        'Inhaler Use',
        'Breathing Techniques',
        'Exercise and Activity',
        'Avoiding Triggers',
        'Managing Flare-ups',
        'Vaccinations'
      ]
    },
    AMI: {
      condition: 'AMI',
      title: 'Recovery After Heart Attack',
      level: 'BASIC',
      content: `Recovering from a heart attack takes time and patience. Your heart is healing, and with proper care, you can return to a healthy, active life.

Recovery timeline:
• First few weeks: Focus on rest and gentle activity
• 4-6 weeks: Gradual increase in activity
• 6-12 weeks: Return to most normal activities
• Ongoing: Maintain heart-healthy lifestyle

Medication importance:
• Take all medications exactly as prescribed
• Don't stop medications without talking to your doctor
• Keep a list of all your medications
• Know what each medication does

Lifestyle changes:
• Quit smoking if you smoke
• Eat a heart-healthy diet (low salt, low fat)
• Exercise regularly as approved by your doctor
• Manage stress
• Control other health conditions (diabetes, high blood pressure)

Warning signs of another heart attack:
• Chest pain or pressure
• Pain in arms, back, neck, or jaw
• Shortness of breath
• Nausea or vomiting
• Cold sweat
• Feeling lightheaded

If you experience these symptoms, call 911 immediately.`,
      topics: [
        'Recovery Timeline',
        'Medication Management',
        'Lifestyle Changes',
        'Exercise Guidelines',
        'Warning Signs',
        'Emergency Response'
      ]
    },
    PNA: {
      condition: 'PNA',
      title: 'Recovering from Pneumonia',
      level: 'BASIC',
      content: `Pneumonia is an infection in your lungs that can make breathing difficult. Recovery takes time, but most people fully recover with proper care.

Recovery process:
• Rest is important - don't rush your recovery
• Take all antibiotics exactly as prescribed
• Drink plenty of fluids
• Use a humidifier to help with breathing
• Practice deep breathing exercises

When to call your doctor:
• Fever returns or gets worse
• Breathing becomes more difficult
• Chest pain gets worse
• You're coughing up blood
• You feel confused or disoriented
• You can't keep food or fluids down

Preventing future infections:
• Get your flu shot every year
• Get the pneumonia vaccine as recommended
• Wash your hands frequently
• Avoid close contact with sick people
• Don't smoke
• Eat a healthy diet
• Get enough sleep

Remember: It's normal to feel tired for several weeks after pneumonia. Listen to your body and don't push yourself too hard.`,
      topics: [
        'Recovery Process',
        'Medication Adherence',
        'Breathing Exercises',
        'When to Call Doctor',
        'Prevention',
        'Rest and Recovery'
      ]
    }
  };

  return educationContent[condition as keyof typeof educationContent] || {
    condition,
    title: 'General Health Information',
    level: 'BASIC',
    content: 'Please consult with your healthcare provider for specific information about your condition.',
    topics: ['General Health']
  };
}
