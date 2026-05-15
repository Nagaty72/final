import { createClient } from '@supabase/supabase-js';
import { ENV } from './env.js';

let supabase = null;

/**
 * Lazily create the Supabase client.
 * This prevents the app from crashing on import when
 * the SUPABASE_URL env var is not yet configured.
 */
export const getSupabase = () => {
  if (!supabase) {
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn(
        '⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Database operations will fail until configured.'
      );
      return null;
    }
    supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
};

// For backwards-compatibility, export a getter proxy
// so existing code like `supabase.from('users')` still works
// once credentials are configured.
export { supabase };
