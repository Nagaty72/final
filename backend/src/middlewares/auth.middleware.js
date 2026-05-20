import { getSupabase } from '../config/supabase.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

/**
 * Authentication middleware.
 * Verifies the Supabase JWT from the Authorization header and attaches
 * the user profile to `req.user`.
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('[AUTH HEADER RECEIVED]', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database client not configured' });
    }

    // 1. Validate token with Supabase Auth (ensures token is alive, not revoked)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token.',
      });
    }

    // 2. Enforce Email Verification
    if (!user.email_confirmed_at) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before accessing the platform.',
      });
    }

    // 3. Hydrate req.user.role from public.users database
    // We check if the user exists in public.users
    const { data: profile } = await supabase
      .from('users')
      .select('id, role_id')
      .eq('email', user.email)
      .maybeSingle();

    let role = 'normal_user';

    if (profile) {
      const { data: roleRow } = await supabase
        .from('roles')
        .select('name')
        .eq('id', profile.role_id)
        .single();
      
      if (roleRow) role = roleRow.name;
    } else {
      // Lazy sync: if user signed up via Supabase but isn't in public.users yet
      const roleId = 3; // normal_user
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          role_id: roleId,
          password_hash: 'managed_by_supabase_auth' // Dummy hash
        })
        .select('id, role_id')
        .single();
        
      if (!insertError && newProfile) {
         // The default role remains 'normal_user'
      }
    }

    // Attach user info to request object for downstream use
    // Crucial: Use the database profile ID (profile.id) if it exists, because foreign keys 
    // (like patients.user_id) rely on public.users.id, which might differ from auth.users.id
    // for users created before the migration.
    req.user = {
      id: profile ? profile.id : user.id,
      email: user.email,
      role: role,
      full_name: user.user_metadata?.full_name || '',
      email_confirmed_at: user.email_confirmed_at,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to an internal error.',
    });
  }
};

