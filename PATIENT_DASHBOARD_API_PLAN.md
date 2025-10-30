# Patient Dashboard API Integration Plan

## Current Status
The Patient Dashboard is fully responsive and uses a unified InteractionHistory component, but currently displays **mock data**. This document outlines the API endpoints needed to make it fully dynamic.

## Required API Endpoints

### 1. Patient Profile & Episode Data
```
GET /api/toc/patient/me
```
**Returns:**
- Patient data (from Patient table where auth_user_id matches current user)
- Active Episode data (most recent episode for the patient)
- Discharge date, condition_code, risk_level, education_level

**Used for:**
- Header: Patient name
- Stats cards: Condition, Last check-in, Next check-in
- Tab content filtering

---

### 2. Medications
```
GET /api/toc/patient/me/medications
```
**Data Source:** `Episode.medications` (JSONB field) or `EpisodeMedication` table

**Returns:**
```json
{
  "medications": [
    {
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "once daily",
      "instructions": "Take in the morning"
    }
  ]
}
```

**Used for:** Medications tab

---

### 3. Check-in History (Interactions)
```
GET /api/toc/patient/me/interactions
```
**Data Source:** `AgentInteraction` table with `AgentMessage` records

**Query:**
```sql
SELECT ai.*, array_agg(am.*) as messages
FROM "AgentInteraction" ai
LEFT JOIN "AgentMessage" am ON am.agent_interaction_id = ai.id
WHERE ai.patient_id = (SELECT id FROM "Patient" WHERE auth_user_id = $current_user_id)
ORDER BY ai.started_at DESC
```

**Returns:**
```json
{
  "interactions": [
    {
      "id": "uuid",
      "started_at": "2025-01-20T10:30:00Z",
      "status": "COMPLETED",
      "summary": "Auto-generated summary of conversation",
      "episode": { "condition_code": "HF" },
      "messages": [
        {
          "role": "AGENT",
          "content": "How are you feeling today?",
          "created_at": "2025-01-20T10:30:00Z"
        },
        {
          "role": "PATIENT",
          "content": "I feel good",
          "created_at": "2025-01-20T10:31:00Z"
        }
      ]
    }
  ]
}
```

**Used for:** Check-in History tab (via InteractionHistory component)

---

### 4. Education Content
```
GET /api/toc/patient/me/education
```
**Data Source:** `EducationContent` table

**Query filters:**
- `condition_code` = patient's episode condition
- `education_level` <= patient's education_level
- `active` = true
- Group by `content_type` (CONDITION_OVERVIEW, LIFESTYLE, DIET, MEDICATION_INFO, etc.)

**Returns:**
```json
{
  "content": [
    {
      "id": "uuid",
      "title": "Understanding Heart Failure",
      "content_type": "CONDITION_OVERVIEW",
      "text_content": "Heart failure is...",
      "education_level": "MEDIUM"
    },
    {
      "id": "uuid",
      "title": "Diet Tips for Heart Failure",
      "content_type": "DIET",
      "text_content": "Reduce sodium...",
      "education_level": "LOW"
    }
  ]
}
```

**Used for:** Education tab

---

### 5. Care Team & Resources
```
GET /api/toc/patient/me/care-team
```
**Data Source:**
- Patient.emergency_contact_name/phone
- Episode.assigned_nurse_id -> User table
- Hospital/organization settings (TBD)

**Returns:**
```json
{
  "emergency_contact": {
    "name": "Jane Smith",
    "phone": "+1234567890",
    "relationship": "Spouse"
  },
  "nurse": {
    "name": "Nurse Johnson",
    "phone": "+1234567890",
    "email": "nurse@hospital.com"
  },
  "hospital": {
    "name": "City General Hospital",
    "phone": "+1234567890"
  }
}
```

**Used for:** Resources tab

---

## Database Tables Already Available

✅ **Patient** - Patient demographic data, contact info
✅ **Episode** - Active episode with condition_code, medications (JSONB), discharge_date
✅ **AgentInteraction** - All check-in interactions with summary, status
✅ **AgentMessage** - Individual messages within each interaction
✅ **EducationContent** - Educational content filtered by condition and education level

## Implementation Priority

1. **High Priority**: Interactions (check-in history) - This is the core patient-facing feature
2. **High Priority**: Medications - Critical for patient safety and adherence
3. **Medium Priority**: Education content - Valuable but can use static content initially
4. **Low Priority**: Resources - Can hardcode care team contact initially

## InteractionHistory Component Integration

The unified `InteractionHistory` component is already integrated with:
- `viewMode="patient"` for patient-friendly terminology ("Check-in", "You", "Care Team")
- Responsive design (mobile-friendly)
- Expandable interactions
- No technical jargon visible to patients

Just pass it the real interaction data from the API and it will work perfectly!

