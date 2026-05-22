import 'dotenv/config';
import { AnalyticsService } from './src/services/analytics.service.js';
import { AnalyticsAlertService } from './src/services/analytics-alert.service.js';

async function test() {
  console.log('--- STARTING TEST ---');
  try {
    const payload = {
      disease_id: "debug_test_999",
      district_id: "debug_dist_999",
      date: "2026-05-22",
      disease_name: "Realtime Debug Virus",
      district_name: "Cairo",
      total_cases: 999,
      severe_cases: 999,
      hospital_load: 999,
      bypass_cooldown: true
    };
    
    await AnalyticsService.upsertDailyStat(payload);
    
    // Wait a bit for fire-and-forget promises
    await new Promise(r => setTimeout(r, 2000));
    console.log('--- TEST FINISHED ---');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

test();
