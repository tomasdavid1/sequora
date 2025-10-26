# Protocol System Architecture

## 🎯 Overview

The protocol system uses a **two-layer AI interpretation** approach to detect critical symptoms and trigger appropriate escalations.

## 📊 System Flow

```
User Input: "im feeling pain in my chest"
        ↓
┌─────────────────────────────────────────────┐
│ LAYER 1: AI Symptom Extraction             │
│ Location: parsePatientInputWithProtocol()  │
│ File: interaction/route.ts (line ~390)     │
│                                             │
│ Input: "im feeling pain in my chest"       │
│ AI extracts: ["chest pain"]                │
│ Output: ParsedResponse {                   │
│   symptoms: ["chest pain"],                │
│   rawInput: "im feeling pain in my chest", │
│   ...                                       │
│ }                                           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ LAYER 2: Protocol Rule Matching            │
│ Location: evaluateRulesDSL()               │
│ File: interaction/route.ts (line ~421)     │
│                                             │
│ 1. Load Protocol Config from DB            │
│    SELECT protocol_config                  │
│    FROM ProtocolAssignment                 │
│    WHERE episode_id = ?                    │
│                                             │
│ 2. Get rules from config:                  │
│    rules.red_flags[].if.any_text          │
│                                             │
│ 3. Match against BOTH:                     │
│    - Raw input: "im feeling pain..."       │
│    - Extracted symptoms: "chest pain"      │
│                                             │
│ 4. Match Found!                            │
│    Pattern: "chest pain" ✅                │
│    Rule: HF_CHEST_PAIN                     │
│    Severity: critical                      │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ LAYER 3: Forced Escalation                 │
│ Location: Interaction handler              │
│ File: interaction/route.ts (line ~132)     │
│                                             │
│ if (decisionHint.action === 'FLAG') {      │
│   // Skip AI, force tool call              │
│   toolName = 'handoff_to_nurse'           │
│   response = "Nurse will contact you..."   │
│ }                                           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ LAYER 4: Database Recording                │
│ Location: handleHandoffToNurse()           │
│                                             │
│ INSERT INTO EscalationTask                 │
│   severity: CRITICAL                       │
│   priority: URGENT                         │
│   reason_codes: ['HF_CHEST_PAIN', ...]    │
│   sla_due_at: NOW() + 30 minutes           │
└─────────────────────────────────────────────┘
```

## 🔍 Protocol Rules Configuration

### Current Rules for HF (Heart Failure)

```json
{
  "red_flags": [
    {
      "if": {
        "any_text": [
          "chest pain",
          "chest pressure", 
          "chest discomfort",
          "heart pain",
          "chest hurt"
        ]
      },
      "flag": {
        "type": "HF_CHEST_PAIN",
        "severity": "critical",
        "message": "Chest pain reported - possible cardiac event",
        "action": "handoff_to_nurse"
      }
    },
    {
      "if": {
        "any_text": [
          "cant breathe",
          "cannot breathe",
          "trouble breathing",
          "hard to breathe",
          "shortness of breath",
          "breathing worse"
        ]
      },
      "flag": {
        "type": "HF_BREATHING_WORSE",
        "severity": "critical",
        "message": "Significant breathing difficulty",
        "action": "handoff_to_nurse"
      }
    },
    {
      "if": {
        "any_text": [
          "gained weight",
          "weight up",
          "weight gain",
          "3 pounds",
          "5 pounds"
        ]
      },
      "flag": {
        "type": "HF_WEIGHT_GAIN",
        "severity": "high",
        "message": "Significant weight gain",
        "action": "raise_flag"
      }
    }
  ],
  "closures": [
    {
      "if": {
        "any_text": [
          "feeling good",
          "doing well",
          "feeling great",
          "no problems",
          "all good",
          "fine"
        ]
      },
      "then": {
        "action": "log_checkin",
        "message": "Patient stable and doing well"
      }
    }
  ]
}
```

## 🔧 How AI Interpretation Works

### Step 1: User Input Examples

| User Says | AI Extracts | Pattern Matches |
|-----------|-------------|----------------|
| "im feeling pain in my chest" | `symptoms: ["chest pain"]` | ✅ "chest pain" |
| "my chest hurts" | `symptoms: ["chest pain"]` | ✅ "chest hurt" |
| "i have chest pressure" | `symptoms: ["chest pain"]` | ✅ "chest pressure" |
| "hard to breathe" | `symptoms: ["breathing difficulty"]` | ✅ "hard to breathe" |
| "gained 5 pounds" | `symptoms: ["weight_gain"]` | ✅ "5 pounds" |

### Step 2: Symptom Extraction Logic

**Location:** `extractSymptoms()` function (line ~850)

```typescript
function extractSymptoms(input: string, condition: string): string[] {
  const symptoms = [];
  const lowerInput = input.toLowerCase();
  
  if (condition === 'HF') {
    // CRITICAL: Chest pain detection (flexible matching)
    if ((lowerInput.includes('chest') && lowerInput.includes('pain')) || 
        (lowerInput.includes('pain') && lowerInput.includes('chest')) ||
        lowerInput.includes('chest pressure') ||
        lowerInput.includes('chest discomfort') ||
        lowerInput.includes('heart pain')) {
      symptoms.push('chest pain');
    }
    
    // Breathing symptoms
    if (lowerInput.includes('breath') || lowerInput.includes('shortness')) {
      symptoms.push('shortness_of_breath');
    }
    
    // ... more conditions
  }
  
  return symptoms;
}
```

### Step 3: Rule Evaluation

**Location:** `evaluateRuleCondition()` function (line ~458)

```typescript
function evaluateRuleCondition(condition: Record<string, unknown>, parsedResponse: any): boolean {
  if (condition.any_text && Array.isArray(condition.any_text)) {
    const inputText = parsedResponse.rawInput?.toLowerCase() || '';
    const extractedSymptoms = (parsedResponse.symptoms || []).join(' ').toLowerCase();
    const combinedText = `${inputText} ${extractedSymptoms}`;
    
    // Check if ANY pattern matches
    return (condition.any_text as string[]).some((text: string) => 
      combinedText.includes(text.toLowerCase())
    );
  }
}
```

**Why check BOTH raw input AND extracted symptoms?**
- **Raw input matching**: Catches exact phrases ("chest pain")
- **Extracted symptoms**: Catches interpreted phrases ("pain in my chest" → "chest pain")
- **Combined approach**: Maximum sensitivity for critical symptoms

## 📝 Adding New Rules

### Option 1: Via SQL (Recommended)

```sql
-- Add new rule to ProtocolContentPack
UPDATE "ProtocolContentPack"
SET content_data = jsonb_set(
  content_data,
  '{red_flags}',
  content_data->'red_flags' || jsonb_build_array(
    jsonb_build_object(
      'if', jsonb_build_object(
        'any_text', jsonb_build_array(
          'dizzy', 'dizziness', 'lightheaded', 'faint'
        )
      ),
      'flag', jsonb_build_object(
        'type', 'HF_DIZZINESS',
        'severity', 'high',
        'message', 'Dizziness reported',
        'action', 'raise_flag'
      )
    )
  )
)
WHERE condition_code = 'HF'
  AND education_level = 'medium'
  AND content_type = 'PROTOCOL_RULES';

-- Refresh protocol assignments
UPDATE "ProtocolAssignment"
SET protocol_config = get_protocol_config(condition_code::condition_code, education_level),
    updated_at = NOW()
WHERE condition_code = 'HF';
```

### Option 2: Via Code

Edit `supabase/seeds/006_protocol_rules.sql` and add to the `red_flags` array.

## 🎨 Severity Levels

| Severity | SLA | Action | Example |
|----------|-----|--------|---------|
| `critical` | 30 min | `handoff_to_nurse` | Chest pain, severe breathing |
| `high` | 2 hours | `raise_flag` | Weight gain, moderate symptoms |
| `moderate` | 4 hours | `raise_flag` | Mild swelling, missed meds |
| `low` | 8 hours | `log_checkin` | General questions |

## 🔍 Debugging

### Check Current Rules

```sql
-- See what rules are active for a patient
SELECT 
  jsonb_pretty(protocol_config -> 'rules') as active_rules
FROM "ProtocolAssignment"
WHERE condition_code = 'HF' AND is_active = true;
```

### Check Rule Matching

```sql
-- See all pattern matches for HF
SELECT 
  jsonb_array_elements(content_data -> 'red_flags') -> 'if' -> 'any_text' as patterns,
  jsonb_array_elements(content_data -> 'red_flags') -> 'flag' ->> 'type' as rule_type
FROM "ProtocolContentPack"
WHERE condition_code = 'HF' AND content_type = 'PROTOCOL_RULES';
```

### Terminal Logs to Watch

```bash
# When a message is sent, look for:
🤖 [AI Generation] Decision hint: { action: 'FLAG', ... }
🚨 [Interaction] CRITICAL FLAG TRIGGERED
🚨 Flag Type: HF_CHEST_PAIN
🚨 Severity: critical
🚨 [Interaction] Forced tool call: handoff_to_nurse
✅ [Handoff] Escalation task created: <uuid>
```

## 🚀 Next Steps

### Recommended Improvements

1. **Use OpenAI for symptom extraction** (structured output)
   - Replace regex-based `extractSymptoms()` with GPT-4 call
   - Request structured JSON output: `{ "symptoms": ["chest_pain"], "severity": "high" }`
   
2. **Make patterns configurable per education level**
   - Low: "hurts", "bad"
   - Medium: "pain", "discomfort"
   - High: "angina", "dyspnea"

3. **Add condition-specific rules**
   - Pull rules from `RedFlagRule` table dynamically
   - Support complex conditions: `if: { pain_score_gte: 7, AND: { symptom: "chest_pain" } }`

4. **Track rule effectiveness**
   - Log which rules triggered which escalations
   - Analytics: false positive rate, response times

## 📚 Related Files

- **Main logic**: `app/api/toc/agents/core/interaction/route.ts`
- **Protocol rules**: `supabase/seeds/006_protocol_rules.sql`
- **Database schema**: `supabase/migrations/20250126000000_protocol_content_and_chest_pain.sql`
- **Red flag rules**: `supabase/seeds/001_toc_initial_data.sql`

