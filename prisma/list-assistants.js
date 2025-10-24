const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const apiKey = process.env.OPEN_API_KEY;

if (!apiKey) {
  console.error('OPEN_API_KEY not set in .env');
  process.exit(1);
}

async function main() {
  try {
    console.log('Listing all assistants from OpenAI...');
    const listRes = await axios.get('https://api.openai.com/v1/assistants', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });
    
    const assistants = listRes.data.data;
    console.log(`Found ${assistants.length} assistants on OpenAI:`);
    
    assistants.forEach((assistant, index) => {
      console.log(`${index + 1}. ID: ${assistant.id}`);
      console.log(`   Name: ${assistant.name}`);
      console.log(`   Model: ${assistant.model}`);
      console.log(`   Created: ${new Date(assistant.created_at * 1000).toISOString()}`);
      console.log('');
    });

    // Also show what's in our database
    console.log('Assistants in database:');
    const dbAssistants = await prisma.assistant.findMany();
    dbAssistants.forEach((assistant, index) => {
      console.log(`${index + 1}. DB ID: ${assistant.id}`);
      console.log(`   OpenAI ID: ${assistant.openaiId}`);
      console.log(`   Name: ${assistant.name}`);
      console.log(`   Created: ${assistant.createdAt.toISOString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error listing assistants:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 