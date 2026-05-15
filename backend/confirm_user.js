import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function confirmUser(email) {
  // Update the user in the auth.users schema is harder via API, 
  // but we can try to update the public.users table if that's what the middleware checks.
  // Actually, the middleware checks supabase.auth.getUser(token).
  // We need to use the admin API to confirm the user.
  
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const user = users.users.find(u => u.email === email);
  if (!user) {
    console.error('User not found:', email);
    return;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true
  });

  if (error) {
    console.error('Error confirming user:', error);
  } else {
    console.log('User confirmed successfully:', email);
  }
}

confirmUser('admin@test.com');
