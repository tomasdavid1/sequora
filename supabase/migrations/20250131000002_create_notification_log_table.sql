-- Migration: Create NotificationLog table
-- Description: Track all notifications sent to nurses and patients for event-driven workflows

CREATE TABLE public."NotificationLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys (nullable to support different notification contexts)
  task_id uuid REFERENCES public."EscalationTask"(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES public."Episode"(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES public."User"(id) ON DELETE CASCADE,
  recipient_patient_id uuid REFERENCES public."Patient"(id) ON DELETE CASCADE,
  
  -- Notification metadata
  notification_type public.notification_type NOT NULL,
  channel public.notification_channel NOT NULL,
  status public.notification_status NOT NULL DEFAULT 'PENDING',
  
  -- Message content
  message_content text NOT NULL,
  subject text, -- For email notifications
  
  -- Provider tracking (e.g., Twilio message SID)
  provider_message_id text,
  provider_error_code text,
  
  -- Timestamps
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  
  -- Error tracking
  failure_reason text,
  retry_count integer DEFAULT 0,
  
  -- Additional metadata (JSON for flexibility)
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Standard timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_recipient CHECK (
    recipient_user_id IS NOT NULL OR recipient_patient_id IS NOT NULL
  ),
  CONSTRAINT valid_sent_at CHECK (
    sent_at IS NULL OR sent_at >= created_at
  ),
  CONSTRAINT valid_delivered_at CHECK (
    delivered_at IS NULL OR (sent_at IS NOT NULL AND delivered_at >= sent_at)
  ),
  CONSTRAINT valid_failed_at CHECK (
    failed_at IS NULL OR failed_at >= created_at
  )
);

-- Add comments
COMMENT ON TABLE public."NotificationLog" IS 'Comprehensive log of all notifications sent through the platform';
COMMENT ON COLUMN public."NotificationLog".task_id IS 'Associated escalation task (if notification is task-related)';
COMMENT ON COLUMN public."NotificationLog".episode_id IS 'Associated episode (for patient-specific notifications)';
COMMENT ON COLUMN public."NotificationLog".recipient_user_id IS 'Nurse/staff member receiving the notification';
COMMENT ON COLUMN public."NotificationLog".recipient_patient_id IS 'Patient receiving the notification';
COMMENT ON COLUMN public."NotificationLog".provider_message_id IS 'External provider message ID (e.g., Twilio SID)';
COMMENT ON COLUMN public."NotificationLog".metadata IS 'Additional flexible data (e.g., template variables, tracking info)';
COMMENT ON COLUMN public."NotificationLog".retry_count IS 'Number of retry attempts for failed notifications';

-- Create indexes for common queries
CREATE INDEX idx_notification_log_task_id ON public."NotificationLog"(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_notification_log_episode_id ON public."NotificationLog"(episode_id) WHERE episode_id IS NOT NULL;
CREATE INDEX idx_notification_log_recipient_user_id ON public."NotificationLog"(recipient_user_id) WHERE recipient_user_id IS NOT NULL;
CREATE INDEX idx_notification_log_recipient_patient_id ON public."NotificationLog"(recipient_patient_id) WHERE recipient_patient_id IS NOT NULL;
CREATE INDEX idx_notification_log_status ON public."NotificationLog"(status);
CREATE INDEX idx_notification_log_notification_type ON public."NotificationLog"(notification_type);
CREATE INDEX idx_notification_log_channel ON public."NotificationLog"(channel);
CREATE INDEX idx_notification_log_created_at ON public."NotificationLog"(created_at DESC);
CREATE INDEX idx_notification_log_sent_at ON public."NotificationLog"(sent_at DESC) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_notification_log_provider_message_id ON public."NotificationLog"(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- Create composite index for pending notifications (for retry jobs)
CREATE INDEX idx_notification_log_pending ON public."NotificationLog"(status, created_at) 
  WHERE status IN ('PENDING', 'FAILED');

-- Enable Row Level Security (RLS)
ALTER TABLE public."NotificationLog" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Nurses can view notifications sent to them
CREATE POLICY "Nurses can view their own notifications"
  ON public."NotificationLog"
  FOR SELECT
  USING (
    recipient_user_id = auth.uid()
  );

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON public."NotificationLog"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- System can insert notifications (service role)
CREATE POLICY "Service role can insert notifications"
  ON public."NotificationLog"
  FOR INSERT
  WITH CHECK (true);

-- System can update notification status (service role)
CREATE POLICY "Service role can update notifications"
  ON public."NotificationLog"
  FOR UPDATE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_notification_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE TRIGGER set_notification_log_updated_at
  BEFORE UPDATE ON public."NotificationLog"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_log_updated_at();

