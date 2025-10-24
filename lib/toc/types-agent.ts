// Agent system types

export type AgentType = 
  | 'OUTREACH_COORDINATOR'      // Handles 72h outreach calls
  | 'MEDICATION_ADVISOR'        // Medication adherence + education
  | 'APPOINTMENT_SCHEDULER'     // Scheduling + confirmation
  | 'TRANSPORT_COORDINATOR'     // NEMT booking
  | 'SYMPTOM_MONITOR'          // Condition-specific monitoring
  | 'CARE_NAVIGATOR'           // General care navigation
  | 'CLINICAL_ESCALATION';     // Triage + nurse escalation

export type AgentStatus = 'ACTIVE' | 'INACTIVE' | 'TESTING' | 'MAINTENANCE';

export type AgentChannel = 'SMS' | 'VOICE' | 'CHAT' | 'EMAIL' | 'APP';

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  status: AgentStatus;
  
  // Supported channels
  channels: AgentChannel[];
  
  // Condition-specific
  conditions?: string[]; // HF, COPD, AMI, PNA
  languages?: string[];  // EN, ES
  
  // AI Configuration
  ai_provider: 'OPENAI' | 'ANTHROPIC' | 'AZURE' | 'CUSTOM';
  model: string; // e.g., 'gpt-4', 'claude-3-opus'
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  
  // Behavior
  proactive: boolean; // Can initiate conversations
  escalation_enabled: boolean;
  handoff_to_human: boolean;
  
  // Timing
  active_hours?: {
    start: string; // "08:00"
    end: string;   // "20:00"
    timezone: string;
  };
  
  // Limits
  max_attempts?: number;
  retry_delay_minutes?: number;
  cooldown_period_hours?: number;
  
  // Integration
  webhook_url?: string;
  api_key_ref?: string;
  
  // Analytics
  total_interactions: number;
  success_rate?: number;
  avg_response_time_ms?: number;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface AgentInteraction {
  id: string;
  agent_id: string;
  episode_id?: string;
  patient_id?: string;
  
  channel: AgentChannel;
  direction: 'INBOUND' | 'OUTBOUND';
  
  // Conversation
  messages: AgentMessage[];
  
  // State
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED' | 'FAILED' | 'TIMEOUT';
  started_at: string;
  completed_at?: string;
  
  // Outcomes
  primary_goal_achieved: boolean;
  escalation_reason?: string;
  handoff_to_user_id?: string;
  
  // Metrics
  duration_seconds?: number;
  message_count: number;
  
  // Context
  metadata?: any;
  
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  interaction_id: string;
  role: 'AGENT' | 'PATIENT' | 'SYSTEM';
  content: string;
  timestamp: string;
  
  // AI metadata
  model_used?: string;
  tokens_used?: number;
  confidence_score?: number;
  
  // Intent detection
  detected_intent?: string;
  entities?: Record<string, any>;
  
  // Flags
  contains_phi: boolean;
  flagged_for_review: boolean;
}

export interface AgentPromptTemplate {
  id: string;
  agent_type: AgentType;
  condition_code?: string;
  language_code: string;
  
  name: string;
  description: string;
  
  // Prompt sections
  system_prompt: string;
  greeting?: string;
  questions?: string[];
  escalation_triggers?: string[];
  closing?: string;
  
  // Variables that can be injected
  variables: string[]; // e.g., ['patient_name', 'discharge_date', 'medications']
  
  // Testing
  test_cases?: Array<{
    input: string;
    expected_intent: string;
    expected_action: string;
  }>;
  
  active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

