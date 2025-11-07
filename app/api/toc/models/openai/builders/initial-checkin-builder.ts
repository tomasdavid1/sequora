/**
 * Initial Check-In Message Builder
 * 
 * Generates personalized, context-aware initial outreach messages for patients.
 * Used for scheduled check-ins, follow-ups, and initial post-discharge contact.
 * 
 * This is separate from response-prompt-builder because:
 * - No patient input to respond to yet
 * - Different tone (initiating vs. responding)
 * - Includes past interaction summaries
 * - Condition-specific opening messages
 */

import { Database } from '@/database.types';
import callOpenAI from '../openai-wrapper';

type ConditionCode = Database['public']['Enums']['condition_code'];
type RiskLevel = Database['public']['Enums']['risk_level'];
type EducationLevel = Database['public']['Enums']['education_level'];
type LanguageCode = Database['public']['Enums']['language_code'];

export interface InitialCheckInParams {
  patientFirstName: string;
  conditionCode: ConditionCode;
  riskLevel: RiskLevel;
  educationLevel: EducationLevel;
  preferredLanguage?: LanguageCode;
  daysSinceDischarge: number;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
  }>;
  previousInteractionSummaries?: string[]; // Summaries from past check-ins
  isFirstContact: boolean; // True if this is the very first contact post-discharge
  facilityName?: string;
  dischargeDate?: string;
}

/**
 * Generate an initial check-in message using OpenAI
 * 
 * @param params - Patient context and check-in parameters
 * @returns Personalized check-in message
 */
export async function generateInitialCheckInMessage(
  params: InitialCheckInParams
): Promise<string> {
  const systemPrompt = buildInitialCheckInPrompt(params);

  try {
    const result = await callOpenAI({
      params: {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: 'Generate the initial check-in message now.',
          },
        ],
        temperature: 0.7, // Slightly higher for natural, warm tone
        max_tokens: 200,
      },
      validation: {
        requireTextContent: true, // MUST have text - this is the initial patient message
        requireValidJson: false,
        allowToolCalls: false // No tool calls for initial messages
      },
      retry: {
        maxAttempts: 2,
        enableFallback: false // No fallback - initial message must work
      },
      operationLabel: 'Generate Initial Check-In'
    });

    const message = result.textContent;

    if (!message) {
      throw new Error('OpenAI returned no content for initial check-in message');
    }

    return message.trim();
  } catch (error) {
    console.error('❌ Error generating initial check-in message:', error);
    throw new Error(`Failed to generate initial check-in message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build the system prompt for initial check-in message generation
 */
function buildInitialCheckInPrompt(params: InitialCheckInParams): string {
  const {
    patientFirstName,
    conditionCode,
    riskLevel,
    educationLevel,
    preferredLanguage = 'EN',
    daysSinceDischarge,
    medications = [],
    previousInteractionSummaries = [],
    isFirstContact,
    facilityName,
  } = params;

  // Condition-specific context
  const conditionContext = getConditionContext(conditionCode);

  // Education level guidance
  const educationGuidance = {
    LOW: 'Use very simple words (5th grade level). Short sentences. No medical jargon. Be extra reassuring and warm.',
    MEDIUM: 'Use clear everyday language. Some medical terms OK if briefly explained. Conversational tone.',
    HIGH: 'Medical terminology is fine. Can be more direct and informative.',
  }[educationLevel];

  // Language
  const languageNote = preferredLanguage === 'ES' 
    ? 'IMPORTANT: Generate the ENTIRE message in Spanish. Use "Hola" instead of "Hi".'
    : 'Generate the message in English.';

  // Previous interaction context
  const historyContext = previousInteractionSummaries.length > 0
    ? `\n\n=== PREVIOUS CHECK-INS ===
${previousInteractionSummaries.map((summary, i) => `${i + 1}. ${summary}`).join('\n')}

Use this context to reference past issues naturally (e.g., "How's the swelling doing?" or "Any improvement with your breathing?").`
    : '';

  // Medications context
  const medsContext = medications.length > 0
    ? `\n\n=== PATIENT MEDICATIONS ===
${medications.map(med => `- ${med.name}${med.dosage ? ' ' + med.dosage : ''}${med.frequency ? ', ' + med.frequency : ''}`).join('\n')}

You may briefly mention medication adherence if relevant to the condition.`
    : '';

  return `You are Sarah, a warm and professional post-discharge care coordinator for Sequora Health.

=== YOUR TASK ===
Generate a personalized initial check-in message for ${patientFirstName} who was discharged ${daysSinceDischarge} days ago${facilityName ? ` from ${facilityName}` : ''}.

=== PATIENT CONTEXT ===
- Condition: ${conditionCode} (${conditionContext.name})
- Risk Level: ${riskLevel}
- Education Level: ${educationLevel}
- Days Since Discharge: ${daysSinceDischarge}
- Is First Contact: ${isFirstContact ? 'YES - This is the very first time reaching out' : 'NO - This is a follow-up check-in'}

${languageNote}

=== EDUCATION LEVEL GUIDANCE ===
${educationGuidance}

=== CONDITION-SPECIFIC FOCUS ===
${conditionContext.focusAreas}
${medsContext}
${historyContext}

=== MESSAGE REQUIREMENTS ===

1. **Opening** (Choose based on context):
   ${isFirstContact 
     ? `- First contact: Introduce yourself warmly as Sarah from Sequora
   - Explain you'll be checking in regularly during their recovery
   - Acknowledge their recent discharge`
     : `- Follow-up: Greet them warmly (they know you)
   - Reference it's been ${daysSinceDischarge} days since discharge
   - ${previousInteractionSummaries.length > 0 ? 'Reference past concerns naturally' : 'Ask how they\'ve been doing'}`
   }

2. **Main Question**:
   - Ask how they're feeling in a natural, conversational way
   - Focus on ${conditionContext.keySymptoms.join(', ')}
   - Keep it open-ended to encourage detailed responses

3. **Tone**:
   - Warm, caring, professional
   - Not robotic or overly formal
   - Appropriate for ${educationLevel} education level
   - Encourage them to share concerns

4. **Length**: 
   - 2-3 sentences maximum
   - SMS-friendly (under 160 characters if possible)
   - Clear and easy to respond to

5. **DO NOT**:
   - Ask multiple questions at once
   - Use medical jargon (unless HIGH education level)
   - Sound like a form letter
   - Ask yes/no questions (we want detailed responses)

=== EXAMPLE STRUCTURE ===
${isFirstContact 
  ? `"Hi ${patientFirstName}, this is Sarah from Sequora. I'll be checking in with you regularly after your recent discharge. How are you feeling today?"`
  : `"Hi ${patientFirstName}, it's Sarah checking in. ${previousInteractionSummaries.length > 0 ? '[Reference past concern]. ' : ''}How have you been feeling since we last talked?"`
}

Generate the message now. Output ONLY the message text, no explanations or meta-commentary.`;
}

/**
 * Get condition-specific context for message personalization
 */
function getConditionContext(conditionCode: string): {
  name: string;
  focusAreas: string;
  keySymptoms: string[];
} {
  const contexts: Record<string, any> = {
    HF: {
      name: 'Heart Failure',
      focusAreas: 'Focus on: shortness of breath, swelling, weight changes, fatigue, medication adherence.',
      keySymptoms: ['breathing', 'swelling', 'weight', 'energy levels'],
    },
    COPD: {
      name: 'COPD',
      focusAreas: 'Focus on: breathing difficulty, cough, mucus, energy levels, oxygen use, medication adherence.',
      keySymptoms: ['breathing', 'cough', 'mucus', 'activity tolerance'],
    },
    AMI: {
      name: 'Heart Attack (AMI)',
      focusAreas: 'Focus on: chest pain/discomfort, shortness of breath, fatigue, medication adherence, cardiac rehab.',
      keySymptoms: ['chest discomfort', 'breathing', 'energy', 'pain'],
    },
    PNA: {
      name: 'Pneumonia',
      focusAreas: 'Focus on: breathing, cough, fever, fatigue, appetite, medication completion.',
      keySymptoms: ['breathing', 'cough', 'fever', 'energy'],
    },
    OTHER: {
      name: 'Post-Discharge Care',
      focusAreas: 'Focus on: general recovery, symptoms, medication adherence, any concerns.',
      keySymptoms: ['overall health', 'symptoms', 'recovery progress'],
    },
  };

  return contexts[conditionCode] || contexts.OTHER;
}
