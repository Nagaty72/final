import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Create both clients to simulate frontend (anon) and check backend state (service role)
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTest() {
  const timestamp = new Date().getTime();
  const testEmail = `test_bug_${timestamp}@example.com`;
  const password = 'Password123!';

  console.log('-------------------------------------------');
  console.log(`[TEST START] Creating user: ${testEmail}`);
  console.log('-------------------------------------------');

  // Step 1: Sign up (simulating frontend login/page.jsx)
  const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
    email: testEmail,
    password,
    options: {
      data: {
        full_name: 'Test Bug User',
        role: 'normal_user'
      }
    }
  });

  if (authError) {
    console.error('[ERROR] SignUp failed:', authError.message);
    return;
  }

  console.log('[USER_ROW_CREATED] Auth user created successfully. ID:', authData.user.id);
  
  // Step 2: Wait 2 seconds to ensure any Supabase database triggers have executed
  console.log('Waiting 2 seconds for potential triggers...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: Query the public.users table directly bypassing all middleware
  const { data: publicUser, error: dbError } = await supabaseAdmin
    .from('users')
    .select('id, email, is_verified, created_at')
    .eq('email', testEmail)
    .maybeSingle();

  if (dbError) {
    console.error('[ERROR] Database query failed:', dbError.message);
    return;
  }

  console.log('-------------------------------------------');
  if (!publicUser) {
    console.log('[RESULT] No row found in public.users!');
    console.log('[CONCLUSION] There is NO trigger automatically creating the user in public.users.');
  } else {
    console.log('[RESULT] Row FOUND in public.users BEFORE OTP verification!');
    console.log(publicUser);
    console.log(`[IS_VERIFIED_VALUE] ${publicUser.is_verified}`);
    if (publicUser.is_verified === true) {
      console.log('[CONCLUSION] A trigger or background process is auto-verifying the user!');
    } else {
      console.log('[CONCLUSION] User was created with is_verified = false.');
    }
  }
  console.log('-------------------------------------------');
}

runTest();
