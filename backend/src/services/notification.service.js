import { NotificationRepository } from '../repositories/notification.repository.js';
import { UserRepository } from '../repositories/user.repository.js';

export const NotificationService = {
  /**
   * Gets ALL notifications (admin view, unfiltered).
   */
  async getAllNotifications() {
    return await NotificationRepository.findAll();
  },

  /**
   * Gets all relevant notifications for a user, formatting and mapping role names.
   */
  async getUserNotifications(userId) {
    // We need the user's role_id and governorate to filter broadcasts
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('User not found');

    // Basic mapping: 1=super_admin, 2=decision_maker, 3=normal_user
    let roleName = 'normal_user';
    if (user.role_id === 1) roleName = 'super_admin';
    else if (user.role_id === 2) roleName = 'decision_maker';

    const governorate = user.governorate || null;

    return await NotificationRepository.findAllForUser(userId, roleName, governorate);
  },

  /**
   * Creates a notification. If user_id is null, it's a broadcast.
   */
  async createNotification(payload) {
    const {
      title,
      message,
      type = 'system',
      severity = 'info',
      user_id = null,
      target_role = null,
      governorate = null,
      metadata = {}
    } = payload;

    if (!title || !message) {
      throw new Error('Title and message are required');
    }

    const data = {
      title,
      message,
      type,
      severity,
      user_id,
      target_role: target_role || null,
      governorate: governorate || null,
      metadata
    };

    return await NotificationRepository.create(data);
  },

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(notificationId, userId) {
    const notif = await NotificationRepository.getById(notificationId);
    if (!notif) throw new Error('Notification not found');

    if (notif.user_id === userId) {
      // Direct notification
      await NotificationRepository.markAsReadDirect(notificationId, userId);
    } else if (notif.user_id === null) {
      // Broadcast notification
      await NotificationRepository.markAsReadBroadcast(notificationId, userId);
    } else {
      throw new Error('Unauthorized to read this notification');
    }
    return { success: true };
  },

  /**
   * Marks all unread notifications for a user as read.
   */
  async markAllAsRead(userId) {
    // 1. Mark all direct as read
    await NotificationRepository.markAllDirectAsRead(userId);

    // 2. We need to mark all valid broadcasts as read. 
    // To do this reliably, we fetch all notifications and mark the unread broadcasts.
    const allNotifs = await this.getUserNotifications(userId);
    const unreadBroadcasts = allNotifs.filter(n => n.user_id === null && n.is_read === false);
    
    for (const b of unreadBroadcasts) {
      await NotificationRepository.markAsReadBroadcast(b.id, userId);
    }

    return { success: true };
  },

  /**
   * Updates a notification (Admin only)
   */
  async updateNotification(notificationId, payload) {
    const notif = await NotificationRepository.getById(notificationId);
    if (!notif) throw new Error('Notification not found');
    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined && v !== null)
    );
    return await NotificationRepository.update(notificationId, cleaned);
  },

  /**
   * Deletes a notification (Admin only)
   */
  async deleteNotification(notificationId) {
    await NotificationRepository.delete(notificationId);
    return { success: true };
  }
};
