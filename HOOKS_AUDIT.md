# Custom Hooks Audit - Repeated Logic Analysis
**Date**: October 27, 2025  
**Scope**: All app/ and components/ directories

---

## 📊 Summary

**Repeated Patterns Found**: 12 major patterns  
**Files Affected**: 16+ files  
**Estimated Duplicate Code**: ~1,500+ lines  
**Recommended Hooks to Create**: 8 hooks

---

## 🔁 Pattern #1: Patient Data Fetching (HIGHEST PRIORITY)

**Found in**: 6 files
- `dashboard/patients/page.tsx`
- `dashboard/ai-tester/page.tsx`
- `toc/hospital/page.tsx`
- `toc/nurse/page.tsx`
- `toc/patient/[patientId]/page.tsx`
- Components that need patient data

**Repeated Code** (~50 lines each = 300 lines total):
```tsx
const [patients, setPatients] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  fetchPatients();
}, []);

const fetchPatients = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/toc/nurse/patients');
    const data = await response.json();
    setPatients(data.patients || []);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

**✅ Hook Already Created**: `hooks/usePatients.ts`  
**Status**: Ready to replace 6 duplicates  
**Impact**: ~300 lines reduction

---

## 🔁 Pattern #2: Conversation/Interaction Fetching

**Found in**: 5 files
- `dashboard/ai-tester/page.tsx` (fetchInteractions)
- `dashboard/patients/page.tsx` (fetchConversationData)
- `dashboard/NurseDashboard.tsx` (fetchConversationData)
- `dashboard/AdminDashboard.tsx` (conversation fetching)
- TOC pages

**Repeated Code** (~40 lines each = 200 lines total):
```tsx
const [conversationData, setConversationData] = useState([]);

const fetchConversationData = async (patientId: string) => {
  try {
    const response = await fetch(`/api/debug/interactions?patientId=${patientId}`);
    const data = await response.json();
    setConversationData(data.interactions || []);
  } catch (error) {
    console.error('Error:', error);
    setConversationData([]);
  }
};
```

**✅ Hook Already Created**: `hooks/useConversations.ts`  
**Status**: Ready to replace 5 duplicates  
**Impact**: ~200 lines reduction

---

## 🔁 Pattern #3: Episode Data Fetching

**Found in**: 4 files
- `ai-tester/page.tsx`
- `toc/episodes/page.tsx`
- `toc/episodes/[id]/page.tsx`
- `toc/hospital/page.tsx`

**Repeated Code** (~40 lines each = 160 lines total):
```tsx
const [episodes, setEpisodes] = useState([]);
const [loading, setLoading] = useState(false);

const fetchEpisodes = async () => {
  setLoading(true);
  const response = await fetch('/api/debug/patients');
  const data = await response.json();
  setEpisodes(data.episodes || []);
  setLoading(false);
};
```

**❌ Hook Needed**: `hooks/useEpisodes.ts`  
**Status**: Should create  
**Impact**: ~160 lines reduction

---

## 🔁 Pattern #4: Task Data Fetching

**Found in**: 4 files
- `dashboard/NurseDashboard.tsx` (fetchTasks)
- `toc/tasks/page.tsx`
- `toc/tasks/[id]/page.tsx`
- `toc/hospital/page.tsx`

**Repeated Code** (~35 lines each = 140 lines total):
```tsx
const [tasks, setTasks] = useState([]);

const fetchTasks = async () => {
  const response = await fetch('/api/toc/nurse/tasks');
  const data = await response.json();
  setTasks(data.tasks || []);
};
```

**❌ Hook Needed**: `hooks/useTasks.ts`  
**Status**: Should create  
**Impact**: ~140 lines reduction

---

## 🔁 Pattern #5: Protocol Profile Fetching

**Found in**: 2 files
- `ai-tester/page.tsx` (fetchProtocolProfile)
- `protocol-config/page.tsx`

**Repeated Code** (~80 lines each = 160 lines total):
```tsx
const [protocolProfile, setProtocolProfile] = useState(null);
const [loadingProfile, setLoadingProfile] = useState(false);

const fetchProtocolProfile = async () => {
  setLoadingProfile(true);
  try {
    const response = await fetch(`/api/toc/protocol/profile?...`);
    const data = await response.json();
    setProtocolProfile(data.profile);
  } catch (error) {
    console.error(error);
  } finally {
    setLoadingProfile(false);
  }
};
```

**❌ Hook Needed**: `hooks/useProtocolProfile.ts`  
**Status**: Should create  
**Impact**: ~160 lines reduction

---

## 🔁 Pattern #6: Modal Visibility Management

**Found in**: 10+ files
- Multiple modals per page
- Each has useState(false) + onOpenChange handlers

**Repeated Code** (~10 lines per modal × 30 modals = 300 lines):
```tsx
const [showModal, setShowModal] = useState(false);
const [showAnotherModal, setShowAnotherModal] = useState(false);
const [showThirdModal, setShowThirdModal] = useState(false);
// ... repeat 5-7 times per file
```

**❌ Hook Needed**: `hooks/useModal.ts` or `hooks/useModals.ts`  
**Status**: Optional but helpful  
**Impact**: Cleaner state management

**Proposed**:
```tsx
// Instead of 7 useState calls
const modals = useModals(['patient', 'contact', 'conversation', 'delete']);
// modals.patient.isOpen, modals.patient.open(), modals.patient.close()
```

---

## 🔁 Pattern #7: Form State Management

**Found in**: 8+ files
- Patient forms
- Episode editing
- Protocol editing
- Task editing

**Repeated Code** (~60 lines each = 480 lines):
```tsx
const [editingData, setEditingData] = useState({});
const [validationErrors, setValidationErrors] = useState([]);
const [submitting, setSubmitting] = useState(false);

const handleSubmit = async () => {
  setSubmitting(true);
  // validation
  // API call
  // error handling
  setSubmitting(false);
};
```

**❌ Hook Needed**: `hooks/useForm.ts`  
**Status**: High value  
**Impact**: ~400+ lines reduction, consistent validation

---

## 🔁 Pattern #8: Analytics/Stats Calculation

**Found in**: 4 files
- `dashboard/patients/page.tsx` (activePatients, avgDays)
- `dashboard/page.tsx` (dashboard stats)
- `toc/hospital/page.tsx` (hospital stats)
- `toc/nurse/page.tsx` (nurse stats)

**Repeated Code** (~80 lines each = 320 lines):
```tsx
const activePatients = patients.filter(p => {
  const daysSince = ...
  return daysSince <= 30;
});

const patientsWithFlags = patients.filter(p => p.flags > 0);

const avgDaysSinceDischarge = patients.reduce(...) / patients.length;
```

**❌ Hook Needed**: `hooks/usePatientAnalytics.ts`  
**Status**: Should create  
**Impact**: ~300 lines reduction, consistent calculations

---

## 🔁 Pattern #9: Condition/Risk Color Mapping

**Found in**: 12+ files
- Every file has `getConditionIcon`, `getConditionColor`, `getRiskColor`

**Repeated Code** (~30 lines each = 360 lines):
```tsx
const getConditionIcon = (condition: string) => {
  switch (condition) {
    case 'HF': return <Heart className="..." />;
    // ...
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'HIGH': return 'bg-red-100';
    // ...
  }
};
```

**✅ Partially Solved**: `lib/ui-helpers.ts` has some  
**Action Needed**: Add icon mapping, move all color logic there  
**Impact**: ~300 lines reduction

---

## 🔁 Pattern #10: Loading States (Auth Check)

**Found in**: 15+ pages
- Every protected page checks auth loading
- Renders spinner during auth check

**Repeated Code** (~15 lines each = 225 lines):
```tsx
if (authLoading) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

if (!user) {
  return <div>Please log in</div>;
}
```

**❌ Hook/Component Needed**: `hooks/useProtectedPage.ts` or `components/ProtectedPage.tsx`  
**Status**: High value  
**Impact**: ~200 lines reduction

---

## 🔁 Pattern #11: Data Refresh on Action

**Found in**: 8+ files
- After creating/updating/deleting, refresh parent data

**Repeated Pattern**:
```tsx
onPatientAdded={() => fetchPatients()}
onTaskResolved={() => fetchTasks()}
onEpisodeUpdated={() => fetchEpisodes()}
```

**Current**: Each component manages own refresh  
**Better**: Hooks return refresh functions  
**Status**: Already implemented in usePatients, useConversations ✅

---

## 🔁 Pattern #12: Error Handling & Toasts

**Found in**: Every file with API calls

**Repeated Code**:
```tsx
try {
  const response = await fetch(...);
  if (!response.ok) {
    toast({ title: "Error", variant: "destructive" });
    return;
  }
  toast({ title: "Success" });
} catch (error) {
  toast({ title: "Error", variant: "destructive" });
}
```

**❌ Hook Needed**: `hooks/useApiCall.ts` or utility wrapper  
**Status**: Would standardize error handling  
**Impact**: Consistent UX, less boilerplate

---

## 🎯 Recommended Hooks to Create (Priority Order)

### Immediate (High Impact):
1. **useEpisodes** - 4 duplicates, ~160 lines  
2. **useTasks** - 4 duplicates, ~140 lines  
3. **usePatientAnalytics** - 4 duplicates, ~300 lines  
4. **useProtocolProfile** - 2 duplicates, ~160 lines

### High Value:
5. **useProtectedPage** - 15+ duplicates, ~200 lines  
6. **useForm** - 8+ duplicates, ~400+ lines

### Nice to Have:
7. **useModals** - Better modal state management  
8. **useApiCall** - Standardized API calling

---

## 💡 Recommended Action Plan

### Phase 1 - Quick Wins (Do Now):
1. ✅ Extract test scenarios (done)
2. ✅ Replace existing patient/conversation fetching with hooks we created
3. ✅ Create useEpisodes hook
4. ✅ Create useTasks hook
5. ✅ Add icon mapping to ui-helpers

**Impact**: ~600-800 lines reduction

### Phase 2 - Analytics & Utilities:
6. ✅ Create usePatientAnalytics hook
7. ✅ Create useProtectedPage wrapper
8. ✅ Move all color/icon logic to ui-helpers

**Impact**: ~500 lines reduction

### Phase 3 - Extract Large Modals:
9. ✅ Extract PatientSelector component
10. ✅ Extract TestScenariosPanel component

**Impact**: ~300 lines reduction from ai-tester

**Total Potential**: ~1,500 lines of duplicate code eliminated

---

**Should I proceed with Phase 1 (create the missing hooks + apply them)?** This would be the biggest immediate impact. 🚀

