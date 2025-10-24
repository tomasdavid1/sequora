import { NextResponse } from 'next/server';
import { EpisodeRepository } from '@/lib/toc/repositories/episode';
import { PatientRepository } from '@/lib/toc/repositories/patient';

// GET /api/toc/episodes - List recent episodes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let episodes;
    if (patientId) {
      episodes = await EpisodeRepository.findByPatient(patientId);
    } else {
      episodes = await EpisodeRepository.getRecentDischarges(limit);
    }

    return NextResponse.json({ episodes });
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
}

// POST /api/toc/episodes - Create new episode
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patient, episode, medications } = body;

    // Create or find patient
    let patientRecord = patient.id 
      ? await PatientRepository.findById(patient.id)
      : patient.mrn 
        ? await PatientRepository.findByMRN(patient.mrn)
        : null;

    if (!patientRecord) {
      patientRecord = await PatientRepository.create(patient);
    }

    // Create episode
    const newEpisode = await EpisodeRepository.create({
      ...episode,
      patient_id: patientRecord.id
    });

    // Add medications if provided
    if (medications && medications.length > 0) {
      for (const med of medications) {
        await EpisodeRepository.addMedication(newEpisode.id, med);
      }
    }

    return NextResponse.json({ episode: newEpisode }, { status: 201 });
  } catch (error) {
    console.error('Error creating episode:', error);
    return NextResponse.json(
      { error: 'Failed to create episode' },
      { status: 500 }
    );
  }
}

