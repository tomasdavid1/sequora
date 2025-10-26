

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."agent_channel" AS ENUM (
    'SMS',
    'VOICE',
    'CHAT',
    'EMAIL',
    'APP'
);


ALTER TYPE "public"."agent_channel" OWNER TO "postgres";


CREATE TYPE "public"."agent_status" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'TESTING',
    'MAINTENANCE'
);


ALTER TYPE "public"."agent_status" OWNER TO "postgres";


CREATE TYPE "public"."agent_type" AS ENUM (
    'OUTREACH_COORDINATOR',
    'MEDICATION_ADVISOR',
    'APPOINTMENT_SCHEDULER',
    'TRANSPORT_COORDINATOR',
    'SYMPTOM_MONITOR',
    'CARE_NAVIGATOR',
    'CLINICAL_ESCALATION'
);


ALTER TYPE "public"."agent_type" OWNER TO "postgres";


CREATE TYPE "public"."ai_provider" AS ENUM (
    'OPENAI',
    'ANTHROPIC',
    'AZURE',
    'CUSTOM'
);


ALTER TYPE "public"."ai_provider" OWNER TO "postgres";


CREATE TYPE "public"."appointment_status" AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED',
    'RESCHEDULED',
    'UNKNOWN'
);


ALTER TYPE "public"."appointment_status" OWNER TO "postgres";


CREATE TYPE "public"."appointment_type" AS ENUM (
    'PCP',
    'SPECIALIST',
    'TELEVISIT',
    'LAB',
    'IMAGING',
    'OTHER'
);


ALTER TYPE "public"."appointment_type" OWNER TO "postgres";


CREATE TYPE "public"."condition_code" AS ENUM (
    'HF',
    'COPD',
    'AMI',
    'PNA',
    'OTHER'
);


ALTER TYPE "public"."condition_code" OWNER TO "postgres";


CREATE TYPE "public"."consent_status" AS ENUM (
    'GRANTED',
    'DENIED',
    'REVOKED',
    'EXPIRED'
);


ALTER TYPE "public"."consent_status" OWNER TO "postgres";


CREATE TYPE "public"."consent_type" AS ENUM (
    'SMS',
    'VOICE',
    'DATA_SHARE',
    'RCM_BILLING',
    'RESEARCH'
);


ALTER TYPE "public"."consent_type" OWNER TO "postgres";


CREATE TYPE "public"."contact_channel" AS ENUM (
    'SMS',
    'VOICE',
    'HUMAN_CALL',
    'EMAIL',
    'APP'
);


ALTER TYPE "public"."contact_channel" OWNER TO "postgres";


CREATE TYPE "public"."education_level" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE "public"."education_level" OWNER TO "postgres";


CREATE TYPE "public"."instruction_priority" AS ENUM (
    'CRITICAL',
    'HIGH',
    'NORMAL',
    'LOW'
);


ALTER TYPE "public"."instruction_priority" OWNER TO "postgres";


CREATE TYPE "public"."instruction_type" AS ENUM (
    'FOLLOWUP_APPOINTMENT',
    'DAILY_MONITORING',
    'DIETARY',
    'ACTIVITY',
    'MEDICATION',
    'EMERGENCY_SIGNS',
    'OTHER'
);


ALTER TYPE "public"."instruction_type" OWNER TO "postgres";


CREATE TYPE "public"."interaction_status" AS ENUM (
    'IN_PROGRESS',
    'COMPLETED',
    'ESCALATED',
    'FAILED',
    'TIMEOUT'
);


ALTER TYPE "public"."interaction_status" OWNER TO "postgres";


CREATE TYPE "public"."language_code" AS ENUM (
    'EN',
    'ES',
    'OTHER'
);


ALTER TYPE "public"."language_code" OWNER TO "postgres";


CREATE TYPE "public"."medication_source" AS ENUM (
    'EHR',
    'PATIENT_REPORTED',
    'PHARMACY',
    'UNKNOWN'
);


ALTER TYPE "public"."medication_source" OWNER TO "postgres";


CREATE TYPE "public"."message_direction" AS ENUM (
    'OUTBOUND',
    'INBOUND'
);


ALTER TYPE "public"."message_direction" OWNER TO "postgres";


CREATE TYPE "public"."message_role" AS ENUM (
    'AGENT',
    'PATIENT',
    'SYSTEM'
);


ALTER TYPE "public"."message_role" OWNER TO "postgres";


CREATE TYPE "public"."message_status" AS ENUM (
    'QUEUED',
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED',
    'RESPONDED',
    'TIMEOUT'
);


ALTER TYPE "public"."message_status" OWNER TO "postgres";


CREATE TYPE "public"."note_destination" AS ENUM (
    'EHR_INBOX',
    'SECURE_FAX',
    'DIRECT_MSG',
    'NONE'
);


ALTER TYPE "public"."note_destination" OWNER TO "postgres";


CREATE TYPE "public"."outreach_status" AS ENUM (
    'PENDING',
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'NO_CONTACT',
    'DECLINED',
    'EXCLUDED'
);


ALTER TYPE "public"."outreach_status" OWNER TO "postgres";


CREATE TYPE "public"."red_flag_severity" AS ENUM (
    'NONE',
    'LOW',
    'MODERATE',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE "public"."red_flag_severity" OWNER TO "postgres";


CREATE TYPE "public"."response_type" AS ENUM (
    'SINGLE_CHOICE',
    'MULTI_CHOICE',
    'NUMERIC',
    'TEXT',
    'YES_NO'
);


ALTER TYPE "public"."response_type" OWNER TO "postgres";


CREATE TYPE "public"."risk_level" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE "public"."risk_level" OWNER TO "postgres";


CREATE TYPE "public"."risk_model_type" AS ENUM (
    'HOSPITAL',
    'LACE',
    'LACE_PLUS',
    'CUSTOM'
);


ALTER TYPE "public"."risk_model_type" OWNER TO "postgres";


CREATE TYPE "public"."rule_type" AS ENUM (
    'RED_FLAG',
    'CLOSURE',
    'QUESTION'
);


ALTER TYPE "public"."rule_type" OWNER TO "postgres";


CREATE TYPE "public"."task_priority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


ALTER TYPE "public"."task_priority" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CANCELLED',
    'EXPIRED'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE TYPE "public"."transport_status" AS ENUM (
    'REQUESTED',
    'BOOKED',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'FAILED',
    'UNKNOWN'
);


ALTER TYPE "public"."transport_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_protocol_to_episode"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Just create a simple assignment record (no education_level needed here)
  INSERT INTO public."ProtocolAssignment" (
    episode_id,
    condition_code,
    risk_level,
    assigned_at
  ) VALUES (
    NEW.id,
    NEW.condition_code,
    COALESCE(NEW.risk_level, 'MEDIUM'),
    NOW()
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_protocol_to_episode"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql_string" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ 
    BEGIN 
      EXECUTE sql_string; 
      RETURN 'Success'; 
    EXCEPTION 
      WHEN OTHERS THEN 
        RETURN 'Error: ' || SQLERRM; 
    END; 
    $$;


ALTER FUNCTION "public"."exec_sql"("sql_string" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_protocol_config"("condition_code_param" "public"."condition_code", "education_level_param" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
  protocol_rules JSONB;
BEGIN
  -- Get protocol rules from ProtocolContentPack
  SELECT content_data
  INTO protocol_rules
  FROM public."ProtocolContentPack"
  WHERE condition_code = condition_code_param
    AND education_level = education_level_param
    AND content_type = 'PROTOCOL_RULES'
    AND active = true
  ORDER BY version DESC
  LIMIT 1;
  
  -- Build complete protocol config
  SELECT jsonb_build_object(
    'condition', condition_code_param,
    'education_level', education_level_param,
    'rules', COALESCE(protocol_rules, jsonb_build_object()),
    'education', jsonb_build_object(),
    'question_tree', jsonb_build_array()
  ) INTO result;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_protocol_config"("condition_code_param" "public"."condition_code", "education_level_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public."User" (email, name, auth_user_id, role)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'PATIENT')
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_interaction_duration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if NEW.completed_at is not null and NEW.started_at is not null then
    NEW.duration_seconds = extract(epoch from (NEW.completed_at - NEW.started_at))::integer;
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."set_interaction_duration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_agent_analytics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_agent_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_condition_catalog_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_condition_catalog_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_login"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public."User" 
  SET last_login_at = NOW(), updated_at = NOW()
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_last_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_protocol_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_protocol_config_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."AgentConfig" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "openai_assistant_id" "text",
    "retell_agent_id" "text",
    "voice_id" "text",
    "prompt_template" "text",
    "system_instructions" "text",
    "temperature" numeric(3,2) DEFAULT 0.7,
    "max_tokens" integer DEFAULT 1000,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."AgentConfig" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AgentInteraction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_config_id" "uuid",
    "interaction_type" "text" NOT NULL,
    "status" "text" DEFAULT 'INITIATED'::"text",
    "external_id" "text",
    "patient_id" "uuid",
    "episode_id" "uuid",
    "outreach_attempt_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "duration_seconds" integer,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "protocol_config_snapshot" "jsonb",
    "protocol_rules_snapshot" "jsonb",
    "protocol_snapshot_at" timestamp with time zone,
    "summary" "text",
    CONSTRAINT "AgentInteraction_interaction_type_check" CHECK (("interaction_type" = ANY (ARRAY['VOICE_CALL'::"text", 'SMS'::"text", 'WHATSAPP'::"text", 'EMAIL'::"text", 'APP_CHAT'::"text"])))
);


ALTER TABLE "public"."AgentInteraction" OWNER TO "postgres";


COMMENT ON COLUMN "public"."AgentInteraction"."protocol_config_snapshot" IS 'Snapshot of ProtocolConfig row used at interaction time. Includes thresholds, vague_symptoms, sentiment_boost settings, etc. For audit trail.';



COMMENT ON COLUMN "public"."AgentInteraction"."protocol_rules_snapshot" IS 'Snapshot of all ProtocolContentPack rules that were active at interaction time. Array of rule objects. For audit trail.';



COMMENT ON COLUMN "public"."AgentInteraction"."protocol_snapshot_at" IS 'Timestamp when the protocol snapshot was captured. Should match interaction start time.';



COMMENT ON COLUMN "public"."AgentInteraction"."summary" IS 'AI-generated brief summary of the interaction (2-3 sentences). Used to provide context in future interactions without loading full message history. Generated when interaction is marked completed or escalated.';



CREATE TABLE IF NOT EXISTS "public"."AgentMessage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_interaction_id" "uuid",
    "message_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "role" "text" NOT NULL,
    "function_name" "text",
    "function_arguments" "jsonb",
    "tokens_used" integer,
    "sequence_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "entities" "jsonb",
    "confidence_score" numeric(3,2),
    "detected_intent" "text",
    "model_used" "text",
    "flagged_for_review" boolean DEFAULT false,
    "contains_phi" boolean DEFAULT false,
    CONSTRAINT "AgentMessage_message_type_check" CHECK (("message_type" = ANY (ARRAY['SYSTEM'::"text", 'USER'::"text", 'ASSISTANT'::"text", 'FUNCTION_CALL'::"text", 'FUNCTION_RESULT'::"text"]))),
    CONSTRAINT "AgentMessage_role_check" CHECK (("role" = ANY (ARRAY['system'::"text", 'user'::"text", 'assistant'::"text", 'function'::"text"])))
);


ALTER TABLE "public"."AgentMessage" OWNER TO "postgres";


COMMENT ON COLUMN "public"."AgentMessage"."timestamp" IS 'When the message was sent/received';



COMMENT ON COLUMN "public"."AgentMessage"."entities" IS 'Extracted entities (symptoms, medications, etc.)';



COMMENT ON COLUMN "public"."AgentMessage"."confidence_score" IS 'AI confidence score (0.00-1.00)';



COMMENT ON COLUMN "public"."AgentMessage"."detected_intent" IS 'Detected patient intent (symptom_report, question, etc.)';



COMMENT ON COLUMN "public"."AgentMessage"."model_used" IS 'AI model that generated this message (gpt-4, gpt-3.5-turbo, etc.)';



CREATE TABLE IF NOT EXISTS "public"."AgentMetrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_config_id" "uuid",
    "date_bucket" "date" NOT NULL,
    "interaction_count" integer DEFAULT 0,
    "success_count" integer DEFAULT 0,
    "failure_count" integer DEFAULT 0,
    "avg_duration_seconds" numeric(10,2) DEFAULT 0,
    "total_tokens_used" integer DEFAULT 0,
    "escalation_count" integer DEFAULT 0,
    "patient_satisfaction_score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."AgentMetrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AgentPromptTemplate" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_type" "text" NOT NULL,
    "condition_code" "public"."condition_code",
    "template_name" "text" NOT NULL,
    "template_content" "text" NOT NULL,
    "variables" "text"[],
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."AgentPromptTemplate" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Appointment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid",
    "type" "public"."appointment_type" NOT NULL,
    "provider_name" "text",
    "department" "text",
    "modality" "text",
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone,
    "location_name" "text",
    "address" "text",
    "tele_link" "text",
    "status" "public"."appointment_status" DEFAULT 'SCHEDULED'::"public"."appointment_status",
    "source_system" "text",
    "last_confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "Appointment_modality_check" CHECK (("modality" = ANY (ARRAY['IN_PERSON'::"text", 'VIRTUAL'::"text"])))
);


ALTER TABLE "public"."Appointment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AssignmentPreference" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "language_code" "public"."language_code",
    "condition_codes" "public"."condition_code"[],
    "shift_start_local" time without time zone,
    "shift_end_local" time without time zone,
    "max_concurrent_tasks" integer DEFAULT 10,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."AssignmentPreference" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AuditLog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_user_id" "uuid",
    "actor_type" "text" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "metadata" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "AuditLog_action_check" CHECK (("action" = ANY (ARRAY['CREATE'::"text", 'UPDATE'::"text", 'READ'::"text", 'DELETE'::"text", 'EXPORT'::"text", 'ESCALATE'::"text"]))),
    CONSTRAINT "AuditLog_actor_type_check" CHECK (("actor_type" = ANY (ARRAY['USER'::"text", 'SYSTEM'::"text", 'PATIENT'::"text"])))
);


ALTER TABLE "public"."AuditLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."CareInstruction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid" NOT NULL,
    "instruction_type" "text" NOT NULL,
    "instruction_text" "text" NOT NULL,
    "priority" "text",
    "due_date" timestamp without time zone,
    "completed" boolean DEFAULT false,
    "completed_at" timestamp without time zone,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."CareInstruction" OWNER TO "postgres";


COMMENT ON TABLE "public"."CareInstruction" IS 'Structured follow-up instructions and care tasks from discharge summary';



COMMENT ON COLUMN "public"."CareInstruction"."instruction_type" IS 'Category: FOLLOWUP_APPOINTMENT, DAILY_MONITORING, DIETARY, ACTIVITY, MEDICATION, EMERGENCY_SIGNS';



COMMENT ON COLUMN "public"."CareInstruction"."instruction_text" IS 'Human-readable instruction text';



COMMENT ON COLUMN "public"."CareInstruction"."priority" IS 'Priority level: CRITICAL, HIGH, NORMAL, LOW';



COMMENT ON COLUMN "public"."CareInstruction"."due_date" IS 'Optional due date for time-sensitive instructions';



COMMENT ON COLUMN "public"."CareInstruction"."completed" IS 'Whether the instruction has been completed';



COMMENT ON COLUMN "public"."CareInstruction"."sort_order" IS 'Display order for instructions';



CREATE TABLE IF NOT EXISTS "public"."CommunicationMessage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid",
    "patient_id" "uuid",
    "direction" "public"."message_direction" NOT NULL,
    "channel" "public"."contact_channel" NOT NULL,
    "template_code" "text",
    "body_hash" "text",
    "contains_phi" boolean DEFAULT false,
    "status" "public"."message_status" DEFAULT 'QUEUED'::"public"."message_status",
    "provider_message_id" "text",
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "responded_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."CommunicationMessage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ConditionCatalog" (
    "condition_code" "public"."condition_code" NOT NULL,
    "full_name" "text" NOT NULL,
    "description" "text",
    "abbreviation" "text",
    "icd10_codes" "text"[],
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "education_title" "text",
    "education_content" "text",
    "education_topics" "text"[],
    "education_level" character varying(20) DEFAULT 'BASIC'::character varying
);


ALTER TABLE "public"."ConditionCatalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."ConditionCatalog" IS 'Metadata for medical conditions including full names, descriptions, and ICD-10 codes';



COMMENT ON COLUMN "public"."ConditionCatalog"."full_name" IS 'Full medical name of the condition (e.g., "Heart Failure" for HF)';



COMMENT ON COLUMN "public"."ConditionCatalog"."education_title" IS 'Patient-friendly title for education materials';



COMMENT ON COLUMN "public"."ConditionCatalog"."education_content" IS 'Patient education content in plain language';



COMMENT ON COLUMN "public"."ConditionCatalog"."education_topics" IS 'List of educational topics covered for this condition';



COMMENT ON COLUMN "public"."ConditionCatalog"."education_level" IS 'Reading level of education content (BASIC, INTERMEDIATE, ADVANCED)';



CREATE TABLE IF NOT EXISTS "public"."Consent" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "type" "public"."consent_type" NOT NULL,
    "status" "public"."consent_status" NOT NULL,
    "method" "text",
    "recorded_by_user_id" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "documentation_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "Consent_method_check" CHECK (("method" = ANY (ARRAY['VERBAL'::"text", 'WRITTEN'::"text", 'DIGITAL'::"text"])))
);


ALTER TABLE "public"."Consent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Episode" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "condition_code" "public"."condition_code" NOT NULL,
    "admit_at" timestamp with time zone,
    "discharge_at" timestamp with time zone NOT NULL,
    "discharge_location" "text",
    "discharge_diagnosis_codes" "text"[],
    "elixhauser_score" integer,
    "risk_scores" "jsonb",
    "discharge_weight_kg" numeric,
    "discharge_spo2" integer,
    "discharge_systolic_bp" integer,
    "discharge_notes_ref" "text",
    "source_system" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "hospital_id" "text",
    "attending_physician_name" "text",
    "attending_physician_npi" "text",
    "hospital_course_summary" "text",
    "severity_indicator" "text",
    "ejection_fraction_pct" integer,
    "facility_name" "text",
    "facility_id" "text",
    "risk_level" "public"."risk_level" DEFAULT 'MEDIUM'::"public"."risk_level" NOT NULL
);


ALTER TABLE "public"."Episode" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Episode"."patient_id" IS 'Required foreign key to Patient. Every episode must belong to a patient. ON DELETE RESTRICT prevents accidental patient deletion.';



COMMENT ON COLUMN "public"."Episode"."hospital_id" IS 'Hospital-assigned episode identifier (e.g., HF-2025-001)';



COMMENT ON COLUMN "public"."Episode"."attending_physician_name" IS 'Full name of attending physician (e.g., Dr. Emily Chen, MD)';



COMMENT ON COLUMN "public"."Episode"."attending_physician_npi" IS 'National Provider Identifier for attending physician';



COMMENT ON COLUMN "public"."Episode"."hospital_course_summary" IS 'Narrative summary of hospital stay and treatment';



COMMENT ON COLUMN "public"."Episode"."severity_indicator" IS 'Condition-specific severity classification (e.g., NYHA Class II, GOLD Stage 3, Killip Class)';



COMMENT ON COLUMN "public"."Episode"."ejection_fraction_pct" IS 'Left ventricular ejection fraction percentage (primarily for HF patients, range 0-100)';



COMMENT ON COLUMN "public"."Episode"."facility_name" IS 'Name of hospital or facility where patient was treated';



COMMENT ON COLUMN "public"."Episode"."facility_id" IS 'Facility identifier or NPI for reporting';



CREATE TABLE IF NOT EXISTS "public"."EpisodeMedication" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid",
    "name" "text" NOT NULL,
    "rx_norm_code" "text",
    "dose" "text",
    "dose_unit" "text",
    "route" "text",
    "frequency" "text",
    "instructions" "text",
    "start_date" "date",
    "expected_duration_days" integer,
    "source" "public"."medication_source" DEFAULT 'PATIENT_REPORTED'::"public"."medication_source",
    "requires_prior_auth" boolean DEFAULT false,
    "cost_concern_flag" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."EpisodeMedication" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."EscalationTask" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid",
    "source_attempt_id" "uuid",
    "reason_codes" "text"[],
    "severity" "public"."red_flag_severity" NOT NULL,
    "priority" "public"."task_priority" NOT NULL,
    "status" "public"."task_status" DEFAULT 'OPEN'::"public"."task_status",
    "sla_due_at" timestamp with time zone NOT NULL,
    "assigned_to_user_id" "uuid",
    "picked_up_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "resolution_outcome_code" "text",
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "agent_interaction_id" "uuid"
);


ALTER TABLE "public"."EscalationTask" OWNER TO "postgres";


COMMENT ON COLUMN "public"."EscalationTask"."source_attempt_id" IS 'References OutreachAttempt (legacy system). Kept for backward compatibility.';



COMMENT ON COLUMN "public"."EscalationTask"."agent_interaction_id" IS 'References AgentInteraction (new AI system). Will CASCADE delete when interaction is deleted.';



CREATE TABLE IF NOT EXISTS "public"."MedicationAdherenceEvent" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid",
    "medication_name" "text" NOT NULL,
    "event_type" "text",
    "source" "text",
    "details" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "MedicationAdherenceEvent_event_type_check" CHECK (("event_type" = ANY (ARRAY['PICKUP_CONFIRMED'::"text", 'PICKUP_DECLINED'::"text", 'MISSED_DOSE'::"text", 'SIDE_EFFECT'::"text", 'COST_BARRIER'::"text", 'SWITCHED_DRUG'::"text", 'ADHERENT'::"text"]))),
    CONSTRAINT "MedicationAdherenceEvent_source_check" CHECK (("source" = ANY (ARRAY['PATIENT'::"text", 'PHARMACY'::"text", 'NURSE'::"text"])))
);


ALTER TABLE "public"."MedicationAdherenceEvent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."NoteExport" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid",
    "escalation_task_id" "uuid",
    "destination" "public"."note_destination" NOT NULL,
    "status" "text" DEFAULT 'QUEUED'::"text",
    "external_ref_id" "text",
    "payload_ref" "text",
    "sent_at" timestamp with time zone,
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."NoteExport" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."OutreachAttempt" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "outreach_plan_id" "uuid",
    "attempt_number" integer NOT NULL,
    "scheduled_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "channel" "public"."contact_channel" NOT NULL,
    "status" "public"."outreach_status" DEFAULT 'PENDING'::"public"."outreach_status",
    "connect" boolean,
    "reason_code" "text",
    "transcript_ref" "text",
    "provider_message_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."OutreachAttempt" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."OutreachPlan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid",
    "preferred_channel" "public"."contact_channel" NOT NULL,
    "fallback_channel" "public"."contact_channel",
    "window_start_at" timestamp with time zone NOT NULL,
    "window_end_at" timestamp with time zone NOT NULL,
    "max_attempts" integer DEFAULT 3,
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "language_code" "public"."language_code" DEFAULT 'EN'::"public"."language_code",
    "include_caregiver" boolean DEFAULT false,
    "status" "public"."outreach_status" DEFAULT 'PENDING'::"public"."outreach_status",
    "exclusion_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."OutreachPlan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."OutreachQuestion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "condition_code" "public"."condition_code" NOT NULL,
    "code" "text" NOT NULL,
    "version" integer DEFAULT 1,
    "text" "text" NOT NULL,
    "response_type" "public"."response_type" NOT NULL,
    "choices" "text"[],
    "unit" "text",
    "min_value" numeric,
    "max_value" numeric,
    "language_code" "public"."language_code" DEFAULT 'EN'::"public"."language_code",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."OutreachQuestion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."OutreachResponse" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "outreach_attempt_id" "uuid",
    "question_code" "text" NOT NULL,
    "question_version" integer DEFAULT 1,
    "response_type" "public"."response_type" NOT NULL,
    "value_text" "text",
    "value_number" numeric,
    "value_choice" "text",
    "value_multi_choice" "text"[],
    "captured_at" timestamp with time zone DEFAULT "now"(),
    "red_flag_severity" "public"."red_flag_severity" DEFAULT 'NONE'::"public"."red_flag_severity",
    "red_flag_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."OutreachResponse" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Patient" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mrn" "text",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "sex_at_birth" "text",
    "language_code" "public"."language_code" DEFAULT 'EN'::"public"."language_code",
    "primary_phone" "text" NOT NULL,
    "alt_phone" "text",
    "email" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "preferred_channel" "public"."contact_channel" DEFAULT 'SMS'::"public"."contact_channel",
    "caregiver_name" "text",
    "caregiver_phone" "text",
    "caregiver_relation" "text",
    "caregiver_preferred_channel" "public"."contact_channel",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "education_level" "public"."education_level" DEFAULT 'MEDIUM'::"public"."education_level" NOT NULL
);


ALTER TABLE "public"."Patient" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ProgramKPI" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date_bucket" "date" NOT NULL,
    "site_id" "text",
    "condition_code" "public"."condition_code",
    "discharges" integer DEFAULT 0,
    "outreach_coverage_pct" numeric(5,2) DEFAULT 0,
    "outreach_completion_pct" numeric(5,2) DEFAULT 0,
    "connect_rate_pct" numeric(5,2) DEFAULT 0,
    "med_fill_7d_pct" numeric(5,2) DEFAULT 0,
    "kept_followup_pct" numeric(5,2) DEFAULT 0,
    "escalation_count" integer DEFAULT 0,
    "escalation_median_tta_min" integer DEFAULT 0,
    "nurse_sla_compliance_pct" numeric(5,2) DEFAULT 0,
    "readmit_30d_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ProgramKPI" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ProtocolAssignment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid" NOT NULL,
    "condition_code" "public"."condition_code" NOT NULL,
    "is_active" boolean DEFAULT true,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "risk_level" "public"."risk_level" DEFAULT 'MEDIUM'::"public"."risk_level" NOT NULL
);


ALTER TABLE "public"."ProtocolAssignment" OWNER TO "postgres";


COMMENT ON TABLE "public"."ProtocolAssignment" IS 'Links episodes to protocol rules. Query ProtocolContentPack for actual rules using condition_code + risk_level.';



COMMENT ON COLUMN "public"."ProtocolAssignment"."condition_code" IS 'Used to query ProtocolContentPack for applicable rules';



CREATE TABLE IF NOT EXISTS "public"."ProtocolConfig" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "critical_confidence_threshold" numeric(3,2) DEFAULT 0.80 NOT NULL,
    "low_confidence_threshold" numeric(3,2) DEFAULT 0.60 NOT NULL,
    "vague_symptoms" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "enable_sentiment_boost" boolean DEFAULT true NOT NULL,
    "distressed_severity_upgrade" "text" DEFAULT 'high'::"text",
    "route_medication_questions_to_info" boolean DEFAULT true NOT NULL,
    "route_general_questions_to_info" boolean DEFAULT true NOT NULL,
    "detect_multiple_symptoms" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "risk_level" "public"."risk_level" NOT NULL,
    "condition_code" "public"."condition_code" NOT NULL,
    "system_prompt" "text",
    CONSTRAINT "ProtocolConfig_critical_confidence_threshold_check" CHECK ((("critical_confidence_threshold" >= (0)::numeric) AND ("critical_confidence_threshold" <= (1)::numeric))),
    CONSTRAINT "ProtocolConfig_low_confidence_threshold_check" CHECK ((("low_confidence_threshold" >= (0)::numeric) AND ("low_confidence_threshold" <= (1)::numeric)))
);


ALTER TABLE "public"."ProtocolConfig" OWNER TO "postgres";


COMMENT ON TABLE "public"."ProtocolConfig" IS 'AI decision thresholds and parameters for each condition + risk level combination. Controls sensitivity, symptom detection, and escalation behavior.';



COMMENT ON COLUMN "public"."ProtocolConfig"."critical_confidence_threshold" IS 'AI confidence threshold (0-1) above which a critical assessment triggers immediate escalation. Lower = more sensitive.';



COMMENT ON COLUMN "public"."ProtocolConfig"."low_confidence_threshold" IS 'AI confidence threshold (0-1) below which the system asks clarifying questions. Higher = asks more questions.';



COMMENT ON COLUMN "public"."ProtocolConfig"."vague_symptoms" IS 'Array of vague symptom keywords specific to this condition (e.g., ["discomfort", "off", "tired"] for HF).';



COMMENT ON COLUMN "public"."ProtocolConfig"."distressed_severity_upgrade" IS 'When patient is distressed + symptoms detected, upgrade severity to this level (critical/high/moderate/none).';



COMMENT ON COLUMN "public"."ProtocolConfig"."detect_multiple_symptoms" IS 'If true, detect ALL matching symptoms in patient input. If false, stop at first match.';



COMMENT ON COLUMN "public"."ProtocolConfig"."system_prompt" IS 'AI system prompt that defines the assistant personality, tone, and behavior for this condition + risk level combination';



CREATE TABLE IF NOT EXISTS "public"."ProtocolContentPack" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "condition_code" "public"."condition_code" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rule_code" "text" NOT NULL,
    "text_patterns" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "message" "text",
    "severity" "public"."red_flag_severity",
    "rule_type" "public"."rule_type" NOT NULL,
    "action_type" "text",
    "numeric_follow_up_question" "text"
);


ALTER TABLE "public"."ProtocolContentPack" OWNER TO "postgres";


COMMENT ON TABLE "public"."ProtocolContentPack" IS 'Individual protocol rules - one row per rule. Query by condition_code + severity filter based on risk_level.';



COMMENT ON COLUMN "public"."ProtocolContentPack"."rule_code" IS 'Unique identifier matching RedFlagRule.rule_code (e.g., HF_CHEST_PAIN)';



COMMENT ON COLUMN "public"."ProtocolContentPack"."text_patterns" IS 'Array of text patterns to match against patient input (e.g., {"chest pain", "chest pressure"})';



COMMENT ON COLUMN "public"."ProtocolContentPack"."message" IS 'Human-readable message describing the rule';



COMMENT ON COLUMN "public"."ProtocolContentPack"."numeric_follow_up_question" IS 'Question to ask when generic pattern is detected but specific amount/number is needed (e.g., "How many pounds have you gained?"). Used for rules where the NUMBER determines which specific rule to trigger (3 lbs vs 5 lbs).';



CREATE TABLE IF NOT EXISTS "public"."RedFlagRule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "condition_code" "public"."condition_code" NOT NULL,
    "rule_code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "severity" "public"."red_flag_severity" NOT NULL,
    "logic_spec" "jsonb",
    "action_hint" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rules_dsl" "jsonb",
    "condition_specific" boolean DEFAULT false,
    "education_level" "text",
    CONSTRAINT "RedFlagRule_education_level_check" CHECK (("education_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'all'::"text"])))
);


ALTER TABLE "public"."RedFlagRule" OWNER TO "postgres";


COMMENT ON COLUMN "public"."RedFlagRule"."severity" IS 'Severity determines which risk levels this rule is active for: CRITICAL=all, HIGH=med+high, MODERATE=high only, LOW=high only';



CREATE TABLE IF NOT EXISTS "public"."TCMRecord" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid",
    "eligibility" boolean DEFAULT false,
    "complexity" "text",
    "interactive_contact_at" timestamp with time zone,
    "face_to_face_at" "date",
    "total_minutes" integer,
    "documentation_complete" boolean DEFAULT false,
    "billed" boolean DEFAULT false,
    "billed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "TCMRecord_complexity_check" CHECK (("complexity" = ANY (ARRAY['MODERATE_99495'::"text", 'HIGH_99496'::"text", 'UNKNOWN'::"text"])))
);


ALTER TABLE "public"."TCMRecord" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."TransportRequest" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid",
    "appointment_id" "uuid",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "pickup_at" timestamp with time zone,
    "pickup_address" "text",
    "dropoff_address" "text",
    "vendor" "text",
    "confirmation_code" "text",
    "status" "public"."transport_status" DEFAULT 'REQUESTED'::"public"."transport_status",
    "cost_cents" integer,
    "payer" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "TransportRequest_payer_check" CHECK (("payer" = ANY (ARRAY['HOSPITAL'::"text", 'PATIENT'::"text", 'GRANT'::"text", 'OTHER'::"text"])))
);


ALTER TABLE "public"."TransportRequest" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" DEFAULT 'PATIENT'::"text" NOT NULL,
    "phone" "text",
    "department" "text",
    "specialty" "text",
    "active" boolean DEFAULT true,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "auth_user_id" "uuid",
    CONSTRAINT "User_role_check" CHECK (("role" = ANY (ARRAY['ADMIN'::"text", 'STAFF'::"text", 'PATIENT'::"text"])))
);


ALTER TABLE "public"."User" OWNER TO "postgres";


ALTER TABLE ONLY "public"."AgentConfig"
    ADD CONSTRAINT "AgentConfig_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AgentInteraction"
    ADD CONSTRAINT "AgentInteraction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AgentMessage"
    ADD CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AgentMetrics"
    ADD CONSTRAINT "AgentMetrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AgentPromptTemplate"
    ADD CONSTRAINT "AgentPromptTemplate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Appointment"
    ADD CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AssignmentPreference"
    ADD CONSTRAINT "AssignmentPreference_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."CareInstruction"
    ADD CONSTRAINT "CareInstruction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."CommunicationMessage"
    ADD CONSTRAINT "CommunicationMessage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ConditionCatalog"
    ADD CONSTRAINT "ConditionCatalog_pkey" PRIMARY KEY ("condition_code");



ALTER TABLE ONLY "public"."Consent"
    ADD CONSTRAINT "Consent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."EpisodeMedication"
    ADD CONSTRAINT "EpisodeMedication_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Episode"
    ADD CONSTRAINT "Episode_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."EscalationTask"
    ADD CONSTRAINT "EscalationTask_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MedicationAdherenceEvent"
    ADD CONSTRAINT "MedicationAdherenceEvent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."NoteExport"
    ADD CONSTRAINT "NoteExport_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."OutreachAttempt"
    ADD CONSTRAINT "OutreachAttempt_outreach_plan_id_attempt_number_key" UNIQUE ("outreach_plan_id", "attempt_number");



ALTER TABLE ONLY "public"."OutreachAttempt"
    ADD CONSTRAINT "OutreachAttempt_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."OutreachPlan"
    ADD CONSTRAINT "OutreachPlan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."OutreachQuestion"
    ADD CONSTRAINT "OutreachQuestion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."OutreachResponse"
    ADD CONSTRAINT "OutreachResponse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Patient"
    ADD CONSTRAINT "Patient_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ProgramKPI"
    ADD CONSTRAINT "ProgramKPI_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ProtocolAssignment"
    ADD CONSTRAINT "ProtocolAssignment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ProtocolConfig"
    ADD CONSTRAINT "ProtocolConfig_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ProtocolContentPack"
    ADD CONSTRAINT "ProtocolContentPack_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RedFlagRule"
    ADD CONSTRAINT "RedFlagRule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TCMRecord"
    ADD CONSTRAINT "TCMRecord_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TransportRequest"
    ADD CONSTRAINT "TransportRequest_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RedFlagRule"
    ADD CONSTRAINT "red_flag_rule_unique_condition_rule" UNIQUE ("condition_code", "rule_code");



CREATE INDEX "idx_agent_interaction_config_id" ON "public"."AgentInteraction" USING "btree" ("agent_config_id", "started_at");



CREATE INDEX "idx_agent_interaction_external_id" ON "public"."AgentInteraction" USING "btree" ("external_id");



CREATE INDEX "idx_agent_interaction_has_snapshot" ON "public"."AgentInteraction" USING "btree" ((("protocol_config_snapshot" IS NOT NULL)));



CREATE INDEX "idx_agent_interaction_patient_id" ON "public"."AgentInteraction" USING "btree" ("patient_id", "started_at");



CREATE INDEX "idx_agent_interaction_protocol_snapshot_at" ON "public"."AgentInteraction" USING "btree" ("protocol_snapshot_at");



CREATE INDEX "idx_agent_message_flagged" ON "public"."AgentMessage" USING "btree" ("flagged_for_review") WHERE ("flagged_for_review" = true);



CREATE INDEX "idx_agent_message_interaction_id" ON "public"."AgentMessage" USING "btree" ("agent_interaction_id", "sequence_number");



CREATE INDEX "idx_agent_message_timestamp" ON "public"."AgentMessage" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_agent_metrics_config_id" ON "public"."AgentMetrics" USING "btree" ("agent_config_id", "date_bucket");



CREATE INDEX "idx_agent_prompt_template_type" ON "public"."AgentPromptTemplate" USING "btree" ("agent_type", "condition_code", "active");



CREATE INDEX "idx_agentinteraction_episode_id" ON "public"."AgentInteraction" USING "btree" ("episode_id");



CREATE INDEX "idx_agentinteraction_patient_id" ON "public"."AgentInteraction" USING "btree" ("patient_id");



CREATE INDEX "idx_appointment_episode_id" ON "public"."Appointment" USING "btree" ("episode_id", "start_at");



CREATE INDEX "idx_appointment_status" ON "public"."Appointment" USING "btree" ("status", "start_at");



CREATE INDEX "idx_audit_log_actor" ON "public"."AuditLog" USING "btree" ("actor_type", "actor_user_id");



CREATE INDEX "idx_audit_log_entity" ON "public"."AuditLog" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_log_occurred_at" ON "public"."AuditLog" USING "btree" ("occurred_at");



CREATE INDEX "idx_care_instruction_due_date" ON "public"."CareInstruction" USING "btree" ("due_date") WHERE ("completed" = false);



CREATE INDEX "idx_care_instruction_episode" ON "public"."CareInstruction" USING "btree" ("episode_id");



CREATE INDEX "idx_care_instruction_priority" ON "public"."CareInstruction" USING "btree" ("priority");



CREATE INDEX "idx_care_instruction_type" ON "public"."CareInstruction" USING "btree" ("instruction_type");



CREATE INDEX "idx_communication_message_episode_id" ON "public"."CommunicationMessage" USING "btree" ("episode_id", "sent_at");



CREATE INDEX "idx_communication_message_provider_id" ON "public"."CommunicationMessage" USING "btree" ("provider_message_id");



CREATE INDEX "idx_communication_message_status" ON "public"."CommunicationMessage" USING "btree" ("status", "sent_at");



CREATE INDEX "idx_consent_patient_id" ON "public"."Consent" USING "btree" ("patient_id", "type", "status");



CREATE INDEX "idx_episode_attending_physician" ON "public"."Episode" USING "btree" ("attending_physician_npi");



CREATE INDEX "idx_episode_condition" ON "public"."Episode" USING "btree" ("condition_code");



CREATE INDEX "idx_episode_facility_id" ON "public"."Episode" USING "btree" ("facility_id");



CREATE INDEX "idx_episode_hospital_id" ON "public"."Episode" USING "btree" ("hospital_id");



CREATE INDEX "idx_episode_patient_id" ON "public"."Episode" USING "btree" ("patient_id");



CREATE INDEX "idx_escalation_task_agent_interaction" ON "public"."EscalationTask" USING "btree" ("agent_interaction_id");



CREATE INDEX "idx_escalation_task_episode_id" ON "public"."EscalationTask" USING "btree" ("episode_id");



CREATE INDEX "idx_escalation_task_priority" ON "public"."EscalationTask" USING "btree" ("severity", "priority");



CREATE INDEX "idx_escalation_task_status" ON "public"."EscalationTask" USING "btree" ("status", "sla_due_at");



CREATE INDEX "idx_medication_adherence_episode_id" ON "public"."MedicationAdherenceEvent" USING "btree" ("episode_id", "occurred_at");



CREATE INDEX "idx_medication_adherence_event_type" ON "public"."MedicationAdherenceEvent" USING "btree" ("event_type", "occurred_at");



CREATE INDEX "idx_note_export_episode_id" ON "public"."NoteExport" USING "btree" ("episode_id", "status");



CREATE INDEX "idx_outreach_attempt_plan_id" ON "public"."OutreachAttempt" USING "btree" ("outreach_plan_id");



CREATE INDEX "idx_outreach_attempt_scheduled_at" ON "public"."OutreachAttempt" USING "btree" ("scheduled_at");



CREATE INDEX "idx_outreach_attempt_status" ON "public"."OutreachAttempt" USING "btree" ("status");



CREATE INDEX "idx_outreach_plan_episode_id" ON "public"."OutreachPlan" USING "btree" ("episode_id");



CREATE INDEX "idx_outreach_question_condition" ON "public"."OutreachQuestion" USING "btree" ("condition_code", "active");



CREATE INDEX "idx_outreach_response_attempt_id" ON "public"."OutreachResponse" USING "btree" ("outreach_attempt_id");



CREATE INDEX "idx_outreach_response_red_flag" ON "public"."OutreachResponse" USING "btree" ("red_flag_severity", "captured_at");



CREATE INDEX "idx_program_kpi_date" ON "public"."ProgramKPI" USING "btree" ("date_bucket", "condition_code");



CREATE INDEX "idx_protocol_assignment_active" ON "public"."ProtocolAssignment" USING "btree" ("is_active");



CREATE INDEX "idx_protocol_assignment_condition" ON "public"."ProtocolAssignment" USING "btree" ("condition_code");



CREATE INDEX "idx_protocol_assignment_episode" ON "public"."ProtocolAssignment" USING "btree" ("episode_id");



CREATE INDEX "idx_protocol_config_active" ON "public"."ProtocolConfig" USING "btree" ("active");



CREATE INDEX "idx_protocol_content_pack_active" ON "public"."ProtocolContentPack" USING "btree" ("active");



CREATE INDEX "idx_protocol_content_pack_condition" ON "public"."ProtocolContentPack" USING "btree" ("condition_code");



CREATE UNIQUE INDEX "idx_protocol_content_pack_unique" ON "public"."ProtocolContentPack" USING "btree" ("condition_code", "rule_code");



CREATE INDEX "idx_protocol_text_patterns_gin" ON "public"."ProtocolContentPack" USING "gin" ("text_patterns");



CREATE INDEX "idx_red_flag_rule_condition" ON "public"."RedFlagRule" USING "btree" ("condition_code", "active");



CREATE INDEX "idx_red_flag_rule_dsl" ON "public"."RedFlagRule" USING "gin" ("rules_dsl");



CREATE INDEX "idx_transport_request_episode_id" ON "public"."TransportRequest" USING "btree" ("episode_id", "pickup_at");



CREATE INDEX "idx_transport_request_status" ON "public"."TransportRequest" USING "btree" ("status", "pickup_at");



CREATE INDEX "idx_user_active" ON "public"."User" USING "btree" ("active");



CREATE INDEX "idx_user_auth_id" ON "public"."User" USING "btree" ("auth_user_id");



CREATE INDEX "idx_user_email" ON "public"."User" USING "btree" ("email");



CREATE INDEX "idx_user_role" ON "public"."User" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "on_episode_created" AFTER INSERT ON "public"."Episode" FOR EACH ROW EXECUTE FUNCTION "public"."assign_protocol_to_episode"();



CREATE OR REPLACE TRIGGER "update_condition_catalog_timestamp" BEFORE UPDATE ON "public"."ConditionCatalog" FOR EACH ROW EXECUTE FUNCTION "public"."update_condition_catalog_updated_at"();



CREATE OR REPLACE TRIGGER "update_protocol_config_timestamp" BEFORE UPDATE ON "public"."ProtocolConfig" FOR EACH ROW EXECUTE FUNCTION "public"."update_protocol_config_updated_at"();



ALTER TABLE ONLY "public"."AgentInteraction"
    ADD CONSTRAINT "AgentInteraction_agent_config_id_fkey" FOREIGN KEY ("agent_config_id") REFERENCES "public"."AgentConfig"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AgentInteraction"
    ADD CONSTRAINT "AgentInteraction_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."AgentInteraction"
    ADD CONSTRAINT "AgentInteraction_outreach_attempt_id_fkey" FOREIGN KEY ("outreach_attempt_id") REFERENCES "public"."OutreachAttempt"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."AgentInteraction"
    ADD CONSTRAINT "AgentInteraction_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."Patient"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."AgentMessage"
    ADD CONSTRAINT "AgentMessage_agent_interaction_id_fkey" FOREIGN KEY ("agent_interaction_id") REFERENCES "public"."AgentInteraction"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AgentMetrics"
    ADD CONSTRAINT "AgentMetrics_agent_config_id_fkey" FOREIGN KEY ("agent_config_id") REFERENCES "public"."AgentConfig"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Appointment"
    ADD CONSTRAINT "Appointment_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AssignmentPreference"
    ADD CONSTRAINT "AssignmentPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AuditLog"
    ADD CONSTRAINT "AuditLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."CareInstruction"
    ADD CONSTRAINT "CareInstruction_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."CommunicationMessage"
    ADD CONSTRAINT "CommunicationMessage_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."CommunicationMessage"
    ADD CONSTRAINT "CommunicationMessage_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."Patient"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Consent"
    ADD CONSTRAINT "Consent_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."Patient"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Consent"
    ADD CONSTRAINT "Consent_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."EpisodeMedication"
    ADD CONSTRAINT "EpisodeMedication_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Episode"
    ADD CONSTRAINT "Episode_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."EscalationTask"
    ADD CONSTRAINT "EscalationTask_agent_interaction_id_fkey" FOREIGN KEY ("agent_interaction_id") REFERENCES "public"."AgentInteraction"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."EscalationTask"
    ADD CONSTRAINT "EscalationTask_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."EscalationTask"
    ADD CONSTRAINT "EscalationTask_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."EscalationTask"
    ADD CONSTRAINT "EscalationTask_source_attempt_id_fkey" FOREIGN KEY ("source_attempt_id") REFERENCES "public"."OutreachAttempt"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."MedicationAdherenceEvent"
    ADD CONSTRAINT "MedicationAdherenceEvent_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."NoteExport"
    ADD CONSTRAINT "NoteExport_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."NoteExport"
    ADD CONSTRAINT "NoteExport_escalation_task_id_fkey" FOREIGN KEY ("escalation_task_id") REFERENCES "public"."EscalationTask"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."OutreachAttempt"
    ADD CONSTRAINT "OutreachAttempt_outreach_plan_id_fkey" FOREIGN KEY ("outreach_plan_id") REFERENCES "public"."OutreachPlan"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."OutreachPlan"
    ADD CONSTRAINT "OutreachPlan_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."OutreachResponse"
    ADD CONSTRAINT "OutreachResponse_outreach_attempt_id_fkey" FOREIGN KEY ("outreach_attempt_id") REFERENCES "public"."OutreachAttempt"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ProtocolAssignment"
    ADD CONSTRAINT "ProtocolAssignment_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."ProtocolAssignment"
    ADD CONSTRAINT "ProtocolAssignment_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."TCMRecord"
    ADD CONSTRAINT "TCMRecord_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."TransportRequest"
    ADD CONSTRAINT "TransportRequest_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."TransportRequest"
    ADD CONSTRAINT "TransportRequest_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AgentInteraction"
    ADD CONSTRAINT "agentinteraction_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."Episode"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."AgentInteraction"
    ADD CONSTRAINT "agentinteraction_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."Patient"("id") ON DELETE SET NULL;



CREATE POLICY "Admin full access - AgentConfig" ON "public"."AgentConfig" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - AgentInteraction" ON "public"."AgentInteraction" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - AgentMessage" ON "public"."AgentMessage" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - AgentMetrics" ON "public"."AgentMetrics" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - AgentPromptTemplate" ON "public"."AgentPromptTemplate" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - Appointment" ON "public"."Appointment" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - AssignmentPreference" ON "public"."AssignmentPreference" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - AuditLog" ON "public"."AuditLog" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - CommunicationMessage" ON "public"."CommunicationMessage" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - Consent" ON "public"."Consent" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - Episode" ON "public"."Episode" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - EpisodeMedication" ON "public"."EpisodeMedication" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - EscalationTask" ON "public"."EscalationTask" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - MedicationAdherenceEvent" ON "public"."MedicationAdherenceEvent" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - NoteExport" ON "public"."NoteExport" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - OutreachAttempt" ON "public"."OutreachAttempt" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - OutreachPlan" ON "public"."OutreachPlan" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - OutreachQuestion" ON "public"."OutreachQuestion" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - OutreachResponse" ON "public"."OutreachResponse" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - Patient" ON "public"."Patient" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - ProgramKPI" ON "public"."ProgramKPI" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - RedFlagRule" ON "public"."RedFlagRule" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - TCMRecord" ON "public"."TCMRecord" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access - TransportRequest" ON "public"."TransportRequest" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Deny all - AgentConfig" ON "public"."AgentConfig" USING (false);



CREATE POLICY "Deny all - AgentInteraction" ON "public"."AgentInteraction" USING (false);



CREATE POLICY "Deny all - AgentMessage" ON "public"."AgentMessage" USING (false);



CREATE POLICY "Deny all - AgentMetrics" ON "public"."AgentMetrics" USING (false);



CREATE POLICY "Deny all - AgentPromptTemplate" ON "public"."AgentPromptTemplate" USING (false);



CREATE POLICY "Deny all - Appointment" ON "public"."Appointment" USING (false);



CREATE POLICY "Deny all - AssignmentPreference" ON "public"."AssignmentPreference" USING (false);



CREATE POLICY "Deny all - AuditLog" ON "public"."AuditLog" USING (false);



CREATE POLICY "Deny all - CommunicationMessage" ON "public"."CommunicationMessage" USING (false);



CREATE POLICY "Deny all - Consent" ON "public"."Consent" USING (false);



CREATE POLICY "Deny all - Episode" ON "public"."Episode" USING (false);



CREATE POLICY "Deny all - EpisodeMedication" ON "public"."EpisodeMedication" USING (false);



CREATE POLICY "Deny all - EscalationTask" ON "public"."EscalationTask" USING (false);



CREATE POLICY "Deny all - MedicationAdherenceEvent" ON "public"."MedicationAdherenceEvent" USING (false);



CREATE POLICY "Deny all - NoteExport" ON "public"."NoteExport" USING (false);



CREATE POLICY "Deny all - OutreachAttempt" ON "public"."OutreachAttempt" USING (false);



CREATE POLICY "Deny all - OutreachPlan" ON "public"."OutreachPlan" USING (false);



CREATE POLICY "Deny all - OutreachQuestion" ON "public"."OutreachQuestion" USING (false);



CREATE POLICY "Deny all - OutreachResponse" ON "public"."OutreachResponse" USING (false);



CREATE POLICY "Deny all - Patient" ON "public"."Patient" USING (false);



CREATE POLICY "Deny all - ProgramKPI" ON "public"."ProgramKPI" USING (false);



CREATE POLICY "Deny all - RedFlagRule" ON "public"."RedFlagRule" USING (false);



CREATE POLICY "Deny all - TCMRecord" ON "public"."TCMRecord" USING (false);



CREATE POLICY "Deny all - TransportRequest" ON "public"."TransportRequest" USING (false);



CREATE POLICY "Patient read own data - Patient" ON "public"."Patient" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'PATIENT'::"text")))) AND ("id" = ( SELECT "p"."id"
   FROM ("public"."Patient" "p"
     JOIN "public"."User" "u" ON (("u"."email" = "p"."email")))
  WHERE ("u"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "Protocol configs are modifiable by admins only" ON "public"."ProtocolConfig" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."id" = "auth"."uid"()) AND ("User"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Protocol configs are viewable by authenticated users" ON "public"."ProtocolConfig" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Service role can manage protocol assignments" ON "public"."ProtocolAssignment" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage protocol content" ON "public"."ProtocolContentPack" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage users" ON "public"."User" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - AgentConfig" ON "public"."AgentConfig" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - AgentInteraction" ON "public"."AgentInteraction" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - AgentMessage" ON "public"."AgentMessage" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - AgentMetrics" ON "public"."AgentMetrics" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - AgentPromptTemplate" ON "public"."AgentPromptTemplate" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - Appointment" ON "public"."Appointment" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - AssignmentPreference" ON "public"."AssignmentPreference" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - AuditLog" ON "public"."AuditLog" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - CommunicationMessage" ON "public"."CommunicationMessage" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - Consent" ON "public"."Consent" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - Episode" ON "public"."Episode" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - EpisodeMedication" ON "public"."EpisodeMedication" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - EscalationTask" ON "public"."EscalationTask" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - MedicationAdherenceEvent" ON "public"."MedicationAdherenceEvent" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - NoteExport" ON "public"."NoteExport" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - OutreachAttempt" ON "public"."OutreachAttempt" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - OutreachPlan" ON "public"."OutreachPlan" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - OutreachQuestion" ON "public"."OutreachQuestion" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - OutreachResponse" ON "public"."OutreachResponse" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - Patient" ON "public"."Patient" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - ProgramKPI" ON "public"."ProgramKPI" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - RedFlagRule" ON "public"."RedFlagRule" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - TCMRecord" ON "public"."TCMRecord" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access - TransportRequest" ON "public"."TransportRequest" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Staff read assigned tasks - EscalationTask" ON "public"."EscalationTask" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'STAFF'::"text")))) AND (("assigned_to_user_id" = ( SELECT "User"."id"
   FROM "public"."User"
  WHERE ("User"."auth_user_id" = "auth"."uid"()))) OR ("assigned_to_user_id" IS NULL))));



CREATE POLICY "Staff update assigned tasks - EscalationTask" ON "public"."EscalationTask" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_user_id" = "auth"."uid"()) AND ("User"."role" = 'STAFF'::"text")))) AND ("assigned_to_user_id" = ( SELECT "User"."id"
   FROM "public"."User"
  WHERE ("User"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own data" ON "public"."User" FOR UPDATE USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view protocol assignments" ON "public"."ProtocolAssignment" FOR SELECT USING (true);



CREATE POLICY "Users can view protocol content" ON "public"."ProtocolContentPack" FOR SELECT USING (true);



CREATE POLICY "Users can view their own data" ON "public"."User" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."assign_protocol_to_episode"() TO "service_role";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql_string" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql_string" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_protocol_config"("condition_code_param" "public"."condition_code", "education_level_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_interaction_duration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_condition_catalog_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_login"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_protocol_config_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."AgentConfig" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."AgentConfig" TO "authenticated";



GRANT ALL ON TABLE "public"."AgentInteraction" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."AgentInteraction" TO "authenticated";



GRANT ALL ON TABLE "public"."AgentMessage" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."AgentMessage" TO "authenticated";



GRANT ALL ON TABLE "public"."AgentMetrics" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."AgentMetrics" TO "authenticated";



GRANT ALL ON TABLE "public"."AgentPromptTemplate" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."AgentPromptTemplate" TO "authenticated";



GRANT ALL ON TABLE "public"."Appointment" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."Appointment" TO "authenticated";



GRANT ALL ON TABLE "public"."AssignmentPreference" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."AssignmentPreference" TO "authenticated";



GRANT ALL ON TABLE "public"."AuditLog" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."AuditLog" TO "authenticated";



GRANT ALL ON TABLE "public"."CareInstruction" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."CareInstruction" TO "authenticated";



GRANT ALL ON TABLE "public"."CommunicationMessage" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."CommunicationMessage" TO "authenticated";



GRANT ALL ON TABLE "public"."ConditionCatalog" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."ConditionCatalog" TO "authenticated";
GRANT SELECT ON TABLE "public"."ConditionCatalog" TO "anon";



GRANT ALL ON TABLE "public"."Consent" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."Consent" TO "authenticated";



GRANT ALL ON TABLE "public"."Episode" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."Episode" TO "authenticated";



GRANT ALL ON TABLE "public"."EpisodeMedication" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."EpisodeMedication" TO "authenticated";



GRANT ALL ON TABLE "public"."EscalationTask" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."EscalationTask" TO "authenticated";



GRANT ALL ON TABLE "public"."MedicationAdherenceEvent" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."MedicationAdherenceEvent" TO "authenticated";



GRANT ALL ON TABLE "public"."NoteExport" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."NoteExport" TO "authenticated";



GRANT ALL ON TABLE "public"."OutreachAttempt" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."OutreachAttempt" TO "authenticated";



GRANT ALL ON TABLE "public"."OutreachPlan" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."OutreachPlan" TO "authenticated";



GRANT ALL ON TABLE "public"."OutreachQuestion" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."OutreachQuestion" TO "authenticated";



GRANT ALL ON TABLE "public"."OutreachResponse" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."OutreachResponse" TO "authenticated";



GRANT ALL ON TABLE "public"."Patient" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."Patient" TO "authenticated";



GRANT ALL ON TABLE "public"."ProgramKPI" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."ProgramKPI" TO "authenticated";



GRANT ALL ON TABLE "public"."ProtocolAssignment" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."ProtocolAssignment" TO "authenticated";



GRANT ALL ON TABLE "public"."ProtocolConfig" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."ProtocolConfig" TO "authenticated";



GRANT ALL ON TABLE "public"."ProtocolContentPack" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."ProtocolContentPack" TO "authenticated";



GRANT ALL ON TABLE "public"."RedFlagRule" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."RedFlagRule" TO "authenticated";



GRANT ALL ON TABLE "public"."TCMRecord" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."TCMRecord" TO "authenticated";



GRANT ALL ON TABLE "public"."TransportRequest" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."TransportRequest" TO "authenticated";



GRANT ALL ON TABLE "public"."User" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."User" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



























RESET ALL;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_login AFTER UPDATE OF last_sign_in_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.update_last_login();


