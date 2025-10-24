import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const userIdentifier = params.userId;
    console.log('[API] /api/treatment/user/[userId] - Looking for user:', userIdentifier);
    
    // First, find the user by email or ID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userIdentifier },
          { id: userIdentifier }
        ]
      }
    });
    
    if (!user) {
      console.log('[API] /api/treatment/user/[userId] - User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[API] /api/treatment/user/[userId] - Found user:', {
      id: user.id,
      email: user.email,
      name: user.name
    });
    
    // Then find their most recent treatment
    console.log('[API] /api/treatment/user/[userId] - Looking for treatments for userId:', user.id);
    const plan = await prisma.treatment.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!plan) {
      console.log('[API] /api/treatment/user/[userId] - No treatment plan found for user');
      
      // Debug: Check what treatments exist in the database
      const allTreatments = await prisma.treatment.findMany({
        select: { id: true, userId: true, createdAt: true, status: true }
      });
      console.log('[API] /api/treatment/user/[userId] - All treatments in DB:', allTreatments);
      
      return NextResponse.json({ error: 'Treatment plan not found' }, { status: 404 });
    }
    
    console.log('[API] /api/treatment/user/[userId] - Found treatment plan:', {
      id: plan.id,
      userId: plan.userId,
      status: plan.status,
      createdAt: plan.createdAt
    });
    
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching treatment plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 