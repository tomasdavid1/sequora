import { PrismaClient, QuestionCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('TomasTeaserLLC7', 10);

  // Create doctors
  const doctors = [
    {
      name: 'Dr. Smith',
      email: 'dr.smith@healthx.com',
      password,
    },
    {
      name: 'Dr. Johnson',
      email: 'dr.johnson@healthx.com',
      password,
    },
    {
      name: 'Dr. Williams',
      email: 'dr.williams@healthx.com',
      password,
    },
    {
      name: 'Dr. Brown',
      email: 'dr.brown@healthx.com',
      password,
    },
    {
      name: 'Dr. Davis',
      email: 'dr.davis@healthx.com',
      password,
    }
  ];

  // Create each doctor
  for (const doctorData of doctors) {
    await prisma.doctor.upsert({
      where: { email: doctorData.email },
      update: {},
      create: doctorData,
    });
  }

  console.log(`Created ${doctors.length} doctors`);

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

  // Create test questions
  const questions = [
    // Food Reactions
    {
      text: "Do you experience bloating after eating?",
      category: QuestionCategory.foodReactions,
      orderInSection: 1,
      possibleValues: [0, 2, 4, 6, 8]
    },
    {
      text: "Do you have food cravings or addictions?",
      category: QuestionCategory.foodReactions,
      orderInSection: 2,
      possibleValues: [0, 2, 4, 6, 8]
    },
    {
      text: "Do you experience skin issues after eating certain foods?",
      category: QuestionCategory.foodReactions,
      orderInSection: 3,
      possibleValues: [0, 2, 4, 6, 8]
    },

    // Metabolic Dysfunction
    {
      text: "Do you have difficulty losing weight?",
      category: QuestionCategory.metabolicDysfunction,
      orderInSection: 1,
      possibleValues: [0, 2, 4, 6, 8]
    },
    {
      text: "Do you experience fatigue in the afternoon?",
      category: QuestionCategory.metabolicDysfunction,
      orderInSection: 2,
      possibleValues: [0, 2, 4, 6, 8]
    },
    {
      text: "Do you have trouble sleeping?",
      category: QuestionCategory.metabolicDysfunction,
      orderInSection: 3,
      possibleValues: [0, 2, 4, 6, 8]
    },

    // Oral Health
    {
      text: "Do your gums bleed when brushing?",
      category: QuestionCategory.oralHealth,
      orderInSection: 1,
      possibleValues: [0, 2, 4, 6, 8]
    },
    {
      text: "Do you grind your teeth at night?",
      category: QuestionCategory.oralHealth,
      orderInSection: 2,
      possibleValues: [0, 2, 4, 6, 8]
    },

    // Gut Dysbiosis
    {
      text: "Do you experience digestive issues?",
      category: QuestionCategory.gutDysbiosis,
      orderInSection: 1,
      possibleValues: [0, 2, 4, 6, 8]
    },
    {
      text: "Do you have irregular bowel movements?",
      category: QuestionCategory.gutDysbiosis,
      orderInSection: 2,
      possibleValues: [0, 2, 4, 6, 8]
    },

    // Environmental Toxins
    {
      text: "Are you sensitive to chemicals or fragrances?",
      category: QuestionCategory.environmentalToxins,
      orderInSection: 1,
      possibleValues: [0, 2, 4, 6, 8]
    },
    {
      text: "Do you experience brain fog?",
      category: QuestionCategory.environmentalToxins,
      orderInSection: 2,
      possibleValues: [0, 2, 4, 6, 8]
    },

    // Nervous System
    {
      text: "Do you experience anxiety or stress?",
      category: QuestionCategory.nervousSystem,
      orderInSection: 1,
      possibleValues: [0, 2, 4, 6, 8]
    },
    {
      text: "Do you have mood swings?",
      category: QuestionCategory.nervousSystem,
      orderInSection: 2,
      possibleValues: [0, 2, 4, 6, 8]
    }
  ];

  // Create questions
  for (const questionData of questions) {
    await prisma.question.create({
      data: questionData,
    });
  }

  console.log('Database seeded successfully!');
  console.log({ doctors: doctors.length, user });
  console.log(`Created ${questions.length} questions`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect()); 