import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  const { data, error } = await supabase.rpc('get_dashboard_kpis', {
    p_city: null,
    p_disease: null,
    p_end_date: null,
    p_gender: null,
    p_severity: null,
    p_start_date: null,
    p_hospital_id: null,
    p_status: null
  });

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("Raw RPC Result for get_dashboard_kpis:");
    console.log(JSON.stringify(data, null, 2));
  }

  // Also let's check what outcomes exist
  const { data: outcomes } = await supabase.from('medical_records').select('outcome').limit(10);
  console.log("Sample outcomes:", outcomes);
}

testRpc();
