-- QwikDoc Consolidated Database Setup Script
-- This script safely creates or updates all 6 tables and their columns.
-- Run this in your Supabase SQL Editor.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'patient' CHECK (role IN ('patient', 'doctor')),
  city TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Clinics Table
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  address TEXT NOT NULL,
  pin TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID REFERENCES public.users(id) NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  experience TEXT,
  consultation_fee INTEGER DEFAULT 500,
  rating DECIMAL DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  about TEXT,
  image TEXT,
  city TEXT,
  location TEXT,
  pin TEXT,
  phone TEXT,
  availability TEXT[] DEFAULT '{}',
  degree TEXT,
  languages_fluent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Doctor-Clinic Links (Primary Venue Management)
CREATE TABLE IF NOT EXISTS public.doctor_clinic_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  schedule TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(doctor_id, clinic_id)
);

-- 5. Doctor Venues (Optional/Legacy - Arbitrary locations)
CREATE TABLE IF NOT EXISTS public.doctor_venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  pin TEXT NOT NULL,
  schedule TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_number INTEGER,
  patient_id UUID REFERENCES auth.users,
  doctor_id UUID REFERENCES public.doctors(id),
  clinic_id UUID REFERENCES public.clinics(id),
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  reason TEXT,
  patient_address TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist (in case tables were created with older schemas)
DO $$ 
BEGIN 
    -- Doctors table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctors' AND column_name='phone') THEN
        ALTER TABLE public.doctors ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctors' AND column_name='pin') THEN
        ALTER TABLE public.doctors ADD COLUMN pin TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctors' AND column_name='availability') THEN
        ALTER TABLE public.doctors ADD COLUMN availability TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctors' AND column_name='degree') THEN
        ALTER TABLE public.doctors ADD COLUMN degree TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctors' AND column_name='languages_fluent') THEN
        ALTER TABLE public.doctors ADD COLUMN languages_fluent TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='patient_address') THEN
        ALTER TABLE public.appointments ADD COLUMN patient_address TEXT;
    END IF;
    -- Users table columns (Critical fix for Admin Dashboard)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='city') THEN
        ALTER TABLE public.users ADD COLUMN city TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='location') THEN
        ALTER TABLE public.users ADD COLUMN location TEXT;
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_clinic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Security Policies (Basic Setup)
DO $$ 
BEGIN 
    -- Users Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Anon can list patients for admin dashboard') THEN
        CREATE POLICY "Anon can list patients for admin dashboard" ON public.users FOR SELECT TO anon USING (role = 'patient');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Authenticated can list patients for admin dashboard') THEN
        CREATE POLICY "Authenticated can list patients for admin dashboard" ON public.users FOR SELECT TO authenticated USING (role = 'patient');
    END IF;

    -- Doctors Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctors' AND policyname='Public can view doctors') THEN
        CREATE POLICY "Public can view doctors" ON public.doctors FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctors' AND policyname='Doctors can update own profile') THEN
        CREATE POLICY "Doctors can update own profile" ON public.doctors FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- Clinics Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clinics' AND policyname='Public can view clinics') THEN
        CREATE POLICY "Public can view clinics" ON public.clinics FOR SELECT USING (true);
    END IF;

    -- Clinic Links Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctor_clinic_links' AND policyname='Public can view clinic links') THEN
        CREATE POLICY "Public can view clinic links" ON public.doctor_clinic_links FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctor_clinic_links' AND policyname='Doctors can insert own clinic links') THEN
        CREATE POLICY "Doctors can insert own clinic links" ON public.doctor_clinic_links FOR INSERT WITH CHECK (auth.uid() = doctor_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctor_clinic_links' AND policyname='Doctors can update own clinic links') THEN
        CREATE POLICY "Doctors can update own clinic links" ON public.doctor_clinic_links FOR UPDATE USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctor_clinic_links' AND policyname='Doctors can delete own clinic links') THEN
        CREATE POLICY "Doctors can delete own clinic links" ON public.doctor_clinic_links FOR DELETE USING (auth.uid() = doctor_id);
    END IF;

    -- Doctor Venues Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctor_venues' AND policyname='Public can view doctor venues') THEN
        CREATE POLICY "Public can view doctor venues" ON public.doctor_venues FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctor_venues' AND policyname='Doctors can manage own venues') THEN
        CREATE POLICY "Doctors can manage own venues" ON public.doctor_venues FOR ALL USING (auth.uid() = doctor_id);
    END IF;

    -- Appointments Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointments' AND policyname='Users view own appointments') THEN
        CREATE POLICY "Users view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointments' AND policyname='Anon can list appointments for admin dashboard') THEN
        CREATE POLICY "Anon can list appointments for admin dashboard" ON public.appointments FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointments' AND policyname='Authenticated can list appointments for admin dashboard') THEN
        CREATE POLICY "Authenticated can list appointments for admin dashboard" ON public.appointments FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointments' AND policyname='Patients can insert appointments') THEN
        CREATE POLICY "Patients can insert appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointments' AND policyname='Participants can update appointments') THEN
        CREATE POLICY "Participants can update appointments" ON public.appointments FOR UPDATE USING (auth.uid() = patient_id OR auth.uid() = doctor_id);
    END IF;
END $$;

-- Grant permissions for authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;