# Protocol Rules Management Guide

## Overview
Protocol rules are now **risk-based**, not education-based. The risk of readmission determines which rules are active.

## Rule Sources

### 1. ProtocolContentPack (JSON Rules)
- Located in database table `ProtocolContentPack`
- Used by `get_protocol_config()` function
- Structure:
```json
{
  "condition_code": "HF",
  "rule_code": "HF_CHEST_PAIN",
  "rule_type": "RED_FLAG",
  "conditions": {
    "any_text": ["chest pain", "chest pressure", "chest discomfort"]
  },
  "actions": {
    "type": "HF_CHEST_PAIN",
    "action": "handoff_to_nurse",
    "message": "Chest pain reported",
    "severity": "critical"
  }
}
```

### 2. RedFlagRule (Database Rules)
- Located in database table `RedFlagRule`
- More detailed, with specific actions like `ED_REFERRAL`, `NURSE_CALLBACK_2H`
- Used for reference and reporting

## How Risk Levels Filter Rules

| Risk Level | Rules Active | Rationale |
|------------|--------------|-----------|
| **HIGH** | ALL (CRITICAL + HIGH + MODERATE + LOW) | Complex patients need maximum monitoring |
| **MEDIUM** | CRITICAL + HIGH | Standard patients get critical + important rules |
| **LOW** | CRITICAL only | Stable patients only need critical symptom detection |

### Example: HF Chest Pain

For the same symptom (chest pain), different risk levels trigger different responses:

```
HIGH risk patient:
  - Detects: "chest pain", "chest discomfort", "chest tightness", "chest aches"
  - Action: Immediate handoff_to_nurse
  - Confidence threshold: 70%

MEDIUM risk patient:
  - Detects: "chest pain", "chest pressure", "heart pain"
  - Action: Immediate handoff_to_nurse
  - Confidence threshold: 80%

LOW risk patient:
  - Detects: "severe chest pain", "crushing chest pain"
  - Action: handoff_to_nurse (but higher bar to trigger)
  - Confidence threshold: 85%
```

## Rule Severity Levels

### CRITICAL
- **Always active** for all risk levels
- Life-threatening symptoms
- Examples:
  - Chest pain (cardiac event)
  - Severe breathing difficulty
  - Loss of consciousness
  - Severe bleeding

### HIGH
- **Active for MEDIUM and HIGH risk**
- Serious symptoms requiring rapid response
- Examples:
  - Significant weight gain (5+ lbs)
  - Worsening shortness of breath
  - New/worsening swelling
  - Medication side effects

### MODERATE
- **Active for HIGH risk only**
- Important symptoms, less urgent
- Examples:
  - Mild swelling
  - Slight breathing difficulty
  - Sleep disturbances
  - Minor fatigue

### LOW
- **Active for HIGH risk only**
- Educational/informational
- Examples:
  - Medication adherence questions
  - Diet questions
  - General wellness

## How to Add New Rules

### 1. Add to ProtocolContentPack (for AI matching)
```sql
INSERT INTO public."ProtocolContentPack" (
  condition_code,
  rule_code,
  rule_type,
  conditions,
  actions,
  active
) VALUES (
  'HF',
  'HF_DIZZINESS',
  'RED_FLAG',
  '{"any_text": ["dizzy", "dizziness", "lightheaded", "room spinning"]}'::jsonb,
  '{"type": "HF_DIZZINESS", "action": "raise_flag", "message": "Dizziness reported", "severity": "high"}'::jsonb,
  true
);
```

### 2. Add to RedFlagRule (for reference/reporting)
```sql
INSERT INTO public."RedFlagRule" (
  condition_code,
  rule_code,
  severity,
  description,
  action_hint,
  active
) VALUES (
  'HF',
  'HF_DIZZINESS',
  'HIGH',
  'Dizziness or lightheadedness - possible low blood pressure',
  'NURSE_CALLBACK_2H',
  true
);
```

## DO NOT Create Education-Specific Rules

❌ **BAD** (Education-specific):
```
HF_LOW_CHEST_PAIN    // For low education patients
HF_MED_CHEST_PAIN    // For medium education patients
HF_HIGH_CHEST_PAIN   // For high education patients
```

✅ **GOOD** (Risk-based with education for communication):
```
HF_CHEST_PAIN        // Generic rule, severity determines risk levels
  severity: CRITICAL → All risk levels see this
  
AI uses education_level to adjust communication:
  - Low education: "Are you having chest pain or tightness?"
  - High education: "Are you experiencing angina or chest discomfort?"
```

## Migration Plan

### Phase 1: Database Cleanup (Complete)
✅ Add risk_level to Episode and ProtocolAssignment
✅ Update get_protocol_config to use risk_level
✅ Deactivate education-specific rules

### Phase 2: Rule Review (TODO)
- [ ] Audit all active rules
- [ ] Verify severities match intended risk levels
- [ ] Remove duplicate rules
- [ ] Add missing critical symptoms

### Phase 3: Risk Calculation (Future)
- [ ] Implement automatic risk calculation from discharge summary
- [ ] Use Elixhauser score, comorbidities, social factors
- [ ] Allow manual override by nurses

## Testing Protocol Rules

Use the AI Tester Protocol Profile to verify:
1. Correct risk level is assigned
2. Only appropriate rules are active for that risk level
3. Education level only affects language, not rules
4. Confidence thresholds match risk level

Example test scenarios:
```
HIGH risk HF patient:
  - Should see 15+ active rules (all severities)
  - Confidence threshold: 70%
  - Check-in frequency: 12h

MEDIUM risk HF patient:
  - Should see 8-10 active rules (critical + high)
  - Confidence threshold: 80%
  - Check-in frequency: 24h

LOW risk HF patient:
  - Should see 3-4 active rules (critical only)
  - Confidence threshold: 85%
  - Check-in frequency: 48h
```

## Summary

**Old System (Education-Based)**:
- 3 versions of each rule (low/med/high education)
- Education level determined which medical protocols
- Confusing and hard to maintain

**New System (Risk-Based)**:
- 1 version of each rule
- Risk level determines which rules are active
- Education level only affects AI communication style
- Clear severity hierarchy: CRITICAL → HIGH → MODERATE → LOW
- Easier to maintain and more clinically appropriate

