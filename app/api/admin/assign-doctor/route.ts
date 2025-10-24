import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { treatmentId, doctorName } = body;

    console.log(`[API] /api/admin/assign-doctor - Assigning ${doctorName} to treatment ${treatmentId}`);
    console.log('[API] /api/admin/assign-doctor - Request body:', body);
    console.log('[API] /api/admin/assign-doctor - Request headers:', Object.fromEntries(request.headers.entries()));

    if (!treatmentId || !doctorName) {
      console.log('[API] /api/admin/assign-doctor - Missing required parameters');
      return NextResponse.json(
        { error: 'Treatment ID and doctor name are required' },
        { status: 400 }
      );
    }

    // Get current treatment to update planJson with assignment info
    console.log('[API] /api/admin/assign-doctor - Looking for treatment:', treatmentId);
    const currentTreatment = await prisma.treatment.findUnique({
      where: { id: treatmentId }
    });

    if (!currentTreatment) {
      console.log('[API] /api/admin/assign-doctor - Treatment not found:', treatmentId);
      
      // Show what treatments actually exist
      const allTreatments = await prisma.treatment.findMany({
        select: { id: true, userId: true, status: true }
      });
      console.log('[API] /api/admin/assign-doctor - Available treatments:', allTreatments);
      
      return NextResponse.json(
        { error: 'Treatment not found', availableTreatments: allTreatments.map(t => t.id) },
        { status: 404 }
      );
    }

    // Add assignment metadata to the planJson
    const existingPlanJson = currentTreatment.planJson as any || {};
    const updatedPlanJson = {
      ...existingPlanJson,
      doctorAssignment: {
        assignedBy: 'admin-system',
        assignedAt: new Date().toISOString(),
        assignedDoctor: doctorName,
        assignmentType: 'manual'
      }
    };

    // Find the actual doctor record by name to get their ID
    const doctor = await prisma.doctor.findFirst({
      where: { name: doctorName }
    });

    if (!doctor) {
      console.warn(`[API] /api/admin/assign-doctor - Doctor "${doctorName}" not found in database`);
    }

    // Update the treatment with the new assignment
    const updatedTreatment = await prisma.treatment.update({
      where: { id: treatmentId },
      data: {
        planJson: updatedPlanJson,
        reviewedBy: doctor?.id || null // Use doctor ID or null if not found
      }
    });

    console.log(`[API] /api/admin/assign-doctor - Successfully assigned ${doctorName} to treatment ${treatmentId}`);

    return NextResponse.json({
      success: true,
      treatment: updatedTreatment,
      assignedDoctor: doctorName
    });

  } catch (error) {
    console.error('[API] /api/admin/assign-doctor - Error:', error);
    return NextResponse.json(
      { error: 'Failed to assign doctor' },
      { status: 500 }
    );
  }
} 