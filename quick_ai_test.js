const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function quickAITest() {
  console.log('🧪 Quick AI Response Test');
  console.log('='.repeat(30));
  
  try {
    // Create a simple test submission
    const questionsResponse = await fetch(`${BASE_URL}/api/questions`);
    const questionsData = await questionsResponse.json();
    
    // Create basic answers (moderate inflammation profile)
    const answers = [];
    let count = 0;
    
    questionsData.sections.forEach(section => {
      section.questions.forEach(question => {
        if (count < 20) { // Just 20 answers for quick test
          answers.push({
            questionId: question.id,
            answer: '4' // Moderate level
          });
          count++;
        }
      });
    });
    
    console.log(`📝 Created ${answers.length} answers`);
    
    // Submit questionnaire
    const submissionResponse = await fetch(`${BASE_URL}/api/questionnaire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: 'quick-test-' + Date.now(), 
        answers 
      })
    });
    
    if (!submissionResponse.ok) {
      throw new Error(`Submission failed: ${submissionResponse.status}`);
    }
    
    const submission = await submissionResponse.json();
    console.log(`✅ Submission created: ${submission.id}`);
    
    // Get assistant
    const assistantResponse = await fetch(`${BASE_URL}/api/assistant`);
    const assistant = await assistantResponse.json();
    console.log(`🤖 Using assistant: ${assistant.id}`);
    
    // Generate treatment
    console.log('🔄 Generating AI treatment plan...');
    const treatmentResponse = await fetch(`${BASE_URL}/api/thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistantId: assistant.id,
        userId: submission.userId
      })
    });
    
    if (!treatmentResponse.ok) {
      const error = await treatmentResponse.text();
      console.error('❌ Treatment generation failed:', error);
      return;
    }
    
    const result = await treatmentResponse.json();
    console.log('✅ Treatment generated successfully!');
    
    // Check if we got an AI response
    if (result.aiResponse) {
      console.log('\n🎉 AI RESPONSE RECEIVED!');
      console.log('='.repeat(40));
      
      console.log('\n📋 SUMMARY:');
      console.log(result.aiResponse.summary || 'No summary provided');
      
      if (result.aiResponse.root_protocol && result.aiResponse.root_protocol.length > 0) {
        console.log('\n💊 ROOT PROTOCOL:');
        result.aiResponse.root_protocol.forEach((item, index) => {
          console.log(`${index + 1}. ${item.name} - ${item.dosage} (${item.frequency})`);
          console.log(`   Purpose: ${item.purpose}`);
        });
      }
      
      if (result.aiResponse.vitamins && result.aiResponse.vitamins.length > 0) {
        console.log('\n🌿 VITAMINS:');
        result.aiResponse.vitamins.forEach((item, index) => {
          console.log(`${index + 1}. ${item.name} - ${item.dosage} (${item.frequency})`);
          console.log(`   Purpose: ${item.purpose}`);
        });
      }
      
      console.log('\n🍽️  DIETARY RECOMMENDATIONS:');
      console.log(result.aiResponse.dietary_recommendations || 'None provided');
      
      console.log('\n⚠️  DISCLAIMER:');
      console.log(result.aiResponse.disclaimer || 'None provided');
      
      // Quick validation
      console.log('\n🧪 QUICK VALIDATION:');
      const hasAllFields = ['summary', 'root_protocol', 'vitamins', 'dietary_recommendations', 'disclaimer']
        .every(field => result.aiResponse.hasOwnProperty(field));
      console.log(`✅ All required fields present: ${hasAllFields}`);
      
      const hasValidStructure = Array.isArray(result.aiResponse.root_protocol) && 
                               Array.isArray(result.aiResponse.vitamins);
      console.log(`✅ Valid array structures: ${hasValidStructure}`);
      
      const protocolCount = result.aiResponse.root_protocol?.length || 0;
      const vitaminCount = result.aiResponse.vitamins?.length || 0;
      console.log(`📊 Protocol items: ${protocolCount}, Vitamin items: ${vitaminCount}`);
      
      console.log('\n🎯 AI IS WORKING AND RESPONDING!');
      
    } else {
      console.log('\n⚠️  No AI response in result');
      console.log('Raw result:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('rate_limit_exceeded') || error.message.includes('quota')) {
      console.log('\n💡 This appears to be a quota/rate limit issue.');
      console.log('   Please check your OpenAI billing and try again later.');
    }
  }
}

// Run the test
quickAITest(); 