-- Run in Supabase SQL Editor so the browser admin panel (anon key) can list patients and appointments.
-- Security: anyone with your publishable anon key can read patient users and all appointments.
-- For production, prefer a backend or Edge Function with the service_role key instead of widening RLS.

-- Patient directory for admin (anon requests only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    AND policyname = 'Anon can list patients for admin dashboard'
  ) THEN
    CREATE POLICY "Anon can list patients for admin dashboard"
    ON public.users
    FOR SELECT
    TO anon
    USING (role = 'patient');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    AND policyname = 'Authenticated can list patients for admin dashboard'
  ) THEN
    CREATE POLICY "Authenticated can list patients for admin dashboard"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (role = 'patient');
  END IF;
END $$;

-- All appointments for admin (anon requests only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments'
    AND policyname = 'Anon can list appointments for admin dashboard'
  ) THEN
    CREATE POLICY "Anon can list appointments for admin dashboard"
    ON public.appointments
    FOR SELECT
    TO anon
    USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments'
    AND policyname = 'Authenticated can list appointments for admin dashboard'
  ) THEN
    CREATE POLICY "Authenticated can list appointments for admin dashboard"
    ON public.appointments
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;
