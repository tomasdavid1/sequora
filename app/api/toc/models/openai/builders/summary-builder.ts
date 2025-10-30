/**
 * Summary builder for generating clinical summaries from conversation messages
 * 
 * Uses OpenAI to generate concise clinical summaries of patient interactions.
 * This is separate from the main response generation which uses tools.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSummary(
  messages: Array<{role: string, content: string}>,
  options: {
    temperature?: number;
    max_tokens?: number;
  } = {}
) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Faster and cheaper for summaries
      messages: messages as any,
      temperature: options.temperature ?? 0.3, // Lower temperature for more consistent summaries
      max_tokens: options.max_tokens ?? 150, // Short summaries
    });

    const summary = completion.choices[0]?.message?.content || '';
    
    return NextResponse.json({
      success: true,
      summary: summary,
      tokensUsed: completion.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('❌ Error generating summary:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Summary generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

