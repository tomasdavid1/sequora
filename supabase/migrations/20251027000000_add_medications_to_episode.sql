-- Add medications field to Episode table
-- This stores the medication list associated with each care episode

-- Add medications column as JSONB
ALTER TABLE "Episode" 
ADD COLUMN IF NOT EXISTS medications JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN "Episode".medications IS 
'Array of medication objects with structure: 
[
  {
    "name": "Medication name (string, required)",
    "dosage": "Dosage amount (string, optional)",
    "frequency": "How often to take (string, optional)",
    "timing": "When to take (string, optional, e.g., morning, with meals)",
    "notes": "Additional instructions (string, optional)"
  }
]

Example:
[
  {
    "name": "Furosemide",
    "dosage": "40mg",
    "frequency": "Once daily",
    "timing": "Morning",
    "notes": "Take with water"
  },
  {
    "name": "Metoprolol",
    "dosage": "25mg",
    "frequency": "Twice daily"
  }
]';

