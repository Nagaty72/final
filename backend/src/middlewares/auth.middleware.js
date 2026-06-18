import { getSupabase } from '../config/supabase.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

/**
 * Authentication middleware.
 * Verifies the Supabase JWT from the Authorization header and attaches
 * the user profile to `req.user`.
 *
 * Enforces application-level email verification via `users.is_verified`.
 * This is separate from Supabase's `email_confirmed_at` — the platform
 * uses OTP-based verification (signInWithOtp + verifyOtp) and sets
 * is_verified = TRUE in the users table upon successful OTP validation.
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

    // 2. Hydrate profile + is_verified from public.users
    let { data: profile } = await supabase
      .from('users')
      .select('id, role_id, is_verified, full_name')
      .eq('email', user.email)
      .maybeSingle();

    let roleId = 3; // default normal_user
    let role = 'normal_user';

    if (!profile) {
      console.log('[AUTH] USER_NOT_FOUND_IN_PUBLIC_USERS:', user.email);
      console.log('[AUTH] CREATING_PUBLIC_USER...');
      
      const insertPayload = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        role_id: roleId,
        is_verified: false,
        password_hash: 'managed_by_supabase_auth'
      };
      
      console.log('[AUTH] Insert Payload:', JSON.stringify(insertPayload));

      // Lazy sync: if user signed up via Supabase but isn't in public.users yet
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert(insertPayload)
        .select('id, role_id, is_verified, full_name')
        .single();
        
      if (insertError) {
        console.error('[AUTH] Failed to lazy sync user:', insertError);
        return res.status(500).json({ success: false, error: 'Internal sync error' });
      }
      
      console.log('[AUTH] CREATED_PUBLIC_USER');
      console.log('[AUTH] Inserted object returned from DB:', JSON.stringify(newProfile));
      console.log('[AUTH] PUBLIC_USER_IS_VERIFIED:', newProfile.is_verified);
      
      profile = newProfile;
    } else {
      roleId = profile.role_id;
    }

    // 3. Resolve role name
    const { data: roleRow } = await supabase
      .from('roles')
      .select('name')
      .eq('id', roleId)
      .single();
    
    if (roleRow) role = roleRow.name;

    // 4. Enforce application-level email verification
    if (profile.is_verified !== true) {
      console.warn('[AUTH] Unverified user attempted access:', user.email);
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before accessing the platform.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // 5. Attach user info to request object for downstream use
    req.user = {
      id: profile.id,
      email: user.email,
      role,
      full_name: profile.full_name || user.user_metadata?.full_name || '',
      is_verified: profile.is_verified,
    };

    console.log('[AUTH] Value returned to req.user:', JSON.stringify(req.user));

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to an internal error.',
    });
  }
};
