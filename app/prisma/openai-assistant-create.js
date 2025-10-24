const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const apiKey = process.env.OPEN_API_KEY;
if (!apiKey) {
  console.error('OPEN_API_KEY not set in .env');
  process.exit(1);
}

const kbDir = path.join(process.cwd(), 'kb');
const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.txt'));
if (!files.length) {
  console.error('No .txt files found in /kb');
  process.exit(1);
}

// Concatenate all file contents with headers
let kbContent = '';
for (const file of files) {
  const filePath = path.join(kbDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  kbContent += `\n--- [${file}] ---\n` + content + '\n';
}

const ASSISTANT_PROMPT = `You are a root-cause wellness AI. Here are your sources of knowledge:${kbContent}\nUse these sources to generate personalized, holistic treatment plans for users based on their health answers. Always reference the latest knowledge.`;

async function main() {
  // Create assistant with prompt-stuffed instructions
  let assistantId = null;
  try {
    const openaiRes = await axios.post('https://api.openai.com/v1/assistants', {
      name: 'HealthX AI',
      instructions: ASSISTANT_PROMPT,
      tools: [],
      model: 'gpt-4-1106-preview',
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
    });
    const openaiAssistant = openaiRes.data;
    assistantId = openaiAssistant.id;
    console.log('Assistant created:', assistantId);
    // Store in DB
    const assistant = await prisma.assistant.create({
      data: {
        openaiId: assistantId,
        name: 'HealthX AI',
        prompt: ASSISTANT_PROMPT,
        filePaths: files,
      },
    });
    console.log('Assistant stored in DB:', assistant.id);
  } catch (e) {
    console.error('Assistant creation failed:', e.response?.data || e.message);
    process.exit(1);
  }
}

main().then(() => process.exit(0)); 