import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TreatmentStatus } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { action, itemApprovals, approvedCount, rejectedCount, rejectionReasons } = body;
    
    console.log(`[API] /api/treatment/${params.id}/approve - ${action} action requested`);
    console.log(`[API] /api/treatment/${params.id}/approve - Item approvals:`, itemApprovals);
    console.log(`[API] /api/treatment/${params.id}/approve - Approved: ${approvedCount}, Rejected: ${rejectedCount}`);
    console.log(`[API] /api/treatment/${params.id}/approve - Rejection reasons:`, rejectionReasons);

    // Handle both old format (approve/reject) and new format (review_completed)
    let status: TreatmentStatus;
    if (action === 'review_completed') {
      // Determine overall status based on item approvals
      if (approvedCount > 0 && rejectedCount === 0) {
        status = TreatmentStatus.APPROVED; // All items approved
      } else if (rejectedCount > 0 && approvedCount === 0) {
        status = TreatmentStatus.REJECTED; // All items rejected
      } else {
        status = TreatmentStatus.PARTIALLY_APPROVED; // Mixed approvals
      }
    } else if (['approve', 'reject'].includes(action)) {
      // Legacy format support
      status = action === 'approve' ? TreatmentStatus.APPROVED : TreatmentStatus.REJECTED;
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve", "reject", or "review_completed"' },
        { status: 400 }
      );
    }
    
    // Get current treatment to update planJson with approval details
    const currentTreatment = await prisma.treatment.findUnique({
      where: { id: params.id }
    });

    if (!currentTreatment) {
      return NextResponse.json(
        { error: 'Treatment not found' },
        { status: 404 }
      );
    }

    // Add review metadata to the planJson
    const existingPlanJson = currentTreatment.planJson as any || {};
    const updatedPlanJson = {
      ...existingPlanJson,
      doctorReview: {
        reviewedBy: 'doctor-system',
        reviewedAt: new Date().toISOString(),
        action: action,
        finalStatus: status,
        itemApprovals: itemApprovals || {},
        rejectionReasons: rejectionReasons || {},
        approvalStats: {
          totalItems: (approvedCount || 0) + (rejectedCount || 0),
          approvedCount: approvedCount || 0,
          rejectedCount: rejectedCount || 0
        },
        reviewNotes: action === 'review_completed' 
          ? `Granular review completed: ${approvedCount || 0} approved, ${rejectedCount || 0} rejected`
          : `Treatment ${action}d with individual item review`
      }
    };
    
    // Get the first available doctor for now (in the future, use logged-in doctor)
    const firstDoctor = await prisma.doctor.findFirst();
    
    const treatment = await prisma.treatment.update({
      where: { id: params.id },
      data: { 
        status,
        reviewedBy: firstDoctor?.id || null,
        planJson: updatedPlanJson
      },
    });

    console.log(`[API] /api/treatment/${params.id}/approve - Treatment review completed successfully`);
    console.log(`[API] /api/treatment/${params.id}/approve - Final status: ${status}`);
    
    return NextResponse.json({ 
      success: true, 
      treatment,
      action,
      finalStatus: status,
      itemApprovals,
      rejectionReasons: rejectionReasons || {},
      approvalStats: {
        totalItems: (approvedCount || 0) + (rejectedCount || 0),
        approvedCount: approvedCount || 0,
        rejectedCount: rejectedCount || 0
      }
    });

  } catch (error) {
    console.error(`[API] /api/treatment/${params.id}/approve - Error:`, error);
    return NextResponse.json(
      { error: 'Failed to update treatment' },
      { status: 500 }
    );
  }
} 