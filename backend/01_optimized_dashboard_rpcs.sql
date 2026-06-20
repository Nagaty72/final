-- ==============================================================================
-- ANALYTICS DASHBOARD PERFORMANCE FIXES (DYNAMIC SQL & INDEXES)
-- Execute this script in the Supabase SQL Editor to resolve statement timeouts
-- 
-- UPDATE: Includes default 30-day boundary to protect unrestricted load performance
-- ==============================================================================

-- 1. Apply Missing Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_severity ON public.medical_records(severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_outcome ON public.medical_records(outcome);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_gender ON public.patients(gender);

-- 2. Rewrite RPCs with Dynamic SQL

-- get_dashboard_kpis
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
  total_cases bigint, total_patients bigint, active_cases bigint,
  recovered_cases bigint, critical_cases bigint, total_hospitals bigint, active_outbreaks bigint
) AS $$
DECLARE v_sql text;
BEGIN
  v_sql := 'WITH filtered_records AS (
      SELECT mr.id, mr.patient_id, mr.hospital_id, mr.outcome, mr.severity, mr.disease_id
      FROM public.medical_records mr WHERE 1=1';

  IF p_disease IS NOT NULL THEN v_sql := v_sql || ' AND mr.disease_id = ' || quote_literal(p_disease); END IF;
  IF p_severity IS NOT NULL THEN v_sql := v_sql || ' AND mr.severity = ' || p_severity::int; END IF;
  IF p_hospital_id IS NOT NULL THEN v_sql := v_sql || ' AND mr.hospital_id = ' || quote_literal(p_hospital_id); END IF;
  IF p_status IS NOT NULL THEN v_sql := v_sql || ' AND mr.outcome = ' || quote_literal(p_status); END IF;

  -- Default Boundary Logic
  IF p_start_date IS NOT NULL THEN 
    v_sql := v_sql || ' AND mr.diagnosis_date >= ' || quote_literal(p_start_date); 
  ELSIF p_start_date IS NULL AND p_end_date IS NULL THEN
    v_sql := v_sql || ' AND mr.diagnosis_date >= CURRENT_DATE - INTERVAL ''30 days''';
  END IF;

  IF p_end_date IS NOT NULL THEN 
    v_sql := v_sql || ' AND mr.diagnosis_date <= ' || quote_literal(p_end_date); 
  END IF;

  v_sql := v_sql || ')
    SELECT 
      COUNT(mr.id)::bigint AS total_cases,
      COUNT(DISTINCT mr.patient_id)::bigint AS total_patients,
      COUNT(mr.id) FILTER (WHERE mr.outcome NOT ILIKE ''recovered'' AND mr.outcome NOT ILIKE ''deceased'')::bigint AS active_cases,
      COUNT(mr.id) FILTER (WHERE mr.outcome ILIKE ''recovered'' OR mr.outcome ILIKE ''resolved'')::bigint AS recovered_cases,
      COUNT(mr.id) FILTER (WHERE mr.severity >= 4)::bigint AS critical_cases,
      COUNT(DISTINCT mr.hospital_id)::bigint AS total_hospitals,
      COUNT(DISTINCT mr.disease_id)::bigint AS active_outbreaks
    FROM filtered_records mr
    LEFT JOIN public.patients p ON mr.patient_id = p.id
    LEFT JOIN public.hospitals h ON mr.hospital_id = h.id
    WHERE 1=1 ';

  IF p_city IS NOT NULL THEN v_sql := v_sql || ' AND (p.city = ' || quote_literal(p_city) || ' OR h.city = ' || quote_literal(p_city) || ')'; END IF;
  IF p_gender IS NOT NULL THEN v_sql := v_sql || ' AND p.gender = ' || quote_literal(p_gender); END IF;

  RETURN QUERY EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;

-- get_dashboard_trends
DROP FUNCTION IF EXISTS public.get_dashboard_trends(text, uuid, date, text, text, date, uuid, text);
CREATE OR REPLACE FUNCTION public.get_dashboard_trends(
  p_city text DEFAULT NULL, p_disease uuid DEFAULT NULL, p_end_date date DEFAULT NULL,
  p_gender text DEFAULT NULL, p_severity text DEFAULT NULL, p_start_date date DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL, p_status text DEFAULT NULL
)
RETURNS TABLE (month text, total_cases bigint) AS $$
DECLARE v_sql text;
BEGIN
  v_sql := 'SELECT to_char(mr.diagnosis_date, ''YYYY-MM'') as month, COUNT(mr.id)::bigint as total_cases
    FROM public.medical_records mr
    LEFT JOIN public.patients p ON mr.patient_id = p.id
    LEFT JOIN public.hospitals h ON mr.hospital_id = h.id WHERE 1=1';
    
  IF p_disease IS NOT NULL THEN v_sql := v_sql || ' AND mr.disease_id = ' || quote_literal(p_disease); END IF;
  IF p_severity IS NOT NULL THEN v_sql := v_sql || ' AND mr.severity = ' || p_severity::int; END IF;
  IF p_hospital_id IS NOT NULL THEN v_sql := v_sql || ' AND mr.hospital_id = ' || quote_literal(p_hospital_id); END IF;
  IF p_status IS NOT NULL THEN v_sql := v_sql || ' AND mr.outcome = ' || quote_literal(p_status); END IF;
  IF p_city IS NOT NULL THEN v_sql := v_sql || ' AND (p.city = ' || quote_literal(p_city) || ' OR h.city = ' || quote_literal(p_city) || ')'; END IF;
  IF p_gender IS NOT NULL THEN v_sql := v_sql || ' AND p.gender = ' || quote_literal(p_gender); END IF;

  -- Default Boundary Logic
  IF p_start_date IS NOT NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date >= ' || quote_literal(p_start_date); 
  ELSIF p_start_date IS NULL AND p_end_date IS NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date >= CURRENT_DATE - INTERVAL ''30 days'''; END IF;
  IF p_end_date IS NOT NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date <= ' || quote_literal(p_end_date); END IF;

  v_sql := v_sql || ' GROUP BY month ORDER BY month ASC';
  RETURN QUERY EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;

-- get_dashboard_severity
DROP FUNCTION IF EXISTS public.get_dashboard_severity(text, uuid, date, text, text, date, uuid, text);
CREATE OR REPLACE FUNCTION public.get_dashboard_severity(
  p_city text DEFAULT NULL, p_disease uuid DEFAULT NULL, p_end_date date DEFAULT NULL,
  p_gender text DEFAULT NULL, p_severity text DEFAULT NULL, p_start_date date DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL, p_status text DEFAULT NULL
)
RETURNS TABLE (severity int, total_cases bigint) AS $$
DECLARE v_sql text;
BEGIN
  v_sql := 'SELECT mr.severity, COUNT(mr.id)::bigint as total_cases
    FROM public.medical_records mr
    LEFT JOIN public.patients p ON mr.patient_id = p.id
    LEFT JOIN public.hospitals h ON mr.hospital_id = h.id WHERE mr.severity IS NOT NULL';
    
  IF p_disease IS NOT NULL THEN v_sql := v_sql || ' AND mr.disease_id = ' || quote_literal(p_disease); END IF;
  IF p_severity IS NOT NULL THEN v_sql := v_sql || ' AND mr.severity = ' || p_severity::int; END IF;
  IF p_hospital_id IS NOT NULL THEN v_sql := v_sql || ' AND mr.hospital_id = ' || quote_literal(p_hospital_id); END IF;
  IF p_status IS NOT NULL THEN v_sql := v_sql || ' AND mr.outcome = ' || quote_literal(p_status); END IF;
  IF p_city IS NOT NULL THEN v_sql := v_sql || ' AND (p.city = ' || quote_literal(p_city) || ' OR h.city = ' || quote_literal(p_city) || ')'; END IF;
  IF p_gender IS NOT NULL THEN v_sql := v_sql || ' AND p.gender = ' || quote_literal(p_gender); END IF;

  -- Default Boundary Logic
  IF p_start_date IS NOT NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date >= ' || quote_literal(p_start_date); 
  ELSIF p_start_date IS NULL AND p_end_date IS NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date >= CURRENT_DATE - INTERVAL ''30 days'''; END IF;
  IF p_end_date IS NOT NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date <= ' || quote_literal(p_end_date); END IF;

  v_sql := v_sql || ' GROUP BY mr.severity ORDER BY mr.severity ASC';
  RETURN QUERY EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;

-- get_dashboard_disease_breakdown
DROP FUNCTION IF EXISTS public.get_dashboard_disease_breakdown(text, uuid, date, text, text, date, uuid, text);
CREATE OR REPLACE FUNCTION public.get_dashboard_disease_breakdown(
  p_city text DEFAULT NULL, p_disease uuid DEFAULT NULL, p_end_date date DEFAULT NULL,
  p_gender text DEFAULT NULL, p_severity text DEFAULT NULL, p_start_date date DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL, p_status text DEFAULT NULL
)
RETURNS TABLE (disease_name text, total_cases bigint) AS $$
DECLARE v_sql text;
BEGIN
  v_sql := 'SELECT d.name, COUNT(mr.id)::bigint as total_cases
    FROM public.medical_records mr
    JOIN public.diseases d ON mr.disease_id = d.id
    LEFT JOIN public.patients p ON mr.patient_id = p.id
    LEFT JOIN public.hospitals h ON mr.hospital_id = h.id WHERE 1=1';
    
  IF p_disease IS NOT NULL THEN v_sql := v_sql || ' AND mr.disease_id = ' || quote_literal(p_disease); END IF;
  IF p_severity IS NOT NULL THEN v_sql := v_sql || ' AND mr.severity = ' || p_severity::int; END IF;
  IF p_hospital_id IS NOT NULL THEN v_sql := v_sql || ' AND mr.hospital_id = ' || quote_literal(p_hospital_id); END IF;
  IF p_status IS NOT NULL THEN v_sql := v_sql || ' AND mr.outcome = ' || quote_literal(p_status); END IF;
  IF p_city IS NOT NULL THEN v_sql := v_sql || ' AND (p.city = ' || quote_literal(p_city) || ' OR h.city = ' || quote_literal(p_city) || ')'; END IF;
  IF p_gender IS NOT NULL THEN v_sql := v_sql || ' AND p.gender = ' || quote_literal(p_gender); END IF;

  -- Default Boundary Logic
  IF p_start_date IS NOT NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date >= ' || quote_literal(p_start_date); 
  ELSIF p_start_date IS NULL AND p_end_date IS NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date >= CURRENT_DATE - INTERVAL ''30 days'''; END IF;
  IF p_end_date IS NOT NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date <= ' || quote_literal(p_end_date); END IF;

  v_sql := v_sql || ' GROUP BY d.name ORDER BY total_cases DESC LIMIT 10';
  RETURN QUERY EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;

-- get_dashboard_bubble_data
DROP FUNCTION IF EXISTS public.get_dashboard_bubble_data(text, uuid, date, text, text, date, uuid, text);
CREATE OR REPLACE FUNCTION public.get_dashboard_bubble_data(
  p_city text DEFAULT NULL, p_disease uuid DEFAULT NULL, p_end_date date DEFAULT NULL,
  p_gender text DEFAULT NULL, p_severity text DEFAULT NULL, p_start_date date DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL, p_status text DEFAULT NULL
)
RETURNS TABLE (city text, disease_name text, total_cases bigint) AS $$
DECLARE v_sql text;
BEGIN
  v_sql := 'SELECT COALESCE(p.city, h.city) as city, d.name as disease_name, COUNT(mr.id)::bigint as total_cases
    FROM public.medical_records mr
    JOIN public.diseases d ON mr.disease_id = d.id
    LEFT JOIN public.patients p ON mr.patient_id = p.id
    LEFT JOIN public.hospitals h ON mr.hospital_id = h.id WHERE 1=1';
    
  IF p_disease IS NOT NULL THEN v_sql := v_sql || ' AND mr.disease_id = ' || quote_literal(p_disease); END IF;
  IF p_severity IS NOT NULL THEN v_sql := v_sql || ' AND mr.severity = ' || p_severity::int; END IF;
  IF p_hospital_id IS NOT NULL THEN v_sql := v_sql || ' AND mr.hospital_id = ' || quote_literal(p_hospital_id); END IF;
  IF p_status IS NOT NULL THEN v_sql := v_sql || ' AND mr.outcome = ' || quote_literal(p_status); END IF;
  IF p_city IS NOT NULL THEN v_sql := v_sql || ' AND (p.city = ' || quote_literal(p_city) || ' OR h.city = ' || quote_literal(p_city) || ')'; END IF;
  IF p_gender IS NOT NULL THEN v_sql := v_sql || ' AND p.gender = ' || quote_literal(p_gender); END IF;

  -- Default Boundary Logic
  IF p_start_date IS NOT NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date >= ' || quote_literal(p_start_date); 
  ELSIF p_start_date IS NULL AND p_end_date IS NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date >= CURRENT_DATE - INTERVAL ''30 days'''; END IF;
  IF p_end_date IS NOT NULL THEN v_sql := v_sql || ' AND mr.diagnosis_date <= ' || quote_literal(p_end_date); END IF;

  v_sql := v_sql || ' GROUP BY COALESCE(p.city, h.city), d.name ORDER BY total_cases DESC';
  RETURN QUERY EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;
