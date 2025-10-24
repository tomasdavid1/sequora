import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MembershipTier } from '@prisma/client';

// This route needs to access searchParams, so it must be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`[API] /api/assessment/eligibility - Checking eligibility for user: ${userId}`);

    // Get user with membership and submissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        submissions: {
          include: {
            answers: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      // For new/guest users, they can always start their first assessment
      return NextResponse.json({
        canStart: true,
        canContinue: false,
        reason: 'new_user',
        assessmentLimits: {
          tier: MembershipTier.BASIC,
          maxAssessments: 1,
          completedCount: 0,
          remainingCount: 1
        },
        incompleteAssessment: null
      });
    }

    // Determine user tier
    const currentTier = user.memberships.length > 0 ? user.memberships[0].tier : MembershipTier.BASIC;
    
    // Assessment limits by tier
    const tierLimits = {
      BASIC: 1,
      PREMIUM: 3,
      VIP: 5
    };

    const maxAssessments = tierLimits[currentTier as keyof typeof tierLimits];

    // Check for incomplete assessments
    // An assessment is considered incomplete if it has fewer than 10 answers
    const MIN_ANSWERS_FOR_COMPLETION = 10;
    let incompleteAssessment = null;
    
    for (const submission of user.submissions) {
      if (submission.answers.length < MIN_ANSWERS_FOR_COMPLETION) {
        incompleteAssessment = {
          id: submission.id,
          createdAt: submission.createdAt.toISOString(),
          answersCount: submission.answers.length
        };
        break; // Only consider the most recent incomplete one
      }
    }

    // Count completed assessments (those with 10+ answers)
    const completedAssessments = user.submissions.filter(
      sub => sub.answers.length >= MIN_ANSWERS_FOR_COMPLETION
    );
    
    const completedCount = completedAssessments.length;
    const remainingCount = Math.max(0, maxAssessments - completedCount);

    // Business rules:
    // 1. If user has incomplete assessment, they can ALWAYS continue it
    // 2. If user has reached their tier limit, they can't start new assessments
    // 3. If user hasn't reached limit, they can start new assessments

    const canContinue = !!incompleteAssessment;
    const canStart = remainingCount > 0;

    let reason = '';
    if (!canStart && !canContinue) {
      reason = 'tier_limit_reached';
    } else if (canContinue) {
      reason = 'can_continue_incomplete';
    } else if (canStart) {
      reason = 'within_limits';
    }

    console.log(`[API] /api/assessment/eligibility - User ${userId}: tier=${currentTier}, completed=${completedCount}/${maxAssessments}, canStart=${canStart}, canContinue=${canContinue}`);

    return NextResponse.json({
      canStart,
      canContinue,
      reason,
      assessmentLimits: {
        tier: currentTier,
        maxAssessments,
        completedCount,
        remainingCount
      },
      incompleteAssessment
    });

  } catch (error) {
    console.error('[API] /api/assessment/eligibility - Error:', error);
    return NextResponse.json(
      { error: 'Failed to check assessment eligibility' },
      { status: 500 }
    );
  }
} 