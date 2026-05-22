import { AlertService } from './alert.service.js';
import { NOTIFICATION_SEVERITY, NOTIFICATION_TYPE, NOTIFICATION_ROLE } from '../constants/notification.constants.js';

export const AnalyticsAlertService = {
  /**
   * Evaluates incoming daily stats and triggers necessary alerts.
   * Runs asynchronously without blocking the main upsert flow.
   * 
   * @param {object} statData The data being inserted (e.g. total_cases, severe_cases)
   */
  async evaluateDailyStats(statData) {
    try {
      const { disease_id, district_id, total_cases, severe_cases, hospital_load } = statData;

      // We assume the caller might only pass IDs. In a full system we'd fetch the actual names here.
      // For the sake of the alert message, we use generic placeholders if names are missing.
      const diseaseName = statData.disease_name || `Disease #${disease_id}`;
      const districtName = statData.district_name || `District #${district_id}`;

      // RULE 1: Outbreak Detection
      // IF cases for a disease increase significantly (e.g. > 50 in a single report)
      if (total_cases >= 50) {
        const key = `outbreak_alert_${disease_id}_${district_id}`;
        await AlertService.triggerAlert(key, {
          title: 'Outbreak Warning',
          message: `Abnormal outbreak growth detected! High number of ${diseaseName} cases (${total_cases}) reported in ${districtName}.`,
          type: NOTIFICATION_TYPE.ALERT,
          severity: NOTIFICATION_SEVERITY.CRITICAL,
          target_role: NOTIFICATION_ROLE.ALL,
          governorate: statData.governorate || null,
          metadata: { bypass_cooldown: statData.bypass_cooldown || false }
        }, 86400); // 24 hour cooldown
      }

      // RULE 2: High Severity Cases
      // IF critical/severe cases exceed threshold (e.g. > 15)
      // (Using fallback logic if severe_cases isn't explicitly passed, we guess it's 20% of total)
      const estimatedSevere = severe_cases !== undefined ? severe_cases : Math.floor(total_cases * 0.2);
      if (estimatedSevere >= 15) {
        const key = `severe_alert_${disease_id}_${district_id}`;
        await AlertService.triggerAlert(key, {
          title: 'High Severity Alert',
          message: `Critical/severe cases for ${diseaseName} have exceeded safety thresholds in ${districtName} (Est. ${estimatedSevere} cases).`,
          type: NOTIFICATION_TYPE.ALERT,
          severity: NOTIFICATION_SEVERITY.WARNING,
          target_role: NOTIFICATION_ROLE.SUPER_ADMIN_AND_DECISION_MAKER,
          metadata: { bypass_cooldown: statData.bypass_cooldown || false }
        }, 86400);
      }

      // RULE 3: Hospital Overload Risk
      // IF hospital utilization/case load becomes high (e.g. > 80% or > 100 cases)
      const load = hospital_load !== undefined ? hospital_load : total_cases;
      if (load >= 100) {
        const key = `hospital_overload_${district_id}`;
        await AlertService.triggerAlert(key, {
          title: 'Hospital Overload Risk',
          message: `Hospital case load in ${districtName} has reached critical capacity limits due to ${diseaseName} volume.`,
          type: NOTIFICATION_TYPE.SYSTEM,
          severity: NOTIFICATION_SEVERITY.CRITICAL,
          target_role: NOTIFICATION_ROLE.SUPER_ADMIN_AND_DECISION_MAKER,
          governorate: statData.governorate || null,
          metadata: { bypass_cooldown: statData.bypass_cooldown || false }
        }, 86400); // 24 hour cooldown
      }

    } catch (error) {
      console.error('[AnalyticsAlertService] Evaluation failed:', error);
    }
  }
};
