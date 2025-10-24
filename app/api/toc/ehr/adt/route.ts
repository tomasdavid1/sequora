// Webhook endpoint for receiving ADT feeds from EHR

import { NextResponse } from 'next/server';
import { EHRInboundIntegration } from '@/lib/toc/integrations/ehr-inbound';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type');
    
    let adtMessage;
    if (contentType?.includes('application/json')) {
      // FHIR or custom JSON format
      adtMessage = await request.json();
    } else {
      // HL7 text format
      const hl7Text = await request.text();
      adtMessage = EHRInboundIntegration.parseHL7(hl7Text);
      
      if (!adtMessage) {
        return NextResponse.json(
          { error: 'Failed to parse HL7 message' },
          { status: 400 }
        );
      }
    }

    const result = await EHRInboundIntegration.processADT(adtMessage);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing ADT:', error);
    return NextResponse.json(
      { error: 'Failed to process ADT message', details: String(error) },
      { status: 500 }
    );
  }
}

