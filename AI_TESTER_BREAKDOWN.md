# AI Tester Breakdown Analysis
**Current Size**: 1,598 lines  
**State Variables**: 25  
**Modals/Cards**: 49  
**Status**: 🔴 CRITICAL - Needs immediate splitting

---

## 📊 What's Actually In This File

### Analysis:
Looking at the file structure, I found:

1. **State Management** (Lines 94-124): 25 state variables
   - Chat state (messages, input, loading)
   - Interaction management (interactions, selected, grouping)
   - Patient/Episode data (patients, episodes, config)
   - Modal visibility flags (7+ modals)
   - Configuration editing state
   - Protocol profile state

2. **Test Scenarios** (Lines ~540-571): Hardcoded test data
   - 4 test scenarios with descriptions
   - Should be in separate JSON file

3. **Business Logic Functions** (Lines ~173-900+):
   - fetchInteractions
   - fetchPatients
   - fetchEpisodes
   - sendMessage
   - deleteInteraction
   - fetchProtocolProfile
   - updateProtocolConfig
   - updateEpisode
   - updatePatient
   - Patient selector logic
   - Interaction grouping logic

4. **UI Rendering** (Lines ~900-1598):
   - Main page layout
   - Patient selector modal (large)
   - Configuration modals (huge - protocol editing)
   - Delete confirmation modal
   - Test scenario cards
   - Interaction grouping UI
   - Stats cards

---

## 🎯 What Should Be Extracted

### Priority 1 - Extract to Separate Files (Immediate):

#### A. **Test Scenarios** → `data/test-scenarios.ts`
**Current**: ~30 lines inline  
**Move to**: JSON/TS file  
**Impact**: -30 lines, easier to maintain

#### B. **Patient Selector Modal** → `components/ai-tester/PatientSelector.tsx`
**Estimated**: ~200 lines  
**Includes**: Patient/Episode selection, search, creation  
**Impact**: -200 lines

#### C. **Protocol Configuration Modals** → `components/ai-tester/ProtocolConfigModal.tsx`
**Estimated**: ~300 lines  
**Includes**: Protocol editing, rules editing, episode editing  
**Impact**: -300 lines

#### D. **Test Scenario Panel** → `components/ai-tester/TestScenariosPanel.tsx`
**Estimated**: ~100 lines  
**Includes**: Test scenario cards, quick test buttons  
**Impact**: -100 lines

---

### Priority 2 - Extract to Custom Hooks:

#### E. **useAITesterState** → `hooks/useAITesterState.ts`
**Purpose**: Manage all the state for ai-tester  
**Includes**: 
- Message state
- Interaction state
- Patient/Episode state
- Modal visibility state

**Before** (25 useState calls):
```tsx
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(false);
const [interactions, setInteractions] = useState([]);
// ... 22 more
```

**After** (1 hook call):
```tsx
const {
  messages, setMessages,
  loading, setLoading,
  interactions, setInteractions,
  // ... all state
} = useAITesterState();
```

**Impact**: Cleaner component, easier testing

#### F. **useProtocolProfile** → `hooks/useProtocolProfile.ts`
**Purpose**: Protocol data fetching and editing  
**Estimated**: ~100 lines  
**Impact**: Reusable across admin areas

#### G. **useInteractionGrouping** → `hooks/useInteractionGrouping.ts` or just a utility
**Purpose**: Group interactions by condition/patient/risk  
**Estimated**: ~50 lines  
**Impact**: Reusable, testable

---

### Priority 3 - Extract UI Logic:

#### H. **Interaction List/Sidebar** → `components/ai-tester/InteractionSidebar.tsx`
**Estimated**: ~200 lines  
**Includes**: 
- Interaction grouping dropdown
- Grouped interaction list
- Expand/collapse groups
- Delete buttons

**Impact**: -200 lines from main component

---

## 📋 Recommended File Structure

```
app/dashboard/ai-tester/
├── page.tsx (150-200 lines) - Main orchestrator
├── components/
│   ├── PatientSelector.tsx (200 lines)
│   ├── ProtocolConfigModal.tsx (300 lines)
│   ├── TestScenariosPanel.tsx (100 lines)
│   ├── InteractionSidebar.tsx (200 lines)
│   └── ChatInterface.tsx (if needed - or use ConversationView)
├── hooks/
│   ├── useAITesterState.ts (150 lines)
│   ├── useProtocolProfile.ts (100 lines)
│   └── useInteractionManagement.ts (100 lines)
└── data/
    └── test-scenarios.ts (50 lines)
```

---

## 💡 Key Question:

**Is this AI testing functionality specific to ai-tester OR should it be reusable?**

Some of this logic might be useful in:
- Regular patient chat interfaces
- Nurse testing tools
- Protocol debugging tools

**Specifically**:
1. **Protocol profile editing** - Should this live in a shared admin component?
2. **Patient/Episode management** - Is this unique to ai-tester or general admin functionality?
3. **Interaction management** - Could nurses benefit from similar tools?

---

## 🎯 My Recommendation:

### Quick Win (Do Now):
1. ✅ Extract test scenarios to `data/test-scenarios.ts` (-30 lines)
2. ✅ Extract PatientSelector modal to component (-200 lines)
3. ✅ Extract ProtocolConfigModal to component (-300 lines)
4. ✅ Create useInteractionManagement hook (-150 lines)

**Total Reduction**: ~680 lines  
**ai-tester.page.tsx**: Would go from 1,598 → ~920 lines

### If You Want to Go Further:
5. Create useAITesterState hook (cleaner state management)
6. Extract InteractionSidebar component
7. Extract TestScenariosPanel component

**Total Reduction**: ~1,200 lines  
**ai-tester.page.tsx**: Would be ~400 lines (just orchestration)

---

**Should I proceed with the Quick Win approach (extract modals + test scenarios)?** This would cut the file in half without changing functionality. 🚀

