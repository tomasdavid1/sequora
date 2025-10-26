import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge Case Testing API
 * Run: http://localhost:3000/api/test/edge-cases
 * 
 * Tests realistic messy patient inputs to validate AI behavior
 */

interface EdgeCaseTest {
  input: string;
  category: string;
  expectedPattern?: string;
  expectedAction?: string;
  shouldContain?: string[];
  shouldNotContain?: string[];
  description: string;
}

const EDGE_CASES: EdgeCaseTest[] = [
  // === OFF-TOPIC / QUESTIONS ===
  {
    input: "when can i refill my prescription?",
    category: "off_topic",
    expectedAction: "ASK_MORE",
    shouldContain: ["feeling", "symptoms", "breathing", "chest", "weight"],
    description: "Should redirect to symptom assessment"
  },
  {
    input: "is it normal to gain 3 pounds in a day?",
    category: "indirect_symptom",
    expectedPattern: "gained 3 pounds",
    expectedAction: "FLAG",
    description: "Question implies they DID gain 3 pounds - should escalate"
  },
  {
    input: "should i be worried about my weight?",
    category: "indirect_concern",
    expectedAction: "ASK_MORE",
    shouldContain: ["weight", "change", "gained", "pounds"],
    description: "Should probe for actual weight change"
  },

  // === VAGUE / MINIMIZING ===
  {
    input: "im doing fine just a little chest tightness but its probably nothing",
    category: "minimizing_critical",
    expectedPattern: "chest",
    expectedAction: "FLAG",
    shouldContain: ["nurse", "escalat"],
    description: "Should escalate despite minimization"
  },
  {
    input: "idk just not feeling like myself",
    category: "vague",
    expectedAction: "ASK_MORE",
    shouldContain: ["specifically", "breathing", "chest", "weight", "swelling"],
    description: "Should ask specific symptom questions"
  },
  {
    input: "my breathing is like it was last tuesday",
    category: "unclear_comparison",
    expectedAction: "ASK_MORE",
    shouldContain: ["better", "worse", "same"],
    description: "Should clarify temporal comparison"
  },

  // === EMOTIONAL / BURIED SYMPTOMS ===
  {
    input: "im so frustrated because i cant even walk to my mailbox without getting winded",
    category: "symptom_in_emotion",
    expectedPattern: "breathing",
    expectedAction: "ASK_MORE",
    shouldContain: ["breathing", "shortness"],
    description: "Should extract 'getting winded' = breathing issue"
  },
  {
    input: "im really anxious about my heart and i dont know if these symptoms are real or just anxiety",
    category: "anxiety_vs_symptoms",
    expectedAction: "ASK_MORE",
    shouldContain: ["symptoms", "experiencing", "chest", "breathing"],
    description: "Should assess actual symptoms regardless of anxiety attribution"
  },

  // === TYPOS / INFORMAL ===
  {
    input: "my chets is hurtin rly bad",
    category: "typo_critical",
    expectedPattern: "chest pain",
    expectedAction: "FLAG",
    shouldContain: ["nurse"],
    description: "Should detect chest pain despite typos"
  },
  {
    input: "ngl im feeling kinda off like my chest is weird",
    category: "slang",
    expectedAction: "ASK_MORE",
    shouldContain: ["chest", "describe", "pain", "pressure"],
    description: "Should probe 'chest is weird'"
  },

  // === MULTI-SYMPTOM / RAMBLING ===
  {
    input: "well i was at the store and noticed my ankles were swollen but then my daughter called oh and my weight was up this morning",
    category: "rambling_multi",
    expectedPattern: "swelling",
    expectedAction: "ASK_MORE",
    shouldContain: ["weight", "pounds"],
    description: "Should extract: swelling + weight gain, ask for weight amount"
  },
  {
    input: "my chest hurts and i cant breathe",
    category: "multi_critical",
    expectedPattern: "chest pain",
    expectedAction: "FLAG",
    shouldContain: ["nurse", "immediate"],
    description: "Multiple critical symptoms = immediate escalation"
  },

  // === CONTRADICTORY ===
  {
    input: "gained 5 pounds but i think its just from eating too much salt",
    category: "rationalized_symptom",
    expectedPattern: "gained 5 pounds",
    expectedAction: "FLAG",
    description: "Should escalate despite patient's rationalization"
  },
  {
    input: "i had chest pain this morning but its gone now",
    category: "resolved_critical",
    expectedPattern: "chest pain",
    expectedAction: "FLAG",
    shouldContain: ["nurse"],
    description: "Recent chest pain = escalate even if resolved"
  },

  // === WEIGHT EDGE CASES ===
  {
    input: "gained some weight",
    category: "vague_weight",
    expectedPattern: "gained weight",
    expectedAction: "ASK_MORE",
    shouldContain: ["how many pounds", "pounds"],
    description: "Should ask for specific amount"
  },
  {
    input: "up like 3 or 4 lbs idk",
    category: "uncertain_number",
    expectedPattern: "gained",
    expectedAction: "FLAG",
    description: "Should escalate even with uncertainty ('3 or 4' >= 3)"
  },
  {
    input: "gained 2 pounds",
    category: "below_threshold",
    expectedAction: "ASK_MORE",
    shouldNotContain: ["nurse", "escalat"],
    description: "2 pounds below threshold - should monitor but not escalate"
  },

  // === OFF-TOPIC NON-HF ===
  {
    input: "my back hurts from gardening",
    category: "non_hf_symptom",
    expectedAction: "ASK_MORE",
    shouldContain: ["breathing", "chest", "weight", "swelling"],
    description: "Back pain not HF-related - should redirect to HF symptoms"
  },

  // === TEMPORAL AMBIGUITY ===
  {
    input: "i gained weight recently",
    category: "vague_time",
    expectedAction: "ASK_MORE",
    shouldContain: ["how many", "pounds"],
    description: "Needs: how much weight? how recently?"
  }
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const runTests = searchParams.get('run') === 'true';
  const category = searchParams.get('category');

  // Filter by category if specified
  let testsToRun = EDGE_CASES;
  if (category) {
    testsToRun = EDGE_CASES.filter(t => t.category === category);
  }

  if (!runTests) {
    // Just list the tests
    return NextResponse.json({
      message: "Edge case tests available",
      totalTests: testsToRun.length,
      categories: [...new Set(EDGE_CASES.map(t => t.category))],
      tests: testsToRun.map(t => ({
        input: t.input,
        category: t.category,
        description: t.description
      })),
      usage: "Add ?run=true to execute tests, ?category=X to filter"
    });
  }

  // Run the tests
  const results = [];
  
  for (const test of testsToRun) {
    const startTime = Date.now();
    
    try {
      // Call the parse endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/toc/models/openai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'parse_patient_input',
          input: {
            patientInput: test.input,
            condition: 'HF',
            riskLevel: 'MEDIUM',
            patterns: [] // Will be populated by the endpoint
          }
        })
      });

      const parseResult = await response.json();
      const duration = Date.now() - startTime;

      // Validate expectations
      const validations: Record<string, boolean> = {};

      if (test.expectedPattern) {
        validations.patternMatch = parseResult.normalized_text?.includes(test.expectedPattern) || false;
      }

      if (test.shouldContain) {
        validations.containsKeywords = test.shouldContain.every((keyword: string) => 
          JSON.stringify(parseResult).toLowerCase().includes(keyword.toLowerCase())
        );
      }

      if (test.shouldNotContain) {
        validations.doesNotContainKeywords = !test.shouldNotContain.some((keyword: string) =>
          JSON.stringify(parseResult).toLowerCase().includes(keyword.toLowerCase())
        );
      }

      const passed = Object.values(validations).every(v => v === true);

      results.push({
        input: test.input,
        category: test.category,
        description: test.description,
        passed,
        duration: `${duration}ms`,
        parsed: {
          normalized_text: parseResult.normalized_text,
          symptoms: parseResult.symptoms,
          severity: parseResult.severity,
          confidence: parseResult.confidence
        },
        validations,
        expectedAction: test.expectedAction,
        raw: parseResult
      });

    } catch (error) {
      results.push({
        input: test.input,
        category: test.category,
        description: test.description,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    byCategory: {} as Record<string, { total: number; passed: number }>
  };

  results.forEach(r => {
    if (!summary.byCategory[r.category]) {
      summary.byCategory[r.category] = { total: 0, passed: 0 };
    }
    summary.byCategory[r.category].total++;
    if (r.passed) {
      summary.byCategory[r.category].passed++;
    }
  });

  return NextResponse.json({
    summary,
    results,
    timestamp: new Date().toISOString()
  }, { 
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

