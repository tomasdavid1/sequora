// Test script for mock SMS functionality
// Run with: node test-mock-sms.js

const testMockSMS = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Mock SMS Service...\n');
  
  try {
    // Test 1: Send a mock SMS
    console.log('1. Sending mock SMS...');
    const smsResponse = await fetch(`${baseUrl}/api/toc/mock-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '+1234567890',
        message: 'Hi! This is your care team checking in. How are you feeling today?',
        patientId: 'test-patient-123',
        episodeId: 'test-episode-456'
      })
    });
    
    const smsResult = await smsResponse.json();
    console.log('✅ SMS Result:', smsResult);
    
    // Test 2: Send a mock voice call
    console.log('\n2. Sending mock voice call...');
    const voiceResponse = await fetch(`${baseUrl}/api/toc/mock-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '+1234567890',
        patientId: 'test-patient-123',
        episodeId: 'test-episode-456',
        script: 'Hello, this is your care team calling to check on your recovery. How are you feeling?',
        condition: 'HF'
      })
    });
    
    const voiceResult = await voiceResponse.json();
    console.log('✅ Voice Result:', voiceResult);
    
    // Test 3: Test the orchestrator
    console.log('\n3. Testing orchestrator...');
    const orchestratorResponse = await fetch(`${baseUrl}/api/toc/orchestrator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'INITIATE_OUTREACH',
        patientId: 'test-patient-123',
        episodeId: 'test-episode-456',
        channel: 'SMS',
        condition: 'HF'
      })
    });
    
    const orchestratorResult = await orchestratorResponse.json();
    console.log('✅ Orchestrator Result:', orchestratorResult);
    
    // Test 4: Test patient response processing with real OpenAI
    console.log('\n4. Testing patient response processing with OpenAI...');
    const interactionResponse = await fetch(`${baseUrl}/api/toc/agents/core/interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'test-patient-123',
        episodeId: 'test-episode-456',
        patientInput: 'I have shortness of breath and gained 3 pounds',
        condition: 'HF'
      })
    });
    
    const interactionResult = await interactionResponse.json();
    console.log('✅ Interaction Result:', interactionResult);
    
    // Test 5: Test OpenAI model layer directly
    console.log('\n5. Testing OpenAI model layer directly...');
    const openaiResponse = await fetch(`${baseUrl}/api/toc/models/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'generate_response',
        input: {
          condition: 'HF',
          patientResponses: 'I have chest pain and feel dizzy',
          context: 'Patient reporting concerning symptoms',
          responseType: 'patient_response'
        }
      })
    });
    
    const openaiResult = await openaiResponse.json();
    console.log('✅ OpenAI Result:', openaiResult);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📱 Check the console logs in your Next.js app to see the mock SMS/Voice messages.');
    console.log('🔗 Visit http://localhost:3000/toc/dev/communications to see the development dashboard.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testMockSMS();
