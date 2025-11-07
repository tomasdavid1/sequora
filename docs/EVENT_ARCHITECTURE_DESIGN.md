# Event-Driven Architecture for Sequora

## Current State Analysis

### Key Events Identified
Based on codebase analysis, here are the critical events that trigger notifications/alerts:

#### 1. **Patient Onboarding & Discharge Events** 🏥
   - `patient.created` - New patient record created
   - `patient.discharged` - Patient discharged from hospital
   - `episode.created` - New care episode starts
   - `episode.completed` - Episode ends (TOC complete)
   - `protocol.assignment.created` - Protocol assigned to patient

#### 2. **AI Check-In Initiation Events** 🤖
   - `outreach.plan.created` - Outreach plan created for patient
   - `outreach.attempt.scheduled` - Check-in attempt scheduled
   - `outreach.attempt.due` - Time to start check-in attempt
   - `outreach.attempt.started` - Check-in conversation started
   - `outreach.attempt.completed` - Check-in finished
   - `outreach.attempt.failed` - Check-in failed (no response)

#### 3. **AI Interaction Events** 💬
   - `patient.response.received` - Patient responds to AI check-in
   - `ai.flag.raised` - AI detects symptom and raises flag
   - `ai.handoff.initiated` - AI hands off to nurse
   - `ai.interaction.completed` - Single check-in completed
   - `ai.wellness.confirmed` - Patient confirms doing well (3+ times)
   - `ai.log.checkin` - Patient confirms all areas OK

#### 4. **Task & Escalation Events** 🚨
   - `task.created` - New escalation task created
   - `task.assigned` - Task assigned to nurse
   - `task.picked.up` - Nurse picks up task
   - `task.resolved` - Nurse resolves task
   - `task.sla.breach.warning` - Approaching SLA deadline (1h before)
   - `task.sla.breach` - SLA missed
   - `task.reassigned` - Task moved to different nurse

#### 5. **Nurse Workflow Events** 👩‍⚕️
   - `nurse.alert.new.task` - New task notification
   - `nurse.patient.contacted` - Nurse contacts patient
   - `nurse.contact.initiated` - Nurse starts outreach (SMS/call)
   - `nurse.contact.completed` - Nurse finished outreach
   - `nurse.ed.note.exported` - Clinical note sent to EHR

#### 6. **Communication & Messaging Events** 📱
   - `message.sent` - SMS/Voice/Email sent (Twilio/etc)
   - `message.delivered` - Message delivered to recipient
   - `message.failed` - Message delivery failed
   - `message.read` - Message read (if trackable)
   - `message.timeout` - No response within timeout window
   - `communication.queued` - Message queued for sending

#### 7. **Medication Events** 💊
   - `medication.missed` - Patient missed dose
   - `medication.pickup.confirmed` - Picked up at pharmacy
   - `medication.pickup.declined` - Refused pickup
   - `medication.barrier.cost` - Cost barrier identified
   - `medication.barrier.side.effects` - Side effects reported
   - `medication.switched` - Drug changed
   - `medication.adherent` - Taking as prescribed

#### 8. **Appointment & Transport Events** 🚗
   - `appointment.scheduled` - Follow-up scheduled
   - `appointment.confirmed` - Patient confirmed
   - `appointment.missed` - No-show
   - `transport.requested` - Transportation needed
   - `transport.confirmed` - Booking confirmed
   - `transport.completed` - Drop-off completed

#### 9. **System & Monitoring Events** 📊
   - `system.health.check` - Periodic health check
   - `event.queue.backlog` - Too many pending events
   - `event.processing.failed` - Event handler failed after retries
   - `api.error.high.rate` - Spike in API errors
   - `database.connection.issue` - DB connectivity problem

## Critical Workflows - Top 10 Must-Haves

### 1. **Patient Discharge → AI Check-In Flow** 🔄
**Trigger:** `episode.created`  
**Workflow:**
1. Create OutreachPlan (24h window)
2. Schedule first check-in attempt
3. Send welcome message to patient
4. Notify care team patient is enrolled

**Implementation:**
```typescript
// When episode created
await emit('episode.created', { episodeId, patientId });

// Handler
on('episode.created', async (event) => {
  const { episodeId, patientId } = event;
  
  // Create outreach plan
  const plan = await createOutreachPlan(episodeId);
  
  // Schedule first attempt (e.g., 24h after discharge)
  await scheduleOutreachAttempt(plan.id, tomorrow);
  
  // Send welcome message
  await sendWelcomeSMS(patientId);
  
  // Notify care team
  await notifyCareTeam(patientId);
});
```

### 2. **Outreach Attempt Due → Send Check-In** ⏰
**Trigger:** `outreach.attempt.due` (cron job)  
**Workflow:**
1. Find all attempts with `scheduled_at <= now`
2. Send SMS to patient
3. Update attempt status to `IN_PROGRESS`
4. Wait for patient response

### 3. **AI Raises Flag → Alert Nurse** 🚨
**Trigger:** `ai.flag.raised` or `task.created`  
**Workflow:**
1. Create EscalationTask
2. Assign to on-call nurse (round-robin)
3. Send SMS alert to nurse
4. Create notification in dashboard
5. Send email if severity = CRITICAL

### 4. **Patient Response → Process with AI** 💬
**Trigger:** `patient.response.received`  
**Workflow:**
1. Process patient message with AI
2. Parse symptoms and severity
3. Evaluate escalation rules
4. Generate appropriate response
5. If flag raised → trigger workflow #3

### 5. **Task SLA Warning → Re-Notify** ⚠️
**Trigger:** `task.sla.breach.warning` (1h before)  
**Workflow:**
1. Find tasks where `sla_due_at - 1h <= now` AND `status != RESOLVED`
2. Re-send SMS to assigned nurse
3. Escalate to supervisor if still pending
4. Log escalation

### 6. **Check-In Complete (Well) → Schedule Next** ✅
**Trigger:** `ai.log.checkin`  
**Workflow:**
1. Mark check-in as successful
2. Schedule next attempt (24-48h later)
3. If 3 successful check-ins → reduce frequency
4. If all critical areas covered → close episode

### 7. **Nurse Resolves Task → Notify Patient** 📞
**Trigger:** `task.resolved`  
**Workflow:**
1. Get resolution notes
2. If nurse contacted patient → log communication
3. Send closing message to patient
4. Archive task

### 8. **Medication Issue → Alert Care Team** 💊
**Trigger:** `medication.missed` or `medication.barrier.cost`  
**Workflow:**
1. Create task (MEDIUM priority)
2. Notify patient's assigned nurse
3. If cost barrier → send financial resources
4. If side effects → escalate to provider

### 9. **Message Delivery Failed → Retry Logic** ❌
**Trigger:** `message.failed`  
**Workflow:**
1. Log failure reason
2. If max retries not reached → retry with exponential backoff
3. If phone number invalid → flag patient record
4. If Twilio error → alert dev team

### 10. **Scheduled Outreach → Start AI Conversation** 🤖
**Trigger:** `outreach.attempt.due` (for specific patient)  
**Workflow:**
1. Send opening message via Twilio
2. Initialize AgentInteraction
3. Wait for patient response
4. Process with AI (workflow #4)
5. If no response in 24h → mark failed, retry schedule

## Recommended Architecture: Inngest 🚀

**Decision:** Inngest is the right choice for Sequora because:
- ✅ Built-in retries, idempotency, and reliability
- ✅ Visual workflow debugger (critical for complex health workflows)
- ✅ Scales automatically as you grow
- ✅ Open source + managed options
- ✅ Native scheduling for recurring tasks (check-ins, SLA warnings)
- ✅ Easy testing and development

### Why Not Simple Solutions?
- ❌ **Database triggers** → Hard to test, debug, and monitor
- ❌ **In-memory event bus** → Lost events on crash, no persistence
- ✅ **Inngest** → Enterprise reliability, visibility, scalability

## Proposed Architecture

### Option A: Supabase Realtime + Database Events (Lightweight) ⚠️ NOT RECOMMENDED

**Best for:** Teams already using Supabase, minimal infrastructure

#### Core Components:
1. **Event Publishing** - Database triggers emit events
2. **Event Subscribers** - Edge functions/workers listen to events
3. **Event Bus** - Supabase Realtime + custom channel

#### Implementation:

```sql
-- New table for event queue
CREATE TABLE "EventQueue" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  source_entity_type TEXT, -- 'AgentInteraction', 'EscalationTask', etc.
  source_entity_id UUID,
  status TEXT DEFAULT 'PENDING',
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT event_type_check CHECK (event_type IN (
    'ai.flag.raised',
    'task.created',
    'patient.discharged',
    'message.sent',
    'medication.missed'
    -- etc.
  ))
);

-- Trigger function to emit events
CREATE OR REPLACE FUNCTION emit_event()
RETURNS TRIGGER AS $$
DECLARE
  event_type TEXT;
BEGIN
  -- Determine event type based on table and operation
  IF TG_TABLE_NAME = 'EscalationTask' AND TG_OP = 'INSERT' THEN
    event_type := 'task.created';
  ELSIF TG_TABLE_NAME = 'AgentInteraction' AND TG_OP = 'UPDATE' THEN
    -- Check if status changed to COMPLETED
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
      event_type := 'ai.interaction.completed';
    END IF;
  END IF;

  -- Insert into event queue
  IF event_type IS NOT NULL THEN
    INSERT INTO "EventQueue" (event_type, event_payload, source_entity_type, source_entity_id)
    VALUES (
      event_type,
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'new', row_to_json(NEW),
        'old', row_to_json(OLD)
      ),
      TG_TABLE_NAME,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to key tables
CREATE TRIGGER escalation_task_event_trigger
  AFTER INSERT ON "EscalationTask"
  FOR EACH ROW EXECUTE FUNCTION emit_event();

CREATE TRIGGER agent_interaction_event_trigger
  AFTER INSERT OR UPDATE ON "AgentInteraction"
  FOR EACH ROW EXECUTE FUNCTION emit_event();

-- Indexes for event queue
CREATE INDEX idx_event_queue_status ON "EventQueue"(status, created_at);
CREATE INDEX idx_event_queue_type ON "EventQueue"(event_type, created_at);
```

#### Edge Function (Event Processor):

```typescript
// supabase-functions/functions/process-events/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Poll for pending events
  const { data: events } = await supabase
    .from('EventQueue')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(10);

  for (const event of events || []) {
    try {
      await processEvent(event);
      
      // Mark as processed
      await supabase
        .from('EventQueue')
        .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
        .eq('id', event.id);
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);
      // Increment retry count
      await supabase
        .from('EventQueue')
        .update({ retry_count: event.retry_count + 1 })
        .eq('id', event.id);
    }
  }

  return new Response(JSON.stringify({ processed: events?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function processEvent(event: any) {
  switch (event.event_type) {
    case 'task.created':
      await notifyNurseAboutTask(event);
      break;
    case 'ai.flag.raised':
      await sendAlert(event);
      break;
    case 'patient.discharged':
      await initiateFollowUp(event);
      break;
    // etc.
  }
}

async function notifyNurseAboutTask(event: any) {
  const task = event.event_payload.new;
  
  // Send SMS to assigned nurse
  const { data: nurse } = await supabase
    .from('User')
    .select('primary_phone')
    .eq('id', task.assigned_to_user_id)
    .single();

  if (nurse?.primary_phone) {
    // Use Twilio integration
    await fetch('http://localhost:54321/functions/v1/send-sms', {
      method: 'POST',
      body: JSON.stringify({
        to: nurse.primary_phone,
        body: `New task: ${task.reason_codes.join(', ')} - Priority: ${task.priority}`
      })
    });
  }
}
```

**Pros:**
- ✅ Minimal infrastructure (just Supabase)
- ✅ Eventual consistency built-in
- ✅ Easy to add new event types
- ✅ Can replay failed events
- ✅ No external dependencies

**Cons:**
- ⚠️ Requires polling (or trigger WebSocket)
- ⚠️ Need to manage retries manually

---

### Option B: Inngest (Event Orchestration) ✅ RECOMMENDED

**Best for:** Complex workflows, need reliability, team familiar with modern tools

#### Why Inngest?
- Built-in retries, idempotency
- Visual workflow builder
- Scales automatically
- Open source + managed options

#### Quick Start Guide
1. **Install Inngest**
```bash
npm install inngest
```

2. **Set up Inngest client**
```typescript
// lib/inngest.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'sequora',
  eventKey: process.env.INNGEST_EVENT_KEY! 
});
```

3. **Create Inngest endpoint (Next.js API route)**
```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { functions } from '@/lib/inngest/functions'; // Your event handlers

export const { GET, POST, PUT } = serve({ client: inngest, functions });
```

4. **Set environment variables**
```bash
INNGEST_EVENT_KEY=your_key_here
INNGEST_SIGNING_KEY=your_signing_key_here  # For dev server
INNGEST_APP_URL=http://localhost:3000  # For local dev
```

#### Implementation:

```typescript
// lib/events/inngest.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'sequora' });

// Define event schemas
export type PatientResponseReceived = {
  name: 'patient.response.received';
  data: {
    patientId: string;
    episodeId: string;
    messageText: string;
    interactionId: string;
  };
};

export type TaskCreated = {
  name: 'task.created';
  data: {
    taskId: string;
    severity: string;
    reasonCodes: string[];
    episodeId: string;
  };
};

// Send events from your app
import { inngest } from '@/lib/events/inngest';

// In interaction/route.ts after creating task
await inngest.send({
  name: 'task.created',
  data: {
    taskId: task.id,
    severity: task.severity,
    reasonCodes: task.reason_codes,
    episodeId: task.episode_id
  }
});
```

```typescript
// supabase-functions/functions/inngest-handler/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serve as serveInngest } from "https://esm.sh/inngest@2.3.2";

serve(
  serveInngest({
    client: { id: 'sequora' },
    functions: [
      {
        name: 'Notify nurse about new task',
        id: 'notify-nurse-task',
        trigger: { event: 'task.created' },
        fn: async ({ event }) => {
          // Fetch nurse info
          // Send SMS
          // Update notification log
        },
        retries: 3,
        onFailure: async ({ error }) => {
          // Log to Sentry/monitoring
        }
      },
      {
        name: 'Process patient discharge',
        id: 'process-discharge',
        trigger: { event: 'patient.discharged' },
        fn: async ({ event }) => {
          // Create outreach plan
          // Schedule first check-in
          // Notify care team
        }
      }
    ]
  })
);
```

**Pros:**
- ✅ Enterprise-grade reliability
- ✅ Built-in retries, scheduling
- ✅ Easy to test locally
- ✅ Visual UI for debugging
- ✅ Scales automatically

**Cons:**
- ⚠️ New dependency
- ⚠️ Slight learning curve
- ⚠️ Managed option costs $

---

### Option C: Simple In-App Event Bus (Current State + Enhancement) ❌ NOT RECOMMENDED

**Best for:** Keep it simple, minimal changes

Enhance what you have with a simple pattern:

```typescript
// lib/events/bus.ts
type EventHandler = (event: any) => Promise<void>;

class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  subscribe(eventType: string, handler: EventHandler) {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  async emit(eventType: string, eventData: any) {
    const handlers = this.handlers.get(eventType) || [];
    
    // Fire and forget for now
    handlers.forEach(handler => {
      handler(eventData).catch(error => {
        console.error(`Error handling ${eventType}:`, error);
      });
    });
  }
}

export const eventBus = new EventBus();

// Setup handlers at app start
// app/api/events/register-handlers.ts
import { eventBus } from '@/lib/events/bus';
import { sendSms } from '@/lib/notifications';

eventBus.subscribe('task.created', async (event) => {
  // Send SMS to nurse
});

eventBus.subscribe('ai.flag.raised', async (event) => {
  // Create escalation task
  // Send alert
});

// In your code
import { eventBus } from '@/lib/events/bus';

// After creating task
await supabase.from('EscalationTask').insert(task);
await eventBus.emit('task.created', { task });
```

**Pros:**
- ✅ Zero infrastructure
- ✅ Simple to understand
- ✅ No external deps

**Cons:**
- ⚠️ No persistence
- ⚠️ No retries
- ⚠️ Lost events if process crashes

---

## Implementation Plan for Inngest

### Phase 1: Core Setup (Week 1)
1. ✅ Install Inngest and set up client
2. ✅ Create `/api/inngest` endpoint
3. ✅ Configure environment variables
4. ✅ Test basic event sending/receiving

### Phase 2: Critical Workflows (Week 2-3)
1. ✅ Implement workflow #3: `task.created` → notify nurse
2. ✅ Implement workflow #1: `episode.created` → create outreach plan
3. ✅ Implement workflow #10: scheduled check-ins
4. ✅ Implement workflow #5: SLA breach warnings

### Phase 3: AI Integration (Week 4)
1. ✅ Implement workflow #4: `patient.response.received` → process with AI
2. ✅ Implement workflow #3: AI flag raising
3. ✅ Implement workflow #6: check-in completion flows

### Phase 4: Advanced Features (Week 5+)
1. ✅ Medication workflows
2. ✅ Appointment/transport workflows
3. ✅ System monitoring
4. ✅ Dashboard integration

### Next Steps

**Ready to start implementing?** I can:
1. Set up Inngest infrastructure
2. Create the first critical workflow (`task.created` → notify nurse)
3. Hook up existing code to emit events
4. Test with your current system

**First workflow to implement:** `task.created` → SMS nurse alert
This is already in your codebase but not automated!

Let's do it? 🚀

