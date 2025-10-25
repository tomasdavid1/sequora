export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      AgentConfig: {
        Row: {
          active: boolean | null
          agent_type: string
          created_at: string | null
          description: string | null
          id: string
          max_tokens: number | null
          name: string
          openai_assistant_id: string | null
          prompt_template: string | null
          retell_agent_id: string | null
          system_instructions: string | null
          temperature: number | null
          updated_at: string | null
          voice_id: string | null
        }
        Insert: {
          active?: boolean | null
          agent_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_tokens?: number | null
          name: string
          openai_assistant_id?: string | null
          prompt_template?: string | null
          retell_agent_id?: string | null
          system_instructions?: string | null
          temperature?: number | null
          updated_at?: string | null
          voice_id?: string | null
        }
        Update: {
          active?: boolean | null
          agent_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_tokens?: number | null
          name?: string
          openai_assistant_id?: string | null
          prompt_template?: string | null
          retell_agent_id?: string | null
          system_instructions?: string | null
          temperature?: number | null
          updated_at?: string | null
          voice_id?: string | null
        }
        Relationships: []
      }
      AgentInteraction: {
        Row: {
          agent_config_id: string | null
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          episode_id: string | null
          external_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          outreach_attempt_id: string | null
          patient_id: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_config_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          episode_id?: string | null
          external_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          outreach_attempt_id?: string | null
          patient_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_config_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          episode_id?: string | null
          external_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          outreach_attempt_id?: string | null
          patient_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AgentInteraction_agent_config_id_fkey"
            columns: ["agent_config_id"]
            isOneToOne: false
            referencedRelation: "AgentConfig"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agentinteraction_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AgentInteraction_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AgentInteraction_outreach_attempt_id_fkey"
            columns: ["outreach_attempt_id"]
            isOneToOne: false
            referencedRelation: "OutreachAttempt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agentinteraction_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "Patient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AgentInteraction_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "Patient"
            referencedColumns: ["id"]
          },
        ]
      }
      AgentMessage: {
        Row: {
          agent_interaction_id: string | null
          confidence_score: number | null
          contains_phi: boolean | null
          content: string
          created_at: string | null
          detected_intent: string | null
          entities: Json | null
          flagged_for_review: boolean | null
          function_arguments: Json | null
          function_name: string | null
          id: string
          message_type: string
          model_used: string | null
          role: string
          sequence_number: number
          timestamp: string | null
          tokens_used: number | null
        }
        Insert: {
          agent_interaction_id?: string | null
          confidence_score?: number | null
          contains_phi?: boolean | null
          content: string
          created_at?: string | null
          detected_intent?: string | null
          entities?: Json | null
          flagged_for_review?: boolean | null
          function_arguments?: Json | null
          function_name?: string | null
          id?: string
          message_type: string
          model_used?: string | null
          role: string
          sequence_number: number
          timestamp?: string | null
          tokens_used?: number | null
        }
        Update: {
          agent_interaction_id?: string | null
          confidence_score?: number | null
          contains_phi?: boolean | null
          content?: string
          created_at?: string | null
          detected_intent?: string | null
          entities?: Json | null
          flagged_for_review?: boolean | null
          function_arguments?: Json | null
          function_name?: string | null
          id?: string
          message_type?: string
          model_used?: string | null
          role?: string
          sequence_number?: number
          timestamp?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "AgentMessage_agent_interaction_id_fkey"
            columns: ["agent_interaction_id"]
            isOneToOne: false
            referencedRelation: "AgentInteraction"
            referencedColumns: ["id"]
          },
        ]
      }
      AgentMetrics: {
        Row: {
          agent_config_id: string | null
          avg_duration_seconds: number | null
          created_at: string | null
          date_bucket: string
          escalation_count: number | null
          failure_count: number | null
          id: string
          interaction_count: number | null
          patient_satisfaction_score: number | null
          success_count: number | null
          total_tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          agent_config_id?: string | null
          avg_duration_seconds?: number | null
          created_at?: string | null
          date_bucket: string
          escalation_count?: number | null
          failure_count?: number | null
          id?: string
          interaction_count?: number | null
          patient_satisfaction_score?: number | null
          success_count?: number | null
          total_tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_config_id?: string | null
          avg_duration_seconds?: number | null
          created_at?: string | null
          date_bucket?: string
          escalation_count?: number | null
          failure_count?: number | null
          id?: string
          interaction_count?: number | null
          patient_satisfaction_score?: number | null
          success_count?: number | null
          total_tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AgentMetrics_agent_config_id_fkey"
            columns: ["agent_config_id"]
            isOneToOne: false
            referencedRelation: "AgentConfig"
            referencedColumns: ["id"]
          },
        ]
      }
      AgentPromptTemplate: {
        Row: {
          active: boolean | null
          agent_type: string
          condition_code: Database["public"]["Enums"]["condition_code"] | null
          created_at: string | null
          id: string
          template_content: string
          template_name: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          active?: boolean | null
          agent_type: string
          condition_code?: Database["public"]["Enums"]["condition_code"] | null
          created_at?: string | null
          id?: string
          template_content: string
          template_name: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          active?: boolean | null
          agent_type?: string
          condition_code?: Database["public"]["Enums"]["condition_code"] | null
          created_at?: string | null
          id?: string
          template_content?: string
          template_name?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      Appointment: {
        Row: {
          address: string | null
          created_at: string | null
          department: string | null
          end_at: string | null
          episode_id: string | null
          id: string
          last_confirmed_at: string | null
          location_name: string | null
          modality: string | null
          provider_name: string | null
          source_system: string | null
          start_at: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          tele_link: string | null
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          department?: string | null
          end_at?: string | null
          episode_id?: string | null
          id?: string
          last_confirmed_at?: string | null
          location_name?: string | null
          modality?: string | null
          provider_name?: string | null
          source_system?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          tele_link?: string | null
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          department?: string | null
          end_at?: string | null
          episode_id?: string | null
          id?: string
          last_confirmed_at?: string | null
          location_name?: string | null
          modality?: string | null
          provider_name?: string | null
          source_system?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          tele_link?: string | null
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Appointment_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
        ]
      }
      AssignmentPreference: {
        Row: {
          condition_codes:
            | Database["public"]["Enums"]["condition_code"][]
            | null
          created_at: string | null
          id: string
          language_code: Database["public"]["Enums"]["language_code"] | null
          max_concurrent_tasks: number | null
          shift_end_local: string | null
          shift_start_local: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          condition_codes?:
            | Database["public"]["Enums"]["condition_code"][]
            | null
          created_at?: string | null
          id?: string
          language_code?: Database["public"]["Enums"]["language_code"] | null
          max_concurrent_tasks?: number | null
          shift_end_local?: string | null
          shift_start_local?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          condition_codes?:
            | Database["public"]["Enums"]["condition_code"][]
            | null
          created_at?: string | null
          id?: string
          language_code?: Database["public"]["Enums"]["language_code"] | null
          max_concurrent_tasks?: number | null
          shift_end_local?: string | null
          shift_start_local?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AssignmentPreference_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      AuditLog: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          occurred_at: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_type: string
          actor_user_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          occurred_at?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          occurred_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AuditLog_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      CareInstruction: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          episode_id: string
          id: string
          instruction_text: string
          instruction_type: string
          priority: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          episode_id: string
          id?: string
          instruction_text: string
          instruction_type: string
          priority?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          episode_id?: string
          id?: string
          instruction_text?: string
          instruction_type?: string
          priority?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CareInstruction_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
        ]
      }
      CommunicationMessage: {
        Row: {
          body_hash: string | null
          channel: Database["public"]["Enums"]["contact_channel"]
          contains_phi: boolean | null
          created_at: string | null
          delivered_at: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          episode_id: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          patient_id: string | null
          provider_message_id: string | null
          responded_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"] | null
          template_code: string | null
          updated_at: string | null
        }
        Insert: {
          body_hash?: string | null
          channel: Database["public"]["Enums"]["contact_channel"]
          contains_phi?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          episode_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          patient_id?: string | null
          provider_message_id?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          template_code?: string | null
          updated_at?: string | null
        }
        Update: {
          body_hash?: string | null
          channel?: Database["public"]["Enums"]["contact_channel"]
          contains_phi?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: Database["public"]["Enums"]["message_direction"]
          episode_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          patient_id?: string | null
          provider_message_id?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          template_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CommunicationMessage_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CommunicationMessage_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "Patient"
            referencedColumns: ["id"]
          },
        ]
      }
      Consent: {
        Row: {
          created_at: string | null
          documentation_ref: string | null
          expires_at: string | null
          id: string
          method: string | null
          patient_id: string | null
          recorded_at: string | null
          recorded_by_user_id: string | null
          status: Database["public"]["Enums"]["consent_status"]
          type: Database["public"]["Enums"]["consent_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          documentation_ref?: string | null
          expires_at?: string | null
          id?: string
          method?: string | null
          patient_id?: string | null
          recorded_at?: string | null
          recorded_by_user_id?: string | null
          status: Database["public"]["Enums"]["consent_status"]
          type: Database["public"]["Enums"]["consent_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          documentation_ref?: string | null
          expires_at?: string | null
          id?: string
          method?: string | null
          patient_id?: string | null
          recorded_at?: string | null
          recorded_by_user_id?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          type?: Database["public"]["Enums"]["consent_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Consent_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "Patient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Consent_recorded_by_user_id_fkey"
            columns: ["recorded_by_user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Episode: {
        Row: {
          admit_at: string | null
          attending_physician_name: string | null
          attending_physician_npi: string | null
          condition_code: Database["public"]["Enums"]["condition_code"]
          created_at: string | null
          discharge_at: string
          discharge_diagnosis_codes: string[] | null
          discharge_location: string | null
          discharge_notes_ref: string | null
          discharge_spo2: number | null
          discharge_systolic_bp: number | null
          discharge_weight_kg: number | null
          education_level: string | null
          ejection_fraction_pct: number | null
          elixhauser_score: number | null
          facility_id: string | null
          facility_name: string | null
          hospital_course_summary: string | null
          hospital_id: string | null
          id: string
          patient_id: string
          risk_scores: Json | null
          severity_indicator: string | null
          source_system: string | null
          updated_at: string | null
        }
        Insert: {
          admit_at?: string | null
          attending_physician_name?: string | null
          attending_physician_npi?: string | null
          condition_code: Database["public"]["Enums"]["condition_code"]
          created_at?: string | null
          discharge_at: string
          discharge_diagnosis_codes?: string[] | null
          discharge_location?: string | null
          discharge_notes_ref?: string | null
          discharge_spo2?: number | null
          discharge_systolic_bp?: number | null
          discharge_weight_kg?: number | null
          education_level?: string | null
          ejection_fraction_pct?: number | null
          elixhauser_score?: number | null
          facility_id?: string | null
          facility_name?: string | null
          hospital_course_summary?: string | null
          hospital_id?: string | null
          id?: string
          patient_id: string
          risk_scores?: Json | null
          severity_indicator?: string | null
          source_system?: string | null
          updated_at?: string | null
        }
        Update: {
          admit_at?: string | null
          attending_physician_name?: string | null
          attending_physician_npi?: string | null
          condition_code?: Database["public"]["Enums"]["condition_code"]
          created_at?: string | null
          discharge_at?: string
          discharge_diagnosis_codes?: string[] | null
          discharge_location?: string | null
          discharge_notes_ref?: string | null
          discharge_spo2?: number | null
          discharge_systolic_bp?: number | null
          discharge_weight_kg?: number | null
          education_level?: string | null
          ejection_fraction_pct?: number | null
          elixhauser_score?: number | null
          facility_id?: string | null
          facility_name?: string | null
          hospital_course_summary?: string | null
          hospital_id?: string | null
          id?: string
          patient_id?: string
          risk_scores?: Json | null
          severity_indicator?: string | null
          source_system?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Episode_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "Patient"
            referencedColumns: ["id"]
          },
        ]
      }
      EpisodeMedication: {
        Row: {
          cost_concern_flag: boolean | null
          created_at: string | null
          dose: string | null
          dose_unit: string | null
          episode_id: string | null
          expected_duration_days: number | null
          frequency: string | null
          id: string
          instructions: string | null
          name: string
          requires_prior_auth: boolean | null
          route: string | null
          rx_norm_code: string | null
          source: Database["public"]["Enums"]["medication_source"] | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          cost_concern_flag?: boolean | null
          created_at?: string | null
          dose?: string | null
          dose_unit?: string | null
          episode_id?: string | null
          expected_duration_days?: number | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          name: string
          requires_prior_auth?: boolean | null
          route?: string | null
          rx_norm_code?: string | null
          source?: Database["public"]["Enums"]["medication_source"] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_concern_flag?: boolean | null
          created_at?: string | null
          dose?: string | null
          dose_unit?: string | null
          episode_id?: string | null
          expected_duration_days?: number | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          name?: string
          requires_prior_auth?: boolean | null
          route?: string | null
          rx_norm_code?: string | null
          source?: Database["public"]["Enums"]["medication_source"] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "EpisodeMedication_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
        ]
      }
      EscalationTask: {
        Row: {
          agent_interaction_id: string | null
          assigned_to_user_id: string | null
          created_at: string | null
          episode_id: string | null
          id: string
          picked_up_at: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          reason_codes: string[] | null
          resolution_notes: string | null
          resolution_outcome_code: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["red_flag_severity"]
          sla_due_at: string
          source_attempt_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          updated_at: string | null
        }
        Insert: {
          agent_interaction_id?: string | null
          assigned_to_user_id?: string | null
          created_at?: string | null
          episode_id?: string | null
          id?: string
          picked_up_at?: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          reason_codes?: string[] | null
          resolution_notes?: string | null
          resolution_outcome_code?: string | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["red_flag_severity"]
          sla_due_at: string
          source_attempt_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          updated_at?: string | null
        }
        Update: {
          agent_interaction_id?: string | null
          assigned_to_user_id?: string | null
          created_at?: string | null
          episode_id?: string | null
          id?: string
          picked_up_at?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          reason_codes?: string[] | null
          resolution_notes?: string | null
          resolution_outcome_code?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["red_flag_severity"]
          sla_due_at?: string
          source_attempt_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "EscalationTask_agent_interaction_id_fkey"
            columns: ["agent_interaction_id"]
            isOneToOne: false
            referencedRelation: "AgentInteraction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EscalationTask_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EscalationTask_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EscalationTask_source_attempt_id_fkey"
            columns: ["source_attempt_id"]
            isOneToOne: false
            referencedRelation: "OutreachAttempt"
            referencedColumns: ["id"]
          },
        ]
      }
      MedicationAdherenceEvent: {
        Row: {
          created_at: string | null
          details: string | null
          episode_id: string | null
          event_type: string | null
          id: string
          medication_name: string
          occurred_at: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          episode_id?: string | null
          event_type?: string | null
          id?: string
          medication_name: string
          occurred_at?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          episode_id?: string | null
          event_type?: string | null
          id?: string
          medication_name?: string
          occurred_at?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MedicationAdherenceEvent_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
        ]
      }
      NoteExport: {
        Row: {
          created_at: string | null
          destination: Database["public"]["Enums"]["note_destination"]
          episode_id: string | null
          escalation_task_id: string | null
          external_ref_id: string | null
          failure_reason: string | null
          id: string
          payload_ref: string | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          destination: Database["public"]["Enums"]["note_destination"]
          episode_id?: string | null
          escalation_task_id?: string | null
          external_ref_id?: string | null
          failure_reason?: string | null
          id?: string
          payload_ref?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          destination?: Database["public"]["Enums"]["note_destination"]
          episode_id?: string | null
          escalation_task_id?: string | null
          external_ref_id?: string | null
          failure_reason?: string | null
          id?: string
          payload_ref?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "NoteExport_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "NoteExport_escalation_task_id_fkey"
            columns: ["escalation_task_id"]
            isOneToOne: false
            referencedRelation: "EscalationTask"
            referencedColumns: ["id"]
          },
        ]
      }
      OutreachAttempt: {
        Row: {
          attempt_number: number
          channel: Database["public"]["Enums"]["contact_channel"]
          completed_at: string | null
          connect: boolean | null
          created_at: string | null
          id: string
          outreach_plan_id: string | null
          provider_message_id: string | null
          reason_code: string | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["outreach_status"] | null
          transcript_ref: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_number: number
          channel: Database["public"]["Enums"]["contact_channel"]
          completed_at?: string | null
          connect?: boolean | null
          created_at?: string | null
          id?: string
          outreach_plan_id?: string | null
          provider_message_id?: string | null
          reason_code?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["outreach_status"] | null
          transcript_ref?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_number?: number
          channel?: Database["public"]["Enums"]["contact_channel"]
          completed_at?: string | null
          connect?: boolean | null
          created_at?: string | null
          id?: string
          outreach_plan_id?: string | null
          provider_message_id?: string | null
          reason_code?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["outreach_status"] | null
          transcript_ref?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "OutreachAttempt_outreach_plan_id_fkey"
            columns: ["outreach_plan_id"]
            isOneToOne: false
            referencedRelation: "OutreachPlan"
            referencedColumns: ["id"]
          },
        ]
      }
      OutreachPlan: {
        Row: {
          created_at: string | null
          episode_id: string | null
          exclusion_reason: string | null
          fallback_channel:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          id: string
          include_caregiver: boolean | null
          language_code: Database["public"]["Enums"]["language_code"] | null
          max_attempts: number | null
          preferred_channel: Database["public"]["Enums"]["contact_channel"]
          status: Database["public"]["Enums"]["outreach_status"] | null
          timezone: string | null
          updated_at: string | null
          window_end_at: string
          window_start_at: string
        }
        Insert: {
          created_at?: string | null
          episode_id?: string | null
          exclusion_reason?: string | null
          fallback_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          id?: string
          include_caregiver?: boolean | null
          language_code?: Database["public"]["Enums"]["language_code"] | null
          max_attempts?: number | null
          preferred_channel: Database["public"]["Enums"]["contact_channel"]
          status?: Database["public"]["Enums"]["outreach_status"] | null
          timezone?: string | null
          updated_at?: string | null
          window_end_at: string
          window_start_at: string
        }
        Update: {
          created_at?: string | null
          episode_id?: string | null
          exclusion_reason?: string | null
          fallback_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          id?: string
          include_caregiver?: boolean | null
          language_code?: Database["public"]["Enums"]["language_code"] | null
          max_attempts?: number | null
          preferred_channel?: Database["public"]["Enums"]["contact_channel"]
          status?: Database["public"]["Enums"]["outreach_status"] | null
          timezone?: string | null
          updated_at?: string | null
          window_end_at?: string
          window_start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "OutreachPlan_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
        ]
      }
      OutreachQuestion: {
        Row: {
          active: boolean | null
          choices: string[] | null
          code: string
          condition_code: Database["public"]["Enums"]["condition_code"]
          created_at: string | null
          id: string
          language_code: Database["public"]["Enums"]["language_code"] | null
          max_value: number | null
          min_value: number | null
          response_type: Database["public"]["Enums"]["response_type"]
          text: string
          unit: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          active?: boolean | null
          choices?: string[] | null
          code: string
          condition_code: Database["public"]["Enums"]["condition_code"]
          created_at?: string | null
          id?: string
          language_code?: Database["public"]["Enums"]["language_code"] | null
          max_value?: number | null
          min_value?: number | null
          response_type: Database["public"]["Enums"]["response_type"]
          text: string
          unit?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          active?: boolean | null
          choices?: string[] | null
          code?: string
          condition_code?: Database["public"]["Enums"]["condition_code"]
          created_at?: string | null
          id?: string
          language_code?: Database["public"]["Enums"]["language_code"] | null
          max_value?: number | null
          min_value?: number | null
          response_type?: Database["public"]["Enums"]["response_type"]
          text?: string
          unit?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      OutreachResponse: {
        Row: {
          captured_at: string | null
          created_at: string | null
          id: string
          outreach_attempt_id: string | null
          question_code: string
          question_version: number | null
          red_flag_code: string | null
          red_flag_severity:
            | Database["public"]["Enums"]["red_flag_severity"]
            | null
          response_type: Database["public"]["Enums"]["response_type"]
          updated_at: string | null
          value_choice: string | null
          value_multi_choice: string[] | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          captured_at?: string | null
          created_at?: string | null
          id?: string
          outreach_attempt_id?: string | null
          question_code: string
          question_version?: number | null
          red_flag_code?: string | null
          red_flag_severity?:
            | Database["public"]["Enums"]["red_flag_severity"]
            | null
          response_type: Database["public"]["Enums"]["response_type"]
          updated_at?: string | null
          value_choice?: string | null
          value_multi_choice?: string[] | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          captured_at?: string | null
          created_at?: string | null
          id?: string
          outreach_attempt_id?: string | null
          question_code?: string
          question_version?: number | null
          red_flag_code?: string | null
          red_flag_severity?:
            | Database["public"]["Enums"]["red_flag_severity"]
            | null
          response_type?: Database["public"]["Enums"]["response_type"]
          updated_at?: string | null
          value_choice?: string | null
          value_multi_choice?: string[] | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "OutreachResponse_outreach_attempt_id_fkey"
            columns: ["outreach_attempt_id"]
            isOneToOne: false
            referencedRelation: "OutreachAttempt"
            referencedColumns: ["id"]
          },
        ]
      }
      Patient: {
        Row: {
          address: string | null
          alt_phone: string | null
          caregiver_name: string | null
          caregiver_phone: string | null
          caregiver_preferred_channel:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          caregiver_relation: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string
          email: string | null
          first_name: string
          id: string
          language_code: Database["public"]["Enums"]["language_code"] | null
          last_name: string
          mrn: string | null
          preferred_channel:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          primary_phone: string
          sex_at_birth: string | null
          state: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          alt_phone?: string | null
          caregiver_name?: string | null
          caregiver_phone?: string | null
          caregiver_preferred_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          caregiver_relation?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth: string
          email?: string | null
          first_name: string
          id?: string
          language_code?: Database["public"]["Enums"]["language_code"] | null
          last_name: string
          mrn?: string | null
          preferred_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          primary_phone: string
          sex_at_birth?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          alt_phone?: string | null
          caregiver_name?: string | null
          caregiver_phone?: string | null
          caregiver_preferred_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          caregiver_relation?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string
          email?: string | null
          first_name?: string
          id?: string
          language_code?: Database["public"]["Enums"]["language_code"] | null
          last_name?: string
          mrn?: string | null
          preferred_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          primary_phone?: string
          sex_at_birth?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      ProgramKPI: {
        Row: {
          condition_code: Database["public"]["Enums"]["condition_code"] | null
          connect_rate_pct: number | null
          created_at: string | null
          date_bucket: string
          discharges: number | null
          escalation_count: number | null
          escalation_median_tta_min: number | null
          id: string
          kept_followup_pct: number | null
          med_fill_7d_pct: number | null
          nurse_sla_compliance_pct: number | null
          outreach_completion_pct: number | null
          outreach_coverage_pct: number | null
          readmit_30d_count: number | null
          site_id: string | null
          updated_at: string | null
        }
        Insert: {
          condition_code?: Database["public"]["Enums"]["condition_code"] | null
          connect_rate_pct?: number | null
          created_at?: string | null
          date_bucket: string
          discharges?: number | null
          escalation_count?: number | null
          escalation_median_tta_min?: number | null
          id?: string
          kept_followup_pct?: number | null
          med_fill_7d_pct?: number | null
          nurse_sla_compliance_pct?: number | null
          outreach_completion_pct?: number | null
          outreach_coverage_pct?: number | null
          readmit_30d_count?: number | null
          site_id?: string | null
          updated_at?: string | null
        }
        Update: {
          condition_code?: Database["public"]["Enums"]["condition_code"] | null
          connect_rate_pct?: number | null
          created_at?: string | null
          date_bucket?: string
          discharges?: number | null
          escalation_count?: number | null
          escalation_median_tta_min?: number | null
          id?: string
          kept_followup_pct?: number | null
          med_fill_7d_pct?: number | null
          nurse_sla_compliance_pct?: number | null
          outreach_completion_pct?: number | null
          outreach_coverage_pct?: number | null
          readmit_30d_count?: number | null
          site_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ProtocolAssignment: {
        Row: {
          assigned_at: string | null
          assigned_by_user_id: string | null
          condition_code: Database["public"]["Enums"]["condition_code"]
          created_at: string | null
          education_level: string
          episode_id: string
          id: string
          is_active: boolean | null
          protocol_config: Json
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          condition_code: Database["public"]["Enums"]["condition_code"]
          created_at?: string | null
          education_level: string
          episode_id: string
          id?: string
          is_active?: boolean | null
          protocol_config: Json
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          condition_code?: Database["public"]["Enums"]["condition_code"]
          created_at?: string | null
          education_level?: string
          episode_id?: string
          id?: string
          is_active?: boolean | null
          protocol_config?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ProtocolAssignment_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ProtocolAssignment_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
        ]
      }
      RedFlagRule: {
        Row: {
          action_hint: string | null
          active: boolean | null
          condition_code: Database["public"]["Enums"]["condition_code"]
          condition_specific: boolean | null
          created_at: string | null
          description: string
          education_level: string | null
          id: string
          logic_spec: Json | null
          rule_code: string
          rules_dsl: Json | null
          severity: Database["public"]["Enums"]["red_flag_severity"]
          updated_at: string | null
        }
        Insert: {
          action_hint?: string | null
          active?: boolean | null
          condition_code: Database["public"]["Enums"]["condition_code"]
          condition_specific?: boolean | null
          created_at?: string | null
          description: string
          education_level?: string | null
          id?: string
          logic_spec?: Json | null
          rule_code: string
          rules_dsl?: Json | null
          severity: Database["public"]["Enums"]["red_flag_severity"]
          updated_at?: string | null
        }
        Update: {
          action_hint?: string | null
          active?: boolean | null
          condition_code?: Database["public"]["Enums"]["condition_code"]
          condition_specific?: boolean | null
          created_at?: string | null
          description?: string
          education_level?: string | null
          id?: string
          logic_spec?: Json | null
          rule_code?: string
          rules_dsl?: Json | null
          severity?: Database["public"]["Enums"]["red_flag_severity"]
          updated_at?: string | null
        }
        Relationships: []
      }
      TCMRecord: {
        Row: {
          billed: boolean | null
          billed_at: string | null
          complexity: string | null
          created_at: string | null
          documentation_complete: boolean | null
          eligibility: boolean | null
          episode_id: string | null
          face_to_face_at: string | null
          id: string
          interactive_contact_at: string | null
          total_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          billed?: boolean | null
          billed_at?: string | null
          complexity?: string | null
          created_at?: string | null
          documentation_complete?: boolean | null
          eligibility?: boolean | null
          episode_id?: string | null
          face_to_face_at?: string | null
          id?: string
          interactive_contact_at?: string | null
          total_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          billed?: boolean | null
          billed_at?: string | null
          complexity?: string | null
          created_at?: string | null
          documentation_complete?: boolean | null
          eligibility?: boolean | null
          episode_id?: string | null
          face_to_face_at?: string | null
          id?: string
          interactive_contact_at?: string | null
          total_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TCMRecord_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
        ]
      }
      TransportRequest: {
        Row: {
          appointment_id: string | null
          confirmation_code: string | null
          cost_cents: number | null
          created_at: string | null
          dropoff_address: string | null
          episode_id: string | null
          id: string
          payer: string | null
          pickup_address: string | null
          pickup_at: string | null
          requested_at: string | null
          status: Database["public"]["Enums"]["transport_status"] | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          appointment_id?: string | null
          confirmation_code?: string | null
          cost_cents?: number | null
          created_at?: string | null
          dropoff_address?: string | null
          episode_id?: string | null
          id?: string
          payer?: string | null
          pickup_address?: string | null
          pickup_at?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["transport_status"] | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          appointment_id?: string | null
          confirmation_code?: string | null
          cost_cents?: number | null
          created_at?: string | null
          dropoff_address?: string | null
          episode_id?: string | null
          id?: string
          payer?: string | null
          pickup_address?: string | null
          pickup_at?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["transport_status"] | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TransportRequest_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "Appointment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TransportRequest_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "Episode"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          active: boolean | null
          auth_user_id: string | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          last_login_at: string | null
          name: string
          phone: string | null
          role: string
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          auth_user_id?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          last_login_at?: string | null
          name: string
          phone?: string | null
          role?: string
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          auth_user_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          name?: string
          phone?: string | null
          role?: string
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      exec_sql: { Args: { sql_string: string }; Returns: string }
      get_protocol_config: {
        Args: {
          condition_code_param: Database["public"]["Enums"]["condition_code"]
          education_level_param: string
        }
        Returns: Json
      }
    }
    Enums: {
      agent_channel: "SMS" | "VOICE" | "CHAT" | "EMAIL" | "APP"
      agent_status: "ACTIVE" | "INACTIVE" | "TESTING" | "MAINTENANCE"
      agent_type:
        | "OUTREACH_COORDINATOR"
        | "MEDICATION_ADVISOR"
        | "APPOINTMENT_SCHEDULER"
        | "TRANSPORT_COORDINATOR"
        | "SYMPTOM_MONITOR"
        | "CARE_NAVIGATOR"
        | "CLINICAL_ESCALATION"
      ai_provider: "OPENAI" | "ANTHROPIC" | "AZURE" | "CUSTOM"
      appointment_status:
        | "SCHEDULED"
        | "CONFIRMED"
        | "COMPLETED"
        | "NO_SHOW"
        | "CANCELLED"
        | "RESCHEDULED"
        | "UNKNOWN"
      appointment_type:
        | "PCP"
        | "SPECIALIST"
        | "TELEVISIT"
        | "LAB"
        | "IMAGING"
        | "OTHER"
      condition_code: "HF" | "COPD" | "AMI" | "PNA" | "OTHER"
      consent_status: "GRANTED" | "DENIED" | "REVOKED" | "EXPIRED"
      consent_type: "SMS" | "VOICE" | "DATA_SHARE" | "RCM_BILLING" | "RESEARCH"
      contact_channel: "SMS" | "VOICE" | "HUMAN_CALL" | "EMAIL" | "APP"
      instruction_priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW"
      instruction_type:
        | "FOLLOWUP_APPOINTMENT"
        | "DAILY_MONITORING"
        | "DIETARY"
        | "ACTIVITY"
        | "MEDICATION"
        | "EMERGENCY_SIGNS"
        | "OTHER"
      interaction_status:
        | "IN_PROGRESS"
        | "COMPLETED"
        | "ESCALATED"
        | "FAILED"
        | "TIMEOUT"
      language_code: "EN" | "ES" | "OTHER"
      medication_source: "EHR" | "PATIENT_REPORTED" | "PHARMACY" | "UNKNOWN"
      message_direction: "OUTBOUND" | "INBOUND"
      message_role: "AGENT" | "PATIENT" | "SYSTEM"
      message_status:
        | "QUEUED"
        | "SENT"
        | "DELIVERED"
        | "READ"
        | "FAILED"
        | "RESPONDED"
        | "TIMEOUT"
      note_destination: "EHR_INBOX" | "SECURE_FAX" | "DIRECT_MSG" | "NONE"
      outreach_status:
        | "PENDING"
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "FAILED"
        | "NO_CONTACT"
        | "DECLINED"
        | "EXCLUDED"
      red_flag_severity: "NONE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
      redflag_severity: "NONE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
      response_type:
        | "SINGLE_CHOICE"
        | "MULTI_CHOICE"
        | "NUMERIC"
        | "TEXT"
        | "YES_NO"
      risk_model_type: "HOSPITAL" | "LACE" | "LACE_PLUS" | "CUSTOM"
      task_priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
      task_status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED" | "EXPIRED"
      transport_status:
        | "REQUESTED"
        | "BOOKED"
        | "CONFIRMED"
        | "COMPLETED"
        | "CANCELLED"
        | "FAILED"
        | "UNKNOWN"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_channel: ["SMS", "VOICE", "CHAT", "EMAIL", "APP"],
      agent_status: ["ACTIVE", "INACTIVE", "TESTING", "MAINTENANCE"],
      agent_type: [
        "OUTREACH_COORDINATOR",
        "MEDICATION_ADVISOR",
        "APPOINTMENT_SCHEDULER",
        "TRANSPORT_COORDINATOR",
        "SYMPTOM_MONITOR",
        "CARE_NAVIGATOR",
        "CLINICAL_ESCALATION",
      ],
      ai_provider: ["OPENAI", "ANTHROPIC", "AZURE", "CUSTOM"],
      appointment_status: [
        "SCHEDULED",
        "CONFIRMED",
        "COMPLETED",
        "NO_SHOW",
        "CANCELLED",
        "RESCHEDULED",
        "UNKNOWN",
      ],
      appointment_type: [
        "PCP",
        "SPECIALIST",
        "TELEVISIT",
        "LAB",
        "IMAGING",
        "OTHER",
      ],
      condition_code: ["HF", "COPD", "AMI", "PNA", "OTHER"],
      consent_status: ["GRANTED", "DENIED", "REVOKED", "EXPIRED"],
      consent_type: ["SMS", "VOICE", "DATA_SHARE", "RCM_BILLING", "RESEARCH"],
      contact_channel: ["SMS", "VOICE", "HUMAN_CALL", "EMAIL", "APP"],
      instruction_priority: ["CRITICAL", "HIGH", "NORMAL", "LOW"],
      instruction_type: [
        "FOLLOWUP_APPOINTMENT",
        "DAILY_MONITORING",
        "DIETARY",
        "ACTIVITY",
        "MEDICATION",
        "EMERGENCY_SIGNS",
        "OTHER",
      ],
      interaction_status: [
        "IN_PROGRESS",
        "COMPLETED",
        "ESCALATED",
        "FAILED",
        "TIMEOUT",
      ],
      language_code: ["EN", "ES", "OTHER"],
      medication_source: ["EHR", "PATIENT_REPORTED", "PHARMACY", "UNKNOWN"],
      message_direction: ["OUTBOUND", "INBOUND"],
      message_role: ["AGENT", "PATIENT", "SYSTEM"],
      message_status: [
        "QUEUED",
        "SENT",
        "DELIVERED",
        "READ",
        "FAILED",
        "RESPONDED",
        "TIMEOUT",
      ],
      note_destination: ["EHR_INBOX", "SECURE_FAX", "DIRECT_MSG", "NONE"],
      outreach_status: [
        "PENDING",
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "FAILED",
        "NO_CONTACT",
        "DECLINED",
        "EXCLUDED",
      ],
      red_flag_severity: ["NONE", "LOW", "MODERATE", "HIGH", "CRITICAL"],
      redflag_severity: ["NONE", "LOW", "MODERATE", "HIGH", "CRITICAL"],
      response_type: [
        "SINGLE_CHOICE",
        "MULTI_CHOICE",
        "NUMERIC",
        "TEXT",
        "YES_NO",
      ],
      risk_model_type: ["HOSPITAL", "LACE", "LACE_PLUS", "CUSTOM"],
      task_priority: ["LOW", "NORMAL", "HIGH", "URGENT"],
      task_status: ["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED", "EXPIRED"],
      transport_status: [
        "REQUESTED",
        "BOOKED",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
        "FAILED",
        "UNKNOWN",
      ],
    },
  },
} as const
