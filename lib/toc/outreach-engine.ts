// Outreach engine: evaluates responses against red flag rules and creates escalation tasks

import { supabaseServer, tocTable } from '../supabase-server';
import { EscalationRepository } from './repositories/escalation';
import { OutreachResponse, RedFlagRule, RedFlagSeverity, ConditionCode, EscalationTask } from '@/types';

interface EvaluationResult {
  hasRedFlags: boolean;
  triggeredRules: RedFlagRule[];
  maxSeverity: RedFlagSeverity;
}

export class OutreachEngine {
  // Evaluate all responses for an attempt against catalog rules
  static async evaluateResponses(
    attemptId: string,
    episodeId: string,
    conditionCode: string,
    responses: OutreachResponse[]
  ): Promise<EvaluationResult> {
    // Fetch active red flag rules for this condition
    const { data: rules, error } = await supabaseServer
      .from(tocTable('redflag_rule'))
      .select('*')
      .eq('condition_code', conditionCode)
      .eq('active', true);

    if (error || !rules) {
      console.error('Failed to fetch red flag rules:', error);
      return { hasRedFlags: false, triggeredRules: [], maxSeverity: 'NONE' };
    }

    const triggeredRules: RedFlagRule[] = [];

    // Evaluate each response against applicable rules
    for (const response of responses) {
      const applicableRules = rules.filter(
        rule => rule.logic_spec.question_code === response.question_code
      );

      for (const rule of applicableRules) {
        if (this.evaluateRule(rule, response)) {
          triggeredRules.push(rule);
          
          // Update response with red flag info
          await supabaseServer
            .from(tocTable('outreach_response'))
            .update({
              redflag_severity: rule.severity,
              redflag_code: rule.rule_code
            })
            .eq('id', response.id);
        }
      }
    }

    if (triggeredRules.length > 0) {
      // Create escalation task
      const maxSeverity = this.getMaxSeverity(triggeredRules.map(r => r.severity));
      const reasonCodes = triggeredRules.map(r => r.rule_code);

      await EscalationRepository.create({
        episode_id: episodeId,
        source_attempt_id: attemptId,
        reason_codes: reasonCodes,
        severity: maxSeverity,
        priority: this.severityToPriority(maxSeverity),
        status: 'OPEN',
        sla_due_at: this.calculateSLADue(maxSeverity)
      });

      return {
        hasRedFlags: true,
        triggeredRules,
        maxSeverity
      };
    }

    return { hasRedFlags: false, triggeredRules: [], maxSeverity: 'NONE' };
  }

  // Evaluate a single rule against a response
  private static evaluateRule(rule: RedFlagRule, response: OutreachResponse): boolean {
    const { operator, threshold, value } = rule.logic_spec;

    // Handle numeric comparisons
    if (response.response_type === 'NUMERIC' && response.value_number !== null) {
      const num = response.value_number;
      switch (operator) {
        case '>=': return num >= threshold;
        case '>': return num > threshold;
        case '<=': return num <= threshold;
        case '<': return num < threshold;
        case '=': return num === threshold;
        default: return false;
      }
    }

    // Handle YES/NO responses
    if (response.response_type === 'YES_NO') {
      return operator === '=' && response.value_choice === value;
    }

    // Handle choice responses
    if (response.response_type === 'SINGLE_CHOICE') {
      return operator === '=' && response.value_choice === value;
    }

    return false;
  }

  private static getMaxSeverity(severities: RedFlagSeverity[]): RedFlagSeverity {
    const order: RedFlagSeverity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'NONE'];
    for (const sev of order) {
      if (severities.includes(sev)) return sev;
    }
    return 'NONE';
  }

  private static severityToPriority(severity: RedFlagSeverity): 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' {
    switch (severity) {
      case 'CRITICAL': return 'URGENT';
      case 'HIGH': return 'HIGH';
      case 'MODERATE': return 'NORMAL';
      default: return 'LOW';
    }
  }

  private static calculateSLADue(severity: RedFlagSeverity): string {
    const slaDurations: Record<RedFlagSeverity, number> = {
      CRITICAL: 30,    // 30 minutes
      HIGH: 120,       // 2 hours
      MODERATE: 1440,  // 24 hours
      LOW: 2880,       // 48 hours
      NONE: 2880
    };

    const minutes = slaDurations[severity];
    const dueDate = new Date(Date.now() + minutes * 60 * 1000);
    return dueDate.toISOString();
  }
}

