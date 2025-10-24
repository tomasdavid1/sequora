const OpenAI = require('openai');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function createAssistant() {
  try {
    // First, try to read the knowledge base files
    const kbDir = path.join(__dirname, '..', 'kb');
    const files = fs.readdirSync(kbDir).filter(file => file.endsWith('.txt'));
    
    console.log('Found knowledge base files:', files);
    
    // Upload files to OpenAI
    const fileIds = [];
    for (const fileName of files) {
      const filePath = path.join(kbDir, fileName);
      console.log(`Uploading ${fileName}...`);
      
      const file = await openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: 'assistants',
      });
      
      fileIds.push(file.id);
      console.log(`Uploaded ${fileName} with ID: ${file.id}`);
    }

    // Create the assistant
    const assistant = await openai.beta.assistants.create({
      name: 'HealthX AI',
      instructions: `You are a functional medicine practitioner AI for HealthX, specialized in creating personalized treatment plans based on patient assessment responses.

Your role is to analyze health assessment data and provide comprehensive, evidence-based treatment recommendations that include:
1. Root cause protocols (supplements, lifestyle interventions)
2. Targeted vitamins and minerals with specific dosages
3. Dietary recommendations based on individual symptoms
4. A clear explanation of the treatment rationale

Always provide responses in the exact JSON format requested, and ensure all recommendations are safe, evidence-based, and appropriate for the individual's symptom profile.`,
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: []
        }
      },
      model: 'gpt-4o',
      temperature: 0.3,
    });

    console.log('Created assistant:', assistant.id);
    
    // If we have files, create a vector store and attach them
    if (fileIds.length > 0) {
      const vectorStore = await openai.beta.vectorStores.create({
        name: 'HealthX AI Knowledge Base',
        file_ids: fileIds,
      });
      
      console.log('Created vector store:', vectorStore.id);
      
      // Update the assistant with the vector store
      await openai.beta.assistants.update(assistant.id, {
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStore.id]
          }
        }
      });
      
      console.log('Updated assistant with vector store');
    }
    
    // Check if we need to update any existing assistants
    const listRes = await openai.beta.assistants.list();
    const existingAssistants = listRes.data.data.filter(a => a.name === 'HealthX AI');
    
    if (existingAssistants.length > 1) {
      console.log('Found existing HealthX AI assistant:', assistant.id);
      // You might want to delete the old one or update it
    }

    return assistant;
    
  } catch (error) {
    console.error('Error creating assistant:', error);
  }
}

// Run the function
createAssistant().then(assistant => {
  console.log('Assistant created successfully!');
  console.log('Assistant ID:', assistant?.id);
}).catch(console.error); 