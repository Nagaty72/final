import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTest() {
  const timestamp = new Date().getTime();
  const testEmail = `test_login_${timestamp}@example.com`;
  const password = 'Password123!';

  console.log(`[TEST] 1. Signing up user: ${testEmail}`);
  const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
    email: testEmail,
    password,
    options: { data: { full_name: 'Test Login User', role: 'normal_user' } }
  });

  if (authError) {
    console.error('SignUp failed:', authError.message);
    return;
  }

  // Clear session to simulate redirect and fresh login
  await supabaseAnon.auth.signOut();

  console.log(`[TEST] 2. Logging in with same credentials`);
  const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email: testEmail,
    password
  });

  if (loginError) {
    console.error('Login failed:', loginError.message);
    return;
  }

  const token = loginData.session.access_token;
  console.log(`[TEST] 3. Calling /api/v1/auth/me with token`);

  const res = await fetch('http://localhost:5001/api/v1/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const text = await res.text();
  console.log(`[TEST] Response Status: ${res.status}`);
  console.log(`[TEST] Response Body:`, text);
}

runTest();
