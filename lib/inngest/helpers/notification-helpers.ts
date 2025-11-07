/**
 * Type-Safe Notification Helpers
 * 
 * Helper functions for working with NotificationLog table
 */

import { Database } from '@/database.types';
import { getSupabaseAdmin } from '@/lib/supabase';

type NotificationLog = Database['public']['Tables']['NotificationLog']['Row'];
type NotificationLogInsert = Database['public']['Tables']['NotificationLog']['Insert'];
type NotificationType = Database['public']['Enums']['notification_type'];
type NotificationChannel = Database['public']['Enums']['notification_channel'];
type NotificationStatus = Database['public']['Enums']['notification_status'];

/**
 * Create a notification log entry
 */
export async function createNotificationLog(
  data: NotificationLogInsert
): Promise<{ data: NotificationLog | null; error: Error | null }> {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: notification, error } = await supabase
      .from('NotificationLog')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating notification log:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: notification, error: null };
  } catch (error) {
    console.error('❌ Unexpected error creating notification log:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Update notification status
 */
export async function updateNotificationStatus(
  notificationId: string,
  status: NotificationStatus,
  additionalData?: {
    providerMessageId?: string;
    failureReason?: string;
    sentAt?: string;
    deliveredAt?: string;
    failedAt?: string;
  }
): Promise<{ success: boolean; error?: Error }> {
  try {
    const supabase = getSupabaseAdmin();

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (additionalData?.providerMessageId) {
      updateData.provider_message_id = additionalData.providerMessageId;
    }
    if (additionalData?.failureReason) {
      updateData.failure_reason = additionalData.failureReason;
    }
    if (additionalData?.sentAt) {
      updateData.sent_at = additionalData.sentAt;
    }
    if (additionalData?.deliveredAt) {
      updateData.delivered_at = additionalData.deliveredAt;
    }
    if (additionalData?.failedAt) {
      updateData.failed_at = additionalData.failedAt;
    }

    const { error } = await supabase
      .from('NotificationLog')
      .update(updateData)
      .eq('id', notificationId);

    if (error) {
      console.error('❌ Error updating notification status:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error updating notification status:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50
): Promise<{ data: NotificationLog[]; error: Error | null }> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('NotificationLog')
      .select('*')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching user notifications:', error);
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Unexpected error fetching user notifications:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Get notifications for a task
 */
export async function getTaskNotifications(
  taskId: string
): Promise<{ data: NotificationLog[]; error: Error | null }> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('NotificationLog')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching task notifications:', error);
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Unexpected error fetching task notifications:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Get pending/failed notifications for retry
 */
export async function getPendingNotifications(
  maxRetries: number = 3
): Promise<{ data: NotificationLog[]; error: Error | null }> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('NotificationLog')
      .select('*')
      .in('status', ['PENDING', 'FAILED'])
      .lt('retry_count', maxRetries)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('❌ Error fetching pending notifications:', error);
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Unexpected error fetching pending notifications:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

// Export types for use in other files
export type {
  NotificationLog,
  NotificationLogInsert,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
};

