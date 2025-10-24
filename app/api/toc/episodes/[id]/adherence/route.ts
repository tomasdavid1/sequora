import { NextResponse } from 'next/server';
import { MedicationAdherenceService } from '@/lib/toc/services/medication-adherence';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const summary = await MedicationAdherenceService.getAdherenceSummary(params.id);
    return NextResponse.json({ adherence: summary });
  } catch (error) {
    console.error('Error fetching adherence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch adherence data' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'check_pharmacy') {
      const results = await MedicationAdherenceService.checkPharmacyFillStatus(params.id);
      return NextResponse.json({ results });
    }

    if (action === 'log_dose') {
      const { medication_name, taken } = body;
      await MedicationAdherenceService.logAdherence(params.id, medication_name, taken);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing adherence action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

