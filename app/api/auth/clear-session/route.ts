import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // This endpoint can be called to help debug auth issues
    // Client-side will clear localStorage
    return NextResponse.json({ 
      success: true, 
      message: 'Auth session cleared. Please refresh the page.' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}

