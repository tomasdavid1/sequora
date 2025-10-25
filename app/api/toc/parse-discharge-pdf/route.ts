import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToText } from '@/lib/file-converter';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('[PDF Parser] OPENAI_API_KEY not set');
      return NextResponse.json({
        success: false,
        error: 'PDF parsing is not configured. Please set OPENAI_API_KEY environment variable.',
        parsedData: null
      }, { status: 503 });
    }

    // Initialize OpenAI client inside the handler
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    console.log('[PDF Parser] Processing file:', file.name, 'Size:', file.size);

    // Convert PDF to text
    const buffer = Buffer.from(await file.arrayBuffer());
    const conversionResult = await convertPdfToText(buffer);

    if (!conversionResult.success || !conversionResult.text) {
      console.error('[PDF Parser] PDF conversion failed:', conversionResult.error);
      return NextResponse.json({
        success: false,
        error: conversionResult.error || 'Failed to extract text from PDF',
        parsedData: null
      });
    }

    console.log('[PDF Parser] Extracted', conversionResult.text.length, 'characters');

    // Use OpenAI to extract structured patient data from the text
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a medical document parser. Extract patient information from discharge summaries.
Return ONLY valid JSON with these exact fields (use null for missing data):
{
  "firstName": string or null,
  "lastName": string or null,
  "dob": "YYYY-MM-DD" or null,
  "phone": string or null,
  "email": string or null,
  "condition": "HF" | "COPD" | "AMI" | "PNA" | "OTHER" or null,
  "educationLevel": "low" | "medium" | "high" or null,
  "dischargeDate": "YYYY-MM-DD" or null,
  "admitDate": "YYYY-MM-DD" or null,
  "diagnosisCodes": string[] or null,
  "medications": string or null (newline-separated list),
  "sexAtBirth": "M" | "F" | "Other" or null,
  "address": string or null,
  "city": string or null,
  "state": string or null,
  "zip": string or null
}

Common condition codes:
- HF = Heart Failure, CHF, Congestive Heart Failure
- COPD = Chronic Obstructive Pulmonary Disease, Emphysema
- AMI = Acute Myocardial Infarction, Heart Attack, STEMI, NSTEMI
- PNA = Pneumonia

For educationLevel, infer from context if available (default to "medium" if unsure).
For medications, list each on a new line with dosage and frequency.`
          },
          {
            role: 'user',
            content: `Extract patient data from this discharge summary:\n\n${conversionResult.text.slice(0, 8000)}`
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const extractedData = JSON.parse(completion.choices[0].message.content || '{}');
      
      console.log('[PDF Parser] Extracted data:', extractedData);

      // Validate required fields
      const hasRequiredFields = 
        extractedData.firstName && 
        extractedData.lastName && 
        extractedData.phone;

      return NextResponse.json({
        success: hasRequiredFields,
        parsedData: extractedData,
        metadata: {
          ...conversionResult.metadata,
          extractedTextLength: conversionResult.text.length,
          hasRequiredFields
        },
        warning: hasRequiredFields ? null : 'Some required fields are missing. Please fill them in manually.'
      });

    } catch (aiError) {
      console.error('[PDF Parser] AI extraction failed:', aiError);
      return NextResponse.json({
        success: false,
        error: 'Failed to extract structured data from PDF text',
        parsedData: null
      });
    }

  } catch (error) {
    console.error('[PDF Parser] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during PDF parsing',
        parsedData: null
      },
      { status: 500 }
    );
  }
}

