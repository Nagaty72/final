import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testBubble() {
  const rpcParams = {
    p_city:       null,
    p_disease:    null,
    p_gender:     null,
    p_severity:   null,
    p_status:     null,
    p_hospital_id: null,
    p_start_date: null,
    p_end_date:   null,
  };
  
  console.log("RPC Payload:", rpcParams);
  const { data, error } = await supabase.rpc('get_dashboard_bubble_data', rpcParams);
  
  if (error) {
    console.error("RPC Error:", error);
    return;
  }
  
  console.log(`Database returned row count: ${data?.length || 0}`);
  if (data && data.length > 0) {
    console.log("Sample of returned rows:", data.slice(0, 3));
  } else {
    console.log("No rows returned from DB.");
  }

  // Also trace what the frontend expects
  // The frontend calls normalizeRows() on this data
  function normalizeRows(res) {
    let raw = [];
    if (Array.isArray(res))               raw = res;
    else if (res?.data && Array.isArray(res.data)) raw = res.data;
    const normalized = raw.map(r => ({
      city:           String(r.city          || 'Unknown'),
      disease_name:   String(r.disease_name  || r.disease || 'Unknown'),
      total_cases:    Number(r.total_cases   ?? r.count ?? 0),
      hospital_count: Number(r.hospital_count || 1),
      mild:           Number(r.mild     || 0),
      moderate:       Number(r.moderate || 0),
      severe:         Number(r.severe   || 0),
      critical:       Number(r.critical || 0),
      extreme:        Number(r.extreme  || 0),
      load_index:     Number(r.load_index || 0),
    })).filter(r => r.total_cases > 0);
    console.log('Bubble API Rows:', raw.length);
    console.log('Normalized Rows:', normalized.length);
    return normalized;
  }

  const normalized = normalizeRows(data);
  console.log(`Normalized row count: ${normalized.length}`);
  if (normalized.length > 0) {
     console.log("Sample normalized rows:", normalized.slice(0, 3));
  }

  // And trace clustering logic
  // The map uses GOVERNORATE_COORDS with the `normalizeGovName(r.city)`
  const GOV_ALIASES = {
    'cairo': 'Cairo', 'al qahirah': 'Cairo', 'al-qahirah': 'Cairo', 'القاهرة': 'Cairo',
    // ... skipping the full list for the mock, just testing logic
  };
  function normalizeGovName(city) {
    if (!city) return '';
    const key = city.toLowerCase().replace(/[_']/g, ' ').replace(/\s+/g, ' ').trim();
    return GOV_ALIASES[key] ?? city;
  }
  
  let validClusters = 0;
  normalized.forEach(r => {
    const gov = normalizeGovName(r.city);
    // console.log(`City: ${r.city} -> Gov: ${gov}`);
    validClusters++;
  });
  console.log(`Valid clusters before grouping: ${validClusters}`);
}

testBubble();
