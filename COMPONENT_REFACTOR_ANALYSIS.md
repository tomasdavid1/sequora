# Component Refactoring Analysis
**Date**: October 27, 2025  
**Purpose**: Identify reusable patterns and oversized components

---

## 📊 Large Files Analysis

### Files >1000 Lines (Critical - Should Split)
1. **app/dashboard/ai-tester/page.tsx** - 1,756 lines 🔴
   - Contains: AI testing UI, chat interface, patient selection, configuration
   - **Recommended Split**: 4-5 components

### Files 500-1000 Lines (Review)
2. **components/patients/PatientsTable.tsx** - 543 lines 🟡
   - Contains: DataTable, Add Patient modal, PDF upload, form validation
   - **Already improved** - add patient modal is self-contained

3. **app/toc/nurse/page.tsx** - 485 lines 🟡
4. **app/toc/hospital/page.tsx** - 480 lines 🟡
5. **app/toc/patient/[patientId]/page.tsx** - 431 lines 🟡

---

## 🔁 Repeated UI Patterns Found

### Pattern #1: **Conversation/Chat Display** (HIGHEST PRIORITY)
**Found in**: 5+ files
- `AdminDashboard.tsx`
- `NurseDashboard.tsx`
- `patients/page.tsx`
- `ai-tester/page.tsx`
- `PatientDashboard.tsx`

**Repeated Code** (~50 lines each):
```tsx
{messages.map((message, idx) => (
  <div className={`p-3 rounded ${
    message.role === 'user' ? 'bg-blue-50' : 'bg-gray-100'
  }`}>
    <Badge>{message.role === 'user' ? 'Patient' : 'AI'}</Badge>
    <span className="text-xs">{new Date(message.timestamp).toLocaleTimeString()}</span>
    <p>{message.content}</p>
  </div>
))}
```

**Variations**:
- Different styling (`bg-blue-500` vs `bg-blue-50`)
- Different role checks (`'user'` vs `'PATIENT'`)
- Different badge styles
- Some show escalation badges, some don't
- Some show metadata/flags, some don't

**Questions**:
1. Should chat bubbles be **left/right aligned** (like iMessage) or **stacked vertically**?
2. Should we **always show escalation badges** or make them optional?
3. Do we need **different variants** (compact vs detailed)?
4. Should we show **timestamps on every message** or just interaction start?

**Proposed Component**:
```tsx
<ConversationView 
  messages={messages}
  variant="compact|detailed|chat"  // Different layouts
  showEscalations={true}
  showMetadata={false}
/>
```

---

### Pattern #2: **Patient Info Card** (HIGH PRIORITY)
**Found in**: 8+ files
- Patient name, DOB, condition, contact info
- Status badges
- Action buttons (Contact, View History)

**Repeated Code** (~30 lines each):
```tsx
<div className="flex items-center gap-2">
  <div>
    <p className="font-medium">{patient.first_name} {patient.last_name}</p>
    <p className="text-sm text-gray-500">{patient.email}</p>
  </div>
  <Badge variant="outline">{patient.condition_code}</Badge>
  <Badge variant={riskLevel}>{patient.risk_level}</Badge>
</div>
```

**Questions**:
1. Should we show **all patient details** or have **compact/full variants**?
2. Should **action buttons be configurable** (some pages need different actions)?
3. Do we need **different layouts** (horizontal vs vertical)?

**Proposed Component**:
```tsx
<PatientCard 
  patient={patient}
  variant="compact|full"
  showActions={true}
  actions={['contact', 'viewHistory', 'edit']}
  onAction={(action, patient) => {...}}
/>
```

---

### Pattern #3: **Empty State** (MEDIUM PRIORITY)
**Found in**: 15+ files
- Icon + message when no data
- Consistent styling needed

**Repeated Code** (~10 lines each):
```tsx
<div className="text-center py-8 text-gray-500">
  <Icon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
  <p>No items found</p>
</div>
```

**Questions**:
1. Should we have **action buttons** in empty states (e.g., "Add First Patient")?
2. Different **variants** for different contexts?

**Proposed Component**:
```tsx
<EmptyState 
  icon={MessageSquare}
  message="No conversations yet"
  action={{ label: "Start Chat", onClick: () => {} }}
/>
```

---

### Pattern #4: **Status Badge Mapping** (MEDIUM PRIORITY)
**Found in**: 20+ files
- Hardcoded color logic for statuses
- Repeated switch statements

**Repeated Code**:
```tsx
variant={
  status === 'ESCALATED' ? 'destructive' :
  status === 'ACTIVE' ? 'default' : 'outline'
}
```

**Questions**:
1. Should status colors be **centralized in a helper**?
2. Do we need **different color schemes** for different contexts?

**Proposed Helper**:
```tsx
// lib/ui-helpers.ts
export const getStatusBadgeVariant = (status: string) => {
  const map = {
    'ESCALATED': 'destructive',
    'ACTIVE': 'default',
    'COMPLETED': 'outline',
    // ...
  };
  return map[status] || 'outline';
};
```

---

### Pattern #5: **Loading Spinner** (LOW PRIORITY)
**Found in**: 12+ files
- Consistent loading UI

**Repeated Code**:
```tsx
<div className="flex items-center justify-center h-screen">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
</div>
```

**Proposed Component**:
```tsx
<LoadingSpinner size="sm|md|lg" fullScreen={true} />
```

---

## 🔨 Components to Break Down

### 1. **ai-tester/page.tsx** (1,756 lines) 🔴 CRITICAL

**Current Structure**:
- Patient selection UI (200 lines)
- Configuration panel (300 lines)
- Chat interface (400 lines)
- Metadata display (300 lines)
- Test scenarios (200 lines)
- API logic (300 lines)

**Recommended Split**:
```
ai-tester/
├── page.tsx (150 lines) - Main orchestrator
└── components/
    ├── PatientSelector.tsx (200 lines)
    ├── ConfigurationPanel.tsx (300 lines)
    ├── ChatInterface.tsx (400 lines)
    ├── MetadataDisplay.tsx (300 lines)
    ├── TestScenarios.tsx (200 lines)
    └── hooks/
        └── useAITester.ts (300 lines) - Business logic
```

**Questions**:
1. Should **chat interface be generic** (usable in ai-tester AND patient dashboard)?
2. Should **test scenarios be in a separate JSON file**?
3. Should we create **custom hooks** for API calls?

---

### 2. **toc/nurse/page.tsx** (485 lines) 🟡

**Contains**:
- Patient list
- Task list
- Multiple modals
- Stats cards

**Recommended Split**:
```
toc/nurse/
├── page.tsx (100 lines)
└── components/
    ├── NursePatientList.tsx
    ├── NurseTaskList.tsx
    ├── NurseStatsCards.tsx
    └── modals/
        ├── PatientDetailsModal.tsx
        └── ContactPatientModal.tsx
```

---

### 3. **toc/hospital/page.tsx** (480 lines) 🟡

Similar structure to nurse page - same recommendations.

---

## 🎯 Shared Logic to Extract

### Logic #1: **Patient Data Fetching** (HIGHEST PRIORITY)
**Found in**: 10+ files
- Each file re-implements patient fetching
- Inconsistent error handling
- No caching

**Current** (duplicated):
```tsx
const fetchPatients = async () => {
  const res = await fetch('/api/toc/nurse/patients');
  const data = await res.json();
  setPatients(data.patients || []);
};
```

**Proposed Custom Hook**:
```tsx
// hooks/usePatients.ts
export function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchPatients = async () => { /* centralized logic */ };
  const refreshPatients = () => { /* ... */ };
  
  return { patients, loading, error, refreshPatients };
}

// Usage:
const { patients, loading, refreshPatients } = usePatients();
```

---

### Logic #2: **Conversation Data Fetching** (HIGH PRIORITY)
**Found in**: 5+ files
- Same API call pattern
- Same data transformation

**Proposed Custom Hook**:
```tsx
// hooks/useConversations.ts
export function useConversations(patientId: string) {
  // Centralized logic
}
```

---

### Logic #3: **Form Validation** (MEDIUM PRIORITY)
**Found in**: Multiple signup/patient forms
- Repeated validation logic
- Inconsistent error messages

**Proposed Helper**:
```tsx
// lib/validation.ts
export const validatePatientForm = (data) => {
  const errors = [];
  if (!data.firstName) errors.push('firstName');
  // ... centralized validation
  return errors;
};
```

---

## 📋 Summary & Questions for You

### Reusable Components to Create (Priority Order):

1. **ConversationView** (5 duplicates, ~50 lines each = 250 lines saved) 🔥
2. **PatientCard** (8 duplicates, ~30 lines each = 240 lines saved) 🔥
3. **EmptyState** (15 duplicates, ~10 lines each = 150 lines saved)
4. **LoadingSpinner** (12 duplicates, ~5 lines each = 60 lines saved)

**Total Potential Savings**: ~700 lines of duplicated UI code

### Components to Split:

1. **ai-tester/page.tsx** (1,756 → ~600 lines across 6 files) 🔥
2. **toc/nurse/page.tsx** (485 → ~200 lines across 4 files)
3. **toc/hospital/page.tsx** (480 → ~200 lines across 4 files)

**Total Size Reduction**: ~1,500 lines moved to smaller, focused components

### Custom Hooks to Create:

1. **usePatients** (10 duplicates)
2. **useConversations** (5 duplicates)
3. **useEpisodes** (if pattern exists)

---

## 🤔 Questions Before Implementation

### General Approach:
1. **Priority**: Should I start with chat/conversation components (most duplicated) or split large files first?
2. **Breaking Changes**: Some refactors might change prop interfaces - is that OK?
3. **Testing**: Should I ensure existing functionality works after each refactor?

### Chat/Conversation Component:
4. **Layout**: Chat bubbles (left/right) OR stacked list view OR both as variants?
5. **Features**: Should we always show escalation badges, or make them optional props?
6. **Naming**: `ConversationView`, `ChatMessages`, `MessageList`, or something else?

### Patient Card Component:
7. **Actions**: Should actions be **configurable per use case** or **standardized**?
8. **Layout**: One component with variants OR separate CompactPatientCard vs FullPatientCard?

### Large File Splits:
9. **ai-tester**: Should the chat interface be generic enough to use elsewhere?
10. **Hooks**: Should we create a `hooks/` directory in each feature folder or centralize in `/hooks`?

### File Organization:
11. **Structure**: Should components live in `/components/shared` or next to where they're used?
12. **Naming**: Feature-based (`ai-tester/components/`) or type-based (`/components/chat/`)?

---

## 💡 Recommendations (My Opinion)

### Phase 1 - Quick Wins (Reusable Components):
✅ Create `ConversationView` component (most duplicated)  
✅ Create `EmptyState` component (simplest, widely used)  
✅ Create status badge helper (one-liner changes)  

### Phase 2 - Hooks (Shared Logic):
✅ Create `usePatients` hook  
✅ Create `useConversations` hook  

### Phase 3 - Split Large Files:
✅ Split ai-tester (biggest offender)  
✅ Split nurse/hospital pages if needed  

**Estimated Impact**:
- ~1,000+ lines of code reduced
- Better maintainability
- Consistent UX
- Easier testing

---

## 🎯 Next Steps

**Please answer the questions above so I can:**
1. Create the right component APIs
2. Choose the best naming conventions
3. Organize files properly
4. Ensure the refactor matches your vision

Or, if you trust my judgment, I can proceed with the recommendations and adjust based on your feedback! 🚀


