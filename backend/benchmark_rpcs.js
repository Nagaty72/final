import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runBenchmark() {
  const params = {
    p_city: null,
    p_disease: null,
    p_end_date: '2026-06-19',
    p_gender: null,
    p_severity: null,
    p_start_date: '2025-06-18',
    p_hospital_id: null,
    p_status: null
  };

  const results = [];
  const functions = [
    'get_dashboard_kpis',
    'get_dashboard_trends',
    'get_dashboard_severity',
    'get_dashboard_disease_breakdown',
    'get_dashboard_bubble_data'
  ];

  console.log("Starting Benchmark...");

  for (const fn of functions) {
    const start = Date.now();
    try {
      const { data, error } = await supabase.rpc(fn, params);
      const duration = Date.now() - start;
      if (error) {
        results.push({ Function: fn, 'Execution Time': `${duration}ms`, Status: `ERROR: ${error.message}` });
      } else {
        results.push({ Function: fn, 'Execution Time': `${duration}ms`, Status: 'SUCCESS' });
      }
    } catch (e) {
      const duration = Date.now() - start;
      results.push({ Function: fn, 'Execution Time': `${duration}ms`, Status: `EXCEPTION: ${e.message}` });
    }
  }

  console.table(results);
}

runBenchmark();
