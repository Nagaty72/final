import { api } from './api';
import { supabase } from '@/lib/supabase';

export const notificationService = {
  /**
   * Fetch all notifications for the authenticated user.
   */
  async getAll() {
    return api.get('/api/v1/notifications');
  },

  /**
   * Fetch ALL notifications — admin panel view (Super Admin only).
   */
  async getAdminAll() {
    return api.get('/api/v1/notifications/admin');
  },

  /**
   * Create a notification (Super Admin only).
   */
  async create(payload) {
    return api.post('/api/v1/notifications', payload);
  },

  /**
   * Mark a specific notification as read.
   */
  async markAsRead(id) {
    return api.patch(`/api/v1/notifications/${id}/read`);
  },

  /**
   * Mark all unread notifications as read.
   */
  async markAllAsRead() {
    return api.patch('/api/v1/notifications/read-all');
  },

  /**
   * Update a notification (Super Admin only).
   */
  async update(id, payload) {
    return api.patch(`/api/v1/notifications/${id}`, payload);
  },

  /**
   * Delete a notification (Super Admin only).
   */
  async delete(id) {
    return api.delete(`/api/v1/notifications/${id}`);
  },

  /**
   * Subscribe to real-time notification inserts.
   */
  subscribeToNotifications(userId, userRole, userGovernorate, callback) {
    // Generate a unique channel name to prevent "callbacks after subscribe" error
    // when multiple components (Dropdown, Page) listen simultaneously or during HMR.
    const channelId = `notifications_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // We listen to ALL inserts on public.notifications
    // and filter client-side to ensure we don't expose unrelated data to UI.
    const channel = supabase.channel(channelId);
    
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        const newNotif = payload.new;
        
        // Filter if this notification targets the current user (loose typing for uuid vs int)
        const isDirect = String(newNotif.user_id) === String(userId);
        
        let isBroadcastTarget = false;
        if (newNotif.user_id === null) {
           const matchRole = !newNotif.target_role || newNotif.target_role === userRole || newNotif.target_role === 'all' || String(newNotif.target_role).includes(userRole);
           
           // Super admins receive alerts across all governorates.
           // Otherwise, check if governorate matches.
           const matchGov = userRole === 'super_admin' || !newNotif.governorate || newNotif.governorate === userGovernorate || newNotif.governorate === 'all';
           
           isBroadcastTarget = matchRole && matchGov;
        }

        if (isDirect || isBroadcastTarget) {
          callback(newNotif);
        }
      }
    ).subscribe((status, err) => {
      if (err) console.error(`[Realtime-Service] Channel error: ${err}`);
    });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
