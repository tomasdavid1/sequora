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
      return NextResponse.json({
        assessments: [],
        userTier: MembershipTier.BASIC,
        totalCompleted: 0
      });
    }

    console.log(`[API] /api/assessment/eligibility - Checking eligibility for user: ${userId}`);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userId },
          { id: userId }
        ]
      },
      include: {
        submissions: {
          include: {
            answers: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        treatments: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        memberships: {
          where: {
            status: 'active'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        assessments: [],
        userTier: MembershipTier.BASIC,
        totalCompleted: 0
      });
    }

    // Determine user tier
    const currentTier = user.memberships.length > 0 ? user.memberships[0].tier : MembershipTier.BASIC;

    // Get total number of questions for accurate percentage calculation
    const totalQuestions = await prisma.question.count();

    // Process submissions into assessment history
    const MIN_ANSWERS_FOR_COMPLETION = Math.floor(totalQuestions * 0.8); // 80% completion threshold
    const assessmentHistory = [];

    for (const submission of user.submissions) {
      const isCompleted = submission.answers.length >= MIN_ANSWERS_FOR_COMPLETION;
      
      // Find related treatment for this submission (if any)
      const relatedTreatment = user.treatments.find(t => {
        // Look for treatments created around the same time as the submission
        const timeDiff = Math.abs(new Date(t.createdAt).getTime() - new Date(submission.createdAt).getTime());
        return timeDiff < 5 * 60 * 1000; // Within 5 minutes
      });

      assessmentHistory.push({
        id: submission.id,
        completedAt: submission.createdAt.toISOString(),
        answersCount: submission.answers.length,
        isCompleted,
        status: isCompleted ? 'completed' : 'incomplete',
        treatmentGenerated: !!relatedTreatment,
        treatmentId: relatedTreatment?.id || null,
        treatmentStatus: relatedTreatment?.status || null,
        completionPercentage: Math.min(100, Math.round((submission.answers.length / totalQuestions) * 100))
      });
    }

    const completedAssessments = assessmentHistory.filter(a => a.isCompleted);

    console.log(`[API] /api/assessment/history - Found ${assessmentHistory.length} total submissions, ${completedAssessments.length} completed for user ${userId}`);

    return NextResponse.json({
      assessments: assessmentHistory,
      userTier: currentTier,
      totalCompleted: completedAssessments.length,
      totalSubmissions: assessmentHistory.length
    });

  } catch (error) {
    console.error('[API] /api/assessment/history - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment history' },
      { status: 500 }
    );
  }
} 