import { UserRepository } from '../repositories/user.repository.js';
import { getSupabase } from '../config/supabase.js';

export const UserController = {
  async getAll(req, res, next) {
    try {
      const users = await UserRepository.findAll();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { email, password, full_name, role_id } = req.body;
      
      const supabase = getSupabase();
      
      // 1. Create user in Supabase Auth (requires service role or admin privileges)
      // Since we might not have service role configured in the client, 
      // we'll try to use the auth.signUp if allowed, or just insert into public.users
      // In a real project, this would use the admin API.
      
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name }
        }
      });

      if (authError) return res.status(400).json({ success: false, error: authError.message });

      // The authMiddleware handles the sync, but we can do it explicitly here too
      // if we want to set the role immediately.
      const { error: updateError } = await supabase
        .from('users')
        .update({ role_id, full_name })
        .eq('id', authUser.user.id);

      res.status(201).json({ success: true, data: authUser.user });
    } catch (error) {
      next(error);
    }
  },

  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role_id } = req.body;

      if (![1, 2, 3].includes(Number(role_id))) {
        return res.status(400).json({ success: false, error: 'Invalid role ID' });
      }

      // Prevent privilege escalation: only super_admin can set super_admin (handled by middleware)
      // but we could add more checks here if needed.

      const updated = await UserRepository.updateRole(id, role_id);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
      }

      await UserRepository.delete(id);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};
