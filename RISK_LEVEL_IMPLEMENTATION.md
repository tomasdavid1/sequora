# Risk Level Implementation

## Overview
This update implements **Risk of Readmission** as the primary factor for protocol selection, replacing education level as the protocol determinant.

## Key Changes

### 1. **Protocol Selection Logic**
- **OLD**: `condition_code` + `education_level` → Protocol
- **NEW**: `condition_code` + `risk_level` → Protocol
- **Education Level**: Now used ONLY for AI communication style (vocabulary, sentence complexity)

### 2. **Risk Levels**
- `LOW`: Stable patients, few comorbidities
- `MEDIUM`: Moderate risk (default)
- `HIGH`: Complex patients, multiple issues

### 3. **Risk-Based Protocol Differences**

| Risk Level | Critical Confidence Threshold | Check-in Frequency | Red Flag Sensitivity |
|------------|------------------------------|-------------------|---------------------|
| HIGH       | 70% (more aggressive)        | Every 12h (2x/day) | All rules active    |
| MEDIUM     | 80% (standard)               | Every 24h (daily) | Critical + High     |
| LOW        | 85% (less aggressive)        | Every 48h (2 days) | Critical only       |

### 4. **Database Changes**
- Added `risk_level` column to `Episode` table
- Added `risk_level` column to `ProtocolAssignment` table
- Updated `get_protocol_config()` function to accept risk_level parameter
- Risk level determines:
  - Which red flag rules are active
  - AI confidence thresholds for escalation
  - Automatic check-in frequency

### 5. **UI Changes**
- **Nurse Dashboard**: Added "Risk of Readmission" dropdown when creating patients
- **Protocol Profile Modal**: Shows risk level prominently with color-coded badge
- **AI Tester**: Displays risk-based threshold differences

### 6. **API Changes**
- `/api/toc/nurse/upload-patient`: Accepts `riskLevel` in request body
- `/api/toc/protocol/profile`: Returns risk_level in profile response
- `/api/toc/agents/core/interaction`: Uses risk_level for protocol assignment

## How to Apply

### 1. Run Migration
```bash
# Apply the risk_level migration
cd /Users/tomas/Projects/healthx2
psql $DATABASE_URL -f supabase/migrations/20250126120000_add_risk_level.sql
```

### 2. Backfill Existing Data
Existing episodes will be set to `MEDIUM` risk by default. Update them as needed:
```sql
UPDATE public."Episode"
SET risk_level = 'HIGH'
WHERE elixhauser_score > 10;  -- Example criteria
```

### 3. Future: Automatic Risk Calculation
When discharge summary parsing is enhanced, risk_level can be automatically calculated based on:
- Elixhauser score
- Number of comorbidities
- Recent readmission history
- Social determinants of health
- Hospital course severity

## Benefits
- **More accurate protocol selection**: Clinical risk drives medical decisions, not education level
- **Flexible escalation**: High-risk patients get more aggressive monitoring
- **Clear separation of concerns**: Education affects communication, risk affects medical protocol
- **Future-ready**: Easy to integrate with risk prediction algorithms

## Next Steps
1. Apply the migration (see above)
2. Update existing test patients with appropriate risk levels
3. Implement automatic risk calculation from discharge summaries
4. Add risk level to PDF parsing logic

