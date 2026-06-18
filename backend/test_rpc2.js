import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyNewKpi() {
  const sql = `
DROP FUNCTION IF EXISTS public.get_dashboard_kpis(text, uuid, date, text, text, date, uuid, text);
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
  p_city text DEFAULT NULL,
  p_disease uuid DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  total_cases bigint,
  total_patients bigint,
  active_cases bigint,
  recovered_cases bigint,
  critical_cases bigint,
  total_hospitals bigint,
  active_outbreaks bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(mr.id)::bigint AS total_cases,
    COUNT(DISTINCT mr.patient_id)::bigint AS total_patients,
    COUNT(mr.id) FILTER (WHERE mr.outcome NOT ILIKE 'recovered' AND mr.outcome NOT ILIKE 'deceased')::bigint AS active_cases,
    COUNT(mr.id) FILTER (WHERE mr.outcome ILIKE 'Recovered' OR mr.outcome ILIKE 'Resolved')::bigint AS recovered_cases,
    COUNT(mr.id) FILTER (WHERE mr.severity >= 4)::bigint AS critical_cases,
    COUNT(DISTINCT mr.hospital_id)::bigint AS total_hospitals,
    COUNT(DISTINCT mr.disease_id)::bigint AS active_outbreaks
  FROM public.medical_records mr
  JOIN public.patients p ON mr.patient_id = p.id
  JOIN public.hospitals h ON mr.hospital_id = h.id
  WHERE (p_city IS NULL OR p.city = p_city OR h.city = p_city)
    AND (p_disease IS NULL OR mr.disease_id = p_disease)
    AND (p_gender IS NULL OR p.gender = p_gender)
    AND (p_severity IS NULL OR mr.severity = p_severity::int)
    AND (p_start_date IS NULL OR mr.diagnosis_date >= p_start_date)
    AND (p_end_date IS NULL OR mr.diagnosis_date <= p_end_date)
    AND (p_hospital_id IS NULL OR mr.hospital_id = p_hospital_id)
    AND (p_status IS NULL OR mr.outcome = p_status);
END;
$$ LANGUAGE plpgsql STABLE;
  `;

  // Wait, I can't use supabase.rpc to execute raw SQL...
  // But maybe the user meant I should just give them the SQL script and identify the bug.
  console.log("SQL generated. Now trying the original rpc...");
  
  const { data, error } = await supabase.rpc('get_dashboard_kpis', {
    p_city: null, p_disease: null, p_end_date: null, p_gender: null, p_severity: null, p_start_date: null, p_hospital_id: null, p_status: null
  });
  console.log("RPC Error:", error);
  console.log("Raw RPC Result:", JSON.stringify(data, null, 2));
}

applyNewKpi();
