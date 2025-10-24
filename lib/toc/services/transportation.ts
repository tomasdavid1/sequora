// NEMT (Non-Emergency Medical Transportation) Service

import { supabaseServer, tocTable } from '../../supabase-server';
import { AppointmentRepository } from '../repositories/appointment';
import { 
  TransportRequest as DBTransportRequest, 
  TransportRequestInsert,
  Appointment 
} from '@/types';

interface TransportRequest {
  episodeId: string;
  appointmentId?: string;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  wheelchairRequired?: boolean;
  oxygenRequired?: boolean;
  membershipId?: string;
}

export class TransportationService {
  // Check NEMT eligibility based on insurance
  static async checkEligibility(patientId: string): Promise<boolean> {
    // TODO: Integrate with insurance eligibility API
    // For now, return true for Medicare/Medicaid patients
    return true; // Mock - assume eligible
  }

  // Book transportation for an appointment
  static async bookTransport(request: TransportRequest): Promise<any> {
    // Check eligibility first
    const { data: episode } = await supabaseServer
      .from(tocTable('episode'))
      .select('patient_id')
      .eq('id', request.episodeId)
      .single();

    if (!episode) throw new Error('Episode not found');

    const eligible = await this.checkEligibility(episode.patient_id);
    if (!eligible) {
      return {
        success: false,
        error: 'Patient not eligible for NEMT'
      };
    }

    // Book with NEMT vendor (ModivCare, MTM, etc.)
    const booking = await this.bookWithVendor(request);

    // Save to database
    const { data: transportRecord } = await supabaseServer
      .from(tocTable('transport_request'))
      .insert({
        episode_id: request.episodeId,
        appointment_id: request.appointmentId,
        requested_at: new Date().toISOString(),
        pickup_at: request.pickupAt.toISOString(),
        pickup_address: request.pickupAddress,
        dropoff_address: request.dropoffAddress,
        vendor: booking.vendor,
        confirmation_code: booking.confirmationCode,
        status: 'BOOKED',
        cost_cents: booking.costCents,
        payer: 'MEDICAID'
      })
      .select()
      .single();

    return {
      success: true,
      transportId: transportRecord?.id,
      confirmationCode: booking.confirmationCode,
      pickupWindow: booking.pickupWindow
    };
  }

  // Update transport status (e.g., confirmed, completed)
  static async updateStatus(transportId: string, status: TransportStatus) {
    await supabaseServer
      .from(tocTable('transport_request'))
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', transportId);
  }

  // Check transport status for appointment
  static async getTransportForAppointment(appointmentId: string) {
    const { data } = await supabaseServer
      .from(tocTable('transport_request'))
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  // Auto-book transport for high-risk patients
  static async autoBookForHighRisk(episodeId: string): Promise<boolean> {
    // Get episode risk score
    const { data: episode } = await supabaseServer
      .from(tocTable('episode'))
      .select('*, patient_id')
      .eq('id', episodeId)
      .single();

    if (!episode || !episode.elixhauser_score) return false;
    if (episode.elixhauser_score < 18) return false; // Only high risk

    // Get upcoming appointments
    const appointments = await AppointmentRepository.getByEpisode(episodeId);
    const upcoming = appointments.filter(apt => 
      apt.status === 'SCHEDULED' && 
      new Date(apt.start_at) > new Date()
    );

    if (upcoming.length === 0) return false;

    // Book transport for first appointment
    const apt = upcoming[0];
    const { data: patient } = await supabaseServer
      .from(tocTable('patient'))
      .select('*')
      .eq('id', episode.patient_id)
      .single();

    if (!patient?.address) return false;

    const pickupAddress = `${patient.address}, ${patient.city}, ${patient.state} ${patient.zip}`;
    
    await this.bookTransport({
      episodeId,
      appointmentId: apt.id,
      pickupAt: new Date(new Date(apt.start_at).getTime() - 60 * 60 * 1000), // 1 hour before
      pickupAddress,
      dropoffAddress: apt.address || apt.location_name || 'Clinic'
    });

    return true;
  }

  private static async bookWithVendor(request: TransportRequest): Promise<any> {
    // TODO: Integrate with NEMT vendor API (ModivCare, MTM, Circulation, etc.)
    // Mock implementation
    console.log('[NEMT] Would book with vendor:', request);

    return {
      vendor: 'ModivCare',
      confirmationCode: `NEMT${Date.now().toString().slice(-8)}`,
      pickupWindow: {
        start: new Date(request.pickupAt.getTime() - 15 * 60 * 1000),
        end: new Date(request.pickupAt.getTime() + 15 * 60 * 1000)
      },
      costCents: 2500 // $25.00
    };
  }
}

