import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  console.log('[API] /api/questions - Fetching questions from database...');
  
  const questions = await prisma.question.findMany({
    orderBy: [{ category: 'asc' }, { orderInSection: 'asc' }],
  });

  console.log('[API] /api/questions - Raw questions from DB:', {
    totalQuestions: questions.length,
    sampleQuestions: questions.slice(0, 3).map(q => ({
      id: q.id,
      text: q.text,
      category: q.category,
      orderInSection: q.orderInSection,
      possibleValues: q.possibleValues
    }))
  });

  // Group questions by category
  const grouped = questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, typeof questions>);

  // Convert to array of sections
  const sections = Object.entries(grouped).map(([category, questions]) => ({
    category,
    questions,
  }));

  console.log('[API] /api/questions - Sending sections to frontend:', {
    totalSections: sections.length,
    sections: sections.map(s => ({
      category: s.category,
      questionCount: s.questions.length,
      sampleQuestions: s.questions.slice(0, 2).map(q => ({
        text: q.text,
        possibleValues: q.possibleValues
      }))
    }))
  });

  return NextResponse.json({ sections });
} 