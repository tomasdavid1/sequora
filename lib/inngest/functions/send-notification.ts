/**
 * Inngest Function: Send Notification
 * 
 * Triggered when: notification/send event is emitted
 * Purpose: Send notifications via SMS, email, or push to users/patients
 */

import { inngest } from '@/lib/inngest/client';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/inngest/services/twilio';
import { sendEmail } from '@/lib/inngest/services/email';

export const sendNotification = inngest.createFunction(
  {
    id: 'send-notification',
    name: 'Send Notification',
    retries: 3,
  },
  { event: 'notification/send' },
  async ({ event, step }) => {
    const {
      recipientUserId,
      recipientPatientId,
      notificationType,
      channel,
      messageContent,
      subject,
      taskId,
      episodeId,
      metadata,
    } = event.data;

    // Step 1: Create notification log entry
    const notificationLog = await step.run('create-notification-log', async () => {
      const supabase = getSupabaseAdmin();

      // Extract outreach_plan_id from metadata if present
      const outreachPlanId = metadata?.outreachPlanId || null;

      const { data, error} = await supabase
        .from('NotificationLog')
        .insert({
          task_id: taskId,
          episode_id: episodeId,
          recipient_user_id: recipientUserId,
          recipient_patient_id: recipientPatientId,
          notification_type: notificationType,
          channel,
          status: 'PENDING',
          message_content: messageContent,
          subject,
          outreach_plan_id: outreachPlanId, // Link to outreach plan if part of campaign
          metadata: metadata || {},
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating notification log:', error);
        throw new Error(`Failed to create notification log: ${error.message}`);
      }

      return data;
    });

    // Step 2: Get recipient contact info
    const recipient = await step.run('get-recipient-info', async () => {
      const supabase = getSupabaseAdmin();

      if (recipientUserId) {
        const { data, error } = await supabase
          .from('User')
          .select('id, email, phone')
          .eq('id', recipientUserId)
          .single();

        if (error) throw new Error(`Failed to get user: ${error.message}`);
        return { type: 'user' as const, ...data };
      } else if (recipientPatientId) {
        const { data, error } = await supabase
          .from('Patient')
          .select('id, email, primary_phone')
          .eq('id', recipientPatientId)
          .single();

        if (error) throw new Error(`Failed to get patient: ${error.message}`);
        return { type: 'patient' as const, ...data };
      }

      throw new Error('No recipient specified');
    });

    // Step 3: Send notification via appropriate channel
    const sendResult = await step.run('send-notification', async () => {
      try {
        if (channel === 'SMS') {
          const phone = recipient.type === 'user' ? recipient.phone : recipient.primary_phone;
          if (!phone) {
            throw new Error('Recipient has no phone number');
          }
          return await sendSMS(phone, messageContent);
        } else if (channel === 'EMAIL') {
          const email = recipient.email;
          if (!email) {
            throw new Error('Recipient has no email');
          }
          return await sendEmail(email, subject || 'Sequora Notification', messageContent);
        } else if (channel === 'PUSH') {
          // TODO: Implement push notifications
          console.log('📱 Push notifications not yet implemented');
          return { success: false, error: 'Push not implemented' };
        } else {
          throw new Error(`Unsupported channel: ${channel}`);
        }
      } catch (error) {
        console.error(`❌ Error sending ${channel} notification:`, error);
        throw error;
      }
    });

    // Step 4: Update notification log with result
    await step.run('update-notification-log', async () => {
      const supabase = getSupabaseAdmin();

      if (sendResult.success) {
        await supabase
          .from('NotificationLog')
          .update({
            status: 'SENT',
            sent_at: new Date().toISOString(),
            provider_message_id: sendResult.messageId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', notificationLog.id);

        // Emit delivered event (will be updated by webhook)
        await inngest.send({
          name: 'notification/delivered',
          data: {
            notificationId: notificationLog.id,
            providerMessageId: sendResult.messageId,
            deliveredAt: new Date().toISOString(),
          },
        });
      } else {
        await supabase
          .from('NotificationLog')
          .update({
            status: 'FAILED',
            failed_at: new Date().toISOString(),
            failure_reason: sendResult.error || 'Unknown error',
            retry_count: (notificationLog.retry_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', notificationLog.id);

        // Emit failed event
        await inngest.send({
          name: 'notification/failed',
          data: {
            notificationId: notificationLog.id,
            failureReason: sendResult.error || 'Unknown error',
            retryCount: (notificationLog.retry_count || 0) + 1,
            failedAt: new Date().toISOString(),
          },
        });
      }
    });

    console.log(`✅ Notification sent via ${channel} to ${recipient.type} ${recipient.id}`);

    return {
      success: sendResult.success,
      notificationId: notificationLog.id,
      channel,
      recipient: recipient.id,
    };
  }
);

