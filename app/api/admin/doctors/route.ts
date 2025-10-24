import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TreatmentStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/doctors - Fetching all doctors for admin dashboard');

    // Get all treatments to calculate doctor statistics
    const allTreatments = await prisma.treatment.findMany({
      select: {
        id: true,
        status: true,
        planJson: true
      }
    });

    // Get all doctors from the database
    const availableDoctors = await prisma.doctor.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Calculate statistics for each doctor
    const doctorsWithStats = availableDoctors.map((doctor) => {
      // Check actual assignments from planJson
      const assignedTreatments = allTreatments.filter(treatment => {
        const planJson = treatment.planJson as any;
        const assignedDoctor = planJson?.doctorAssignment?.assignedDoctor;
        
        // Match by doctor name
        return assignedDoctor === doctor.name;
      });
      
      const completedTreatments = assignedTreatments.filter(t => 
        t.status === TreatmentStatus.APPROVED || t.status === TreatmentStatus.REJECTED || t.status === TreatmentStatus.PARTIALLY_APPROVED
      );

      return {
        ...doctor,
        assignedTreatments: assignedTreatments.length,
        completedTreatments: completedTreatments.length,
        specialty: 'General Practice' // Default since not in DB schema
      };
    });

    // Debug logging to trace assignments
    const treatmentAssignments = allTreatments.map(treatment => {
      const planJson = treatment.planJson as any;
      return {
        treatmentId: treatment.id,
        assignedDoctor: planJson?.doctorAssignment?.assignedDoctor || 'None',
        status: treatment.status
      };
    });

    console.log('[API] /api/admin/doctors - Treatment assignments:', treatmentAssignments);
    console.log('[API] /api/admin/doctors - Doctor stats:', {
      count: doctorsWithStats.length,
      stats: doctorsWithStats.map(d => ({
        name: d.name,
        assigned: d.assignedTreatments,
        completed: d.completedTreatments
      }))
    });

    return NextResponse.json({
      doctors: doctorsWithStats,
      count: doctorsWithStats.length
    });

  } catch (error) {
    console.error('[API] /api/admin/doctors - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctors data' },
      { status: 500 }
    );
  }
} 