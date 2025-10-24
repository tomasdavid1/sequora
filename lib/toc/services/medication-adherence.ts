// Medication Adherence Tracking Service

import { supabaseServer, tocTable } from '../../supabase-server';
import { EpisodeRepository } from '../repositories/episode';
import { EscalationRepository } from '../repositories/escalation';
import { EpisodeMedication, MedicationAdherenceEvent } from '@/types';

export class MedicationAdherenceService {
  // Check pharmacy for medication pickup status
  static async checkPharmacyFillStatus(episodeId: string): Promise<any> {
    const medications = await EpisodeRepository.getMedications(episodeId);
    const results = [];

    for (const med of medications) {
      // TODO: Integrate with pharmacy API (SureScripts, etc.)
      // Mock implementation for now
      const fillStatus = await this.mockPharmacyCheck(med.name);
      
      await supabaseServer.from(tocTable('medication_adherence_event')).insert({
        episode_id: episodeId,
        medication_name: med.name,
        event_type: fillStatus.filled ? 'PICKUP_CONFIRMED' : 'PICKUP_DELAYED',
        source: 'PHARMACY_API',
        details: JSON.stringify(fillStatus),
        occurred_at: new Date().toISOString()
      });

      results.push({
        medication: med.name,
        filled: fillStatus.filled,
        fillDate: fillStatus.fillDate,
        pharmacy: fillStatus.pharmacy
      });

      // Create escalation if not filled after 48h
      if (!fillStatus.filled && this.daysSinceDischarge(episodeId) >= 2) {
        await EscalationRepository.create({
          episode_id: episodeId,
          reason_codes: ['MEDICATION_NOT_FILLED_48H'],
          severity: 'MODERATE',
          priority: 'NORMAL',
          status: 'OPEN',
          sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }

    return results;
  }

  // Log patient-reported adherence
  static async logAdherence(
    episodeId: string,
    medicationName: string,
    taken: boolean,
    reportedAt: Date = new Date()
  ) {
    await supabaseServer.from(tocTable('medication_adherence_event')).insert({
      episode_id: episodeId,
      medication_name: medicationName,
      event_type: taken ? 'DOSE_TAKEN' : 'DOSE_MISSED',
      source: 'PATIENT_REPORTED',
      occurred_at: reportedAt.toISOString()
    });

    // Check adherence rate
    const adherenceRate = await this.calculateAdherenceRate(episodeId, medicationName);
    
    // Alert if adherence < 80%
    if (adherenceRate < 0.8) {
      await EscalationRepository.create({
        episode_id: episodeId,
        reason_codes: ['LOW_MEDICATION_ADHERENCE'],
        severity: 'MODERATE',
        priority: 'NORMAL',
        status: 'OPEN',
        sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }

  // Calculate adherence rate (doses taken / expected doses)
  static async calculateAdherenceRate(
    episodeId: string,
    medicationName: string,
    days: number = 7
  ): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: events } = await supabaseServer
      .from(tocTable('medication_adherence_event'))
      .select('*')
      .eq('episode_id', episodeId)
      .eq('medication_name', medicationName)
      .in('event_type', ['DOSE_TAKEN', 'DOSE_MISSED'])
      .gte('occurred_at', startDate.toISOString());

    if (!events || events.length === 0) return 1.0; // No data = assume adherent

    const taken = events.filter(e => e.event_type === 'DOSE_TAKEN').length;
    const total = events.length;

    return taken / total;
  }

  // Get adherence summary for episode
  static async getAdherenceSummary(episodeId: string) {
    const medications = await EpisodeRepository.getMedications(episodeId);
    const summary = [];

    for (const med of medications) {
      const rate = await this.calculateAdherenceRate(episodeId, med.name);
      const { data: events } = await supabaseServer
        .from(tocTable('medication_adherence_event'))
        .select('*')
        .eq('episode_id', episodeId)
        .eq('medication_name', med.name)
        .order('occurred_at', { ascending: false })
        .limit(1);

      summary.push({
        medication: med.name,
        adherenceRate: Math.round(rate * 100),
        lastEvent: events?.[0] || null,
        filled: events?.[0]?.event_type === 'PICKUP_CONFIRMED'
      });
    }

    return summary;
  }

  private static async daysSinceDischarge(episodeId: string): Promise<number> {
    const episode = await EpisodeRepository.findById(episodeId);
    if (!episode) return 0;
    
    const now = Date.now();
    const discharge = new Date(episode.discharge_at).getTime();
    return Math.floor((now - discharge) / (1000 * 60 * 60 * 24));
  }

  private static async mockPharmacyCheck(medicationName: string): Promise<any> {
    // TODO: Replace with real pharmacy API integration
    const isFilled = Math.random() > 0.3; // 70% filled in mock
    return {
      filled: isFilled,
      fillDate: isFilled ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : null,
      pharmacy: isFilled ? 'CVS Pharmacy #1234' : null
    };
  }
}

