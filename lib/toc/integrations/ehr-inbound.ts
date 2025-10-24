// EHR Inbound Integration - Parse ADT feeds and create episodes

import { PatientRepository } from '../repositories/patient';
import { EpisodeRepository } from '../repositories/episode';
import { ConditionCode, LanguageCode } from '../types';

interface ADTMessage {
  messageType: 'A01' | 'A03' | 'A04' | 'A08'; // Admit, Discharge, Register, Update
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  sex?: string;
  language?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  admitDate?: string;
  dischargeDate?: string;
  diagnosisCodes?: string[];
  medications?: any[];
}

export class EHRInboundIntegration {
  // Process an ADT message (HL7 or FHIR)
  static async processADT(message: ADTMessage) {
    console.log(`[EHR-Inbound] Processing ${message.messageType} for MRN ${message.mrn}`);

    try {
      // Find or create patient
      let patient = await PatientRepository.findByMRN(message.mrn);
      
      if (!patient) {
        patient = await PatientRepository.create({
          mrn: message.mrn,
          first_name: message.firstName,
          last_name: message.lastName,
          dob: message.dob,
          sex_at_birth: message.sex,
          language_code: this.mapLanguage(message.language),
          primary_phone: message.phone,
          email: message.email,
          address: message.address,
          city: message.city,
          state: message.state,
          zip: message.zip,
          preferred_channel: message.phone ? 'SMS' : 'VOICE'
        });
        console.log(`[EHR-Inbound] Created patient: ${patient.id}`);
      }

      // Handle discharge message (A03)
      if (message.messageType === 'A03' && message.dischargeDate) {
        const conditionCode = this.inferCondition(message.diagnosisCodes || []);
        
        if (conditionCode) {
          const episode = await EpisodeRepository.create({
            patient_id: patient.id,
            condition_code: conditionCode,
            admit_at: message.admitDate || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            discharge_at: message.dischargeDate,
            discharge_location: 'HOME',
            discharge_diagnosis_codes: message.diagnosisCodes,
            source_system: 'EHR_ADT'
          });

          console.log(`[EHR-Inbound] Created episode: ${episode.id} for condition ${conditionCode}`);

          // Add medications if provided
          if (message.medications) {
            for (const med of message.medications) {
              await EpisodeRepository.addMedication(episode.id, {
                name: med.name,
                dose: med.dose,
                frequency: med.frequency,
                instructions: med.instructions,
                source: 'EHR',
                requires_prior_auth: false,
                cost_concern_flag: false
              });
            }
          }

          return { success: true, episodeId: episode.id };
        }
      }

      return { success: true, message: 'Patient updated, no episode created' };
    } catch (error) {
      console.error('[EHR-Inbound] Error processing ADT:', error);
      return { success: false, error: String(error) };
    }
  }

  // Infer TOC condition from ICD-10 codes
  private static inferCondition(diagnosisCodes: string[]): ConditionCode | null {
    // Heart Failure: I50.x
    if (diagnosisCodes.some(code => code.startsWith('I50'))) {
      return 'HF';
    }

    // COPD: J44.x
    if (diagnosisCodes.some(code => code.startsWith('J44'))) {
      return 'COPD';
    }

    // Acute MI: I21.x, I22.x
    if (diagnosisCodes.some(code => code.startsWith('I21') || code.startsWith('I22'))) {
      return 'AMI';
    }

    // Pneumonia: J12.x-J18.x
    if (diagnosisCodes.some(code => {
      const numeric = parseInt(code.substring(1, 3));
      return code.startsWith('J') && numeric >= 12 && numeric <= 18;
    })) {
      return 'PNA';
    }

    return null;
  }

  private static mapLanguage(language?: string): LanguageCode {
    if (!language) return 'EN';
    const lang = language.toLowerCase();
    if (lang.includes('es') || lang.includes('spanish')) return 'ES';
    return 'EN';
  }

  // Parse HL7 message (simplified)
  static parseHL7(hl7Message: string): ADTMessage | null {
    // TODO: Implement real HL7 parser
    // This is a simplified stub
    const lines = hl7Message.split('\n');
    const mshLine = lines.find(l => l.startsWith('MSH'));
    const pidLine = lines.find(l => l.startsWith('PID'));
    const pv1Line = lines.find(l => l.startsWith('PV1'));

    if (!mshLine || !pidLine) return null;

    // Extract fields (real implementation would use proper HL7 parser)
    const pidFields = pidLine.split('|');
    
    return {
      messageType: 'A03', // Would parse from MSH
      patientId: pidFields[3] || '',
      mrn: pidFields[3] || '',
      firstName: pidFields[5]?.split('^')[1] || '',
      lastName: pidFields[5]?.split('^')[0] || '',
      dob: pidFields[7] || '',
      sex: pidFields[8],
      phone: pidFields[13],
      diagnosisCodes: []
    };
  }
}

