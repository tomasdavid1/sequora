import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/patients - Fetching all patients for admin dashboard');

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

    console.log('[API] /api/admin/patients - Using real doctors from DB:', availableDoctors.map(d => d.name));

    // Fetch all users with their treatments
    const users = await prisma.user.findMany({
      include: {
        treatments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[API] /api/admin/patients - Found ${users.length} users`);

    // Transform data to include treatment statistics
    const patients = users.map(user => {
      const treatmentCount = user.treatments.length;
      const latestTreatment = user.treatments[0] || null;

      return {
        id: user.id,
        name: user.name || 'Unknown Patient',
        email: user.email || 'No email',
        createdAt: user.createdAt.toISOString(),
        treatmentCount,
        latestTreatment: latestTreatment ? {
          id: latestTreatment.id,
          status: latestTreatment.status,
          createdAt: latestTreatment.createdAt.toISOString(),
          assignedDoctor: getAssignedDoctor(latestTreatment, availableDoctors)
        } : null
      };
    });

    console.log('[API] /api/admin/patients - Sample patient:', {
      count: patients.length,
      sample: patients[0] ? {
        name: patients[0].name,
        treatmentCount: patients[0].treatmentCount,
        latestStatus: patients[0].latestTreatment?.status
      } : null
    });

    return NextResponse.json({
      patients,
      count: patients.length
    });

  } catch (error) {
    console.error('[API] /api/admin/patients - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients data' },
      { status: 500 }
    );
  }
}

// Helper function to assign doctors using real database doctors
function getAssignedDoctor(treatment: any, availableDoctors: { id: string; name: string }[]): string {
  // Check for manual assignment first
  const planJson = treatment.planJson as any;
  const manuallyAssignedDoctor = planJson?.doctorAssignment?.assignedDoctor;
  
  if (manuallyAssignedDoctor) {
    return manuallyAssignedDoctor;
  }
  
  // Fall back to automatic assignment using real doctors
  if (availableDoctors.length === 0) {
    return 'Unassigned';
  }
  
  const index = parseInt(treatment.id.slice(-1), 16) % availableDoctors.length;
  return availableDoctors[index].name;
} 