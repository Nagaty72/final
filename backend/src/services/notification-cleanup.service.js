import { getSupabase } from '../config/supabase.js';

export const NotificationCleanupService = {
  /**
   * Safely deletes notifications older than the specified number of days.
   * Useful for maintaining database performance over time.
   * 
   * @param {number} retentionDays Number of days to retain notifications (e.g. 30 or 60)
   */
  async cleanOldNotifications(retentionDays = 30) {
    const supabase = getSupabase();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffIso = cutoffDate.toISOString();

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffIso);

      if (error) throw error;
      
      console.log(`[NotificationCleanupService] Successfully removed notifications older than ${retentionDays} days.`);
      return { success: true, removedCount: data?.length || 0 };
    } catch (err) {
      console.error('[NotificationCleanupService] Failed to clean old notifications:', err);
      return { success: false, error: err.message };
    }
  }
};
