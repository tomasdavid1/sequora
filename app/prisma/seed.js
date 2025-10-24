const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const questionSeed = [
  // Food Reactions
  { text: 'Do you find that you must follow a very restrictive diet because you have multiple food allergies, sensitivities, and intolerances?', category: 'foodReactions', orderInSection: 1, possibleValues: [0,2,4,6] },
  { text: 'Have you been diagnosed with new onset food sensitivities and allergies in the past 12 months?', category: 'foodReactions', orderInSection: 2, possibleValues: [0,2,4,6] },
  { text: 'Do you experience hives or itchy red skin reactions?', category: 'foodReactions', orderInSection: 3, possibleValues: [0,2,4,6] },
  { text: 'Do you experience bloating and/or gas?', category: 'foodReactions', orderInSection: 4, possibleValues: [0,2,4,6] },
  { text: 'Do you experience constipation and/or diarrhea?', category: 'foodReactions', orderInSection: 5, possibleValues: [0,2,4,6] },
  { text: 'Do you experience abdominal pain with meals?', category: 'foodReactions', orderInSection: 6, possibleValues: [0,2,4,6] },
  { text: 'Do you experience brain fog?', category: 'foodReactions', orderInSection: 7, possibleValues: [0,2,4,6] },
  { text: 'Do you get headaches or migraines?', category: 'foodReactions', orderInSection: 8, possibleValues: [0,2,4,6] },
  { text: 'Do you experience chronic fatigue?', category: 'foodReactions', orderInSection: 9, possibleValues: [0,2,4,6] },
  { text: 'Do you experience chronic joint pain, aches, and swelling?', category: 'foodReactions', orderInSection: 10, possibleValues: [0,2,4,6] },
  { text: 'Do you experience persistent skin rashes?', category: 'foodReactions', orderInSection: 11, possibleValues: [0,2,4,6] },
  { text: 'Do you have dark circles under your eyes?', category: 'foodReactions', orderInSection: 12, possibleValues: [0,2,4,6] },

  // Metabolic Dysfunction
  { text: 'Have you noticed unexplained weight gain, especially around the abdomen, even when mindful of diet and lifestyle factors?', category: 'metabolicDysfunction', orderInSection: 1, possibleValues: [0,2,4,6] },
  { text: 'Have you experienced significant, unintentional weight loss?', category: 'metabolicDysfunction', orderInSection: 2, possibleValues: [0,2,4,6] },
  { text: 'Do you get hangry or feel lightheaded when you skip meals or do not snack between meals?', category: 'metabolicDysfunction', orderInSection: 3, possibleValues: [0,2,4,6] },
  { text: 'Do you have insatiable hunger and food cravings?', category: 'metabolicDysfunction', orderInSection: 4, possibleValues: [0,2,4,6] },
  { text: 'Do you often feel thirsty, even after drinking plenty of fluids?', category: 'metabolicDysfunction', orderInSection: 5, possibleValues: [0,2,4,6] },
  { text: 'Have you been diagnosed with pre-diabetes or type 2 diabetes?', category: 'metabolicDysfunction', orderInSection: 6, possibleValues: [0,2,4,8] },
  { text: 'Have you or a close family member been diagnosed with Alzheimer\'s disease or another type of dementia?', category: 'metabolicDysfunction', orderInSection: 7, possibleValues: [0,2,4,6] },
  { text: 'Have you been told by your healthcare provider that you are overweight or obese?', category: 'metabolicDysfunction', orderInSection: 8, possibleValues: [0,2,4,8] },
  { text: 'Do you find it difficult to handle and adjust to stressful situations?', category: 'metabolicDysfunction', orderInSection: 9, possibleValues: [0,2,4,6] },
  { text: 'Do you crave sweet and starchy foods?', category: 'metabolicDysfunction', orderInSection: 10, possibleValues: [0,2,4,6] },

  // Oral Health
  { text: 'Do you have “silver” amalgam fillings from previous cavities?', category: 'oralHealth', orderInSection: 1, possibleValues: [0,2,4,8] },
  { text: 'Do your gums easily bleed when you brush or floss your teeth?', category: 'oralHealth', orderInSection: 2, possibleValues: [0,2,4,8] },
  { text: 'Are you a smoker or do you chew tobacco regularly?', category: 'oralHealth', orderInSection: 3, possibleValues: [0,2,4,6] },
  { text: 'Have you received any root canals?', category: 'oralHealth', orderInSection: 4, possibleValues: [0,2,4,8] },
  { text: 'Do you have any dental implants?', category: 'oralHealth', orderInSection: 5, possibleValues: [0,2,4,6] },
  { text: 'Have you had dry sockets or infected tooth extractions?', category: 'oralHealth', orderInSection: 6, possibleValues: [0,2,4,6] },
  { text: 'Do you have persistent bad breath, even after brushing and rinsing regularly?', category: 'oralHealth', orderInSection: 7, possibleValues: [0,2,4,6] },
  { text: 'Have you been told you have deep pockets around your wisdom teeth or experienced post-surgical complications after wisdom teeth removal?', category: 'oralHealth', orderInSection: 8, possibleValues: [0,2,4,6] },
  { text: 'Do you often wake up with a sore jaw, headaches, or signs of teeth grinding?', category: 'oralHealth', orderInSection: 9, possibleValues: [0,2,4,6] },

  // Gut Dysbiosis
  { text: 'Do you experience bloating and/or gas?', category: 'gutDysbiosis', orderInSection: 1, possibleValues: [0,2,4,6] },
  { text: 'Do you experience chronic constipation and/or diarrhea?', category: 'gutDysbiosis', orderInSection: 2, possibleValues: [0,2,4,6] },
  { text: 'Do you experience abdominal pain with meals?', category: 'gutDysbiosis', orderInSection: 3, possibleValues: [0,2,4,6] },
  { text: 'Do you experience abdominal cramping and distension after taking certain probiotics?', category: 'gutDysbiosis', orderInSection: 4, possibleValues: [0,2,4,8] },
  { text: 'Do you feel "drunk" after eating high-carbohydrate foods, even without consuming alcohol?', category: 'gutDysbiosis', orderInSection: 5, possibleValues: [0,2,4,6] },
  { text: 'Do you experience rectal itching and teeth grinding that worsens at night and occurs in cycles around the full moon?', category: 'gutDysbiosis', orderInSection: 6, possibleValues: [0,2,4,6] },
  { text: 'Do you have dark circles under your eyes?', category: 'gutDysbiosis', orderInSection: 7, possibleValues: [0,2,4,6] },
  { text: 'Are you hungry all the time, almost as if a bottomless pit?', category: 'gutDysbiosis', orderInSection: 8, possibleValues: [0,2,4,6] },
  { text: 'Do you consistently crave sweet and starchy foods?', category: 'gutDysbiosis', orderInSection: 9, possibleValues: [0,2,4,6] },
  { text: 'Do you travel internationally in developing nations?', category: 'gutDysbiosis', orderInSection: 10, possibleValues: [0,2,4,6] },
  { text: 'Do you often find that your iron stores (ferritin) remain low, even when following a nutrient-dense diet or taking iron supplements?', category: 'gutDysbiosis', orderInSection: 11, possibleValues: [0,2,4,6] },
  { text: 'Do you notice a thick white coating on your tongue that doesn\'t go away with brushing?', category: 'gutDysbiosis', orderInSection: 12, possibleValues: [0,2,4,6] },
  { text: 'Do you experience abdominal pain, itchy flushed skin, watery eyes, headaches, and/or brain fog after consuming fermented foods, cured meats, or wine?', category: 'gutDysbiosis', orderInSection: 13, possibleValues: [0,2,4,6] },

  // Environmental Toxins
  { text: 'Do you currently live in, work at, or go to school in a building that has a damp or mildewy odor?', category: 'environmentalToxins', orderInSection: 1, possibleValues: [0,2,4,8] },
  { text: 'Do you notice that your symptoms decrease or disappear when you go on vacation or spend time in a different location for at least a few days?', category: 'environmentalToxins', orderInSection: 2, possibleValues: [0,2,4,8] },
  { text: 'Do you find it difficult to breathe through your nose, causing you to frequently breathe through your mouth?', category: 'environmentalToxins', orderInSection: 3, possibleValues: [0,2,4,8] },
  { text: 'Do you wake up routinely during the night with attacks of coughing?', category: 'environmentalToxins', orderInSection: 4, possibleValues: [0,2,4,6] },
  { text: 'Do you consider yourself particularly sensitive to electromagnetic frequencies (EMFs)?', category: 'environmentalToxins', orderInSection: 5, possibleValues: [0,2,4,6] },
  { text: 'Do you experience brain fog?', category: 'environmentalToxins', orderInSection: 6, possibleValues: [0,2,4,6] },
  { text: 'Have you been diagnosed with high blood pressure?', category: 'environmentalToxins', orderInSection: 7, possibleValues: [0,2,4,6] },
  { text: 'Have you or a close family member been diagnosed with Alzheimer\'s disease or another type of dementia?', category: 'environmentalToxins', orderInSection: 8, possibleValues: [0,2,4,6] },
  { text: 'Have you been told that you have hormone issues?', category: 'environmentalToxins', orderInSection: 9, possibleValues: [0,2,4,6] },
  { text: 'Do you tend to feel sensitive to chemicals such as perfumes, cleaning products, laundry detergents, or exhaust fumes, and experience symptoms like headaches, lightheadedness, or nausea when exposed?', category: 'environmentalToxins', orderInSection: 10, possibleValues: [0,2,4,6] },
  { text: 'Do you notice significant puffiness, swelling, or water retention in your face, arms, and/or legs?', category: 'environmentalToxins', orderInSection: 11, possibleValues: [0,2,4,6] },
  { text: 'Do you get a metallic taste in your mouth?', category: 'environmentalToxins', orderInSection: 12, possibleValues: [0,2,4,6] },
  { text: 'Do you eat tuna, shark, swordfish, or Atlantic salmon more than twice per week?', category: 'environmentalToxins', orderInSection: 13, possibleValues: [0,2,4,8] },
  { text: 'Are you an electrician, handle electronic devices, or do home renovations, including painting?', category: 'environmentalToxins', orderInSection: 14, possibleValues: [0,2,4,8] },
  { text: 'Do you currently or have you previously lived in a mining community or are you involved in construction, soldering, or glass staining?', category: 'environmentalToxins', orderInSection: 15, possibleValues: [0,2,4,8] },

  // Foreign Objects
  { text: 'Have you been diagnosed with an autoimmune disorder?', category: 'foreignObjects', orderInSection: 1, possibleValues: [0,2,4,6] },
  { text: 'Have you been injured or received a life-altering diagnosis after receiving a vaccine?', category: 'foreignObjects', orderInSection: 2, possibleValues: [0,2,4,8] },
  { text: 'Do you have any silicone implants?', category: 'foreignObjects', orderInSection: 3, possibleValues: [0,2,4,6] },
  { text: 'Do you have metal implants, dermal fillers, polypropylene mesh, or any other device/material implanted in your body?', category: 'foreignObjects', orderInSection: 4, possibleValues: [0,2,4,6] },
  { text: 'Have you ever been diagnosed with chronic fatigue syndrome, lupus, multiple sclerosis, dysautonomia, scleroderma, or Guillain-Barré Syndrome?', category: 'foreignObjects', orderInSection: 5, possibleValues: [0,2,4,8] },
  { text: 'Do you experience persistent skin rashes?', category: 'foreignObjects', orderInSection: 6, possibleValues: [0,2,4,6] },
  { text: 'Do you experience tingling, numbness, burning, or stabbing sensations?', category: 'foreignObjects', orderInSection: 7, possibleValues: [0,2,4,6] },
  { text: 'Do you experience heart palpitations, a racing heart while at rest, or occasional skipped beats?', category: 'foreignObjects', orderInSection: 8, possibleValues: [0,2,4,6] },
  { text: 'Do you often feel ill, similar to having flu-like symptoms?', category: 'foreignObjects', orderInSection: 9, possibleValues: [0,2,4,6] },

  // Stealth Infections
  { text: 'Have you ever been bitten by a tick?', category: 'stealthInfections', orderInSection: 1, possibleValues: [0,2,4,6] },
  { text: 'Have you ever had a bullseye rash on any part of your body?', category: 'stealthInfections', orderInSection: 2, possibleValues: [0,2,4,8] },
  { text: 'Do you experience unexplained fevers, sweats, and chills?', category: 'stealthInfections', orderInSection: 3, possibleValues: [0,2,4,6] },
  { text: 'Do you experience tingling, numbness, burning, or stabbing sensations?', category: 'stealthInfections', orderInSection: 4, possibleValues: [0,2,4,6] },
  { text: 'Do you experience heart palpitations, a racing heart while at rest, or occasional skipped beats?', category: 'stealthInfections', orderInSection: 5, possibleValues: [0,2,4,8] },
  { text: 'Do you often experience a sore throat, enlarged tonsils, and/or swollen lymph nodes in your neck?', category: 'stealthInfections', orderInSection: 6, possibleValues: [0,2,4,6] },
  { text: 'Do you experience vertigo?', category: 'stealthInfections', orderInSection: 7, possibleValues: [0,2,4,6] },
  { text: 'Do you experience chronic ear buzzing, ringing, and/or pain?', category: 'stealthInfections', orderInSection: 8, possibleValues: [0,2,4,6] },
  { text: 'Do you experience "air hunger," where you feel like you\'re suffocating and struggling to breathe?', category: 'stealthInfections', orderInSection: 9, possibleValues: [0,2,4,6] },
  { text: 'Do you experience chronic pelvic or testicular pain?', category: 'stealthInfections', orderInSection: 10, possibleValues: [0,2,4,8] },
  { text: 'Do you notice dark urine with or without blood?', category: 'stealthInfections', orderInSection: 11, possibleValues: [0,2,4,8] },
  { text: 'Do you experience tremors?', category: 'stealthInfections', orderInSection: 12, possibleValues: [0,2,4,8] },
  { text: 'Do you experience persistent, widespread aches and pains?', category: 'stealthInfections', orderInSection: 13, possibleValues: [0,2,4,8] },
  { text: 'Have you ever been diagnosed with a heart murmur, valve prolapse, endocarditis, or myocarditis?', category: 'stealthInfections', orderInSection: 14, possibleValues: [0,2,4,6] },
  { text: 'Have you noticed you have a stretch mark-like rash on your back, arms, legs, or abdomen, but not from being overweight?', category: 'stealthInfections', orderInSection: 15, possibleValues: [0,2,4,6] },
  { text: 'Do you experience pain along your shin bone or in the heels or soles of your feet?', category: 'stealthInfections', orderInSection: 16, possibleValues: [0,2,4,8] },
  { text: 'Do you find yourself disoriented (getting lost, going to wrong places), confused, or forgetful (poor short-term memory)?', category: 'stealthInfections', orderInSection: 17, possibleValues: [0,2,4,8] },
  { text: 'Do you experience flushing, increased heart rate, and faintness with minimal exertion (such as going up a flight of stairs) or at rest?', category: 'stealthInfections', orderInSection: 18, possibleValues: [0,2,4,8] },

  // Nervous System
  { text: 'Do you often feel wired, like you can\'t shut off your mind, yet still feel exhausted?', category: 'nervousSystem', orderInSection: 1, possibleValues: [0,2,4,6] },
  { text: 'Do you have trouble falling asleep (without medication)?', category: 'nervousSystem', orderInSection: 2, possibleValues: [0,2,4,8] },
  { text: 'Do you experience tremors?', category: 'nervousSystem', orderInSection: 3, possibleValues: [0,2,4,8] },
  { text: 'Have you been diagnosed with high blood pressure?', category: 'nervousSystem', orderInSection: 4, possibleValues: [0,2,4,6] },
  { text: 'Have you been told that you have hormone issues?', category: 'nervousSystem', orderInSection: 5, possibleValues: [0,2,4,6] },
  { text: 'Do you find yourself highly sensitive and reactive to your environment, where even minor events or interactions trigger anxiety or panic?', category: 'nervousSystem', orderInSection: 6, possibleValues: [0,2,4,6] },
  { text: 'Do you find yourself overwhelmed, mentally exhausted, and highly emotionally reactive/snippy?', category: 'nervousSystem', orderInSection: 7, possibleValues: [0,2,4,6] },
  { text: 'Did you grow up in a home where you were verbally, physically, or sexually abused?', category: 'nervousSystem', orderInSection: 8, possibleValues: [0,2,4,6] },
  { text: 'Did you grow up with absent parents due to alcoholism, divorce, mental illness, or incarceration?', category: 'nervousSystem', orderInSection: 9, possibleValues: [0,2,4,6] },
  { text: 'Does your drive for perfection or workaholism interfere with your happiness or impact your quality of life?', category: 'nervousSystem', orderInSection: 10, possibleValues: [0,2,4,6] },
  { text: 'Do you have a hard time communicating your needs and/or boundaries?', category: 'nervousSystem', orderInSection: 11, possibleValues: [0,2,4,6] },
  { text: 'Have you been diagnosed with a mood disorder such as anxiety, depression, or bipolar?', category: 'nervousSystem', orderInSection: 12, possibleValues: [0,2,4,6] },
  { text: 'Do you experience heart palpitations, a racing heart while at rest, or occasional skipped beats?', category: 'nervousSystem', orderInSection: 13, possibleValues: [0,2,4,6] },
  { text: 'Do you find it difficult to handle and adjust to stressful situations?', category: 'nervousSystem', orderInSection: 14, possibleValues: [0,2,4,6] },
];

async function main() {
  const password = await bcrypt.hash('TomasTeaserLLC7', 10);

  const doctor = await prisma.doctor.upsert({
    where: { email: 'doctor@healthx.com' },
    update: {},
    create: {
      name: 'Dr. Smith',
      email: 'doctor@healthx.com',
      password,
    },
  });

  const user = await prisma.user.upsert({
    where: { memberId: 'wix-123' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'user@healthx.com',
      memberId: 'wix-123',
    },
  });

  // Seed all questions
  for (const q of questionSeed) {
    await prisma.question.create({
      data: {
        text: q.text,
        category: q.category,
        orderInSection: q.orderInSection,
        possibleValues: q.possibleValues,
      },
    });
  }
  console.log('Seeded all questions');
  console.log({ doctor, user });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect()); 