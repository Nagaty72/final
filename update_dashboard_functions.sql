-- =================================================================================
-- 1. PERFORMANCE INDEXES
-- Ensuring covering indexes exist to prevent Seq Scans and Bitmap Heap Scans.
-- =================================================================================
CREATE INDEX IF NOT EXISTS idx_patients_city ON public.patients(city);
CREATE INDEX IF NOT EXISTS idx_patients_gender ON public.patients(gender);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON public.hospitals(city);
CREATE INDEX IF NOT EXISTS idx_records_disease ON public.medical_records(disease_id);
CREATE INDEX IF NOT EXISTS idx_records_hospital ON public.medical_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_records_patient ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_records_outcome ON public.medical_records(outcome);
CREATE INDEX IF NOT EXISTS idx_records_severity ON public.medical_records(severity);
CREATE INDEX IF NOT EXISTS idx_records_date ON public.medical_records(diagnosis_date);

-- =================================================================================
-- 2. DASHBOARD FUNCTIONS (LAST KNOWN WORKING STATE)
-- Restored to standard explicit JOINs with the OR condition.
-- Includes correctness fixes for strict Outcome capitalization.
-- =================================================================================

-- 1. get_dashboard_kpis
DROP FUNCTION IF EXISTS public.get_dashboard_kpis(text, uuid, date, text, text, date);
DROP FUNCTION IF EXISTS public.get_dashboard_kpis(text, text[], date, text, text, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_kpis(text, uuid, date, text, text, date, uuid, text);

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
  p_city text DEFAULT NULL,
  p_disease text[] DEFAULT NULL,
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
  total_hospitals bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(mr.id)::bigint AS total_cases,
    COUNT(DISTINCT mr.patient_id)::bigint AS total_patients,
    COUNT(mr.id) FILTER (WHERE mr.outcome = 'Under Treatment')::bigint AS active_cases,
    COUNT(mr.id) FILTER (WHERE mr.outcome = 'Recovered')::bigint AS recovered_cases,
    COUNT(mr.id) FILTER (WHERE mr.severity >= 4)::bigint AS critical_cases,
    COUNT(DISTINCT mr.hospital_id)::bigint AS total_hospitals
  FROM public.medical_records mr
  JOIN public.patients p ON mr.patient_id = p.id
  JOIN public.hospitals h ON mr.hospital_id = h.id
  WHERE 
    (p_disease IS NULL OR mr.disease_id IN (SELECT d_sub.id FROM public.diseases d_sub WHERE d_sub.name = ANY(p_disease)))
    AND (p_severity IS NULL OR mr.severity = p_severity::int)
    AND (p_start_date IS NULL OR mr.diagnosis_date >= p_start_date)
    AND (p_end_date IS NULL OR mr.diagnosis_date <= p_end_date)
    AND (p_hospital_id IS NULL OR mr.hospital_id = p_hospital_id)
    AND (p_status IS NULL OR mr.outcome = p_status)
    AND (p_gender IS NULL OR p.gender = p_gender)
    AND (p_city IS NULL OR p.city = p_city OR h.city = p_city);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. get_dashboard_trends
DROP FUNCTION IF EXISTS public.get_dashboard_trends(text, uuid, date, text, text, date);
DROP FUNCTION IF EXISTS public.get_dashboard_trends(text, text[], date, text, text, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_trends(text, uuid, date, text, text, date, uuid, text);

CREATE OR REPLACE FUNCTION public.get_dashboard_trends(
  p_city text DEFAULT NULL,
  p_disease text[] DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  month text,
  year text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(mr.diagnosis_date, 'Mon') AS month,
    to_char(mr.diagnosis_date, 'YYYY') AS year,
    COUNT(mr.id)::bigint AS count
  FROM public.medical_records mr
  JOIN public.patients p ON mr.patient_id = p.id
  JOIN public.hospitals h ON mr.hospital_id = h.id
  WHERE 
    (p_disease IS NULL OR mr.disease_id IN (SELECT d_sub.id FROM public.diseases d_sub WHERE d_sub.name = ANY(p_disease)))
    AND (p_severity IS NULL OR mr.severity = p_severity::int)
    AND (p_start_date IS NULL OR mr.diagnosis_date >= p_start_date)
    AND (p_end_date IS NULL OR mr.diagnosis_date <= p_end_date)
    AND (p_hospital_id IS NULL OR mr.hospital_id = p_hospital_id)
    AND (p_status IS NULL OR mr.outcome = p_status)
    AND (p_gender IS NULL OR p.gender = p_gender)
    AND (p_city IS NULL OR p.city = p_city OR h.city = p_city)
  GROUP BY to_char(mr.diagnosis_date, 'YYYY'), to_char(mr.diagnosis_date, 'MM'), to_char(mr.diagnosis_date, 'Mon')
  ORDER BY to_char(mr.diagnosis_date, 'YYYY') ASC, to_char(mr.diagnosis_date, 'MM') ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. get_dashboard_disease_breakdown
DROP FUNCTION IF EXISTS public.get_dashboard_disease_breakdown(text, uuid, date, text, text, date);
DROP FUNCTION IF EXISTS public.get_dashboard_disease_breakdown(text, text[], date, text, text, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_disease_breakdown(text, uuid, date, text, text, date, uuid, text);

CREATE OR REPLACE FUNCTION public.get_dashboard_disease_breakdown(
  p_city text DEFAULT NULL,
  p_disease text[] DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  name text,
  count bigint,
  percentage numeric
) AS $$
DECLARE
  total_cases bigint;
BEGIN
  -- First pass: get the filtered total efficiently
  SELECT COUNT(mr.id) INTO total_cases
  FROM public.medical_records mr
  JOIN public.patients p ON mr.patient_id = p.id
  JOIN public.hospitals h ON mr.hospital_id = h.id
  WHERE 
    (p_disease IS NULL OR mr.disease_id IN (SELECT d_sub.id FROM public.diseases d_sub WHERE d_sub.name = ANY(p_disease)))
    AND (p_severity IS NULL OR mr.severity = p_severity::int)
    AND (p_start_date IS NULL OR mr.diagnosis_date >= p_start_date)
    AND (p_end_date IS NULL OR mr.diagnosis_date <= p_end_date)
    AND (p_hospital_id IS NULL OR mr.hospital_id = p_hospital_id)
    AND (p_status IS NULL OR mr.outcome = p_status)
    AND (p_gender IS NULL OR p.gender = p_gender)
    AND (p_city IS NULL OR p.city = p_city OR h.city = p_city);

  RETURN QUERY
  SELECT 
    d.name,
    COUNT(mr.id)::bigint AS count,
    ROUND((COUNT(mr.id)::numeric / NULLIF(total_cases, 0)) * 100, 2) AS percentage
  FROM public.medical_records mr
  JOIN public.diseases d ON mr.disease_id = d.id
  JOIN public.patients p ON mr.patient_id = p.id
  JOIN public.hospitals h ON mr.hospital_id = h.id
  WHERE 
    (p_disease IS NULL OR mr.disease_id IN (SELECT d_sub.id FROM public.diseases d_sub WHERE d_sub.name = ANY(p_disease)))
    AND (p_severity IS NULL OR mr.severity = p_severity::int)
    AND (p_start_date IS NULL OR mr.diagnosis_date >= p_start_date)
    AND (p_end_date IS NULL OR mr.diagnosis_date <= p_end_date)
    AND (p_hospital_id IS NULL OR mr.hospital_id = p_hospital_id)
    AND (p_status IS NULL OR mr.outcome = p_status)
    AND (p_gender IS NULL OR p.gender = p_gender)
    AND (p_city IS NULL OR p.city = p_city OR h.city = p_city)
  GROUP BY d.name
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. get_dashboard_severity
DROP FUNCTION IF EXISTS public.get_dashboard_severity(text, uuid, date, text, text, date);
DROP FUNCTION IF EXISTS public.get_dashboard_severity(text, text[], date, text, text, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_severity(text, uuid, date, text, text, date, uuid, text);

CREATE OR REPLACE FUNCTION public.get_dashboard_severity(
  p_city text DEFAULT NULL,
  p_disease text[] DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  severity text,
  count bigint,
  percentage numeric
) AS $$
DECLARE
  total_cases bigint;
BEGIN
  -- First pass: get the filtered total efficiently
  SELECT COUNT(mr.id) INTO total_cases
  FROM public.medical_records mr
  JOIN public.patients p ON mr.patient_id = p.id
  JOIN public.hospitals h ON mr.hospital_id = h.id
  WHERE 
    (p_disease IS NULL OR mr.disease_id IN (SELECT d_sub.id FROM public.diseases d_sub WHERE d_sub.name = ANY(p_disease)))
    AND (p_severity IS NULL OR mr.severity = p_severity::int)
    AND (p_start_date IS NULL OR mr.diagnosis_date >= p_start_date)
    AND (p_end_date IS NULL OR mr.diagnosis_date <= p_end_date)
    AND (p_hospital_id IS NULL OR mr.hospital_id = p_hospital_id)
    AND (p_status IS NULL OR mr.outcome = p_status)
    AND (p_gender IS NULL OR p.gender = p_gender)
    AND (p_city IS NULL OR p.city = p_city OR h.city = p_city);

  RETURN QUERY
  SELECT 
    CASE 
      WHEN mr.severity = 1 THEN 'Mild'
      WHEN mr.severity = 2 THEN 'Moderate'
      WHEN mr.severity = 3 THEN 'Severe'
      WHEN mr.severity = 4 THEN 'Critical'
      WHEN mr.severity = 5 THEN 'Fatal'
      ELSE 'Unknown'
    END AS severity,
    COUNT(mr.id)::bigint AS count,
    ROUND((COUNT(mr.id)::numeric / NULLIF(total_cases, 0)) * 100, 2) AS percentage
  FROM public.medical_records mr
  JOIN public.patients p ON mr.patient_id = p.id
  JOIN public.hospitals h ON mr.hospital_id = h.id
  WHERE 
    (p_disease IS NULL OR mr.disease_id IN (SELECT d_sub.id FROM public.diseases d_sub WHERE d_sub.name = ANY(p_disease)))
    AND (p_severity IS NULL OR mr.severity = p_severity::int)
    AND (p_start_date IS NULL OR mr.diagnosis_date >= p_start_date)
    AND (p_end_date IS NULL OR mr.diagnosis_date <= p_end_date)
    AND (p_hospital_id IS NULL OR mr.hospital_id = p_hospital_id)
    AND (p_status IS NULL OR mr.outcome = p_status)
    AND (p_gender IS NULL OR p.gender = p_gender)
    AND (p_city IS NULL OR p.city = p_city OR h.city = p_city)
  GROUP BY mr.severity
  ORDER BY mr.severity ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. get_dashboard_bubble_data
DROP FUNCTION IF EXISTS public.get_dashboard_bubble_data(text, uuid, date, text, text, date);
DROP FUNCTION IF EXISTS public.get_dashboard_bubble_data(text, text[], date, text, text, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_bubble_data(text, uuid, date, text, text, date, uuid, text);

CREATE OR REPLACE FUNCTION public.get_dashboard_bubble_data(
  p_city text DEFAULT NULL,
  p_disease text[] DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  district_name text,
  city text,
  disease text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dist.name AS district_name,
    dist.city,
    d.name AS disease,
    COUNT(mr.id)::bigint AS count
  FROM public.medical_records mr
  JOIN public.diseases d ON mr.disease_id = d.id
  JOIN public.hospitals h ON mr.hospital_id = h.id
  JOIN public.districts dist ON h.district_id = dist.id
  JOIN public.patients p ON mr.patient_id = p.id
  WHERE 
    (p_disease IS NULL OR mr.disease_id IN (SELECT d_sub.id FROM public.diseases d_sub WHERE d_sub.name = ANY(p_disease)))
    AND (p_severity IS NULL OR mr.severity = p_severity::int)
    AND (p_start_date IS NULL OR mr.diagnosis_date >= p_start_date)
    AND (p_end_date IS NULL OR mr.diagnosis_date <= p_end_date)
    AND (p_hospital_id IS NULL OR mr.hospital_id = p_hospital_id)
    AND (p_status IS NULL OR mr.outcome = p_status)
    AND (p_gender IS NULL OR p.gender = p_gender)
    AND (p_city IS NULL OR dist.city = p_city)
  GROUP BY dist.name, dist.city, d.name
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;
