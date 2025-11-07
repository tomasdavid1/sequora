-- Migration: Create enums for NotificationLog table
-- Description: Add notification_type, notification_channel, and notification_status enums

-- Create notification_type enum
CREATE TYPE public.notification_type AS ENUM (
  'TASK_CREATED',
  'TASK_ASSIGNED',
  'SLA_WARNING',
  'SLA_BREACH',
  'TASK_RESOLVED',
  'CHECK_IN_REMINDER',
  'CHECK_IN_SENT',
  'PATIENT_RESPONSE',
  'MEDICATION_ALERT',
  'APPOINTMENT_REMINDER',
  'WELCOME_MESSAGE'
);

COMMENT ON TYPE public.notification_type IS 'Types of notifications that can be sent to users or patients';

-- Create notification_channel enum (reusing contact_channel values but specific to notifications)
CREATE TYPE public.notification_channel AS ENUM (
  'SMS',
  'EMAIL',
  'PUSH',
  'VOICE'
);

COMMENT ON TYPE public.notification_channel IS 'Communication channels for sending notifications';

-- Create notification_status enum
CREATE TYPE public.notification_status AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'CANCELLED'
);

COMMENT ON TYPE public.notification_status IS 'Delivery status of notifications';

