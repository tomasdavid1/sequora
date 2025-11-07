/**
 * Inngest Webhook Endpoint
 * 
 * This endpoint serves all Inngest functions and handles event processing.
 * Inngest will send events to this endpoint, which will trigger the appropriate functions.
 * 
 * Route: POST /api/inngest
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';

// Import all Inngest functions
import { assignTaskToNurse } from '@/lib/inngest/functions/assign-task';
import { sendNotification } from '@/lib/inngest/functions/send-notification';
import { monitorTaskSLA } from '@/lib/inngest/functions/monitor-sla';
import { scheduleCheckIn } from '@/lib/inngest/functions/schedule-checkin';
import { handleCheckInResponse } from '@/lib/inngest/functions/handle-checkin-response';
import { createOutreachPlan } from '@/lib/inngest/functions/create-outreach-plan';
import { handleRiskChange } from '@/lib/inngest/functions/handle-risk-change';
import { handleManualCheckIn } from '@/lib/inngest/functions/handle-manual-checkin';

/**
 * Configure and serve Inngest functions
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Task Management
    assignTaskToNurse,
    monitorTaskSLA,
    
    // Notifications
    sendNotification,
    
    // Check-ins & Outreach
    createOutreachPlan,
    scheduleCheckIn,
    handleManualCheckIn,
    handleCheckInResponse,
    
    // Risk Management
    handleRiskChange, // Handles both upgrades and downgrades
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
  
  // Streaming is recommended for long-running functions
  streaming: 'allow',
});

