-- Fixed enum migration with proper PostgreSQL syntax
-- Migration: Convert TEXT fields with CHECK constraints to proper ENUMs

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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Message Type (currently TEXT with CHECK constraint)
DO $$ BEGIN
    CREATE TYPE "public"."message_type" AS ENUM (
        'SYSTEM',
        'USER',
        'ASSISTANT',
        'FUNCTION_CALL',
        'FUNCTION_RESULT',
        'TOOL_CALL',
        'TOOL_RESULT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Audit Action
DO $$ BEGIN
    CREATE TYPE "public"."audit_action" AS ENUM (
        'CREATE',
        'UPDATE',
        'READ',
        'DELETE',
        'EXPORT',
        'ESCALATE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Actor Type (for AuditLog)
DO $$ BEGIN
    CREATE TYPE "public"."actor_type" AS ENUM (
        'USER',
        'SYSTEM',
        'PATIENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User Role
DO $$ BEGIN
    CREATE TYPE "public"."user_role" AS ENUM (
        'ADMIN',
        'STAFF',
        'NURSE',
        'PATIENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Note Export Status
DO $$ BEGIN
    CREATE TYPE "public"."note_export_status" AS ENUM (
        'QUEUED',
        'IN_PROGRESS',
        'SENT',
        'FAILED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Consent Method
DO $$ BEGIN
    CREATE TYPE "public"."consent_method" AS ENUM (
        'VERBAL',
        'WRITTEN',
        'DIGITAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Medication Adherence Event Type
DO $$ BEGIN
    CREATE TYPE "public"."medication_adherence_event_type" AS ENUM (
        'PICKUP_CONFIRMED',
        'PICKUP_DECLINED',
        'MISSED_DOSE',
        'SIDE_EFFECT',
        'COST_BARRIER',
        'SWITCHED_DRUG',
        'ADHERENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Medication Event Source
DO $$ BEGIN
    CREATE TYPE "public"."medication_event_source" AS ENUM (
        'PATIENT',
        'PHARMACY',
        'NURSE',
        'SYSTEM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Appointment Modality
DO $$ BEGIN
    CREATE TYPE "public"."appointment_modality" AS ENUM (
        'IN_PERSON',
        'VIRTUAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TCM Complexity
DO $$ BEGIN
    CREATE TYPE "public"."tcm_complexity" AS ENUM (
        'MODERATE_99495',
        'HIGH_99496',
        'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Transport Payer
DO $$ BEGIN
    CREATE TYPE "public"."transport_payer" AS ENUM (
        'HOSPITAL',
        'PATIENT',
        'GRANT',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CONVERT TEXT COLUMNS TO ENUMS
-- ============================================================================

-- AgentInteraction.interaction_type
DO $$ 
BEGIN
    ALTER TABLE "AgentInteraction" 
    ALTER COLUMN "interaction_type" TYPE "interaction_type" 
    USING "interaction_type"::"interaction_type";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- AgentMessage.message_type
DO $$ 
BEGIN
    ALTER TABLE "AgentMessage" 
    ALTER COLUMN "message_type" TYPE "message_type" 
    USING "message_type"::"message_type";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- AuditLog.action
DO $$ 
BEGIN
    ALTER TABLE "AuditLog" 
    ALTER COLUMN "action" TYPE "audit_action" 
    USING "action"::"audit_action";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- AuditLog.actor_type
DO $$ 
BEGIN
    ALTER TABLE "AuditLog" 
    ALTER COLUMN "actor_type" TYPE "actor_type" 
    USING "actor_type"::"actor_type";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- User.role
DO $$ 
BEGIN
    ALTER TABLE "User" 
    ALTER COLUMN "role" TYPE "user_role" 
    USING "role"::"user_role";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- NoteExport.status
DO $$ 
BEGIN
    ALTER TABLE "NoteExport" 
    ALTER COLUMN "status" TYPE "note_export_status" 
    USING "status"::"note_export_status";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Consent.method
DO $$ 
BEGIN
    ALTER TABLE "Consent" 
    ALTER COLUMN "method" TYPE "consent_method" 
    USING "method"::"consent_method";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- MedicationAdherenceEvent.event_type
DO $$ 
BEGIN
    ALTER TABLE "MedicationAdherenceEvent" 
    ALTER COLUMN "event_type" TYPE "medication_adherence_event_type" 
    USING "event_type"::"medication_adherence_event_type";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- MedicationAdherenceEvent.source
DO $$ 
BEGIN
    ALTER TABLE "MedicationAdherenceEvent" 
    ALTER COLUMN "source" TYPE "medication_event_source" 
    USING "source"::"medication_event_source";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Appointment.modality
DO $$ 
BEGIN
    ALTER TABLE "Appointment" 
    ALTER COLUMN "modality" TYPE "appointment_modality" 
    USING "modality"::"appointment_modality";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- TCM.complexity
DO $$ 
BEGIN
    ALTER TABLE "TCM" 
    ALTER COLUMN "complexity" TYPE "tcm_complexity" 
    USING "complexity"::"tcm_complexity";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Transport.payer
DO $$ 
BEGIN
    ALTER TABLE "Transport" 
    ALTER COLUMN "payer" TYPE "transport_payer" 
    USING "payer"::"transport_payer";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;
-- Migration: Convert TEXT fields with CHECK constraints to proper ENUMs

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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Message Type (currently TEXT with CHECK constraint)
DO $$ BEGIN
    CREATE TYPE "public"."message_type" AS ENUM (
        'SYSTEM',
        'USER',
        'ASSISTANT',
        'FUNCTION_CALL',
        'FUNCTION_RESULT',
        'TOOL_CALL',
        'TOOL_RESULT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Audit Action
DO $$ BEGIN
    CREATE TYPE "public"."audit_action" AS ENUM (
        'CREATE',
        'UPDATE',
        'READ',
        'DELETE',
        'EXPORT',
        'ESCALATE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Actor Type (for AuditLog)
DO $$ BEGIN
    CREATE TYPE "public"."actor_type" AS ENUM (
        'USER',
        'SYSTEM',
        'PATIENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User Role
DO $$ BEGIN
    CREATE TYPE "public"."user_role" AS ENUM (
        'ADMIN',
        'STAFF',
        'NURSE',
        'PATIENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Note Export Status
DO $$ BEGIN
    CREATE TYPE "public"."note_export_status" AS ENUM (
        'QUEUED',
        'IN_PROGRESS',
        'SENT',
        'FAILED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Consent Method
DO $$ BEGIN
    CREATE TYPE "public"."consent_method" AS ENUM (
        'VERBAL',
        'WRITTEN',
        'DIGITAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Medication Adherence Event Type
DO $$ BEGIN
    CREATE TYPE "public"."medication_adherence_event_type" AS ENUM (
        'PICKUP_CONFIRMED',
        'PICKUP_DECLINED',
        'MISSED_DOSE',
        'SIDE_EFFECT',
        'COST_BARRIER',
        'SWITCHED_DRUG',
        'ADHERENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Medication Event Source
DO $$ BEGIN
    CREATE TYPE "public"."medication_event_source" AS ENUM (
        'PATIENT',
        'PHARMACY',
        'NURSE',
        'SYSTEM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Appointment Modality
DO $$ BEGIN
    CREATE TYPE "public"."appointment_modality" AS ENUM (
        'IN_PERSON',
        'VIRTUAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TCM Complexity
DO $$ BEGIN
    CREATE TYPE "public"."tcm_complexity" AS ENUM (
        'MODERATE_99495',
        'HIGH_99496',
        'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Transport Payer
DO $$ BEGIN
    CREATE TYPE "public"."transport_payer" AS ENUM (
        'HOSPITAL',
        'PATIENT',
        'GRANT',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CONVERT TEXT COLUMNS TO ENUMS
-- ============================================================================

-- AgentInteraction.interaction_type
DO $$ 
BEGIN
    ALTER TABLE "AgentInteraction" 
    ALTER COLUMN "interaction_type" TYPE "interaction_type" 
    USING "interaction_type"::"interaction_type";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- AgentMessage.message_type
DO $$ 
BEGIN
    ALTER TABLE "AgentMessage" 
    ALTER COLUMN "message_type" TYPE "message_type" 
    USING "message_type"::"message_type";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- AuditLog.action
DO $$ 
BEGIN
    ALTER TABLE "AuditLog" 
    ALTER COLUMN "action" TYPE "audit_action" 
    USING "action"::"audit_action";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- AuditLog.actor_type
DO $$ 
BEGIN
    ALTER TABLE "AuditLog" 
    ALTER COLUMN "actor_type" TYPE "actor_type" 
    USING "actor_type"::"actor_type";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- User.role
DO $$ 
BEGIN
    ALTER TABLE "User" 
    ALTER COLUMN "role" TYPE "user_role" 
    USING "role"::"user_role";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- NoteExport.status
DO $$ 
BEGIN
    ALTER TABLE "NoteExport" 
    ALTER COLUMN "status" TYPE "note_export_status" 
    USING "status"::"note_export_status";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Consent.method
DO $$ 
BEGIN
    ALTER TABLE "Consent" 
    ALTER COLUMN "method" TYPE "consent_method" 
    USING "method"::"consent_method";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- MedicationAdherenceEvent.event_type
DO $$ 
BEGIN
    ALTER TABLE "MedicationAdherenceEvent" 
    ALTER COLUMN "event_type" TYPE "medication_adherence_event_type" 
    USING "event_type"::"medication_adherence_event_type";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- MedicationAdherenceEvent.source
DO $$ 
BEGIN
    ALTER TABLE "MedicationAdherenceEvent" 
    ALTER COLUMN "source" TYPE "medication_event_source" 
    USING "source"::"medication_event_source";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Appointment.modality
DO $$ 
BEGIN
    ALTER TABLE "Appointment" 
    ALTER COLUMN "modality" TYPE "appointment_modality" 
    USING "modality"::"appointment_modality";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- TCM.complexity
DO $$ 
BEGIN
    ALTER TABLE "TCM" 
    ALTER COLUMN "complexity" TYPE "tcm_complexity" 
    USING "complexity"::"tcm_complexity";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Transport.payer
DO $$ 
BEGIN
    ALTER TABLE "Transport" 
    ALTER COLUMN "payer" TYPE "transport_payer" 
    USING "payer"::"transport_payer";
EXCEPTION
    WHEN OTHERS THEN null;
END $$;
