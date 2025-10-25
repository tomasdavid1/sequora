# Discharge Summary Fields Analysis

## Fields from Example Discharge Summary vs Current Database Schema

### ✅ Already Have (Patient Table)
- ✅ **Name**: `first_name`, `last_name`
- ✅ **Age**: Can calculate from `date_of_birth`
- ✅ **Gender**: `sex_at_birth`
- ✅ **Contact Info**: `primary_phone`, `email`, `address`, `city`, `state`, `zip`
- ✅ **MRN**: `mrn` (Medical Record Number)
- ✅ **Caregiver Info**: `caregiver_name`, `caregiver_phone`, `caregiver_relation`

### ✅ Already Have (Episode Table)
- ✅ **Date of Admission**: `admit_at`
- ✅ **Date of Discharge**: `discharge_at`
- ✅ **Primary Diagnosis**: `condition_code` (HF, COPD, AMI, PNA)
- ✅ **Discharge Location**: `discharge_location`
- ✅ **Discharge Notes**: `discharge_notes_ref` (reference to notes)
- ✅ **Vitals**: `discharge_systolic_bp`, `discharge_spo2`, `discharge_weight_kg`

### ✅ Already Have (EpisodeMedication Table)
- ✅ **Medication Name**: `name`
- ✅ **Dosage**: `dose`, `dose_unit`
- ✅ **Frequency**: `frequency`
- ✅ **Instructions**: `instructions`
- ✅ **Route**: `route`
- ✅ **Start Date**: `start_date`

### ❌ Missing Fields

#### Episode Table - Missing:
1. ❌ **Hospital ID** (e.g., "HF-2025-001") - Episode identifier
2. ❌ **Attending Physician Name** (e.g., "Dr. Emily Chen, MD")
3. ❌ **Attending Physician ID/NPI**
4. ❌ **Hospital Course Summary** (narrative text about the stay)
5. ❌ **NYHA Class** or other severity indicators
6. ❌ **Ejection Fraction** (for HF patients)
7. ❌ **Facility/Hospital Name**
8. ❌ **Facility ID**

#### Missing Tables/Structures:
1. ❌ **Follow-up Instructions** (list of care tasks)
   - Currently no structured place for:
     - "Schedule follow-up with cardiology in 2 weeks"
     - "Check blood pressure daily"
     - "Limit sodium intake to < 2 grams/day"
     - "Monitor for symptoms"

2. ❌ **Emergency Contact Instructions**
   - Warning signs to watch for
   - When to seek immediate care

3. ❌ **Discharge Summary Document**
   - Full narrative summary
   - Provider signature/attestation
   - Document metadata

---

## Proposed Migration

### Option 1: Add Missing Fields to Episode Table
```sql
-- Add discharge summary fields to Episode table
ALTER TABLE public."Episode"
  ADD COLUMN hospital_id TEXT,
  ADD COLUMN attending_physician_name TEXT,
  ADD COLUMN attending_physician_npi TEXT,
  ADD COLUMN hospital_course_summary TEXT,
  ADD COLUMN severity_indicator TEXT, -- NYHA Class, GOLD stage, etc.
  ADD COLUMN ejection_fraction_pct INTEGER, -- For HF patients
  ADD COLUMN facility_name TEXT,
  ADD COLUMN facility_id TEXT;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_episode_hospital_id ON public."Episode"(hospital_id);
CREATE INDEX IF NOT EXISTS idx_episode_facility_id ON public."Episode"(facility_id);

-- Add comments
COMMENT ON COLUMN public."Episode".hospital_id IS 'Hospital-assigned episode identifier (e.g., HF-2025-001)';
COMMENT ON COLUMN public."Episode".attending_physician_name IS 'Full name of attending physician';
COMMENT ON COLUMN public."Episode".attending_physician_npi IS 'National Provider Identifier';
COMMENT ON COLUMN public."Episode".hospital_course_summary IS 'Narrative summary of hospital stay';
COMMENT ON COLUMN public."Episode".severity_indicator IS 'Condition-specific severity (e.g., NYHA Class II, GOLD Stage 3)';
COMMENT ON COLUMN public."Episode".ejection_fraction_pct IS 'Left ventricular ejection fraction percentage (for HF patients)';
```

### Option 2: Create Care Instructions Table
```sql
-- Create table for structured follow-up instructions
CREATE TABLE IF NOT EXISTS public."CareInstruction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public."Episode"(id) ON DELETE CASCADE,
  instruction_type TEXT NOT NULL, -- 'FOLLOWUP_APPOINTMENT', 'DAILY_MONITORING', 'DIETARY', 'ACTIVITY', 'EMERGENCY_SIGNS'
  instruction_text TEXT NOT NULL,
  priority TEXT, -- 'CRITICAL', 'HIGH', 'NORMAL'
  due_date TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_care_instruction_episode ON public."CareInstruction"(episode_id);
CREATE INDEX idx_care_instruction_type ON public."CareInstruction"(instruction_type);

-- Add comments
COMMENT ON TABLE public."CareInstruction" IS 'Structured follow-up instructions and care tasks from discharge summary';
COMMENT ON COLUMN public."CareInstruction".instruction_type IS 'Category of instruction for filtering and grouping';
```

### Option 3: Create Discharge Summary Document Table
```sql
-- Create table for complete discharge summary documents
CREATE TABLE IF NOT EXISTS public."DischargeSummary" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public."Episode"(id) ON DELETE CASCADE,
  document_type TEXT DEFAULT 'DISCHARGE_SUMMARY', -- 'DISCHARGE_SUMMARY', 'TRANSFER_SUMMARY'
  summary_text TEXT, -- Full narrative
  structured_data JSONB, -- Store full structured discharge data
  provider_name TEXT,
  provider_npi TEXT,
  signed_at TIMESTAMP,
  signature_ref TEXT, -- Reference to electronic signature
  document_url TEXT, -- S3/storage URL for PDF
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(episode_id, document_type)
);

CREATE INDEX idx_discharge_summary_episode ON public."DischargeSummary"(episode_id);

-- Add comments
COMMENT ON TABLE public."DischargeSummary" IS 'Complete discharge summary documents with narrative and structured data';
COMMENT ON COLUMN public."DischargeSummary".structured_data IS 'Full JSON representation of discharge summary for flexible querying';
```

---

## Recommended Approach

**Phase 1 (Immediate):**
- ✅ Add physician and facility fields to Episode table
- ✅ Add hospital_course_summary and clinical details
- These are simple fields that enhance existing data

**Phase 2 (Near-term):**
- ✅ Create CareInstruction table for structured follow-up tasks
- This enables better patient engagement and task tracking

**Phase 3 (Future):**
- ✅ Create DischargeSummary table for full document management
- Useful for compliance, document generation, and interoperability

---

## Usage Examples

### Creating Episode with Discharge Data
```typescript
const episode = await supabase.from('Episode').insert({
  patient_id: patientId,
  condition_code: 'HF',
  admit_at: '2025-10-18',
  discharge_at: '2025-10-24',
  hospital_id: 'HF-2025-001',
  attending_physician_name: 'Dr. Emily Chen, MD',
  attending_physician_npi: '1234567890',
  facility_name: 'Memorial Hospital',
  hospital_course_summary: 'Patient admitted with shortness of breath...',
  severity_indicator: 'NYHA Class II',
  ejection_fraction_pct: 35,
  discharge_systolic_bp: 120,
  discharge_spo2: 96,
  discharge_weight_kg: 80
});
```

### Adding Follow-up Instructions
```typescript
const instructions = [
  {
    episode_id: episodeId,
    instruction_type: 'FOLLOWUP_APPOINTMENT',
    instruction_text: 'Schedule follow-up with cardiology in 2 weeks',
    priority: 'HIGH',
    due_date: addDays(new Date(), 14)
  },
  {
    episode_id: episodeId,
    instruction_type: 'DAILY_MONITORING',
    instruction_text: 'Check blood pressure daily and record readings',
    priority: 'HIGH'
  },
  {
    episode_id: episodeId,
    instruction_type: 'DIETARY',
    instruction_text: 'Limit sodium intake to < 2 grams/day',
    priority: 'NORMAL'
  }
];

await supabase.from('CareInstruction').insert(instructions);
```

