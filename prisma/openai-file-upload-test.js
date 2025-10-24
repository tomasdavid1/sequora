const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

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

const filePath = path.join(kbDir, files[0]);
console.log('Uploading file:', filePath, fs.existsSync(filePath));

async function uploadFile() {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('purpose', 'assistants');
  try {
    const res = await axios.post('https://api.openai.com/v1/files', form, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    console.log('Upload success:', res.data);
  } catch (e) {
    console.error('Upload failed:', e.response?.data || e.message);
  }
}

uploadFile(); 