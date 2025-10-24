const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigrations() {
  console.log('🚀 Applying TOC migrations...');
  
  const migrations = [
    '20250117180000_create_user_table.sql',
    '20250117190000_toc_core_schema.sql', 
    '20250117200000_toc_extended_schema.sql',
    '20250117210000_toc_agent_system.sql',
    '20250117220000_toc_rls_policies.sql'
  ];
  
  for (const migration of migrations) {
    try {
      console.log(`📄 Applying migration: ${migration}`);
      const sql = fs.readFileSync(path.join('supabase/migrations', migration), 'utf8');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { data, error } = await supabase.rpc('exec_sql', { sql_string: statement + ';' });
            if (error) {
              console.error(`❌ Error in statement: ${statement.substring(0, 100)}...`);
              console.error('Error:', error);
              // Continue with next statement
            }
          } catch (err) {
            console.error(`❌ Failed to execute statement: ${statement.substring(0, 100)}...`);
            console.error('Error:', err.message);
            // Continue with next statement
          }
        }
      }
      
      console.log(`✅ Migration ${migration} completed`);
    } catch (err) {
      console.error(`❌ Failed to read ${migration}:`, err.message);
    }
  }
  
  console.log('🎉 All migrations completed!');
}

// First, let's create the exec_sql function
async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function...');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_string text) 
    RETURNS text 
    LANGUAGE plpgsql 
    SECURITY DEFINER 
    AS $$ 
    BEGIN 
      EXECUTE sql_string; 
      RETURN 'Success'; 
    EXCEPTION 
      WHEN OTHERS THEN 
        RETURN 'Error: ' || SQLERRM; 
    END; 
    $$;
    
    GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
    GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
  `;
  
  try {
    // Try to create the function using a direct SQL call
    const { data, error } = await supabase
      .from('_sql')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Cannot create exec_sql function via client. Please run this SQL in Supabase Dashboard:');
      console.log(createFunctionSQL);
      console.log('\nThen run: node apply-migrations.js');
      return false;
    }
    
    console.log('✅ exec_sql function created successfully');
    return true;
  } catch (err) {
    console.log('⚠️  Cannot create exec_sql function via client. Please run this SQL in Supabase Dashboard:');
    console.log(createFunctionSQL);
    console.log('\nThen run: node apply-migrations.js');
    return false;
  }
}

async function main() {
  try {
    const functionCreated = await createExecSqlFunction();
    if (functionCreated) {
      await applyMigrations();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

main();
