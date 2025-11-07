-- Migration: Create NurseShift table (optional, for future round-robin assignment)
-- Description: Track nurse availability and shift schedules for intelligent task assignment

CREATE TABLE public."NurseShift" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key
  nurse_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  
  -- Shift timing
  shift_start timestamptz NOT NULL,
  shift_end timestamptz NOT NULL,
  
  -- Availability flags
  is_on_call boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  
  -- Capacity management
  max_concurrent_tasks integer DEFAULT 10 NOT NULL,
  current_task_count integer DEFAULT 0 NOT NULL,
  
  -- Shift metadata
  shift_type text, -- e.g., 'DAY', 'NIGHT', 'WEEKEND'
  notes text,
  
  -- Standard timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_shift_times CHECK (shift_end > shift_start),
  CONSTRAINT valid_task_count CHECK (current_task_count >= 0 AND current_task_count <= max_concurrent_tasks),
  CONSTRAINT valid_max_tasks CHECK (max_concurrent_tasks > 0)
);

-- Add comments
COMMENT ON TABLE public."NurseShift" IS 'Track nurse shifts and availability for intelligent task assignment';
COMMENT ON COLUMN public."NurseShift".nurse_id IS 'Nurse user ID';
COMMENT ON COLUMN public."NurseShift".is_on_call IS 'Whether nurse is on-call during this shift';
COMMENT ON COLUMN public."NurseShift".is_active IS 'Whether this shift is currently active (for cancellations)';
COMMENT ON COLUMN public."NurseShift".max_concurrent_tasks IS 'Maximum number of tasks nurse can handle simultaneously';
COMMENT ON COLUMN public."NurseShift".current_task_count IS 'Current number of assigned tasks (updated by triggers)';
COMMENT ON COLUMN public."NurseShift".shift_type IS 'Type of shift (DAY, NIGHT, WEEKEND, etc.)';

-- Create indexes
CREATE INDEX idx_nurse_shift_nurse_id ON public."NurseShift"(nurse_id);
CREATE INDEX idx_nurse_shift_times ON public."NurseShift"(shift_start, shift_end);
CREATE INDEX idx_nurse_shift_active ON public."NurseShift"(is_active) WHERE is_active = true;

-- Composite index for finding available nurses
CREATE INDEX idx_nurse_shift_availability ON public."NurseShift"(nurse_id, shift_start, shift_end, is_active)
  WHERE is_active = true AND current_task_count < max_concurrent_tasks;

-- Enable Row Level Security (RLS)
ALTER TABLE public."NurseShift" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Nurses can view their own shifts
CREATE POLICY "Nurses can view their own shifts"
  ON public."NurseShift"
  FOR SELECT
  USING (nurse_id = auth.uid());

-- Admins can manage all shifts
CREATE POLICY "Admins can manage all shifts"
  ON public."NurseShift"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Service role can manage shifts (for automated scheduling)
CREATE POLICY "Service role can manage shifts"
  ON public."NurseShift"
  FOR ALL
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_nurse_shift_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE TRIGGER set_nurse_shift_updated_at
  BEFORE UPDATE ON public."NurseShift"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nurse_shift_updated_at();

-- Optional: Create function to automatically update current_task_count
-- This would be triggered when tasks are assigned/resolved
CREATE OR REPLACE FUNCTION public.update_nurse_shift_task_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.assigned_to_user_id IS NOT NULL THEN
    -- Increment task count for the nurse's current shift
    UPDATE public."NurseShift"
    SET current_task_count = current_task_count + 1
    WHERE nurse_id = NEW.assigned_to_user_id
      AND shift_start <= NEW.created_at
      AND shift_end >= NEW.created_at
      AND is_active = true;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'RESOLVED' AND NEW.status = 'RESOLVED' THEN
    -- Decrement task count when task is resolved
    UPDATE public."NurseShift"
    SET current_task_count = GREATEST(0, current_task_count - 1)
    WHERE nurse_id = NEW.assigned_to_user_id
      AND shift_start <= NEW.created_at
      AND shift_end >= NEW.created_at
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_nurse_shift_task_count IS 'Automatically update nurse shift task counts when tasks are assigned or resolved';

-- Create trigger on EscalationTask to update shift task counts
CREATE TRIGGER update_shift_task_count_on_task_change
  AFTER INSERT OR UPDATE ON public."EscalationTask"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nurse_shift_task_count();

