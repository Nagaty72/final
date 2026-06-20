import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres.pgvcboloxjgkqbajhzbg:Epicare_Database_2026@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
  });
  await client.connect();
  const query = `
    EXPLAIN ANALYZE
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
      (NULL::text[] IS NULL OR mr.disease_id IN (SELECT d_sub.id FROM public.diseases d_sub WHERE d_sub.name = ANY(NULL::text[])))
      AND (NULL::int IS NULL OR mr.severity = NULL::int)
      AND ('2025-06-18'::date IS NULL OR mr.diagnosis_date >= '2025-06-18'::date)
      AND ('2026-06-19'::date IS NULL OR mr.diagnosis_date <= '2026-06-19'::date)
      AND (NULL::uuid IS NULL OR mr.hospital_id = NULL::uuid)
      AND (NULL::text IS NULL OR mr.outcome = NULL::text)
      AND (NULL::text IS NULL OR p.gender = NULL::text)
      AND (NULL::text IS NULL OR p.city = NULL::text OR h.city = NULL::text)
  `;
  try {
    const res = await client.query(query);
    res.rows.forEach(r => console.log(r['QUERY PLAN']));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run().catch(console.error);
