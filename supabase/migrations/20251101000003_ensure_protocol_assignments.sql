-- Ensure protocol assignments always exist for episodes
-- Migration: 20251101000003_ensure_protocol_assignments.sql

-- Step 1: Backfill any missing protocol assignments for existing episodes
INSERT INTO "ProtocolAssignment" (episode_id, condition_code, risk_level, is_active, created_at, updated_at)
SELECT 
  e.id,
  e.condition_code,
  e.risk_level,
  true,
  NOW(),
  NOW()
FROM "Episode" e
LEFT JOIN "ProtocolAssignment" pa ON pa.episode_id = e.id AND pa.is_active = true
WHERE pa.id IS NULL
  AND e.condition_code IS NOT NULL
  AND e.risk_level IS NOT NULL;

-- Step 2: Create function to auto-create protocol assignment when episode is created
CREATE OR REPLACE FUNCTION create_protocol_assignment_for_episode()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if episode has required fields
  IF NEW.condition_code IS NOT NULL AND NEW.risk_level IS NOT NULL THEN
    INSERT INTO "ProtocolAssignment" (
      episode_id,
      condition_code,
      risk_level,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.condition_code,
      NEW.risk_level,
      true,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on Episode table
DROP TRIGGER IF EXISTS trigger_create_protocol_assignment ON "Episode";

CREATE TRIGGER trigger_create_protocol_assignment
  AFTER INSERT ON "Episode"
  FOR EACH ROW
  EXECUTE FUNCTION create_protocol_assignment_for_episode();

-- Step 4: Create function to update protocol assignment when episode condition/risk changes
CREATE OR REPLACE FUNCTION update_protocol_assignment_on_episode_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If condition_code or risk_level changed, deactivate old assignment and create new one
  IF (OLD.condition_code IS DISTINCT FROM NEW.condition_code) 
     OR (OLD.risk_level IS DISTINCT FROM NEW.risk_level) THEN
    
    -- Deactivate old assignment
    UPDATE "ProtocolAssignment"
    SET is_active = false,
        updated_at = NOW()
    WHERE episode_id = NEW.id
      AND is_active = true;
    
    -- Create new assignment if episode has required fields
    IF NEW.condition_code IS NOT NULL AND NEW.risk_level IS NOT NULL THEN
      INSERT INTO "ProtocolAssignment" (
        episode_id,
        condition_code,
        risk_level,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.condition_code,
        NEW.risk_level,
        true,
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to update protocol assignment when episode changes
DROP TRIGGER IF EXISTS trigger_update_protocol_assignment ON "Episode";

CREATE TRIGGER trigger_update_protocol_assignment
  AFTER UPDATE ON "Episode"
  FOR EACH ROW
  EXECUTE FUNCTION update_protocol_assignment_on_episode_change();

-- Step 6: Add comment explaining the architecture
COMMENT ON TRIGGER trigger_create_protocol_assignment ON "Episode" IS 
  'Auto-creates ProtocolAssignment when Episode is created. Protocol assignments should NEVER be null.';

COMMENT ON TRIGGER trigger_update_protocol_assignment ON "Episode" IS 
  'Auto-updates ProtocolAssignment when Episode condition_code or risk_level changes. Deactivates old assignment and creates new one.';

