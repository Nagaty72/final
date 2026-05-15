import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSupabase } from '../config/supabase.js';
import { ENV } from '../config/env.js';

const SALT_ROUNDS = 12;

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'), { statusCode: 503 });
  return s;
};

/** Map role names from DB to role_id */
const ROLE_MAP = { super_admin: 1, decision_maker: 2, normal_user: 3 };

export const AuthService = {
  /**
   * Check if email is already registered.
   */
  async checkEmail(email) {
    const supabase = db();
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).maybeSingle();
    return !!existing;
  },

  /**
   * Register a new user.
   * Schema: users( id, email, password_hash, full_name, role_id, created_at )
   */
  async register({ email, password, full_name, role }) {
    const supabase = db();

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).maybeSingle();

    if (existing) {
      throw Object.assign(new Error('A user with this email already exists'), { statusCode: 409 });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Resolve role_id from role name (default: normal_user = 3)
    const role_id = ROLE_MAP[role] || ROLE_MAP.normal_user;

    // Create user in our users table
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ email, password_hash, full_name, role_id })
      .select('id, email, full_name, role_id, created_at')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw Object.assign(new Error('Failed to create user'), { statusCode: 500 });
    }

    // Resolve role name for token
    const { data: roleRow } = await supabase
      .from('roles').select('name').eq('id', role_id).single();

    // Generate tokens so the user is logged in immediately after registration
    const userRole = roleRow?.name || 'normal_user';
    const payload = { id: newUser.id, email: newUser.email, full_name: newUser.full_name, role: userRole };
    const accessToken = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ id: newUser.id }, ENV.JWT_REFRESH_SECRET, { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN });

    await supabase.from('refresh_tokens').insert({
      user_id: newUser.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return {
      user: { id: newUser.id, email: newUser.email, full_name: newUser.full_name, role: userRole },
      accessToken,
      refreshToken,
    };
  },

  /**
   * Login — finds user by email, verifies password, returns JWT pair.
   */
  async login({ email, password }) {
    const supabase = db();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, full_name, role_id')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    // Fetch role name
    const { data: roleRow } = await supabase
      .from('roles').select('name').eq('id', user.role_id).single();

    const role = roleRow?.name || 'normal_user';

    // Generate tokens
    const payload = { id: user.id, email: user.email, full_name: user.full_name, role };

    const accessToken = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ id: user.id }, ENV.JWT_REFRESH_SECRET, { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN });

    // Store refresh token
    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return {
      user: { id: user.id, email: user.email, full_name: user.full_name, role },
      accessToken,
      refreshToken,
    };
  },

  async refreshAccessToken(refreshToken) {
    const supabase = db();

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET);
    } catch {
      throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
    }

    const { data: stored } = await supabase
      .from('refresh_tokens').select('id')
      .eq('token', refreshToken).eq('user_id', decoded.id).single();

    if (!stored) {
      throw Object.assign(new Error('Refresh token has been revoked'), { statusCode: 401 });
    }

    const { data: user } = await supabase
      .from('users').select('id, email, full_name, role_id').eq('id', decoded.id).single();

    if (!user) throw Object.assign(new Error('User no longer exists'), { statusCode: 401 });

    const { data: roleRow } = await supabase.from('roles').select('name').eq('id', user.role_id).single();
    const role = roleRow?.name || 'normal_user';

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, full_name: user.full_name, role },
      ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN }
    );

    return { accessToken, user: { ...user, role } };
  },

  async logout(refreshToken) {
    await db().from('refresh_tokens').delete().eq('token', refreshToken);
  },

  async getProfile(userId) {
    const supabase = db();
    const { data: user, error } = await supabase
      .from('users').select('id, email, full_name, role_id, created_at')
      .eq('id', userId).single();

    if (error || !user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    const { data: roleRow } = await supabase.from('roles').select('name').eq('id', user.role_id).single();

    return { ...user, role: roleRow?.name || 'normal_user' };
  },

  async updateProfile(userId, { full_name, email, password }) {
    const supabase = db();
    const updates = {};
    const authUpdates = {};

    if (full_name) updates.full_name = full_name;
    
    if (email) {
      updates.email = email;
      authUpdates.email = email;
    }
    
    if (password) {
      updates.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      authUpdates.password = password;
    }

    // 1. Update our application users table
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, email, full_name, role_id')
      .single();

    if (error) {
      if (error.code === '23505') throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
      throw Object.assign(new Error('Failed to update profile'), { statusCode: 500 });
    }

    // 2. Sync with Supabase Auth if email or password changed
    if (Object.keys(authUpdates).length > 0) {
      try {
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdates);
        if (authError) {
          console.error('Supabase Auth sync error:', authError);
          // We don't throw here to avoid breaking the whole update if only auth sync fails,
          // but in production you might want more robust handling.
        }
      } catch (err) {
        console.error('Failed to sync with Supabase Auth:', err);
      }
    }

    const { data: roleRow } = await supabase.from('roles').select('name').eq('id', user.role_id).single();
    return { ...user, role: roleRow?.name || 'normal_user' };
  },

};
