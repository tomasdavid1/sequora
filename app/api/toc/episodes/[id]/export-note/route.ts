import { NextResponse } from 'next/server';
import { EHROutboundIntegration } from '@/lib/toc/integrations/ehr-outbound';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { destination } = body;

    if (!['EHR_INBOX', 'SECURE_FAX', 'DIRECT_MSG'].includes(destination)) {
      return NextResponse.json(
        { error: 'Invalid destination' },
        { status: 400 }
      );
    }

    const result = await EHROutboundIntegration.exportToEHR(params.id, destination);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error exporting note:', error);
    return NextResponse.json(
      { error: 'Failed to export note' },
      { status: 500 }
    );
  }
}

