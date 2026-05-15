import { getSupabase } from '../config/supabase.js';

export const UserRepository = {
  async findAll() {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role_id, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async findById(id) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role_id, created_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(userData) {
    const supabase = getSupabase();
    // For manual creation, we usually use Supabase Auth Admin API if available
    // But since we are restricted in what we can do, let's assume we use the public.users table 
    // and the user will need to set their password via reset link or we use Supabase Auth.
    // However, the request says "Create users manually". 
    // I'll implement a simple insert into public.users.
    
    // NOTE: In a real Supabase setup, you'd use supabase.auth.admin.createUser()
    // but that requires service_role key. Assuming we have it configured.
    
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRole(id, roleId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .update({ role_id: roleId })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};
