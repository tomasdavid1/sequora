-- Add ProtocolConfig table for AI decision parameters
-- This centralizes all protocol-specific thresholds and configurations

CREATE TABLE IF NOT EXISTS public."ProtocolConfig" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condition_code TEXT NOT NULL CHECK (condition_code IN ('HF', 'COPD', 'AMI', 'PNA', 'OTHER')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  
  -- AI Decision Thresholds
  -- Lower threshold = more sensitive (escalates earlier)
  critical_confidence_threshold NUMERIC(3,2) DEFAULT 0.80 NOT NULL 
    CHECK (critical_confidence_threshold >= 0 AND critical_confidence_threshold <= 1),
  low_confidence_threshold NUMERIC(3,2) DEFAULT 0.60 NOT NULL 
    CHECK (low_confidence_threshold >= 0 AND low_confidence_threshold <= 1),
  
  -- Vague Symptom Detection (condition-specific keywords)
  vague_symptoms TEXT[] NOT NULL DEFAULT '{}',
  
  -- Sentiment-based Severity Boost
  -- When patient is distressed + symptoms match, upgrade severity
  enable_sentiment_boost BOOLEAN DEFAULT true NOT NULL,
  distressed_severity_upgrade TEXT DEFAULT 'high' 
    CHECK (distressed_severity_upgrade IN ('critical', 'high', 'moderate', 'none')),
  
  -- Intent Routing
  -- Whether to route non-symptom questions to info/education flow
  route_medication_questions_to_info BOOLEAN DEFAULT true NOT NULL,
  route_general_questions_to_info BOOLEAN DEFAULT true NOT NULL,
  
  -- Multi-symptom Detection
  -- Whether to detect all symptoms or stop at first match
  detect_multiple_symptoms BOOLEAN DEFAULT false NOT NULL,
  
  -- Metadata
  active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one config per condition + risk level combination
  UNIQUE(condition_code, risk_level)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_protocol_config_condition_risk 
  ON public."ProtocolConfig"(condition_code, risk_level) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_protocol_config_active 
  ON public."ProtocolConfig"(active);

-- RLS Policies
ALTER TABLE public."ProtocolConfig" ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read protocol configs
CREATE POLICY "Protocol configs are viewable by authenticated users"
  ON public."ProtocolConfig"
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify protocol configs
CREATE POLICY "Protocol configs are modifiable by admins only"
  ON public."ProtocolConfig"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Add helpful comments
COMMENT ON TABLE public."ProtocolConfig" IS 'AI decision thresholds and parameters for each condition + risk level combination. Controls sensitivity, symptom detection, and escalation behavior.';
COMMENT ON COLUMN public."ProtocolConfig".critical_confidence_threshold IS 'AI confidence threshold (0-1) above which a critical assessment triggers immediate escalation. Lower = more sensitive.';
COMMENT ON COLUMN public."ProtocolConfig".low_confidence_threshold IS 'AI confidence threshold (0-1) below which the system asks clarifying questions. Higher = asks more questions.';
COMMENT ON COLUMN public."ProtocolConfig".vague_symptoms IS 'Array of vague symptom keywords specific to this condition (e.g., ["discomfort", "off", "tired"] for HF).';
COMMENT ON COLUMN public."ProtocolConfig".distressed_severity_upgrade IS 'When patient is distressed + symptoms detected, upgrade severity to this level (critical/high/moderate/none).';
COMMENT ON COLUMN public."ProtocolConfig".detect_multiple_symptoms IS 'If true, detect ALL matching symptoms in patient input. If false, stop at first match.';

