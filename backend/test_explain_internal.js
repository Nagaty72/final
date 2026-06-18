import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runExplain() {
  const sql = `
DROP FUNCTION IF EXISTS public.explain_internal_kpis(text);
CREATE OR REPLACE FUNCTION public.explain_internal_kpis(p_city text)
RETURNS SETOF text AS $$
BEGIN
  RETURN QUERY EXECUTE
  'EXPLAIN ANALYZE
   WITH filtered_records AS (
     SELECT mr.id, mr.patient_id, mr.hospital_id, mr.outcome, mr.severity
     FROM public.medical_records mr
   )
   SELECT 
     COUNT(mr.id)::bigint AS total_cases,
     COUNT(DISTINCT mr.patient_id)::bigint AS total_patients,
     COUNT(mr.id) FILTER (WHERE mr.outcome NOT ILIKE ''recovered'' AND mr.outcome NOT ILIKE ''deceased'')::bigint AS active_cases,
     COUNT(mr.id) FILTER (WHERE mr.outcome ILIKE ''recovered'' OR mr.outcome ILIKE ''resolved'')::bigint AS recovered_cases,
     COUNT(mr.id) FILTER (WHERE mr.severity >= 4)::bigint AS critical_cases,
     COUNT(DISTINCT mr.hospital_id)::bigint AS total_hospitals
   FROM filtered_records mr
   WHERE 
     (mr.patient_id IN (SELECT id FROM public.patients WHERE city = $1) OR 
      mr.hospital_id IN (SELECT id FROM public.hospitals WHERE city = $1))'
  USING p_city;
END;
$$ LANGUAGE plpgsql;
  `;

  // We can't execute DDL through postgrest without an exec_sql function!
  // Let me check if there's any exec_sql function already.
  const { data: testData, error: testErr } = await supabase.rpc('exec_sql', { query: sql });
  if (testErr) {
    console.error("No exec_sql function available:", testErr.message);
  }
}

runExplain();
