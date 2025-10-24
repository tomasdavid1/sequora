import { NextRequest, NextResponse } from 'next/server';

// This route needs to access searchParams, so it must be dynamic
export const dynamic = 'force-dynamic';

// For now, we'll store active states in memory
// TODO: Later we can store this as metadata in Supabase or in the database
const fileActiveStates = new Map<string, boolean>();

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/admin/toggle-kb-file - Toggling file active status');

    const body = await request.json();
    const { fileName, isActive } = body;

    if (!fileName || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'File name and isActive boolean are required' },
        { status: 400 }
      );
    }

    // Store the active state
    fileActiveStates.set(fileName, isActive);

    console.log(`[API] /api/admin/toggle-kb-file - Set ${fileName} to ${isActive ? 'active' : 'inactive'}`);

    return NextResponse.json({
      success: true,
      fileName,
      isActive,
      message: `File ${fileName} is now ${isActive ? 'active' : 'inactive'}`
    });

  } catch (error) {
    console.error('[API] /api/admin/toggle-kb-file - Error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle file status' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      // Return all active states
      const allStates = Object.fromEntries(fileActiveStates);
      return NextResponse.json({ activeStates: allStates });
    }

    // Return specific file state (default to true if not set)
    const isActive = fileActiveStates.get(fileName) ?? true;
    
    return NextResponse.json({
      fileName,
      isActive
    });

  } catch (error) {
    console.error('[API] /api/admin/toggle-kb-file - Error:', error);
    return NextResponse.json(
      { error: 'Failed to get file status' },
      { status: 500 }
    );
  }
} 