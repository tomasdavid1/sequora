-- Remove unused requires_specific_answer field from ProtocolContentPack
-- This field was never used in any business logic, just adding complexity

ALTER TABLE "public"."ProtocolContentPack" 
DROP COLUMN IF EXISTS "requires_specific_answer";

