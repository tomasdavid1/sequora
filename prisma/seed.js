const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('TomasTeaserLLC7', 10);

  // Create doctor
  const doctor = await prisma.doctor.upsert({
    where: { email: 'doctor@healthx.com' },
    update: {},
    create: {
      name: 'Dr. Smith',
      email: 'doctor@healthx.com',
      password,
    },
  });

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@healthx.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@healthx.com',
      role: 'ADMIN',
    },
  });

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'user@healthx.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'user@healthx.com',
      role: 'PATIENT',
    },
  });

  // Read the complete questionnaire from JSON file
  const quizDataPath = path.join(__dirname, '..', 'lib', 'quiz_structured_with_answers.json');
  const quizData = JSON.parse(fs.readFileSync(quizDataPath, 'utf8'));

  // Override answer scales per category (index-aligned)
  const overrides = {
    'Food Reactions': [
      [0,2,4,6], [0,6], [0,2,4], [0,2,4,6], [0,2,4,6], [0,2,4,6], [0,2,4], [0,2,4], [0,2,4], [0,2,4], [0,2,4], [0,2]
    ],
    'Metabolic Dysfunction': [
      [0,6], [0,2], [0,2,4,6], [0,2,4,6], [0,2,4], [0,8], [0,2], [0,8], [0,2,4,6], [0,2,4,8]
    ],
    'Oral Health': [
      [0,8], [0,8], [0,2], [0,8], [0,6], [0,4], [0,6], [0,6], [0,6]
    ],
    'Gut Dysbiosis': [
      [0,2,4,6], [0,2,4,6], [0,2,4,6], [0,4], [0,4], [0,6], [0,2], [0,2], [0,2,4], [0,2], [0,4], [0,4], [0,2,4]
    ],
    'Environmental Toxins': [
      [0,4], [0,2,4], [0,2,4], [0,2], [0,4], [0,2,4], [0,2], [0,2], [0,4], [0,4,6], [0,2,4], [0,2,4], [0,2,4], [0,4], [0,4]
    ],
    'Foreign Objects/Substances': [
      [0,6], [0,8], [0,6], [0,6], [0,8], [0,2,4], [0,2,4], [0,2,4,6], [0,6]
    ],
    'Stealth Infections': [
      [0,2], [0,2], [0,2,4], [0,2,4], [0,2,4], [0,2], [0,2], [0,2], [0,2,4], [0,2], [0,2], [0,2,4], [0,2,4], [0,4], [0,4], [0,2,4], [0,2,4], [0,2,4]
    ],
    'Nervous System Dysregulation': [
      [0,2,4,6], [0,2,4], [0,2,4], [0,2], [0,4], [0,2,4], [0,2], [0,6], [0,6], [0,4], [0,2], [0,2], [0,2,4], [0,2,4]
    ],
  };

  // Convert the JSON data to Prisma format
  const questions = [];
  const categoryMap = {
    'Food Reactions': 'foodReactions',
    'Metabolic Dysfunction': 'metabolicDysfunction',
    'Oral Health': 'oralHealth',
    'Gut Dysbiosis': 'gutDysbiosis',
    'Environmental Toxins': 'environmentalToxins',
    'Foreign Objects/Substances': 'foreignObjects',
    'Stealth Infections': 'stealthInfections',
    'Nervous System Dysregulation': 'nervousSystem'
  };

  // Process each category
  for (const [categoryName, categoryQuestions] of Object.entries(quizData)) {
    const prismaCategory = categoryMap[categoryName];
    if (!prismaCategory) {
      console.warn(`Unknown category: ${categoryName}`);
      continue;
    }

    categoryQuestions.forEach((q, index) => {
      const override = overrides[categoryName] && overrides[categoryName][index];
      questions.push({
        text: q.question,
        category: prismaCategory,
        orderInSection: index + 1,
        possibleValues: override ? override : q.answers
      });
    });
  }

  // Clear existing questions first
  try {
    await prisma.question.deleteMany({});
    console.log('Cleared existing questions');
  } catch (error) {
    console.log('No existing questions to clear');
  }

  // Create all questions
  try {
    for (const questionData of questions) {
      await prisma.question.create({
        data: questionData,
      });
    }
    console.log(`Created ${questions.length} questions successfully`);
  } catch (error) {
    console.error('Error creating questions:', error);
    throw error;
  }

  // Create sample memberships for different users
  try {
    // Create BASIC membership for default user
    const basicMembership = await prisma.membership.create({
      data: {
        userId: user.id,
        tier: 'BASIC',
        status: 'active',
        startDate: new Date('2024-01-15'),
      }
    });

    // Create a PREMIUM user with membership
    const premiumUser = await prisma.user.upsert({
      where: { email: 'premium@healthx.com' },
      update: {},
      create: {
        name: 'Premium User',
        email: 'premium@healthx.com',
        role: 'PATIENT',
      }
    });

    const premiumMembership = await prisma.membership.create({
      data: {
        userId: premiumUser.id,
        tier: 'PREMIUM',
        status: 'active',
        startDate: new Date('2024-01-10'),
      }
    });

    // Create a VIP user with membership
    const vipUser = await prisma.user.upsert({
      where: { email: 'vip@healthx.com' },
      update: {},
      create: {
        name: 'VIP User',
        email: 'vip@healthx.com',
        role: 'PATIENT',
      }
    });

    const vipMembership = await prisma.membership.create({
      data: {
        userId: vipUser.id,
        tier: 'VIP',
        status: 'active',
        startDate: new Date('2024-01-05'),
        endDate: new Date('2025-01-05'), // Annual subscription
      }
    });

    console.log('Created sample memberships:', {
      basic: { user: user.email, tier: basicMembership.tier },
      premium: { user: premiumUser.email, tier: premiumMembership.tier },
      vip: { user: vipUser.email, tier: vipMembership.tier }
    });

  } catch (error) {
    console.error('Error creating memberships:', error);
    throw error;
  }

  console.log('✅ Created admin user:', admin.email);

  // Create doctors
  console.log('🔧 Creating doctors...');
  
  const doctors = [
    { name: 'Dr. Smith', email: 'dr.smith@healthx.com', password: '$2b$10$LQwJ5.7LCr3jUwG0LwICC.O0ygL9xGWZ9vQr.lJqJjdFqOkkY0LJq' }, // "password123"
    { name: 'Dr. Johnson', email: 'dr.johnson@healthx.com', password: '$2b$10$LQwJ5.7LCr3jUwG0LwICC.O0ygL9xGWZ9vQr.lJqJjdFqOkkY0LJq' },
    { name: 'Dr. Williams', email: 'dr.williams@healthx.com', password: '$2b$10$LQwJ5.7LCr3jUwG0LwICC.O0ygL9xGWZ9vQr.lJqJjdFqOkkY0LJq' },
    { name: 'Dr. Brown', email: 'dr.brown@healthx.com', password: '$2b$10$LQwJ5.7LCr3jUwG0LwICC.O0ygL9xGWZ9vQr.lJqJjdFqOkkY0LJq' },
    { name: 'Dr. Davis', email: 'dr.davis@healthx.com', password: '$2b$10$LQwJ5.7LCr3jUwG0LwICC.O0ygL9xGWZ9vQr.lJqJjdFqOkkY0LJq' }
  ];

  for (const doctorData of doctors) {
    const doctor = await prisma.doctor.upsert({
      where: { email: doctorData.email },
      update: {},
      create: doctorData
    });
    console.log('✅ Created doctor:', doctor.name);
  }

  console.log('Database seeded successfully!');
  console.log({ doctor, admin, user });
  console.log(`Created ${questions.length} questions across ${Object.keys(quizData).length} categories`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect()); 