// Condition Dialogue Agent
// Runs scripted check-ins per condition, collects responses

import { supabaseServer } from '@/lib/supabase-server';
import { OutreachRepository } from '../repositories/outreach';
import { TriageAgent } from './triage';
import { 
  Episode, 
  Patient, 
  OutreachAttempt, 
  OutreachResponse, 
  OutreachQuestion,
  ConditionCode,
  LanguageCode,
  ContactChannel
} from '@/types';
import OpenAI from 'openai';

interface DialogueContext {
  interactionId: string;
  episodeId: string;
  patientId: string;
  conditionCode: string;
  languageCode: string;
  channel: string;
  attemptId: string;
}

interface DialogueResult {
  success: boolean;
  connected: boolean;
  messageCount: number;
  responses: any[];
}

export class ConditionDialogueAgent {
  private agentId: string;
  private openai: OpenAI;

  constructor() {
    // Get agent ID from environment variable
    this.agentId = process.env.AGENT_CONDITION_DIALOGUE_ID || 'default-dialogue';
    this.openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });
  }

  async execute(context: DialogueContext): Promise<DialogueResult> {
    console.log(`[ConditionDialogue] Starting ${context.conditionCode} dialogue for patient ${context.patientId}`);

    // Fetch condition-specific questions
    const { data: questions } = await supabaseServer
      .from('OutreachQuestion')
      .select('*')
      .eq('condition_code', context.conditionCode as any)
      .eq('language_code', context.languageCode as any)
      .eq('active', true)
      .order('created_at');

    if (!questions || questions.length === 0) {
      console.error(`[ConditionDialogue] No questions found`);
      return { success: false, connected: false, messageCount: 0, responses: [] };
    }

    // Get agent configuration
    const { data: agentConfig } = await supabaseServer
      .from('AgentConfig')
      .select('*')
      .eq('agent_type', 'OUTREACH_COORDINATOR')
      .eq('active', true)
      .single();

    const responses: any[] = [];
    let messageCount = 0;

    // Execute dialogue based on channel
    if (context.channel === 'SMS') {
      const result = await this.executeSMSDialogue(context, questions, agentConfig);
      responses.push(...result.responses);
      messageCount = result.messageCount;
    } else if (context.channel === 'VOICE') {
      const result = await this.executeVoiceDialogue(context, questions, agentConfig);
      responses.push(...result.responses);
      messageCount = result.messageCount;
    }

    // Save responses to database
    for (const response of responses) {
      await OutreachRepository.addResponse(context.attemptId, response);
    }

    // Hand off to triage agent to evaluate responses
    const triageAgent = new TriageAgent();
    await triageAgent.evaluate({
      attemptId: context.attemptId,
      episodeId: context.episodeId,
      conditionCode: context.conditionCode,
      responses
    });

    return {
      success: responses.length > 0,
      connected: true,
      messageCount,
      responses
    };
  }

  // SMS dialogue flow (forced-choice)
  private async executeSMSDialogue(
    context: DialogueContext,
    questions: any[],
    agentConfig: any
  ): Promise<{ responses: any[]; messageCount: number }> {
    const responses: any[] = [];
    let messageCount = 0;

    // Send greeting
    await this.sendMessage(context.interactionId, 'AGENT', this.getGreeting(context.languageCode));
    messageCount++;

    // Iterate through questions
    for (const question of questions) {
      // Send question
      const questionText = this.formatQuestion(question, context.languageCode);
      await this.sendMessage(context.interactionId, 'AGENT', questionText);
      messageCount++;

      // Mock patient response (TODO: integrate with real SMS provider)
      const patientResponse = await this.mockPatientResponse(question);
      await this.sendMessage(context.interactionId, 'PATIENT', patientResponse.text);
      messageCount++;

      // Parse response
      const parsedResponse = await this.parseResponse(question, patientResponse.text, agentConfig);
      
      responses.push({
        question_code: question.code,
        question_version: question.version,
        response_type: question.response_type,
        ...parsedResponse,
        captured_at: new Date().toISOString(),
        redflag_severity: 'NONE' // Will be updated by triage agent
      });
    }

    // Send closing
    await this.sendMessage(context.interactionId, 'AGENT', this.getClosing(context.languageCode));
    messageCount++;

    return { responses, messageCount };
  }

  // Voice dialogue flow (IVR-style)
  private async executeVoiceDialogue(
    context: DialogueContext,
    questions: any[],
    agentConfig: any
  ): Promise<{ responses: any[]; messageCount: number }> {
    // Similar to SMS but with voice-specific formatting
    // TODO: Integrate with Twilio Voice API
    console.log(`[ConditionDialogue] Voice dialogue not yet implemented, falling back to SMS`);
    return this.executeSMSDialogue(context, questions, agentConfig);
  }

  // Use LLM to parse free-text responses
  private async parseResponse(question: any, responseText: string, agentConfig: any): Promise<any> {
    // For forced-choice questions (YES_NO, SINGLE_CHOICE)
    if (question.response_type === 'YES_NO') {
      const normalized = responseText.toLowerCase();
      if (normalized.includes('yes') || normalized.includes('1') || normalized.includes('sí')) {
        return { value_choice: 'YES' };
      }
      if (normalized.includes('no') || normalized.includes('2')) {
        return { value_choice: 'NO' };
      }
    }

    // For numeric responses
    if (question.response_type === 'NUMERIC') {
      const match = responseText.match(/\d+(\.\d+)?/);
      if (match) {
        return { value_number: parseFloat(match[0]) };
      }
    }

    // For free text, use LLM to extract intent
    try {
      const completion = await this.openai.chat.completions.create({
        model: agentConfig?.model || 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `Extract the answer from the patient's response to: "${question.text}". 
Response type: ${question.response_type}. 
Return JSON with either value_choice (YES/NO), value_number, or value_text.`
          },
          {
            role: 'user',
            content: responseText
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      });

      const parsed = JSON.parse(completion.choices[0].message.content || '{}');
      return parsed;
    } catch (error) {
      console.error('[ConditionDialogue] Failed to parse response with LLM:', error);
      return { value_text: responseText };
    }
  }

  // Message helpers
  private async sendMessage(interactionId: string, role: string, content: string): Promise<void> {
    // Get the current message count for this interaction to set sequence_number
    const { data: existingMessages } = await supabaseServer
      .from('AgentMessage')
      .select('sequence_number')
      .eq('agent_interaction_id', interactionId)
      .order('sequence_number', { ascending: false })
      .limit(1);
    
    const nextSequence = existingMessages && existingMessages.length > 0 
      ? existingMessages[0].sequence_number + 1 
      : 1;

    await supabaseServer.from('AgentMessage').insert({
      agent_interaction_id: interactionId,
      role,
      content,
      contains_phi: role === 'PATIENT', // Patient messages may contain PHI
      timestamp: new Date().toISOString(),
      message_type: 'TEXT',
      sequence_number: nextSequence
    });
  }

  private getGreeting(languageCode: string): string {
    return languageCode === 'ES'
      ? 'Hola, este es un chequeo de su equipo de atención. ¿Tiene unos minutos?'
      : 'Hi, this is a check-in from your care team. Do you have a few minutes?';
  }

  private getClosing(languageCode: string): string {
    return languageCode === 'ES'
      ? 'Gracias por completar este chequeo. Si tiene alguna preocupación urgente, llame al 911. ¡Cuídese!'
      : 'Thank you for completing this check-in. If you have any urgent concerns, please call 911. Take care!';
  }

  private formatQuestion(question: any, languageCode: string): string {
    let text = question.text;
    
    if (question.response_type === 'YES_NO') {
      text += languageCode === 'ES'
        ? ' Responda 1 para sí, 2 para no.'
        : ' Reply 1 for yes, 2 for no.';
    } else if (question.response_type === 'NUMERIC') {
      text += languageCode === 'ES'
        ? ' Responda con un número.'
        : ' Reply with a number.';
    }

    return text;
  }

  // Mock patient response (replace with real SMS integration)
  private async mockPatientResponse(question: any): Promise<{ text: string }> {
    // Simulate realistic patient responses
    if (question.response_type === 'YES_NO') {
      return { text: Math.random() > 0.3 ? '2' : '1' }; // 70% no, 30% yes
    }
    if (question.response_type === 'NUMERIC') {
      if (question.code.includes('WEIGHT')) {
        return { text: String(Math.floor(Math.random() * 10)) }; // 0-10 lbs
      }
      if (question.code.includes('RESCUE_USE')) {
        return { text: String(Math.floor(Math.random() * 6)) }; // 0-5 times
      }
    }
    return { text: 'Okay' };
  }
}

