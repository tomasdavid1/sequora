import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    console.log('📄 [PDF Parse] Processing file:', file.name, 'Size:', file.size);

    // Use GPT-4 Vision to extract text from PDF pages
    // Note: OpenAI doesn't directly support PDF, so we'd need pdf-parse library
    // For now, let's use a simpler approach - extract text first
    
    // Import pdf-parse dynamically
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);
    const pdfText = pdfData.text;

    console.log('📄 [PDF Parse] Extracted text length:', pdfText.length);

    // Send to OpenAI to extract structured data
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a medical data extraction AI. Extract patient information from discharge summary text.

Return ONLY valid JSON with these exact fields (use null for missing data):
{
  "firstName": string,
  "lastName": string,
  "dob": string (YYYY-MM-DD format),
  "phone": string,
  "email": string | null,
  "condition": "HF" | "COPD" | "AMI" | "PNA" | "OTHER",
  "dischargeDate": string (YYYY-MM-DD format),
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "educationLevel": "LOW" | "MEDIUM" | "HIGH",
  "address": string | null,
  "city": string | null,
  "state": string | null,
  "zip": string | null,
  "medications": [
    {
      "name": string,
      "dosage": string | null,
      "frequency": string | null,
      "timing": string | null,
      "notes": string | null
    }
  ]
}

Extraction guidelines:
- firstName/lastName: Patient's legal name
- dob: Date of birth
- phone: Primary contact number (format as digits only)
- email: Email address if mentioned
- condition: Primary diagnosis (HF=Heart Failure, COPD, AMI=Acute MI, PNA=Pneumonia)
- dischargeDate: When patient was discharged from hospital
- riskLevel: Assess as LOW/MEDIUM/HIGH based on comorbidities, severity, readmission risk
- educationLevel: Assess as LOW/MEDIUM/HIGH based on document language complexity, patient demographics
- address/city/state/zip: Mailing address if mentioned
- medications: Extract ALL discharge medications from the document
  * Look for sections like "Discharge Medications", "Medications on Discharge", "Home Medications"
  * name: Medication name (generic or brand)
  * dosage: Strength/amount (e.g., "40mg", "25mg")
  * frequency: How often (e.g., "once daily", "twice daily", "every 12 hours")
  * timing: When to take (e.g., "morning", "with meals", "at bedtime")
  * notes: Special instructions (e.g., "take with food", "do not crush")
  * If medication details are incomplete, extract what's available
  * Return empty array [] if no medications found`
        },
        {
          role: "user",
          content: `Extract patient information from this discharge summary:\n\n${pdfText.substring(0, 15000)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const extractedData = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // Ensure medications is an array
    if (!extractedData.medications) {
      extractedData.medications = [];
    } else if (!Array.isArray(extractedData.medications)) {
      console.warn('⚠️ [PDF Parse] Medications was not an array, converting to array');
      extractedData.medications = [];
    }

    console.log('✅ [PDF Parse] Extracted data:', {
      ...extractedData,
      medications: `${extractedData.medications.length} medication(s)`
    });
    console.log('💊 [PDF Parse] Medications extracted:', extractedData.medications);

    return NextResponse.json({
      success: true,
      data: extractedData,
      rawText: pdfText.substring(0, 500) // Include snippet for debugging
    });

  } catch (error) {
    console.error('❌ [PDF Parse] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to parse PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

