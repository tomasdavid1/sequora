import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TreatmentStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// This route needs to access headers for authentication, so it must be dynamic
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/doctor/treatments - Fetching treatments for authenticated doctor');

    // Get the authenticated user from Supabase
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header provided' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Find the doctor record by email
    const doctor = await prisma.doctor.findUnique({
      where: { email: user.email! }
    });

    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    console.log(`[API] /api/doctor/treatments - Found doctor: ${doctor.name} (${doctor.id})`);

    // Fetch treatments assigned to this doctor OR previously reviewed by them
    const treatments = await prisma.treatment.findMany({
      where: {
        OR: [
          // Pending treatments assigned to this doctor
          {
            AND: [
              { reviewedBy: doctor.id },
              { status: TreatmentStatus.PENDING }
            ]
          },
          // Past treatments reviewed by this doctor (approved/rejected)
          {
            AND: [
              { reviewedBy: doctor.id },
              { status: { in: [TreatmentStatus.APPROVED, TreatmentStatus.REJECTED, TreatmentStatus.PARTIALLY_APPROVED] } }
            ]
          }
        ]
      },
      include: {
        user: true
      },
      orderBy: [
        { status: 'asc' }, // pending first
        { createdAt: 'desc' }
      ]
    });

    console.log(`[API] /api/doctor/treatments - Found ${treatments.length} treatments for doctor ${doctor.name}`);

    // Fetch submission data for each treatment
    const formattedTreatments = await Promise.all(
      treatments.map(async (treatment) => {
        // Get the most recent submission for this user
        const submission = await prisma.submission.findFirst({
          where: { userId: treatment.userId },
          include: {
            answers: {
              include: {
                question: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        return {
          id: treatment.id,
          userId: treatment.userId,
          userName: treatment.user.name,
          userEmail: treatment.user.email,
          status: treatment.status,
          createdAt: treatment.createdAt.toISOString(),
          assignedDoctor: doctor.name, // This doctor is assigned
          planJson: treatment.planJson,
          submission: submission ? {
            id: submission.id,
            createdAt: submission.createdAt.toISOString(),
            answers: submission.answers.map(answer => ({
              id: answer.id,
              answer: answer.answer,
              question: {
                id: answer.question.id,
                text: answer.question.text,
                category: answer.question.category,
                possibleValues: answer.question.possibleValues
              }
            }))
          } : null
        };
      })
    );

    console.log('[API] /api/doctor/treatments - Sample treatment:', {
      count: formattedTreatments.length,
      sample: formattedTreatments[0] ? {
        id: formattedTreatments[0].id,
        userName: formattedTreatments[0].userName,
        status: formattedTreatments[0].status
      } : null
    });

    return NextResponse.json({
      treatments: formattedTreatments,
      count: formattedTreatments.length,
      doctorInfo: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email
      }
    });

  } catch (error) {
    console.error('[API] /api/doctor/treatments - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treatments' },
      { status: 500 }
    );
  }
} 