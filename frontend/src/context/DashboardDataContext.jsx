'use client';
/**
 * DashboardDataContext
 *
 * Single source of truth for all dashboard analytics data.
 * Fetches KPIs, Trends, Severity, and Disease Breakdown EXACTLY ONCE
 * via a single Promise.all, then provides results to all child components.
 *
 * Before consolidation: 10 parallel requests per page load
 * After consolidation:   4 parallel requests per page load
 */

import React, {
  createContext, useContext, useEffect, useRef, useState,
} from 'react';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow }              from 'zustand/react/shallow';
import {
  getDashboardKpis,
  getDashboardTrends,
  getDashboardSeverity,
  getDashboardDiseaseBreakdown,
} from '@/services/analytics.service';

/* ── Context definition ────────────────────────────────────────────────────── */
const DashboardDataContext = createContext(null);

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used inside <DashboardDataProvider>');
  return ctx;
}

/* ── Provider ──────────────────────────────────────────────────────────────── */
export function DashboardDataProvider({ children }) {
  const filters = useDashboardFilterStore(
    useShallow(state => ({
      city:      state.city,
      disease:   state.disease,
      gender:    state.gender,
      severity:  state.severity,
      status:    state.status,
      hospital:  state.hospital,
      timeRange: state.timeRange,
    }))
  );

  const [kpisRaw,      setKpisRaw]      = useState(null);
  const [trendsRaw,    setTrendsRaw]    = useState(null);
  const [severityRaw,  setSeverityRaw]  = useState(null);
  const [breakdownRaw, setBreakdownRaw] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const abortRef   = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const diseaseDep = Array.isArray(filters.disease) ? filters.disease.join(',') : '';

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    // ── Instrumentation ──────────────────────────────────────────────────────
    const loadId = Math.random().toString(36).substring(7);
    const t0 = Date.now();
    console.log(`[DASHBOARD-LOAD][${loadId}] Starting — 4 requests (kpis, trends, severity, breakdown)`);

    const timeEndpoint = (name, start) => {
      const ms = Date.now() - start;
      console.log(`[DASHBOARD-LOAD][${loadId}] ${name} completed in ${ms}ms`);
    };
    // ────────────────────────────────────────────────────────────────────────

    const t_kpis      = Date.now();
    const t_trends    = Date.now();
    const t_severity  = Date.now();
    const t_breakdown = Date.now();

    Promise.all([
      getDashboardKpis(filters).then(r      => { timeEndpoint('/kpis',              t_kpis);      return r; }),
      getDashboardTrends(filters).then(r    => { timeEndpoint('/trends',            t_trends);    return r; }),
      getDashboardSeverity(filters).then(r  => { timeEndpoint('/severity',          t_severity);  return r; }),
      getDashboardDiseaseBreakdown(filters).then(r => { timeEndpoint('/disease-breakdown', t_breakdown); return r; }),
    ])
      .then(([kpiRes, trendRes, severityRes, breakdownRes]) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        setKpisRaw(kpiRes);
        setTrendsRaw(trendRes);
        setSeverityRaw(severityRes);
        setBreakdownRaw(breakdownRes);
        console.log(`[DASHBOARD-LOAD][${loadId}] All 4 requests done in ${Date.now() - t0}ms — total calls this load: 4`);
      })
      .catch(err => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        console.error(`[DASHBOARD-LOAD][${loadId}] Error:`, err.message);
        setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted && mountedRef.current) setLoading(false);
      });

    return () => ctrl.abort();
  }, [filters.city, diseaseDep, filters.gender, filters.severity, filters.status, filters.hospital, filters.timeRange]);

  return (
    <DashboardDataContext.Provider value={{
      kpisRaw,
      trendsRaw,
      severityRaw,
      breakdownRaw,
      loading,
      error,
      filters,
    }}>
      {children}
    </DashboardDataContext.Provider>
  );
}
