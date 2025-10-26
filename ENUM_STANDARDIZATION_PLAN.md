# Enum Standardization Plan

## Current State Analysis

### ✅ Existing Database Enums (from database.types.ts)

1. **red_flag_severity**: `"NONE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL"`
2. **redflag_severity**: `"NONE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL"` ⚠️ **DUPLICATE!**
3. **task_priority**: `"LOW" | "NORMAL" | "HIGH" | "URGENT"`
4. **task_status**: `"OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED" | "EXPIRED"`
5. **condition_code**: `"HF" | "COPD" | "AMI" | "PNA" | "OTHER"`
6. **interaction_status**: `"IN_PROGRESS" | "COMPLETED" | "ESCALATED" | "FAILED" | "TIMEOUT"`
7. **contact_channel**: `"SMS" | "VOICE" | "HUMAN_CALL" | "EMAIL" | "APP"`
8. **response_type**: `"SINGLE_CHOICE" | "MULTI_CHOICE" | "NUMERIC" | "TEXT" | "YES_NO"`

### ❌ Problems Found

#### 1. **Case Mismatch** (Code uses lowercase, DB expects uppercase)

**Issue**: Code uses `'critical'`, `'high'`, `'moderate'` but enum is `'CRITICAL'`, `'HIGH'`, `'MODERATE'`

**Affected Files**:
- `app/api/toc/agents/core/interaction/route.ts` (Lines 167, 171, 173, 647, 712, 727)
- `app/api/toc/agents/core/checkin/route.ts` (Lines 217, 262, 284-288, 307-317)
- `app/api/toc/agents/analyze-response/route.ts` (Lines 217, 241, 277, 290-303)
- `app/api/admin/protocol-config/route.ts` (Line 85)
- `supabase/seeds/007_normalized_protocol_rules.sql` (All severity values)

#### 2. **Missing Enum**: `risk_level`

Currently TEXT in database, should be enum:
```sql
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
```

**Affected Tables**:
- `Episode.risk_level`
- `ProtocolAssignment.risk_level`
- `ProtocolConfig.risk_level`

**Affected Code**:
- All files checking `risk_level === 'HIGH'`, `'MEDIUM'`, `'LOW'`

#### 3. **TEXT Columns That Should Be Enums**

| Table | Column | Should Be |
|-------|--------|-----------|
| `ProtocolContentPack` | `severity` | `red_flag_severity` enum |
| `ProtocolContentPack` | `rule_type` | `rule_type` enum (new) |
| `RedFlagRule` | `severity` | `red_flag_severity` enum |
| `EscalationTask` | `severity` | `red_flag_severity` enum |
| `EscalationTask` | `priority` | `task_priority` enum |
| `EscalationTask` | `status` | `task_status` enum |
| `Episode` | `risk_level` | `risk_level` enum (new) |
| `Episode` | `condition_code` | `condition_code` enum |
| `ProtocolAssignment` | `risk_level` | `risk_level` enum (new) |
| `ProtocolAssignment` | `condition_code` | `condition_code` enum |
| `ProtocolConfig` | `risk_level` | `risk_level` enum (new) |
| `ProtocolConfig` | `condition_code` | `condition_code` enum |

#### 4. **Duplicate Enum**: `redflag_severity` vs `red_flag_severity`

We have TWO severity enums (both identical). Should consolidate to ONE.

#### 5. **Hardcoded Strings in Code**

**Severity values hardcoded**:
```typescript
// ❌ BAD - Hardcoded strings
if (decisionHint.severity === 'critical') { ... }
if (analysis.severity === 'CRITICAL') { ... }

// ✅ GOOD - Import from database types
import { Database } from '@/database.types';
type Severity = Database['public']['Enums']['red_flag_severity'];

if (decisionHint.severity === 'CRITICAL') { ... }
```

**Valid severity check hardcoded**:
```typescript
// ❌ BAD
const validSeverities = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

// ✅ GOOD
import { Enums } from '@/database.types';
const VALID_SEVERITIES = Enums.red_flag_severity; // From database
```

## Migration Plan

### Step 1: Create Missing Enums

```sql
-- Create risk_level enum
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- Create rule_type enum
CREATE TYPE rule_type AS ENUM ('RED_FLAG', 'CLOSURE', 'EDUCATIONAL');

-- Create education_level enum (currently TEXT)
CREATE TYPE education_level AS ENUM ('low', 'medium', 'high');
```

### Step 2: Consolidate Duplicate Severity Enum

```sql
-- Drop the duplicate redflag_severity enum
DROP TYPE IF EXISTS redflag_severity CASCADE;

-- Ensure all tables use red_flag_severity
```

### Step 3: Convert TEXT Columns to Enums

```sql
-- ProtocolContentPack
ALTER TABLE "ProtocolContentPack"
  ALTER COLUMN severity TYPE red_flag_severity USING severity::red_flag_severity,
  ALTER COLUMN rule_type TYPE rule_type USING rule_type::rule_type;

-- Episode
ALTER TABLE "Episode"
  ALTER COLUMN risk_level TYPE risk_level USING risk_level::risk_level,
  ALTER COLUMN condition_code TYPE condition_code USING condition_code::condition_code;

-- ProtocolAssignment
ALTER TABLE "ProtocolAssignment"
  ALTER COLUMN risk_level TYPE risk_level USING risk_level::risk_level,
  ALTER COLUMN condition_code TYPE condition_code USING condition_code::condition_code;

-- ProtocolConfig
ALTER TABLE "ProtocolConfig"
  ALTER COLUMN risk_level TYPE risk_level USING risk_level::risk_level,
  ALTER COLUMN condition_code TYPE condition_code USING condition_code::condition_code;

-- RedFlagRule
ALTER TABLE "RedFlagRule"
  ALTER COLUMN severity TYPE red_flag_severity USING severity::red_flag_severity,
  ALTER COLUMN condition_code TYPE condition_code USING condition_code::condition_code;

-- EscalationTask
ALTER TABLE "EscalationTask"
  ALTER COLUMN severity TYPE red_flag_severity USING severity::red_flag_severity,
  ALTER COLUMN priority TYPE task_priority USING priority::task_priority,
  ALTER COLUMN status TYPE task_status USING status::task_status;

-- Patient
ALTER TABLE "Patient"
  ALTER COLUMN education_level TYPE education_level USING education_level::education_level;
```

### Step 4: Update Seed Data to Use UPPERCASE

```sql
-- supabase/seeds/007_normalized_protocol_rules.sql
-- Change all lowercase severity to UPPERCASE
UPDATE "ProtocolContentPack"
SET severity = UPPER(severity)
WHERE severity IN ('critical', 'high', 'moderate', 'low', 'none');
```

## Code Changes Required

### 1. Create Enum Helper File

```typescript
// lib/enums.ts
import { Database } from '@/database.types';

export const Severity = Database['public']['Enums']['red_flag_severity'];
export type SeverityType = typeof Severity[number];

export const RiskLevel = Database['public']['Enums']['risk_level'];
export type RiskLevelType = typeof RiskLevel[number];

export const ConditionCode = Database['public']['Enums']['condition_code'];
export type ConditionCodeType = typeof ConditionCode[number];

export const TaskPriority = Database['public']['Enums']['task_priority'];
export type TaskPriorityType = typeof TaskPriority[number];

export const TaskStatus = Database['public']['Enums']['task_status'];
export type TaskStatusType = typeof TaskStatus[number];

export const InteractionStatus = Database['public']['Enums']['interaction_status'];
export type InteractionStatusType = typeof InteractionStatus[number];

// Validation helpers
export const VALID_SEVERITIES = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
export const VALID_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const VALID_CONDITIONS = ['HF', 'COPD', 'AMI', 'PNA', 'OTHER'] as const;

export function isValidSeverity(value: unknown): value is SeverityType {
  return typeof value === 'string' && VALID_SEVERITIES.includes(value as any);
}

export function isValidRiskLevel(value: unknown): value is RiskLevelType {
  return typeof value === 'string' && VALID_RISK_LEVELS.includes(value as any);
}

export function isValidCondition(value: unknown): value is ConditionCodeType {
  return typeof value === 'string' && VALID_CONDITIONS.includes(value as any);
}
```

### 2. Update All Files Using Enums

**Before**:
```typescript
// ❌ Hardcoded
if (decisionHint.severity === 'critical') { ... }
const validSeverities = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
```

**After**:
```typescript
// ✅ Import enums
import { VALID_SEVERITIES, isValidSeverity, SeverityType } from '@/lib/enums';

if (decisionHint.severity === 'CRITICAL') { ... } // Uppercase
if (!isValidSeverity(analysis.severity)) {
  throw new Error(`Invalid severity "${analysis.severity}". Must be one of: ${VALID_SEVERITIES.join(', ')}`);
}
```

### 3. Files Requiring Updates

1. **`app/api/toc/agents/core/interaction/route.ts`**
   - Change `'critical'` → `'CRITICAL'`
   - Change `'high'` → `'HIGH'`
   - Change `'moderate'` → `'MODERATE'`
   - Import and use `SeverityType`, `ConditionCodeType`, `RiskLevelType`

2. **`app/api/toc/agents/core/checkin/route.ts`**
   - Same severity changes
   - Use enum types in function signatures

3. **`app/api/toc/agents/analyze-response/route.ts`**
   - Replace hardcoded `validSeverities` array with `VALID_SEVERITIES`
   - Use `isValidSeverity()` helper

4. **`app/api/admin/protocol-config/route.ts`**
   - Validate `distressed_severity_upgrade` is valid severity

5. **`supabase/seeds/007_normalized_protocol_rules.sql`**
   - Change all `'critical'` → `'CRITICAL'`
   - Change all `'high'` → `'HIGH'`
   - etc.

6. **`supabase/seeds/008_protocol_config_data.sql`**
   - Update all severity/risk_level values to match enums

## Benefits

1. ✅ **Type Safety**: TypeScript catches invalid values at compile time
2. ✅ **Database Integrity**: PostgreSQL enforces valid values
3. ✅ **Consistency**: Single source of truth for all valid values
4. ✅ **Auto-complete**: IDEs suggest valid enum values
5. ✅ **Self-documenting**: Clear what values are allowed
6. ✅ **Performance**: Enums are stored as integers internally
7. ✅ **Migration Safety**: Can't insert invalid data

## Implementation Order

1. ✅ Create `lib/enums.ts` helper file
2. ✅ Create migration to add missing enums
3. ✅ Update seed files to use correct casing
4. ✅ Convert TEXT columns to enum types
5. ✅ Update all TypeScript code to use enums
6. ✅ Run `npx supabase gen types typescript` to regenerate types
7. ✅ Test all affected endpoints
8. ✅ Update validation logic to use enum helpers

## Timeline

**High Priority** (Breaking Changes):
- Fix case mismatch (lowercase → UPPERCASE)
- Add `risk_level` enum
- Convert `ProtocolContentPack.severity` to enum

**Medium Priority**:
- Consolidate duplicate severity enums
- Convert remaining TEXT columns to enums

**Low Priority**:
- Add `education_level` enum
- Add `rule_type` enum

