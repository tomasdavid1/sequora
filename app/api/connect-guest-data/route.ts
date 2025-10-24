import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MembershipTier } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { authUserId, email, guestUserId } = await req.json();
    
    console.log('[API] /api/connect-guest-data - Connecting guest data:', {
      authUserId,
      email,
      guestUserId
    });

    if (!authUserId || !email || !guestUserId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Find the guest user with data
    const guestUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: guestUserId },
          { email: email } // Also check by email in case of case sensitivity issues
        ]
      },
      include: {
        treatments: true,
        submissions: true,
        memberships: true
      }
    });

    if (!guestUser) {
      console.log('[API] /api/connect-guest-data - No guest user found');
      return NextResponse.json({ success: true, message: 'No guest data to connect' });
    }

    console.log('[API] /api/connect-guest-data - Found guest user:', {
      id: guestUser.id,
      email: guestUser.email,
      treatments: guestUser.treatments.length,
      submissions: guestUser.submissions.length
    });

    // Check if auth user already exists in Prisma
    const existingAuthUser = await prisma.user.findUnique({
      where: { id: authUserId }
    });

    if (existingAuthUser) {
      console.log('[API] /api/connect-guest-data - Auth user exists, transferring data');
      
      // Transfer data to existing auth user
      await prisma.treatment.updateMany({
        where: { userId: guestUser.id },
        data: { userId: authUserId }
      });
      
      await prisma.submission.updateMany({
        where: { userId: guestUser.id },
        data: { userId: authUserId }
      });

      // Update the existing user's email if needed
      await prisma.user.update({
        where: { id: authUserId },
        data: { email: email.toLowerCase() }
      });
      
      // Delete the guest user
      await prisma.user.delete({
        where: { id: guestUser.id }
      });
      
      console.log('[API] /api/connect-guest-data - Data transferred and guest user deleted');
      
    } else {
      console.log('[API] /api/connect-guest-data - Converting guest user to auth user');
      
      // Update the guest user to use the auth user ID
      await prisma.user.update({
        where: { id: guestUser.id },
        data: {
          id: authUserId,
          email: email.toLowerCase(),
          name: 'Assessment User'
        }
      });
      
      console.log('[API] /api/connect-guest-data - Guest user converted to auth user');
    }

    // Ensure the user has a PREMIUM membership
    const finalUserId = existingAuthUser ? authUserId : authUserId;
    const existingMembership = await prisma.membership.findFirst({
      where: { userId: finalUserId }
    });

    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          userId: finalUserId,
          tier: MembershipTier.PREMIUM,
          status: 'active',
          startDate: new Date()
        }
      });
      console.log('[API] /api/connect-guest-data - Created PREMIUM membership for user');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Guest data connected successfully' 
    });

  } catch (error) {
    console.error('[API] /api/connect-guest-data - Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect guest data' },
      { status: 500 }
    );
  }
} 