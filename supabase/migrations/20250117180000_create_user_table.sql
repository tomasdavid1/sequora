-- Create User table that links to Supabase auth.users
-- This provides role-based access control for the TOC platform

-- Create User table
CREATE TABLE IF NOT EXISTS public."User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PATIENT' CHECK (role IN ('ADMIN', 'STAFF', 'PATIENT')),
  phone TEXT,
  department TEXT,
  specialty TEXT,
  active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_user_auth_id ON public."User"(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_role ON public."User"(role);
CREATE INDEX IF NOT EXISTS idx_user_active ON public."User"(active);

-- Enable RLS
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- Create policies (drop if they exist first)
DROP POLICY IF EXISTS "Service role can manage users" ON public."User";
DROP POLICY IF EXISTS "Users can view their own data" ON public."User";
DROP POLICY IF EXISTS "Users can update their own data" ON public."User";

CREATE POLICY "Service role can manage users" ON public."User"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own data" ON public."User"
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own data" ON public."User"
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Create function to automatically create User record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (email, name, auth_user_id, role)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'PATIENT')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update last_login_at
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public."User" 
  SET last_login_at = NOW(), updated_at = NOW()
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for login tracking
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.update_last_login();
