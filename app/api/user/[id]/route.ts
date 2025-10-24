import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MembershipTier, UserRole } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userIdentifier = params.id;
    
    // Fetch user with their current active membership - handle both email and ID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userIdentifier },
          { id: userIdentifier }
        ]
      },
      include: {
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
      // User doesn't exist in Prisma but exists in Supabase Auth
      // Create user in Prisma using the Supabase Auth ID
      console.log('[API] /api/user/[id] - User not found in Prisma, creating from Supabase Auth ID:', userIdentifier);
      
      try {
        const newUser = await prisma.user.create({
          data: {
            id: userIdentifier, // Use Supabase Auth ID
            email: `${userIdentifier}@temp.com`, // Temporary email (will be updated on next login)
            name: 'New User',
            role: UserRole.PATIENT,
          },
        });
        
        // Create BASIC membership for regular signup users
        const membership = await prisma.membership.create({
          data: {
            userId: newUser.id,
            tier: MembershipTier.BASIC,
            status: 'active',
            startDate: new Date()
          }
        });
        
        console.log('[API] /api/user/[id] - Created user in Prisma:', {
          id: newUser.id,
          email: newUser.email,
          membershipTier: membership.tier
        });
        
        // Return the newly created user with membership
        return NextResponse.json({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          joinDate: newUser.createdAt.toISOString(),
          membership: {
            id: membership.id,
            tier: membership.tier,
            status: membership.status,
            startDate: membership.startDate.toISOString(),
            endDate: membership.endDate?.toISOString()
          }
        });
        
      } catch (error: any) {
        console.error('[API] /api/user/[id] - Failed to create user in Prisma:', error);
        return NextResponse.json(
          { error: 'Failed to create user record', details: error.message },
          { status: 500 }
        );
      }
    }

    // Format response to match the dashboard interface
    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      joinDate: user.createdAt.toISOString(),
      membership: user.memberships.length > 0 ? {
        id: user.memberships[0].id,
        tier: user.memberships[0].tier,
        status: user.memberships[0].status,
        startDate: user.memberships[0].startDate.toISOString(),
        endDate: user.memberships[0].endDate?.toISOString()
      } : null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 