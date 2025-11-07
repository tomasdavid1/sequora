# Sequora Inngest Integration

This directory contains the event-driven architecture implementation using [Inngest](https://www.inngest.com/).

## Overview

Sequora uses Inngest for reliable, event-driven workflows including:
- **Task Assignment**: Automatically assign escalation tasks to available nurses
- **Notifications**: Send SMS, email, and push notifications to users and patients
- **SLA Monitoring**: Track task SLAs and send warnings/breach notifications
- **Check-In Scheduling**: Schedule and manage patient check-ins post-discharge

## Directory Structure

```
lib/inngest/
├── client.ts                    # Inngest client and event schema definitions
├── functions/                   # Inngest function definitions
│   ├── assign-task.ts          # Auto-assign tasks to nurses (round-robin)
│   ├── send-notification.ts    # Send notifications via SMS/email/push
│   ├── monitor-sla.ts          # Monitor task SLAs and send alerts
│   ├── schedule-checkin.ts     # Schedule check-ins 24h after discharge
│   └── handle-checkin-response.ts  # Process patient responses
├── services/                    # External service integrations
│   ├── twilio.ts               # Twilio SMS/WhatsApp/Voice
│   └── email.ts                # Email service (placeholder)
├── helpers/                     # Type-safe database helpers
│   ├── notification-helpers.ts # NotificationLog CRUD operations
│   └── task-helpers.ts         # EscalationTask CRUD operations
└── README.md                    # This file
```

## Event Schema

All events are type-safe and defined in `client.ts`. Key events:

### Patient Events
- `patient/discharged` - Triggered when patient is discharged
- `patient/enrolled` - Triggered when patient enrolls in program

### Check-In Events
- `checkin/scheduled` - Check-in scheduled for patient
- `checkin/initiated` - Check-in conversation started
- `checkin/completed` - Check-in successfully completed

### Interaction Events
- `interaction/response_received` - Patient responded to AI
- `interaction/escalated` - Interaction escalated to nurse

### Task Events
- `task/created` - New escalation task created
- `task/assigned` - Task assigned to nurse
- `task/resolved` - Task resolved by nurse
- `task/sla_warning` - Task approaching SLA deadline
- `task/sla_breach` - Task exceeded SLA deadline

### Notification Events
- `notification/send` - Send notification request
- `notification/delivered` - Notification delivered successfully
- `notification/failed` - Notification delivery failed

## Usage

### Emitting Events

Use the type-safe `emitEvent` helper:

```typescript
import { emitEvent } from '@/lib/inngest/client';

// Emit a task created event
await emitEvent('task/created', {
  taskId: '123',
  episodeId: '456',
  patientId: '789',
  priority: 'HIGH',
  severity: 'MODERATE',
  reasonCodes: ['HF_BREATHING_WORSE'],
  actionType: 'NURSE_CALLBACK_2H',
  slaMinutes: 120,
  createdAt: new Date().toISOString(),
});
```

### Creating Functions

Inngest functions are defined in `functions/` and registered in `app/api/inngest/route.ts`:

```typescript
import { inngest } from '@/lib/inngest/client';

export const myFunction = inngest.createFunction(
  {
    id: 'my-function',
    name: 'My Function',
    retries: 3,
  },
  { event: 'my/event' },
  async ({ event, step }) => {
    // Step 1: Do something
    const result = await step.run('step-1', async () => {
      // Your code here
      return { success: true };
    });

    // Step 2: Do something else
    await step.run('step-2', async () => {
      // Your code here
    });

    return { success: true };
  }
);
```

### Using Database Helpers

Type-safe helpers are available in `helpers/`:

```typescript
import { createNotificationLog, updateNotificationStatus } from '@/lib/inngest/helpers/notification-helpers';
import { assignTask, getTaskById } from '@/lib/inngest/helpers/task-helpers';

// Create notification log
const { data, error } = await createNotificationLog({
  recipient_user_id: nurseId,
  notification_type: 'TASK_ASSIGNED',
  channel: 'SMS',
  status: 'PENDING',
  message_content: 'New task assigned',
});

// Assign task to nurse
await assignTask(taskId, nurseId);
```

## Environment Variables

Required environment variables:

```bash
# Inngest
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key

# Twilio (for SMS/Voice)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890  # Optional

# App URL (for callbacks)
NEXT_PUBLIC_APP_URL=https://your-app.com
```

## Development

### Local Development

1. Start Inngest Dev Server:
   ```bash
   npx inngest-cli@latest dev
   ```

2. Start your Next.js app:
   ```bash
   npm run dev
   ```

3. Visit http://localhost:8288 to see the Inngest dashboard

### Testing Events

You can manually trigger events from the Inngest dashboard or via code:

```typescript
import { emitEvent } from '@/lib/inngest/client';

await emitEvent('task/created', {
  // ... event data
});
```

## Deployment

### Inngest Cloud

1. Sign up at [inngest.com](https://www.inngest.com/)
2. Create a new app
3. Get your `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`
4. Add them to your production environment variables
5. Deploy your Next.js app - Inngest will automatically discover your functions at `/api/inngest`

### Vercel

Inngest works seamlessly with Vercel. Just add your environment variables and deploy.

## Key Features

### Automatic Retries
All functions have automatic retries (default: 3) with exponential backoff.

### Step Functions
Use `step.run()` to break functions into recoverable steps. If a step fails, only that step is retried.

### Delayed Execution
Use `step.sleep()` for delayed execution:

```typescript
await step.sleep('wait-24-hours', 24 * 60 * 60 * 1000);
```

### Visual Dashboard
Inngest provides a visual dashboard to monitor all function executions, view logs, and debug issues.

### Type Safety
All events are fully type-safe with TypeScript, preventing runtime errors.

## Best Practices

1. **Always use `step.run()`** for any operation that might fail
2. **Emit events after database operations**, not before
3. **Don't fail the request if event emission fails** - log and continue
4. **Use descriptive step names** for easier debugging
5. **Keep functions focused** - one function per workflow
6. **Use helpers** for database operations to maintain type safety

## Troubleshooting

### Events not triggering functions
- Check that the event name matches exactly (case-sensitive)
- Verify `INNGEST_EVENT_KEY` is set correctly
- Check the Inngest dashboard for errors

### Functions failing
- Check the Inngest dashboard for detailed error logs
- Verify all environment variables are set
- Check database permissions (RLS policies)

### SLA monitoring not working
- Ensure tasks have `sla_due_at` set
- Check that `slaMinutes > 0` in the event data
- Verify the function is registered in `/api/inngest/route.ts`

## Resources

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest TypeScript SDK](https://www.inngest.com/docs/reference/typescript)
- [Event-Driven Architecture Design](../../docs/EVENT_ARCHITECTURE_DESIGN.md)
- [How Inngest Works](../../docs/HOW_INNGEST_WORKS.md)

