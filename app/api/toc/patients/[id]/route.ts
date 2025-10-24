import { NextResponse } from 'next/server';
import { PatientRepository } from '@/lib/toc/repositories/patient';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const patient = await PatientRepository.findById(params.id);
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
      { status: 500 }
    );
  }
}

