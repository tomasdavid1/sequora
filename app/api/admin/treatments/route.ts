import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/treatments - Fetching all treatments for admin dashboard');

    // Fetch all treatments with user information
    const allTreatments = await prisma.treatment.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[API] /api/admin/treatments - Found ${allTreatments.length} treatments`);

    // Get available doctors from database
    const availableDoctors = await prisma.doctor.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('[API] /api/admin/treatments - Using real doctors from DB:', availableDoctors.map(d => d.name));
    
    // Transform the data to match the frontend interface
    const formattedTreatments = allTreatments.map((treatment, index) => {
      const planJson = treatment.planJson as any;
      const manuallyAssignedDoctor = planJson?.doctorAssignment?.assignedDoctor;
      
      // Fallback to round-robin assignment if no manual assignment
      const fallbackDoctor = availableDoctors[index % availableDoctors.length]?.name || 'Unassigned';
      const assignedDoctor = manuallyAssignedDoctor || fallbackDoctor;

      return {
        id: treatment.id,
        userId: treatment.userId,
        patientName: treatment.user.name || 'Unknown Patient',
        patientEmail: treatment.user.email || 'No email',
        status: treatment.status,
        createdAt: treatment.createdAt.toISOString(),
        assignedDoctor: assignedDoctor,
        summary: planJson?.summary || 'No summary available'
      };
    });

    console.log('[API] /api/admin/treatments - Sample treatment:', {
      count: formattedTreatments.length,
      sample: formattedTreatments[0] ? {
        id: formattedTreatments[0].id,
        patientName: formattedTreatments[0].patientName,
        status: formattedTreatments[0].status,
        assignedDoctor: formattedTreatments[0].assignedDoctor
      } : null
    });

    return NextResponse.json({
      treatments: formattedTreatments,
      count: formattedTreatments.length
    });

  } catch (error) {
    console.error('[API] /api/admin/treatments - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treatments data' },
      { status: 500 }
    );
  }
} 