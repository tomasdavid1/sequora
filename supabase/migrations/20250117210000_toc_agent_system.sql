-- TOC Agent System Migration
-- Tables for managing AI agents and their interactions

-- Agent Config table
CREATE TABLE IF NOT EXISTS public."AgentConfig" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  openai_assistant_id TEXT,
  retell_agent_id TEXT,
  voice_id TEXT,
  prompt_template TEXT,
  system_instructions TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Interaction table
CREATE TABLE IF NOT EXISTS public."AgentInteraction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_config_id UUID REFERENCES public."AgentConfig"(id) ON DELETE CASCADE,
  interaction_type TEXT CHECK (interaction_type IN ('VOICE_CALL', 'SMS', 'WHATSAPP', 'EMAIL', 'APP_CHAT')) NOT NULL,
  status TEXT CHECK (status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')) DEFAULT 'INITIATED',
  external_id TEXT, -- Retell call ID, Twilio message SID, etc.
  patient_id UUID REFERENCES public."Patient"(id) ON DELETE SET NULL,
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE SET NULL,
  outreach_attempt_id UUID REFERENCES public."OutreachAttempt"(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Message table
CREATE TABLE IF NOT EXISTS public."AgentMessage" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_interaction_id UUID REFERENCES public."AgentInteraction"(id) ON DELETE CASCADE,
  message_type TEXT CHECK (message_type IN ('SYSTEM', 'USER', 'ASSISTANT', 'FUNCTION_CALL', 'FUNCTION_RESULT')) NOT NULL,
  content TEXT NOT NULL,
  role TEXT CHECK (role IN ('system', 'user', 'assistant', 'function')) NOT NULL,
  function_name TEXT,
  function_arguments JSONB,
  tokens_used INTEGER,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Prompt Template table
CREATE TABLE IF NOT EXISTS public."AgentPromptTemplate" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  condition_code public.condition_code,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  variables TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Metrics table
CREATE TABLE IF NOT EXISTS public."AgentMetrics" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_config_id UUID REFERENCES public."AgentConfig"(id) ON DELETE CASCADE,
  date_bucket DATE NOT NULL,
  interaction_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_duration_seconds DECIMAL(10,2) DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  escalation_count INTEGER DEFAULT 0,
  patient_satisfaction_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_config_type ON public."AgentConfig"(agent_type, active);
CREATE INDEX IF NOT EXISTS idx_agent_interaction_config_id ON public."AgentInteraction"(agent_config_id, started_at);
CREATE INDEX IF NOT EXISTS idx_agent_interaction_status ON public."AgentInteraction"(status, started_at);
CREATE INDEX IF NOT EXISTS idx_agent_interaction_external_id ON public."AgentInteraction"(external_id);
CREATE INDEX IF NOT EXISTS idx_agent_interaction_patient_id ON public."AgentInteraction"(patient_id, started_at);
CREATE INDEX IF NOT EXISTS idx_agent_message_interaction_id ON public."AgentMessage"(agent_interaction_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_agent_prompt_template_type ON public."AgentPromptTemplate"(agent_type, condition_code, active);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_config_id ON public."AgentMetrics"(agent_config_id, date_bucket);
