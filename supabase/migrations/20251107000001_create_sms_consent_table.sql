-- SMS Consent Table for Twilio Compliance
-- Stores explicit opt-in consent records with audit trail

CREATE TABLE IF NOT EXISTS public."SMSConsent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ NOT NULL,
  opt_out_timestamp TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  opt_in_source TEXT, -- 'web_form', 'nurse_portal', 'phone_call', etc.
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast phone number lookup
CREATE INDEX IF NOT EXISTS idx_sms_consent_phone ON public."SMSConsent"(phone_number);

-- Index for active consents
CREATE INDEX IF NOT EXISTS idx_sms_consent_active ON public."SMSConsent"(active) WHERE active = true;

-- Add RLS policies
ALTER TABLE public."SMSConsent" ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for consent form)
CREATE POLICY "Allow public consent submission"
  ON public."SMSConsent"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role can read consents (HIPAA compliance)
CREATE POLICY "Service role can read consents"
  ON public."SMSConsent"
  FOR SELECT
  TO service_role
  USING (true);

-- Only service role can update consents (for opt-outs)
CREATE POLICY "Service role can update consents"
  ON public."SMSConsent"
  FOR UPDATE
  TO service_role
  USING (true);

-- Add comments
COMMENT ON TABLE public."SMSConsent" IS 'SMS opt-in consent records for Twilio compliance. Stores explicit consent with timestamp and audit trail.';
COMMENT ON COLUMN public."SMSConsent".phone_number IS 'Phone number (normalized, digits only)';
COMMENT ON COLUMN public."SMSConsent".consent_timestamp IS 'When user gave consent (for audit trail)';
COMMENT ON COLUMN public."SMSConsent".opt_out_timestamp IS 'When user opted out (if applicable)';
COMMENT ON COLUMN public."SMSConsent".opt_in_source IS 'Where consent was collected (web_form, nurse_portal, etc)';
COMMENT ON COLUMN public."SMSConsent".active IS 'Whether consent is currently active (false if opted out)';

