-- Migration: Add default outreach plan configuration
-- Purpose: Define default outreach strategies based on condition and risk level

-- Create table for outreach plan templates
CREATE TABLE IF NOT EXISTS "public"."OutreachPlanTemplate" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_code public.condition_code NOT NULL,
  risk_level public.risk_level NOT NULL,
  preferred_channel public.contact_channel DEFAULT 'SMS',
  fallback_channel public.contact_channel DEFAULT 'VOICE',
  first_contact_delay_hours INTEGER DEFAULT 24, -- Hours after discharge
  max_attempts INTEGER DEFAULT 3,
  attempt_interval_hours INTEGER DEFAULT 48, -- Hours between attempts
  contact_window_hours INTEGER DEFAULT 168, -- 7 days default
  timezone TEXT DEFAULT 'America/New_York',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(condition_code, risk_level)
);

ALTER TABLE "public"."OutreachPlanTemplate" OWNER TO "postgres";

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_outreach_template_condition_risk 
ON "public"."OutreachPlanTemplate"(condition_code, risk_level) 
WHERE active = true;

-- Add RLS policies
ALTER TABLE "public"."OutreachPlanTemplate" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to outreach templates"
ON "public"."OutreachPlanTemplate"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read outreach templates"
ON "public"."OutreachPlanTemplate"
FOR SELECT
TO authenticated
USING (true);

-- Insert default templates based on risk levels
INSERT INTO "public"."OutreachPlanTemplate" (condition_code, risk_level, preferred_channel, first_contact_delay_hours, max_attempts, attempt_interval_hours, contact_window_hours)
VALUES
  -- Heart Failure (HF)
  ('HF', 'HIGH', 'SMS', 24, 5, 24, 168),      -- High risk: 24h after discharge, 5 attempts, every 24h, 7 day window
  ('HF', 'MEDIUM', 'SMS', 48, 3, 48, 168),    -- Medium risk: 48h after discharge, 3 attempts, every 48h, 7 day window
  ('HF', 'LOW', 'SMS', 72, 2, 72, 168),       -- Low risk: 72h after discharge, 2 attempts, every 72h, 7 day window
  
  -- COPD
  ('COPD', 'HIGH', 'SMS', 24, 5, 24, 168),
  ('COPD', 'MEDIUM', 'SMS', 48, 3, 48, 168),
  ('COPD', 'LOW', 'SMS', 72, 2, 72, 168),
  
  -- Acute Myocardial Infarction (AMI)
  ('AMI', 'HIGH', 'SMS', 12, 5, 24, 168),     -- High risk AMI: 12h after discharge (more urgent)
  ('AMI', 'MEDIUM', 'SMS', 24, 3, 48, 168),
  ('AMI', 'LOW', 'SMS', 48, 2, 72, 168),
  
  -- Pneumonia (PNA)
  ('PNA', 'HIGH', 'SMS', 24, 4, 36, 168),
  ('PNA', 'MEDIUM', 'SMS', 48, 3, 48, 168),
  ('PNA', 'LOW', 'SMS', 72, 2, 72, 168),
  
  -- Other conditions (conservative defaults)
  ('OTHER', 'HIGH', 'SMS', 24, 3, 48, 168),
  ('OTHER', 'MEDIUM', 'SMS', 48, 3, 72, 168),
  ('OTHER', 'LOW', 'SMS', 72, 2, 96, 168)
ON CONFLICT (condition_code, risk_level) DO NOTHING;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_outreach_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_outreach_template_updated_at
  BEFORE UPDATE ON "public"."OutreachPlanTemplate"
  FOR EACH ROW
  EXECUTE FUNCTION update_outreach_template_updated_at();

-- Add comments
COMMENT ON TABLE "public"."OutreachPlanTemplate" IS 
'Templates for creating OutreachPlans based on condition and risk level. Used to automatically configure outreach strategies when patients are enrolled.';

COMMENT ON COLUMN "public"."OutreachPlanTemplate".first_contact_delay_hours IS 
'Hours to wait after discharge before first contact attempt';

COMMENT ON COLUMN "public"."OutreachPlanTemplate".attempt_interval_hours IS 
'Hours to wait between subsequent contact attempts';

COMMENT ON COLUMN "public"."OutreachPlanTemplate".contact_window_hours IS 
'Total time window for all contact attempts (typically 7 days = 168 hours)';

