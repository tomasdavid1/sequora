import { NextResponse } from 'next/server';
import { TransportationService } from '@/lib/toc/services/transportation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'check_eligibility') {
      const { patient_id } = body;
      const eligible = await TransportationService.checkEligibility(patient_id);
      return NextResponse.json({ eligible });
    }

    if (action === 'book') {
      const {
        episode_id,
        appointment_id,
        pickup_at,
        pickup_address,
        dropoff_address
      } = body;

      const result = await TransportationService.bookTransport({
        episodeId: episode_id,
        appointmentId: appointment_id,
        pickupAt: new Date(pickup_at),
        pickupAddress: pickup_address,
        dropoffAddress: dropoff_address
      });

      return NextResponse.json(result);
    }

    if (action === 'auto_book_high_risk') {
      const { episode_id } = body;
      const booked = await TransportationService.autoBookForHighRisk(episode_id);
      return NextResponse.json({ booked });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing transport request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointment_id');

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointment_id required' },
        { status: 400 }
      );
    }

    const transport = await TransportationService.getTransportForAppointment(appointmentId);
    return NextResponse.json({ transport });
  } catch (error) {
    console.error('Error fetching transport:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport' },
      { status: 500 }
    );
  }
}

