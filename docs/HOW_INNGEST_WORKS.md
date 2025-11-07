# How Inngest Works for Sequora - Step by Step

## The Big Picture

**Without Inngest (Current State):**
```
Patient responses → AI processes → Manually check if task created → Manually notify nurse 🤷‍♂️
```

**With Inngest:**
```
Patient responds → AI creates task → Event emitted → Inngest automatically notifies nurse → ✅
```

---

## Real Example: Task Created → Notify Nurse

Let's trace through what happens when the AI creates an escalation task.

### Current Code (interaction/route.ts)
```typescript
// In handleHandoffToNurse() or handleRaiseFlag()
const { data: task, error } = await supabase
  .from('EscalationTask')
  .insert({
    episode_id: episodeId,
    severity: 'CRITICAL',
    priority: 'URGENT',
    // ... other fields
  });

console.log('✅ Task created:', task.id);
// 🚨 PROBLEM: Nothing happens after this! Nurse doesn't get notified automatically.
```

### With Inngest

#### Step 1: Emit Event from Your Code
```typescript
// Same code, but add one line
import { inngest } from '@/lib/inngest';  // Added import

const { data: task } = await supabase
  .from('EscalationTask')
  .insert({...});

// 🚀 NEW: Emit event (this is async, fire-and-forget)
await inngest.send({
  name: 'task.created',
  data: {
    taskId: task.id,
    severity: task.severity,
    reasonCodes: task.reason_codes,
    episodeId: task.episode_id,
    priority: task.priority
  }
});
```

#### Step 2: Inngest Receives Event and Triggers Function

Inngest (running in the cloud or your dev server):
1. Receives the `task.created` event
2. Looks up what functions listen to this event
3. Finds `notify-nurse-task` function
4. Triggers it with the event data

```typescript
// lib/inngest/functions.ts
import { inngest } from '../client';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendSms } from '@/lib/notifications';

export const notifyNurseTask = inngest.createFunction(
  { 
    id: 'notify-nurse-task',
    name: 'Notify nurse about new task',
    retries: 3  // Try 3 times if it fails
  },
  { event: 'task.created' },  // 👈 This listens for 'task.created' events
  async ({ event, step }) => {
    const { taskId, severity, reasonCodes, episodeId, priority } = event.data;
    
    console.log(`📧 Notifying nurse about task ${taskId}`);
    
    // Step 1: Get task details
    const task = await step.run('fetch-task', async () => {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('EscalationTask')
        .select('*, assigned_to_user_id')
        .eq('id', taskId)
        .single();
      return data;
    });
    
    // Step 2: Get nurse info
    const nurse = await step.run('fetch-nurse', async () => {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('User')
        .select('primary_phone, first_name, last_name')
        .eq('id', task.assigned_to_user_id)
        .single();
      return data;
    });
    
    // Step 3: Send SMS
    await step.run('send-sms', async () => {
      const message = `🚨 New ${severity} task: ${reasonCodes.join(', ')}\n` +
                     `Priority: ${priority}\n` +
                     `Ep ID: ${episodeId.substring(0, 8)}...\n` +
                     `View: https://app.sequora.com/tasks/${taskId}`;
      
      await sendSms({
        to: nurse.primary_phone,
        body: message
      });
      
      console.log(`✅ SMS sent to ${nurse.first_name} at ${nurse.primary_phone}`);
    });
    
    // Step 4: Log notification
    await step.run('log-notification', async () => {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('NotificationLog')
        .insert({
          task_id: taskId,
          nurse_id: task.assigned_to_user_id,
          method: 'SMS',
          status: 'SENT',
          sent_at: new Date().toISOString()
        });
    });
  }
);

// Export all functions
export const functions = [notifyNurseTask];
```

#### Step 3: Register Function with Inngest

```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { functions } from '@/lib/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions
});
```

#### Step 4: That's It! 🎉

Now whenever `task.created` is emitted, Inngest:
1. ✅ Automatically calls `notifyNurseTask`
2. ✅ Retries if it fails (3 times by default)
3. ✅ Shows you what happened in the dashboard
4. ✅ Handles failures gracefully

---

## Key Features

### 1. Retries
If sending SMS fails (Twilio down, network issue), Inngest retries:
```
Attempt 1: Failed (Twilio timeout)
  → Wait 1 second
Attempt 2: Failed (still timeout)
  → Wait 2 seconds
Attempt 3: Failed (still timeout)
  → Wait 4 seconds
Attempt 4: Success! ✅
```

### 2. Steps
Each `step.run()` is:
- ✅ **Idempotent** - Can retry safely
- ✅ **Tracked** - See what happened in UI
- ✅ **Cached** - Results saved, don't re-run

### 3. Visual Dashboard

**Inngest Cloud Dashboard:**
```
📊 Recent Runs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────┐
│ notify-nurse-task                   │
│ Started: 2:34:21 PM                 │
│ Status: Completed ✅                │
│ Duration: 234ms                     │
│                                     │
│ Steps:                              │
│ ✅ fetch-task (123ms)               │
│ ✅ fetch-nurse (45ms)               │
│ ✅ send-sms (66ms)                  │
│ ✅ log-notification (3ms)           │
└─────────────────────────────────────┘
```

### 4. Scheduling

Want to schedule future events? Easy!

```typescript
// Workflow #10: Schedule check-in 24h from now
export const scheduleCheckIn = inngest.createFunction(
  { id: 'schedule-check-in' },
  { event: 'episode.created' },
  async ({ event, step }) => {
    const { episodeId, patientId, dischargeDate } = event.data;
    
    // Schedule event for 24h from now
    await step.sleep('wait-24h', '24h');
    
    // Now send the check-in
    await step.run('send-check-in', async () => {
      await sendCheckInSMS(patientId);
    });
  }
);
```

---

## How It All Connects

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                         │
│                                                             │
│  interaction/route.ts                                       │
│    └─ Creates task → emits 'task.created' event            │
│                                                             │
│  upload-patient/route.ts                                    │
│    └─ Creates episode → emits 'episode.created' event      │
│                                                             │
│  etc...                                                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
                    POST /api/inngest
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                      Inngest                                │
│                                                             │
│  Receives: 'task.created'                                   │
│    → Looks up functions                                     │
│    → Finds 'notify-nurse-task'                             │
│    → Runs it                                                │
│                                                             │
│  Receives: 'episode.created'                                │
│    → Runs 'schedule-check-in'                               │
│    → Waits 24h                                              │
│    → Emits 'outreach.attempt.due'                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   lib/inngest/functions.ts                  │
│                                                             │
│  notifyNurseTask()                                          │
│    → Fetches task, nurse, sends SMS                        │
│                                                             │
│  scheduleCheckIn()                                          │
│    → Waits, sends SMS                                      │
│                                                             │
│  etc...                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Development Workflow

### Local Development
```bash
# Terminal 1: Run your app
npm run dev

# Terminal 2: Run Inngest Dev Server
npx inngest-cli dev

# Browse to http://localhost:8288 to see events/functions
```

### Testing
```typescript
// In your tests
import { inngest } from '@/lib/inngest';

test('sends SMS when task created', async () => {
  // Create task
  const task = await createTask(...);
  
  // Emit event
  await inngest.send({
    name: 'task.created',
    data: { taskId: task.id, ... }
  });
  
  // Inngest processes it automatically
  // Your SMS mock should have been called
});
```

---

## Why This Is Better Than Alternatives

| Feature | Inngest | Database Triggers | Cron Jobs | Event Bus |
|---------|---------|-------------------|-----------|-----------|
| Retries | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Visibility | ✅ Dashboard | ❌ Logs only | ❌ Logs only | ❌ Logs only |
| Scheduling | ✅ Built-in | ❌ Need cron | ⚠️ Cron | ❌ No |
| Testing | ✅ Easy | ⚠️ Hard | ⚠️ Hard | ✅ Easy |
| Idempotency | ✅ Yes | ⚠️ Manual | ❌ No | ❌ No |
| Debugging | ✅ Visual | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |
| Scales | ✅ Auto | ✅ Auto | ⚠️ Manual | ❌ No |
| Cost | 💰 Managed | ✅ Free | ✅ Free | ✅ Free |

---

## Common Patterns for Sequora

### Pattern 1: Simple Notification
```typescript
// Trigger: task.created
// Action: Send SMS
export const notifyNurseTask = inngest.createFunction(
  { id: 'notify-nurse-task', retries: 3 },
  { event: 'task.created' },
  async ({ event }) => {
    await sendSMS(event.data);
  }
);
```

### Pattern 2: Schedule Future Work
```typescript
// Trigger: episode.created
// Action: Wait 24h, then send check-in
export const scheduleCheckIn = inngest.createFunction(
  { id: 'schedule-check-in' },
  { event: 'episode.created' },
  async ({ event, step }) => {
    await step.sleep('wait-24h', '24h');
    await sendCheckIn(event.data.patientId);
  }
);
```

### Pattern 3: Polling/Scheduled
```typescript
// Runs every 5 minutes, checks for tasks near SLA
export const checkSLAWarnings = inngest.createFunction(
  { id: 'check-sla-warnings' },
  { cron: '*/5 * * * *' },  // Every 5 minutes
  async ({ step }) => {
    const tasks = await step.run('find-near-sla', () => {
      return findTasksSLAInOneHour();
    });
    
    for (const task of tasks) {
      await step.run(`warn-${task.id}`, () => {
        return sendSLAWarning(task);
      });
    }
  }
);
```

### Pattern 4: Workflow (Multiple Steps)
```typescript
// Trigger: task.sla.breach
// Action: Notify nurse → Wait → Escalate to supervisor
export const handleSLABreach = inngest.createFunction(
  { id: 'handle-sla-breach' },
  { event: 'task.sla.breach' },
  async ({ event, step }) => {
    // Step 1: Alert nurse
    await step.run('alert-nurse', () => sendSLABreachAlert(event.data));
    
    // Step 2: Wait 30 minutes
    await step.sleep('wait-30min', '30m');
    
    // Step 3: Check if resolved
    const resolved = await step.run('check-resolved', () => {
      return checkIfTaskResolved(event.data.taskId);
    });
    
    // Step 4: If not, escalate
    if (!resolved) {
      await step.run('escalate', () => escalateToSupervisor(event.data));
    }
  }
);
```

---

## Summary

**Inngest = Reliable, visible, testable event processing**

Instead of:
- ❌ Manual cron jobs
- ❌ Database triggers you can't debug
- ❌ Hope and pray it works

You get:
- ✅ Events → Functions → Done
- ✅ Visual dashboard
- ✅ Automatic retries
- ✅ Easy testing
- ✅ Scales automatically

**Next step:** Want me to set this up for Sequora? I can:
1. Install Inngest
2. Create first function (task.created → SMS)
3. Hook up your existing code
4. Test it end-to-end

Ready? 🚀

