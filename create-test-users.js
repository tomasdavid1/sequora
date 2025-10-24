const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUsers() {
  console.log('🚀 Creating test users...');
  
  const testUsers = [
    {
      email: 'admin@healthx.com',
      password: 'admin123',
      user_metadata: {
        name: 'Admin User',
        role: 'ADMIN'
      }
    },
    {
      email: 'nurse@healthx.com', 
      password: 'nurse123',
      user_metadata: {
        name: 'Sarah Johnson',
        role: 'STAFF'
      }
    },
    {
      email: 'patient@healthx.com',
      password: 'patient123', 
      user_metadata: {
        name: 'John Smith',
        role: 'PATIENT'
      }
    }
  ];
  
  for (const user of testUsers) {
    try {
      console.log(`📧 Creating user: ${user.email}`);
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        user_metadata: user.user_metadata,
        email_confirm: true // Skip email confirmation
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`✅ User ${user.email} already exists`);
        } else {
          console.error(`❌ Error creating ${user.email}:`, error.message);
        }
      } else {
        console.log(`✅ Created user: ${user.email}`);
      }
      
    } catch (err) {
      console.error(`❌ Failed to create ${user.email}:`, err.message);
    }
  }
  
  console.log('\n🎉 Test users created!');
  console.log('\n📋 Login Credentials:');
  console.log('👑 Admin: admin@healthx.com / admin123');
  console.log('👩‍⚕️ Nurse: nurse@healthx.com / nurse123');
  console.log('👤 Patient: patient@healthx.com / patient123');
}

createTestUsers().catch(console.error);
