import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const rpcs = [
  'get_dashboard_kpis',
  'get_dashboard_trends',
  'get_dashboard_severity',
  'get_dashboard_disease_breakdown',
  'get_dashboard_bubble_data'
];

async function runDiagnostic() {
  const params = {
    p_city: null,
    p_disease: null,
    p_end_date: null,
    p_gender: null,
    p_severity: null,
    p_start_date: null,
    p_hospital_id: null,
    p_status: null
  };

  for (const rpc of rpcs) {
    console.log(`\n================================`);
    console.log(`Testing RPC: ${rpc}`);
    console.log(`================================`);
    
    // Normal Run to get execution time
    const start = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const duration = Date.now() - start;
    const body = await res.text();
    console.log(`Normal Execution Status: ${res.status}`);
    console.log(`Normal Execution Time: ${duration} ms`);
    if (res.status !== 200) {
       console.log(`Error Response:`, body.substring(0, 200));
    }

    // Explain Analyze
    const explainRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Accept': 'application/vnd.pgrst.plan+text; options=analyze',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const plan = await explainRes.text();
    console.log(`EXPLAIN ANALYZE Status: ${explainRes.status}`);
    console.log(`EXPLAIN ANALYZE Output:\n${plan}`);
  }
}

runDiagnostic();
