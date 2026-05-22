import NodeCache from 'node-cache';
import { NotificationService } from './notification.service.js';

// Cooldown cache: 24 hours standard (86400 seconds)
// checkperiod: clean up expired keys every hour
const alertCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

export const AlertService = {
  /**
   * Triggers an alert if it hasn't been triggered within the cooldown period.
   * @param {string} deduplicationKey Unique key for this specific alert
   * @param {object} payload Notification payload
   * @param {number} cooldownSeconds Cooldown before triggering again (default 24h)
   */
  async triggerAlert(deduplicationKey, payload, cooldownSeconds = 86400) {
    // Check if bypass flag is present in metadata, and only allow it in development/testing
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isBypass = payload.metadata && payload.metadata.bypass_cooldown && isDevelopment;

    // 1. Duplicate Prevention: Check cooldown cache
    if (!isBypass && alertCache.has(deduplicationKey)) {
      return false;
    }

    try {
      // 2. Fire the notification
      await NotificationService.createNotification(payload);
      
      // 3. Set the cooldown lock
      const ttl = isBypass ? 1 : cooldownSeconds;
      alertCache.set(deduplicationKey, true, ttl);
      
      return true;
    } catch (err) {
      console.error('[AlertService] Failed to trigger alert:', err);
      return false;
    }
  }
};
