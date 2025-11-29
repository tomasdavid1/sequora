-- Migration: Create MagicLink table for secure patient chat links
-- Industry standard: 48-hour expiration, multi-use, session-based security

DO $$
BEGIN
    RAISE NOTICE 'Starting migration to create MagicLink table...';

    -- Step 1: Add phone verification fields to Patient table
    RAISE NOTICE 'Adding phone verification fields to Patient table...';
    
    ALTER TABLE "public"."Patient"
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
    
    ALTER TABLE "public"."Patient"
    ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP;
    
    -- Backfill existing patients as verified (assume they were verified during signup)
    UPDATE "public"."Patient"
    SET phone_verified = true,
        phone_verified_at = created_at
    WHERE phone_verified IS NULL OR phone_verified = false;

    -- Step 2: Create MagicLink table
    RAISE NOTICE 'Creating MagicLink table...';
    
    CREATE TABLE IF NOT EXISTS "public"."MagicLink" (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        token TEXT UNIQUE NOT NULL,
        
        -- Patient context
        patient_id UUID NOT NULL REFERENCES "public"."Patient"(id) ON DELETE CASCADE,
        episode_id UUID NOT NULL REFERENCES "public"."Episode"(id) ON DELETE CASCADE,
        outreach_attempt_id UUID REFERENCES "public"."OutreachAttempt"(id) ON DELETE SET NULL,
        
        -- Purpose and lifecycle
        purpose TEXT NOT NULL DEFAULT 'check-in',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        
        -- Usage tracking
        first_used_at TIMESTAMP,
        last_used_at TIMESTAMP,
        use_count INTEGER DEFAULT 0,
        
        -- Active state
        is_active BOOLEAN DEFAULT true,
        revoked_at TIMESTAMP,
        revoke_reason TEXT,
        
        -- Security audit trail
        ip_addresses TEXT[],
        user_agents TEXT[],
        
        -- Link to interaction created from this link
        agent_interaction_id UUID REFERENCES "public"."AgentInteraction"(id) ON DELETE SET NULL,
        
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Step 3: Create indexes for performance
    RAISE NOTICE 'Creating indexes on MagicLink table...';
    
    CREATE INDEX IF NOT EXISTS idx_magic_link_token 
    ON "public"."MagicLink"(token);
    
    CREATE INDEX IF NOT EXISTS idx_magic_link_patient 
    ON "public"."MagicLink"(patient_id);
    
    CREATE INDEX IF NOT EXISTS idx_magic_link_episode 
    ON "public"."MagicLink"(episode_id);
    
    CREATE INDEX IF NOT EXISTS idx_magic_link_expires 
    ON "public"."MagicLink"(expires_at) 
    WHERE is_active = true;
    
    CREATE INDEX IF NOT EXISTS idx_magic_link_active 
    ON "public"."MagicLink"(is_active, expires_at);

    -- Step 4: Enable RLS
    RAISE NOTICE 'Enabling Row Level Security on MagicLink...';
    
    ALTER TABLE "public"."MagicLink" ENABLE ROW LEVEL SECURITY;

    -- Step 5: Create RLS policies
    -- Allow service role full access
    CREATE POLICY "Service role has full access to MagicLink"
    ON "public"."MagicLink"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    -- Allow authenticated users to read their own magic links
    CREATE POLICY "Users can view their own magic links"
    ON "public"."MagicLink"
    FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid());

    RAISE NOTICE 'Migration to create MagicLink table completed successfully.';
END;
$$;

