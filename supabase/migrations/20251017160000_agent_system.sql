-- Agent system tables for managing multiple AI agents

set search_path = public;

-- Agent types enum
create type agent_type as enum (
  'OUTREACH_COORDINATOR',
  'MEDICATION_ADVISOR',
  'APPOINTMENT_SCHEDULER',
  'TRANSPORT_COORDINATOR',
  'SYMPTOM_MONITOR',
  'CARE_NAVIGATOR',
  'CLINICAL_ESCALATION'
);

create type agent_status as enum ('ACTIVE', 'INACTIVE', 'TESTING', 'MAINTENANCE');
create type agent_channel as enum ('SMS', 'VOICE', 'CHAT', 'EMAIL', 'APP');
create type ai_provider as enum ('OPENAI', 'ANTHROPIC', 'AZURE', 'CUSTOM');
create type interaction_status as enum ('IN_PROGRESS', 'COMPLETED', 'ESCALATED', 'FAILED', 'TIMEOUT');
create type message_role as enum ('AGENT', 'PATIENT', 'SYSTEM');

-- Agent configurations
create table if not exists agent_config (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type agent_type not null,
  description text,
  status agent_status not null default 'TESTING',
  
  -- Channels (stored as array)
  channels agent_channel[] not null,
  
  -- Condition/language filters
  conditions condition_code[],
  languages language_code[],
  
  -- AI configuration
  ai_provider ai_provider not null default 'OPENAI',
  model text not null,
  temperature numeric(3,2),
  max_tokens integer,
  system_prompt text,
  
  -- Behavior flags
  proactive boolean not null default false,
  escalation_enabled boolean not null default true,
  handoff_to_human boolean not null default true,
  
  -- Timing
  active_hours jsonb, -- {start, end, timezone}
  
  -- Limits
  max_attempts integer default 3,
  retry_delay_minutes integer default 30,
  cooldown_period_hours integer default 24,
  
  -- Integration
  webhook_url text,
  api_key_ref text, -- Reference to secure vault
  
  -- Analytics (updated periodically)
  total_interactions integer default 0,
  success_rate numeric(5,2),
  avg_response_time_ms integer,
  
  -- Metadata
  created_by uuid references user_staff(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agent_config_type on agent_config(type);
create index idx_agent_config_status on agent_config(status);
create index idx_agent_config_type_status on agent_config(type, status);

-- Agent interactions (conversation sessions)
create table if not exists agent_interaction (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agent_config(id),
  episode_id uuid references episode(id),
  patient_id uuid not null references patient(id),
  
  channel agent_channel not null,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND')),
  
  -- State
  status interaction_status not null default 'IN_PROGRESS',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  
  -- Outcomes
  primary_goal_achieved boolean default false,
  escalation_reason text,
  handoff_to_user_id uuid references user_staff(id),
  
  -- Metrics
  duration_seconds integer,
  message_count integer default 0,
  
  -- Context (flexible JSON for agent-specific data)
  metadata jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agent_interaction_agent on agent_interaction(agent_id);
create index idx_agent_interaction_episode on agent_interaction(episode_id);
create index idx_agent_interaction_patient on agent_interaction(patient_id);
create index idx_agent_interaction_status on agent_interaction(status);
create index idx_agent_interaction_started on agent_interaction(started_at);

-- Agent messages (conversation turns)
create table if not exists agent_message (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references agent_interaction(id) on delete cascade,
  role message_role not null,
  content text not null,
  timestamp timestamptz not null default now(),
  
  -- AI metadata
  model_used text,
  tokens_used integer,
  confidence_score numeric(3,2),
  
  -- Intent detection
  detected_intent text,
  entities jsonb,
  
  -- Flags
  contains_phi boolean default false,
  flagged_for_review boolean default false,
  
  created_at timestamptz not null default now()
);

create index idx_agent_message_interaction on agent_message(interaction_id);
create index idx_agent_message_timestamp on agent_message(timestamp);
create index idx_agent_message_flagged on agent_message(flagged_for_review) where flagged_for_review = true;

-- Agent prompt templates
create table if not exists agent_prompt_template (
  id uuid primary key default gen_random_uuid(),
  agent_type agent_type not null,
  condition_code condition_code,
  language_code language_code not null,
  
  name text not null,
  description text,
  
  -- Prompt sections
  system_prompt text not null,
  greeting text,
  questions text[], -- Array of question templates
  escalation_triggers text[],
  closing text,
  
  -- Variables for interpolation
  variables text[], -- e.g., ['patient_name', 'medications']
  
  -- Testing
  test_cases jsonb,
  
  active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agent_prompt_type on agent_prompt_template(agent_type);
create index idx_agent_prompt_condition on agent_prompt_template(condition_code);
create index idx_agent_prompt_active on agent_prompt_template(active) where active = true;

-- Agent performance metrics (aggregated)
create table if not exists agent_metrics (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agent_config(id),
  date date not null,
  
  -- Volume
  total_interactions integer default 0,
  successful_interactions integer default 0,
  escalated_interactions integer default 0,
  failed_interactions integer default 0,
  
  -- Performance
  avg_duration_seconds numeric(10,2),
  avg_messages_per_interaction numeric(5,2),
  avg_response_time_ms integer,
  
  -- Quality
  goal_achievement_rate numeric(5,2),
  escalation_rate numeric(5,2),
  patient_satisfaction_score numeric(3,2),
  
  -- Cost (if applicable)
  total_tokens_used bigint,
  estimated_cost_cents integer,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(agent_id, date)
);

create index idx_agent_metrics_agent on agent_metrics(agent_id);
create index idx_agent_metrics_date on agent_metrics(date);

-- Enable RLS
alter table agent_config enable row level security;
alter table agent_interaction enable row level security;
alter table agent_message enable row level security;
alter table agent_prompt_template enable row level security;
alter table agent_metrics enable row level security;

-- RLS policies (service role can manage all)
create policy "Service role can manage agent configs"
  on agent_config for all to service_role using (true) with check (true);

create policy "Service role can manage interactions"
  on agent_interaction for all to service_role using (true) with check (true);

create policy "Service role can manage messages"
  on agent_message for all to service_role using (true) with check (true);

create policy "Service role can manage prompts"
  on agent_prompt_template for all to service_role using (true) with check (true);

create policy "Service role can view metrics"
  on agent_metrics for select to service_role using (true);

-- Authenticated users can read active agents
create policy "Authenticated can read active agents"
  on agent_config for select to authenticated
  using (status = 'ACTIVE');

-- Function to update agent analytics
create or replace function update_agent_analytics()
returns trigger as $$
begin
  if NEW.status = 'COMPLETED' and OLD.status != 'COMPLETED' then
    update agent_config
    set 
      total_interactions = total_interactions + 1,
      updated_at = now()
    where id = NEW.agent_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_update_agent_analytics
  after update on agent_interaction
  for each row
  execute function update_agent_analytics();

-- Function to calculate interaction duration
create or replace function set_interaction_duration()
returns trigger as $$
begin
  if NEW.completed_at is not null and NEW.started_at is not null then
    NEW.duration_seconds = extract(epoch from (NEW.completed_at - NEW.started_at))::integer;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_set_interaction_duration
  before update on agent_interaction
  for each row
  when (NEW.completed_at is not null)
  execute function set_interaction_duration();

