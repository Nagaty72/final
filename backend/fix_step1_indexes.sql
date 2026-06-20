-- ==============================================================================
-- ANALYTICS DASHBOARD PERFORMANCE FIX
-- STEP 1 of 2 — Indexes (run this first, then run step 2)
-- Execute in: Supabase Dashboard → SQL Editor → New Query
-- ==============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_severity ON public.medical_records(severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_outcome  ON public.medical_records(outcome);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_gender  ON public.patients(gender);
