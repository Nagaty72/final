EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  COUNT(mr.id)::bigint AS total_cases,
  COUNT(DISTINCT mr.patient_id)::bigint AS total_patients,
  COUNT(mr.id) FILTER (WHERE mr.outcome NOT IN ('recovered', 'deceased', 'resolved'))::bigint AS active_cases,
  COUNT(mr.id) FILTER (WHERE mr.outcome IN ('recovered', 'resolved'))::bigint AS recovered_cases,
  COUNT(mr.id) FILTER (WHERE mr.severity >= 4)::bigint AS critical_cases,
  COUNT(DISTINCT mr.hospital_id)::bigint AS total_hospitals
FROM public.medical_records mr
JOIN public.patients p ON mr.patient_id = p.id
JOIN public.hospitals h ON mr.hospital_id = h.id
WHERE 
  -- Benchmark parameters
  (mr.diagnosis_date >= '2025-06-18')
  AND (mr.diagnosis_date <= '2026-06-18')
  AND (p.city = 'Assiut' OR h.city = 'Assiut');
