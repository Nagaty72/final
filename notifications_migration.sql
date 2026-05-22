-- notifications_migration.sql

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE, -- null means broadcast
    title text NOT NULL,
    message text NOT NULL,
    type text,
    severity text,
    target_role text,
    governorate text,
    is_read boolean DEFAULT false, -- For direct notifications
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_governorate ON public.notifications(governorate);

-- 3. Create a table to track read status for broadcast notifications
CREATE TABLE IF NOT EXISTS public.notification_reads (
    notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (notification_id, user_id)
);

-- Enable RLS (Optional depending on Supabase setup, but safe to add)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their notifications or broadcasts targeted to them
CREATE POLICY "Users can view their own and targeted broadcast notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    user_id IS NULL -- The backend will filter target_role/governorate dynamically
);

-- Super admin can insert/delete
CREATE POLICY "Super admins can manage notifications"
ON public.notifications FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() AND users.role_id = 1
    )
);

-- Users can insert into notification_reads to mark broadcast as read
CREATE POLICY "Users can mark broadcasts as read"
ON public.notification_reads FOR ALL
TO authenticated
USING (user_id = auth.uid());
