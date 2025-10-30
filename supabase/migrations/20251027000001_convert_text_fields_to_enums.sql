-- Migration: Convert TEXT fields with CHECK constraints to proper ENUMs
-- This improves type safety at the database level and removes redundant CHECK constraints

-- ============================================================================
-- CREATE MISSING ENUMS
-- ============================================================================

-- Interaction Type (currently TEXT with CHECK constraint)
DO $$ BEGIN
    CREATE TYPE "public"."interaction_type" AS ENUM (
    'VOICE_CALL',
    'SMS',
    'WHATSAPP',
    'EMAIL',
    'APP_CHAT'
);

-- Message Type (currently TEXT with CHECK constraint)
CREATE TYPE IF NOT EXISTS "public"."message_type" AS ENUM (
    'SYSTEM',
    'USER',
    'ASSISTANT',
    'FUNCTION_CALL',
    'FUNCTION_RESULT',
    'TOOL_CALL',
    'TOOL_RESULT'
);

-- Audit Action
CREATE TYPE IF NOT EXISTS "public"."audit_action" AS ENUM (
    'CREATE',
    'UPDATE',
    'READ',
    'DELETE',
    'EXPORT',
    'ESCALATE'
);

-- Actor Type (for AuditLog)
CREATE TYPE IF NOT EXISTS "public"."actor_type" AS ENUM (
    'USER',
    'SYSTEM',
    'PATIENT'
);

-- User Role
CREATE TYPE IF NOT EXISTS "public"."user_role" AS ENUM (
    'ADMIN',
    'STAFF',
    'NURSE',
    'PATIENT'
);

-- Note Export Status
CREATE TYPE IF NOT EXISTS "public"."note_export_status" AS ENUM (
    'QUEUED',
    'IN_PROGRESS',
    'SENT',
    'FAILED',
    'CANCELLED'
);

-- Consent Method
CREATE TYPE IF NOT EXISTS "public"."consent_method" AS ENUM (
    'VERBAL',
    'WRITTEN',
    'DIGITAL'
);

-- Medication Adherence Event Type
CREATE TYPE IF NOT EXISTS "public"."medication_adherence_event_type" AS ENUM (
    'PICKUP_CONFIRMED',
    'PICKUP_DECLINED',
    'MISSED_DOSE',
    'SIDE_EFFECT',
    'COST_BARRIER',
    'SWITCHED_DRUG',
    'ADHERENT'
);

-- Medication Event Source
CREATE TYPE IF NOT EXISTS "public"."medication_event_source" AS ENUM (
    'PATIENT',
    'PHARMACY',
    'NURSE',
    'SYSTEM'
);

-- Appointment Modality
CREATE TYPE IF NOT EXISTS "public"."appointment_modality" AS ENUM (
    'IN_PERSON',
    'VIRTUAL'
);

-- TCM Complexity
CREATE TYPE IF NOT EXISTS "public"."tcm_complexity" AS ENUM (
    'MODERATE_99495',
    'HIGH_99496',
    'UNKNOWN'
);

-- Transport Payer
CREATE TYPE IF NOT EXISTS "public"."transport_payer" AS ENUM (
    'HOSPITAL',
    'PATIENT',
    'GRANT',
    'OTHER'
);

-- ============================================================================
-- CONVERT TEXT COLUMNS TO ENUMS
-- ============================================================================

-- AgentInteraction.interaction_type
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'AgentInteraction' 
        AND column_name = 'interaction_type' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."AgentInteraction" 
        DROP CONSTRAINT IF EXISTS "AgentInteraction_interaction_type_check";
        
        -- Convert column to ENUM
        ALTER TABLE "public"."AgentInteraction" 
        ALTER COLUMN "interaction_type" TYPE "public"."interaction_type" 
        USING "interaction_type"::"public"."interaction_type";
        
        RAISE NOTICE 'Converted AgentInteraction.interaction_type to ENUM';
    END IF;
END $$;

-- AgentInteraction.status (use existing interaction_status ENUM)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'AgentInteraction' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- Update default value to match enum
        UPDATE "public"."AgentInteraction" 
        SET "status" = 'IN_PROGRESS' 
        WHERE "status" = 'INITIATED';
        
        -- Convert column to ENUM
        ALTER TABLE "public"."AgentInteraction" 
        ALTER COLUMN "status" TYPE "public"."interaction_status" 
        USING CASE 
            WHEN "status" = 'INITIATED' THEN 'IN_PROGRESS'
            ELSE "status"
        END::"public"."interaction_status";
        
        -- Set default
        ALTER TABLE "public"."AgentInteraction" 
        ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS'::"public"."interaction_status";
        
        RAISE NOTICE 'Converted AgentInteraction.status to ENUM';
    END IF;
END $$;

-- AgentMessage.message_type
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'AgentMessage' 
        AND column_name = 'message_type' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."AgentMessage" 
        DROP CONSTRAINT IF EXISTS "AgentMessage_message_type_check";
        
        -- Update legacy values
        UPDATE "public"."AgentMessage" 
        SET "message_type" = 'TOOL_CALL' 
        WHERE "message_type" = 'FUNCTION_CALL';
        
        UPDATE "public"."AgentMessage" 
        SET "message_type" = 'TOOL_RESULT' 
        WHERE "message_type" = 'FUNCTION_RESULT';
        
        -- Convert column to ENUM
        ALTER TABLE "public"."AgentMessage" 
        ALTER COLUMN "message_type" TYPE "public"."message_type" 
        USING "message_type"::"public"."message_type";
        
        RAISE NOTICE 'Converted AgentMessage.message_type to ENUM';
    END IF;
END $$;

-- AgentMessage.role (use existing message_role ENUM)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'AgentMessage' 
        AND column_name = 'role' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."AgentMessage" 
        DROP CONSTRAINT IF EXISTS "AgentMessage_role_check";
        
        -- Map values to message_role enum (AGENT, PATIENT, SYSTEM)
        UPDATE "public"."AgentMessage" 
        SET "role" = CASE 
            WHEN "role" = 'user' THEN 'PATIENT'
            WHEN "role" = 'assistant' THEN 'AGENT'
            WHEN "role" = 'system' THEN 'SYSTEM'
            WHEN "role" = 'function' THEN 'SYSTEM'
            ELSE "role"
        END;
        
        -- Convert column to ENUM
        ALTER TABLE "public"."AgentMessage" 
        ALTER COLUMN "role" TYPE "public"."message_role" 
        USING UPPER("role")::"public"."message_role";
        
        RAISE NOTICE 'Converted AgentMessage.role to ENUM';
    END IF;
END $$;

-- User.role
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'role' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."User" 
        DROP CONSTRAINT IF EXISTS "User_role_check";
        
        -- Add NURSE to user_role enum if not exists
        ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'NURSE';
        
        -- Convert column to ENUM
        ALTER TABLE "public"."User" 
        ALTER COLUMN "role" TYPE "public"."user_role" 
        USING "role"::"public"."user_role";
        
        -- Set default
        ALTER TABLE "public"."User" 
        ALTER COLUMN "role" SET DEFAULT 'PATIENT'::"public"."user_role";
        
        RAISE NOTICE 'Converted User.role to ENUM';
    END IF;
END $$;

-- NoteExport.status
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'NoteExport' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- Convert column to ENUM
        ALTER TABLE "public"."NoteExport" 
        ALTER COLUMN "status" TYPE "public"."note_export_status" 
        USING "status"::"public"."note_export_status";
        
        -- Set default
        ALTER TABLE "public"."NoteExport" 
        ALTER COLUMN "status" SET DEFAULT 'QUEUED'::"public"."note_export_status";
        
        RAISE NOTICE 'Converted NoteExport.status to ENUM';
    END IF;
END $$;

-- Appointment.modality
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Appointment' 
        AND column_name = 'modality' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."Appointment" 
        DROP CONSTRAINT IF EXISTS "Appointment_modality_check";
        
        -- Convert column to ENUM
        ALTER TABLE "public"."Appointment" 
        ALTER COLUMN "modality" TYPE "public"."appointment_modality" 
        USING "modality"::"public"."appointment_modality";
        
        RAISE NOTICE 'Converted Appointment.modality to ENUM';
    END IF;
END $$;

-- AuditLog.action
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'AuditLog' 
        AND column_name = 'action' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."AuditLog" 
        DROP CONSTRAINT IF EXISTS "AuditLog_action_check";
        
        -- Convert column to ENUM
        ALTER TABLE "public"."AuditLog" 
        ALTER COLUMN "action" TYPE "public"."audit_action" 
        USING "action"::"public"."audit_action";
        
        RAISE NOTICE 'Converted AuditLog.action to ENUM';
    END IF;
END $$;

-- AuditLog.actor_type
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'AuditLog' 
        AND column_name = 'actor_type' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."AuditLog" 
        DROP CONSTRAINT IF EXISTS "AuditLog_actor_type_check";
        
        -- Convert column to ENUM
        ALTER TABLE "public"."AuditLog" 
        ALTER COLUMN "actor_type" TYPE "public"."actor_type" 
        USING "actor_type"::"public"."actor_type";
        
        RAISE NOTICE 'Converted AuditLog.actor_type to ENUM';
    END IF;
END $$;

-- Consent.method
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Consent' 
        AND column_name = 'method' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."Consent" 
        DROP CONSTRAINT IF EXISTS "Consent_method_check";
        
        -- Convert column to ENUM
        ALTER TABLE "public"."Consent" 
        ALTER COLUMN "method" TYPE "public"."consent_method" 
        USING "method"::"public"."consent_method";
        
        RAISE NOTICE 'Converted Consent.method to ENUM';
    END IF;
END $$;

-- MedicationAdherenceEvent.event_type
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'MedicationAdherenceEvent' 
        AND column_name = 'event_type' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."MedicationAdherenceEvent" 
        DROP CONSTRAINT IF EXISTS "MedicationAdherenceEvent_event_type_check";
        
        -- Convert column to ENUM
        ALTER TABLE "public"."MedicationAdherenceEvent" 
        ALTER COLUMN "event_type" TYPE "public"."medication_adherence_event_type" 
        USING "event_type"::"public"."medication_adherence_event_type";
        
        RAISE NOTICE 'Converted MedicationAdherenceEvent.event_type to ENUM';
    END IF;
END $$;

-- MedicationAdherenceEvent.source
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'MedicationAdherenceEvent' 
        AND column_name = 'source' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."MedicationAdherenceEvent" 
        DROP CONSTRAINT IF EXISTS "MedicationAdherenceEvent_source_check";
        
        -- Convert column to ENUM
        ALTER TABLE "public"."MedicationAdherenceEvent" 
        ALTER COLUMN "source" TYPE "public"."medication_event_source" 
        USING "source"::"public"."medication_event_source";
        
        RAISE NOTICE 'Converted MedicationAdherenceEvent.source to ENUM';
    END IF;
END $$;

-- TCMRecord.complexity
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'TCMRecord' 
        AND column_name = 'complexity' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."TCMRecord" 
        DROP CONSTRAINT IF EXISTS "TCMRecord_complexity_check";
        
        -- Convert column to ENUM
        ALTER TABLE "public"."TCMRecord" 
        ALTER COLUMN "complexity" TYPE "public"."tcm_complexity" 
        USING "complexity"::"public"."tcm_complexity";
        
        RAISE NOTICE 'Converted TCMRecord.complexity to ENUM';
    END IF;
END $$;

-- TransportRequest.payer
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'TransportRequest' 
        AND column_name = 'payer' 
        AND data_type = 'text'
    ) THEN
        -- Drop the CHECK constraint first
        ALTER TABLE "public"."TransportRequest" 
        DROP CONSTRAINT IF EXISTS "TransportRequest_payer_check";
        
        -- Convert column to ENUM
        ALTER TABLE "public"."TransportRequest" 
        ALTER COLUMN "payer" TYPE "public"."transport_payer" 
        USING "payer"::"public"."transport_payer";
        
        RAISE NOTICE 'Converted TransportRequest.payer to ENUM';
    END IF;
END $$;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON TYPE "public"."interaction_type" IS 
'Types of agent interactions: VOICE_CALL, SMS, WHATSAPP, EMAIL, APP_CHAT';

COMMENT ON TYPE "public"."message_type" IS 
'Types of messages in a conversation: SYSTEM, USER, ASSISTANT, TOOL_CALL, TOOL_RESULT';

COMMENT ON TYPE "public"."user_role" IS 
'User roles in the system: ADMIN (full access), STAFF (general staff), NURSE (care coordinators), PATIENT (end users)';

COMMENT ON TYPE "public"."note_export_status" IS 
'Status of clinical note exports to EHR: QUEUED, IN_PROGRESS, SENT, FAILED, CANCELLED';

