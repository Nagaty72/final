import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authMiddleware } from './src/middlewares/auth.middleware.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTest() {
  const timestamp = new Date().getTime();
  const testEmail = `test_lazy_sync_${timestamp}@example.com`;
  const password = 'Password123!';

  console.log(`[TEST START] Creating auth user: ${testEmail}`);

  // 1. Sign up
  const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
    email: testEmail,
    password,
    options: {
      data: { full_name: 'Test Lazy Sync', role: 'normal_user' }
    }
  });

  if (authError) {
    console.error('SignUp failed:', authError.message);
    return;
  }

  const token = authData.session?.access_token || authData.session?.provider_token;
  
  // Supabase auth.signUp with Confirm Email disabled usually returns a session. 
  // Let's do a direct signInWithPassword to guarantee we have a token just in case.
  const { data: signData } = await supabaseAnon.auth.signInWithPassword({
    email: testEmail, password
  });

  const accessToken = signData?.session?.access_token || authData?.session?.access_token;

  if (!accessToken) {
    console.error('Failed to get access token for the test user.');
    return;
  }

  console.log('Got Access Token. Triggering authMiddleware...');

  // Mock Express Req/Res
  const req = {
    headers: { authorization: `Bearer ${accessToken}` }
  };
  const res = {
    status: (code) => ({
      json: (data) => {
        console.log(`[EXPRESS RES] Status: ${code}, Data:`, JSON.stringify(data));
      }
    })
  };
  const next = () => {
    console.log('[EXPRESS NEXT] Middleware passed.');
  };

  // Run the middleware!
  await authMiddleware(req, res, next);
}

runTest();
