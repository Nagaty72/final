  import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres.pgvcboloxjgkqbajhzbg:Epicare_Database_2026@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
  });
  await client.connect();
  const res = await client.query("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_dashboard_kpis';");
  console.log(res.rows[0].pg_get_functiondef);
  await client.end();
}
run().catch(console.error);
