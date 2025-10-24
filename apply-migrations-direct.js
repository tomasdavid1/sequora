const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigrationsDirect() {
  console.log('🚀 Applying TOC migrations directly...');
  
  try {
    // 1. Create User table
    console.log('📄 Creating User table...');
    const userTableSQL = `
      CREATE TABLE IF NOT EXISTS public."User" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'PATIENT' CHECK (role IN ('ADMIN', 'STAFF', 'PATIENT')),
        phone TEXT,
        department TEXT,
        specialty TEXT,
        active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
      );
    `;
    
    const { data: userResult, error: userError } = await supabase.rpc('exec_sql', { 
      sql_string: userTableSQL 
    });
    
    if (userError) {
      console.error('❌ Error creating User table:', userError);
      return;
    }
    console.log('✅ User table created');
    
    // 2. Create indexes
    console.log('📄 Creating indexes...');
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_user_email ON public."User"(email);
      CREATE INDEX IF NOT EXISTS idx_user_auth_id ON public."User"(auth_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_role ON public."User"(role);
      CREATE INDEX IF NOT EXISTS idx_user_active ON public."User"(active);
    `;
    
    const { data: indexResult, error: indexError } = await supabase.rpc('exec_sql', { 
      sql_string: indexesSQL 
    });
    
    if (indexError) {
      console.error('❌ Error creating indexes:', indexError);
    } else {
      console.log('✅ Indexes created');
    }
    
    // 3. Enable RLS
    console.log('📄 Enabling RLS...');
    const rlsSQL = `ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;`;
    
    const { data: rlsResult, error: rlsError } = await supabase.rpc('exec_sql', { 
      sql_string: rlsSQL 
    });
    
    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled');
    }
    
    // 4. Create policies
    console.log('📄 Creating policies...');
    const policiesSQL = `
      CREATE POLICY "Service role can manage users" ON public."User"
        FOR ALL USING (auth.role() = 'service_role');
      
      CREATE POLICY "Users can view their own data" ON public."User"
        FOR SELECT USING (auth.uid() = auth_user_id);
      
      CREATE POLICY "Users can update their own data" ON public."User"
        FOR UPDATE USING (auth.uid() = auth_user_id);
    `;
    
    const { data: policyResult, error: policyError } = await supabase.rpc('exec_sql', { 
      sql_string: policiesSQL 
    });
    
    if (policyError) {
      console.error('❌ Error creating policies:', policyError);
    } else {
      console.log('✅ Policies created');
    }
    
    // 5. Create trigger function
    console.log('📄 Creating trigger function...');
    const triggerFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
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
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { data: triggerResult, error: triggerError } = await supabase.rpc('exec_sql', { 
      sql_string: triggerFunctionSQL 
    });
    
    if (triggerError) {
      console.error('❌ Error creating trigger function:', triggerError);
    } else {
      console.log('✅ Trigger function created');
    }
    
    // 6. Create trigger
    console.log('📄 Creating trigger...');
    const triggerSQL = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;
    
    const { data: triggerCreateResult, error: triggerCreateError } = await supabase.rpc('exec_sql', { 
      sql_string: triggerSQL 
    });
    
    if (triggerCreateError) {
      console.error('❌ Error creating trigger:', triggerCreateError);
    } else {
      console.log('✅ Trigger created');
    }
    
    console.log('🎉 User table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyMigrationsDirect();
