// Triage Agent
// Applies red-flag rules, creates escalation tasks with severity and SLA

import { supabaseServer } from '@/lib/supabase-server';
import { EscalationRepository } from '../repositories/escalation';
import { RedFlagRule, OutreachResponse, EscalationTask, RedFlagSeverity, ConditionCode } from '@/types';

interface TriageContext {
  attemptId: string;
  episodeId: string;
  conditionCode: string;
  responses: any[];
}

export class TriageAgent {
  private agentId: string;

  constructor() {
    // Get agent ID from environment variable
    this.agentId = process.env.AGENT_TRIAGE_ID || 'default-triage';
  }

  async evaluate(context: TriageContext): Promise<void> {
    console.log(`[Triage] Evaluating ${context.responses.length} responses for ${context.conditionCode}`);

    // Fetch active red flag rules for this condition
    const { data: rules } = await supabaseServer
      .from('RedFlagRule')
      .select('*')
      .eq('condition_code', context.conditionCode as any)
      .eq('active', true);

    if (!rules || rules.length === 0) {
      console.log(`[Triage] No rules configured for ${context.conditionCode}`);
      return;
    }

    const triggeredRules: any[] = [];

    // Evaluate each response against applicable rules
    for (const response of context.responses) {
      const applicableRules = rules.filter(
        rule => (rule.logic_spec as any)?.question_code === response.question_code
      );

      for (const rule of applicableRules) {
        if (this.evaluateRule(rule, response)) {
          triggeredRules.push(rule);
          console.log(`[Triage] Rule triggered: ${rule.rule_code} (${rule.severity})`);

          // Update response with red flag info
          await supabaseServer
            .from('OutreachResponse')
            .update({
              red_flag_severity: rule.severity as any,
              red_flag_code: rule.rule_code
            })
            .eq('outreach_attempt_id', context.attemptId)
            .eq('question_code', response.question_code);
        }
      }
    }

    // Create escalation task if any rules triggered
    if (triggeredRules.length > 0) {
      const maxSeverity = this.getMaxSeverity(triggeredRules.map(r => r.severity));
      const reasonCodes = triggeredRules.map(r => r.rule_code);

      const task = await EscalationRepository.create({
        episode_id: context.episodeId,
        source_attempt_id: context.attemptId,
        reason_codes: reasonCodes,
        severity: maxSeverity as any,
        priority: this.severityToPriority(maxSeverity) as any,
        status: 'OPEN' as any,
        sla_due_at: this.calculateSLADue(maxSeverity)
      } as any);

      console.log(`[Triage] Created ${maxSeverity} task: ${task.id}`);

      // Create agent interaction record for triage decision
      await supabaseServer.from('AgentInteraction').insert({
        agent_config_id: this.agentId,
        episode_id: context.episodeId,
        patient_id: null, // Triage is system-level, not patient-facing
        interaction_type: 'TRIAGE_EVALUATION',
        status: 'COMPLETED',
        outreach_attempt_id: context.attemptId,
        metadata: {
          triggered_rules: triggeredRules.map(r => r.rule_code),
          max_severity: maxSeverity,
          escalation_task_id: task.id
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
    } else {
      console.log(`[Triage] No red flags detected`);
    }
  }

  // Rule evaluation logic
  private evaluateRule(rule: any, response: any): boolean {
    const logicSpec = rule.logic_spec as any;
    if (!logicSpec) return false;
    
    const { operator, threshold, value } = logicSpec;

    // Handle numeric comparisons
    if (response.value_number !== null && response.value_number !== undefined) {
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
    if (response.value_choice) {
      return operator === '=' && response.value_choice === value;
    }

    return false;
  }

  // Severity helpers
  private getMaxSeverity(severities: RedFlagSeverity[]): RedFlagSeverity {
    const order: RedFlagSeverity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'NONE'];
    for (const sev of order) {
      if (severities.includes(sev)) return sev;
    }
    return 'NONE';
  }

  private severityToPriority(severity: RedFlagSeverity): 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' {
    switch (severity) {
      case 'CRITICAL': return 'URGENT';
      case 'HIGH': return 'HIGH';
      case 'MODERATE': return 'NORMAL';
      default: return 'LOW';
    }
  }

  private calculateSLADue(severity: RedFlagSeverity): string {
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

