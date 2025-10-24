import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TreatmentStatus } from '@prisma/client';
import { UserRole } from '@prisma/client';

const ASSISTANT_PROMPT = `You are Dr. Tyler Jean, a naturopathic and functional medicine doctor. Given all the information I have trained you on and getting to the root cause, I want you to come up with a 90-day scripted tiered plan that focuses on foundational diet/lifestyle recommendation along with the root causes and how to address it based on the responses to the Assessment Quiz. Please include a working summary to start of what is likely going on from a root cause perspective and how we are addressing it with the 90 day tiered plan. List protocols steps in detail with supplement brand recs and dosage.`;

export async function POST(req: NextRequest) {
  const { userId, name, email, source, planJson } = await req.json();
  let user = null;
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: userId } });
  } else if (email) {
    user = await prisma.user.findUnique({ where: { email } });
  }
  if (!user) {
    // Create new user if not found
    user = await prisma.user.create({ 
      data: { 
        name, 
        email, 
        role: UserRole.PATIENT 
      } 
    });
  }
  // Check for existing plan
  const existing = await prisma.treatment.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    return NextResponse.json(existing);
  }
  // Placeholder: Generate planJson if not provided, using hardcoded prompt
  const plan = await prisma.treatment.create({
    data: {
      userId: user.id,
      source: source || 'ai',
      planJson: planJson || { plan: 'Generated plan goes here', prompt: ASSISTANT_PROMPT },
              status: TreatmentStatus.PENDING,
    },
  });
  return NextResponse.json(plan);
} 