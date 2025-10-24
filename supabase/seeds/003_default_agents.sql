-- Seed default TOC agents

set search_path = public;

-- 1. Outreach Coordinator Agent
insert into agent_config (
  name,
  type,
  description,
  status,
  channels,
  conditions,
  languages,
  ai_provider,
  model,
  temperature,
  max_tokens,
  system_prompt,
  proactive,
  escalation_enabled,
  handoff_to_human,
  max_attempts,
  retry_delay_minutes
) values (
  '72-Hour Outreach Coordinator',
  'OUTREACH_COORDINATOR',
  'Conducts automated 72-hour post-discharge check-ins via SMS and voice, detects red flags, and escalates to nurses when needed.',
  'ACTIVE',
  ARRAY['SMS', 'VOICE']::agent_channel[],
  ARRAY['HF', 'COPD', 'AMI', 'PNA']::condition_code[],
  ARRAY['EN', 'ES']::language_code[],
  'OPENAI',
  'gpt-4-turbo',
  0.7,
  500,
  'You are a caring post-discharge coordinator. Your goal is to check on patients 2-3 days after hospital discharge, ask about their symptoms, medications, and appointments. Be empathetic, clear, and concise. If you detect any red flags (worsening symptoms, medication issues), escalate immediately to a nurse.',
  true,
  true,
  true,
  3,
  24
);

-- 2. Medication Advisor Agent
insert into agent_config (
  name,
  type,
  description,
  status,
  channels,
  conditions,
  languages,
  ai_provider,
  model,
  temperature,
  system_prompt,
  proactive,
  escalation_enabled,
  handoff_to_human
) values (
  'Medication Adherence Advisor',
  'MEDICATION_ADVISOR',
  'Educates patients about their medications, tracks adherence, and helps troubleshoot side effects or barriers to picking up prescriptions.',
  'ACTIVE',
  ARRAY['SMS', 'VOICE', 'CHAT']::agent_channel[],
  ARRAY['HF', 'COPD', 'AMI', 'PNA']::condition_code[],
  ARRAY['EN', 'ES']::language_code[],
  'OPENAI',
  'gpt-4-turbo',
  0.6,
  'You are a medication adherence specialist. Help patients understand their medications, remind them to take doses, and assist with pharmacy pickup. If they report side effects or can''t afford meds, escalate to care coordinator.',
  true,
  true,
  true
);

-- 3. Symptom Monitor Agent
insert into agent_config (
  name,
  type,
  description,
  status,
  channels,
  languages,
  ai_provider,
  model,
  temperature,
  system_prompt,
  proactive,
  escalation_enabled
) values (
  'Heart Failure Symptom Monitor',
  'SYMPTOM_MONITOR',
  'Monitors HF-specific symptoms daily: weight changes, shortness of breath, swelling. Escalates critical symptoms immediately.',
  'ACTIVE',
  ARRAY['SMS', 'APP']::agent_channel[],
  ARRAY['EN', 'ES']::language_code[],
  'OPENAI',
  'gpt-4-turbo',
  0.5,
  'You are a heart failure monitoring specialist. Ask patients about daily weight, shortness of breath, swelling, and medication adherence. If weight increases 2+ lbs in 24h or patient has dyspnea at rest, ESCALATE IMMEDIATELY.',
  true,
  true
),
(
  'COPD Symptom Monitor',
  'SYMPTOM_MONITOR',
  'Monitors COPD-specific symptoms: rescue inhaler use, dyspnea, cough changes. Escalates if patient is using rescue inhaler excessively.',
  'ACTIVE',
  ARRAY['SMS', 'APP']::agent_channel[],
  ARRAY['EN', 'ES']::language_code[],
  'OPENAI',
  'gpt-4-turbo',
  0.5,
  'You are a COPD monitoring specialist. Track rescue inhaler use, breathing difficulty, and cough. If rescue inhaler used >4x per day or breathing is worsening, ESCALATE.',
  true,
  true
);

-- 4. Appointment Scheduler Agent
insert into agent_config (
  name,
  type,
  description,
  status,
  channels,
  languages,
  ai_provider,
  model,
  system_prompt,
  proactive
) values (
  'Appointment Scheduler',
  'APPOINTMENT_SCHEDULER',
  'Helps patients schedule follow-up appointments, sends reminders, and reschedules if needed.',
  'ACTIVE',
  ARRAY['SMS', 'VOICE', 'CHAT']::agent_channel[],
  ARRAY['EN', 'ES']::language_code[],
  'OPENAI',
  'gpt-3.5-turbo',
  'You are an appointment scheduling assistant. Help patients book follow-up appointments within 7-14 days of discharge. Offer available times, confirm details, and send reminders.',
  true
);

-- 5. Transport Coordinator Agent
insert into agent_config (
  name,
  type,
  description,
  status,
  channels,
  languages,
  ai_provider,
  model,
  system_prompt,
  proactive
) values (
  'Transportation Coordinator',
  'TRANSPORT_COORDINATOR',
  'Arranges NEMT (non-emergency medical transportation) for patients who need rides to appointments.',
  'ACTIVE',
  ARRAY['SMS', 'VOICE']::agent_channel[],
  ARRAY['EN', 'ES']::language_code[],
  'OPENAI',
  'gpt-3.5-turbo',
  'You are a transportation coordinator. Help patients arrange rides to medical appointments through NEMT. Collect pickup address, confirm appointment time, and provide confirmation code.',
  true
);

-- 6. Care Navigator Agent
insert into agent_config (
  name,
  type,
  description,
  status,
  channels,
  languages,
  ai_provider,
  model,
  temperature,
  system_prompt,
  proactive,
  handoff_to_human
) values (
  'General Care Navigator',
  'CARE_NAVIGATOR',
  'Answers general questions about discharge instructions, provides health education, and connects patients to resources.',
  'ACTIVE',
  ARRAY['SMS', 'CHAT', 'EMAIL']::agent_channel[],
  ARRAY['EN', 'ES']::language_code[],
  'OPENAI',
  'gpt-4-turbo',
  0.7,
  'You are a patient care navigator. Answer questions about discharge instructions, provide health education, and help patients access community resources. Be supportive and informative.',
  false,
  true
);

-- 7. Clinical Escalation Agent
insert into agent_config (
  name,
  type,
  description,
  status,
  channels,
  languages,
  ai_provider,
  model,
  temperature,
  system_prompt,
  proactive,
  escalation_enabled,
  handoff_to_human
) values (
  'Clinical Escalation Triage',
  'CLINICAL_ESCALATION',
  'Performs initial triage of escalated issues, determines severity, and routes to appropriate clinical staff.',
  'TESTING',
  ARRAY['CHAT']::agent_channel[],
  ARRAY['EN', 'ES']::language_code[],
  'OPENAI',
  'gpt-4-turbo',
  0.3,
  'You are a clinical triage specialist. Assess escalated patient concerns, determine severity (CRITICAL/HIGH/MODERATE), and route to appropriate staff. For CRITICAL issues, recommend ED or 911.',
  false,
  false,
  true
);

