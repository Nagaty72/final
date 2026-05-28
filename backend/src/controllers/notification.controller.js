import { NotificationService } from '../services/notification.service.js';

export const NotificationController = {
  // Admin: get ALL notifications (unfiltered)
  async getAllAdmin(req, res, next) {
    try {
      const data = await NotificationService.getAllNotifications();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await NotificationService.getUserNotifications(userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await NotificationService.createNotification(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      await NotificationService.markAsRead(id, userId);
      res.json({ success: true, message: 'Marked as read' });
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      await NotificationService.markAllAsRead(userId);
      res.json({ success: true, message: 'All marked as read' });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, message, type, severity } = req.body;
      if (!title && !message && !type && !severity) {
        return res.status(400).json({ success: false, error: 'At least one field is required to update' });
      }
      const data = await NotificationService.updateNotification(id, { title, message, type, severity });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await NotificationService.deleteNotification(id);
      res.json({ success: true, message: 'Notification deleted' });
    } catch (err) {
      next(err);
    }
  }
};
