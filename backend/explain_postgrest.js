import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function explainQuery() {
  const params = {
    p_city: 'Cairo',
    p_disease: null,
    p_end_date: null,
    p_gender: null,
    p_severity: null,
    p_start_date: null,
    p_hospital_id: null,
    p_status: null
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_dashboard_kpis`, {
    method: 'POST',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Accept': 'application/vnd.pgrst.plan+text; options=analyze',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  const text = await response.text();
  console.log("Status:", response.status);
  console.log("EXPLAIN ANALYZE Output:\n", text);
}

explainQuery();
