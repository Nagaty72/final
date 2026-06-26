-- ==============================================================================
-- CLEANUP: Remove obsolete scalar uuid overloads for analytics RPCs
-- 
-- Background
-- ----------
-- During earlier debugging a scalar (uuid) overload of each dashboard RPC was
-- accidentally deployed alongside the canonical array (uuid[]) overload.
-- PostgreSQL resolves calls to the scalar version when a single UUID string is
-- passed, silently bypassing the array-based filtering logic in the backend.
--
-- This script drops every stale scalar overload and leaves exactly ONE version
-- of each function — the uuid[] variant that the backend repository targets.
--
-- Safe to re-run: all statements use DROP … IF EXISTS.
--
-- Run in: Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ==============================================================================

-- ── 1. Drop obsolete scalar (uuid) overloads ──────────────────────────────────

DROP FUNCTION IF EXISTS public.get_dashboard_kpis(text, uuid, date, text, text, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_trends(text, uuid, date, text, text, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_severity(text, uuid, date, text, text, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_disease_breakdown(text, uuid, date, text, text, date, uuid, text);

-- bubble_data never had a scalar overload that should remain, but drop any
-- accidental uuid or uuid[] variants from earlier migration iterations
DROP FUNCTION IF EXISTS public.get_dashboard_bubble_data(text, uuid,   date, text, text, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_bubble_data(text, uuid[], date, text, text, date, uuid, text);

-- ── 2. Verify — expected: exactly ONE row per function name ───────────────────
--
-- Run this SELECT after the DROPs above to confirm:
--
SELECT
    proname                                    AS function_name,
    pg_get_function_identity_arguments(oid)    AS arguments
FROM pg_proc
WHERE proname LIKE 'get_dashboard_%'
ORDER BY proname;
--
-- Expected output (5 rows, no duplicates):
--
--  function_name                    | arguments
-- ----------------------------------+--------------------------------------------------
--  get_dashboard_bubble_data        | p_city text, p_disease text[], ...
--  get_dashboard_disease_breakdown  | p_city text, p_disease uuid[], ...
--  get_dashboard_kpis               | p_city text, p_disease uuid[], ...
--  get_dashboard_severity           | p_city text, p_disease uuid[], ...
--  get_dashboard_trends             | p_city text, p_disease uuid[], ...
