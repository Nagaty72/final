import { getSupabase } from '../config/supabase.js';

export const NotificationRepository = {
  /**
   * Fetch all notifications for a specific user, including targeted broadcasts.
   * Also resolves the `is_read` state for broadcasts using `notification_reads`.
   */
  async findAllForUser(userId, roleName, governorate) {
    const supabase = getSupabase();

    // 1. Fetch direct notifications
    const { data: direct, error: err1 } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (err1) throw err1;

    // 2. Fetch broadcast notifications targeting this user
    let broadcastQuery = supabase
      .from('notifications')
      .select('*')
      .is('user_id', null)
      .order('created_at', { ascending: false });

    const { data: broadcasts, error: err2 } = await broadcastQuery;
    if (err2) throw err2;

    // Filter broadcasts by role/governorate in JS to simplify query logic
    // (In production with large data, this should be a complex SQL query or RPC)
    const validBroadcasts = broadcasts.filter(b => {
      const matchRole = !b.target_role || b.target_role === roleName || b.target_role === 'all' || b.target_role.includes(roleName);
      const matchGov = !b.governorate || b.governorate === governorate || b.governorate === 'all';
      return matchRole && matchGov;
    });

    // 3. Fetch read statuses for the valid broadcasts
    let readBroadcasts = new Set();
    if (validBroadcasts.length > 0) {
      const bIds = validBroadcasts.map(b => b.id);
      const { data: reads, error: err3 } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId)
        .in('notification_id', bIds);
      
      if (!err3 && reads) {
        reads.forEach(r => readBroadcasts.add(r.notification_id));
      }
    }

    // Map read statuses
    const processedBroadcasts = validBroadcasts.map(b => ({
      ...b,
      is_read: readBroadcasts.has(b.id)
    }));

    // Combine and sort
    const allNotifications = [...direct, ...processedBroadcasts].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return allNotifications;
  },

  async create(data) {
    const supabase = getSupabase();
    const { data: result, error } = await supabase
      .from('notifications')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  async getById(id) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // ignore no rows
    return data;
  },

  async markAsReadDirect(id, userId) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  },

  async markAsReadBroadcast(id, userId) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('notification_reads')
      .upsert({ notification_id: id, user_id: userId }, { onConflict: 'notification_id, user_id' });
    
    if (error) throw error;
  },

  async markAllDirectAsRead(userId) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
  },

  async delete(id) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
