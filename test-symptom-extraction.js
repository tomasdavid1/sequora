// Test Symptom Extraction
// Run with: node test-symptom-extraction.js

function extractSymptoms(input, condition) {
  const symptoms = [];
  const lowerInput = input.toLowerCase();
  
  if (condition === 'HF') {
    // Chest pain detection
    if ((lowerInput.includes('chest') && lowerInput.includes('pain')) || 
        (lowerInput.includes('pain') && lowerInput.includes('chest')) ||
        lowerInput.includes('chest pressure') ||
        lowerInput.includes('chest discomfort') ||
        lowerInput.includes('heart pain')) {
      symptoms.push('chest pain');
    }
    
    // Breathing
    if (lowerInput.includes('breath') || lowerInput.includes('shortness')) {
      symptoms.push('shortness_of_breath');
    }
    
    // Weight
    if (lowerInput.includes('weight') || lowerInput.includes('gain')) {
      symptoms.push('weight_gain');
    }
  }
  
  return symptoms;
}

function matchesPattern(patterns, input, symptoms) {
  const combinedText = `${input.toLowerCase()} ${symptoms.join(' ').toLowerCase()}`;
  return patterns.some(pattern => combinedText.includes(pattern.toLowerCase()));
}

// Test cases
const testCases = [
  {
    input: "im feeling pain in my chest",
    condition: "HF",
    expectedSymptoms: ["chest pain"],
    patterns: ["chest pain", "chest pressure"],
    shouldMatch: true
  },
  {
    input: "my chest hurts",
    condition: "HF",
    expectedSymptoms: ["chest pain"],
    patterns: ["chest pain", "chest hurt"],
    shouldMatch: true
  },
  {
    input: "i have chest pressure",
    condition: "HF",
    expectedSymptoms: ["chest pain"],
    patterns: ["chest pain", "chest pressure"],
    shouldMatch: true
  },
  {
    input: "i am doing well",
    condition: "HF",
    expectedSymptoms: [],
    patterns: ["chest pain"],
    shouldMatch: false
  }
];

console.log('🧪 Testing Symptom Extraction & Pattern Matching\n');

testCases.forEach((test, i) => {
  const extracted = extractSymptoms(test.input, test.condition);
  const matches = matchesPattern(test.patterns, test.input, extracted);
  
  const pass = 
    JSON.stringify(extracted) === JSON.stringify(test.expectedSymptoms) &&
    matches === test.shouldMatch;
  
  console.log(`Test ${i + 1}: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Extracted: [${extracted.map(s => `"${s}"`).join(', ')}]`);
  console.log(`  Expected: [${test.expectedSymptoms.map(s => `"${s}"`).join(', ')}]`);
  console.log(`  Patterns: [${test.patterns.map(p => `"${p}"`).join(', ')}]`);
  console.log(`  Matches: ${matches} (expected: ${test.shouldMatch})`);
  console.log('');
});

