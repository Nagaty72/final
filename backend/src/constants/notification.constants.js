export const NOTIFICATION_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

export const NOTIFICATION_TYPE = {
  SYSTEM: 'system',
  ALERT: 'alert',
  CUSTOM: 'custom'
};

export const NOTIFICATION_ROLE = {
  ALL: 'all',
  SUPER_ADMIN: 'super_admin',
  DECISION_MAKER: 'decision_maker',
  NORMAL_USER: 'normal_user',
  // Combined roles used for targeting multiple groups
  SUPER_ADMIN_AND_DECISION_MAKER: 'super_admin,decision_maker'
};
