import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/tabs - Fetching admin tabs configuration');

    // For now, return default tab configuration
    // This will be replaced with actual database query when AdminTab table is properly populated
    const defaultTabs = [
      {
        id: 'tab-1',
        name: 'patients',
        label: 'Patients',
        order: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tab-2',
        name: 'treatments',
        label: 'Treatments',
        order: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tab-3',
        name: 'doctors',
        label: 'Doctors',
        order: 3,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tab-4',
        name: 'threads',
        label: 'Threads',
        order: 4,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tab-5',
        name: 'assistant',
        label: 'Assistant',
        order: 5,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log(`[API] /api/admin/tabs - Found ${defaultTabs.length} tabs`);

    // TODO: Replace with actual database query when AdminTab table is populated
    // const tabs = await prisma.adminTab.findMany({
    //   where: { isActive: true },
    //   orderBy: { order: 'asc' }
    // });

    return NextResponse.json({
      tabs: defaultTabs,
      count: defaultTabs.length
    });

  } catch (error) {
    console.error('[API] /api/admin/tabs - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin tabs' },
      { status: 500 }
    );
  }
} 