import { NextResponse } from 'next/server';
import { supabaseServer, tocTable } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { data: questions, error } = await supabaseServer
      .from(tocTable('outreach_question'))
      .select('*')
      .order('condition_code')
      .order('code');

    if (error) throw error;

    return NextResponse.json({ questions: questions || [] });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data: question, error } = await supabaseServer
      .from(tocTable('outreach_question'))
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}

