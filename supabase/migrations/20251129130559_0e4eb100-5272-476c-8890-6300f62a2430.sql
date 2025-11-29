-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create enum for resident status
CREATE TYPE public.resident_status AS ENUM ('pending', 'verified', 'inactive');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (as instructed - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create ANRs table (core identifier for each address)
CREATE TABLE public.anrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- The ANR identification code (e.g., ANR-75011-0142)
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create habitations table (multiple habitations per ANR for apartments)
CREATE TABLE public.habitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anr_id UUID REFERENCES public.anrs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., "Appartement 3B", "Famille Dupont"
  floor TEXT, -- optional floor info
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (anr_id, name)
);

-- Create residents table (up to 5 per habitation)
CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habitation_id UUID REFERENCES public.habitations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_owner BOOLEAN DEFAULT FALSE, -- The resident who created the habitation
  is_muted BOOLEAN DEFAULT FALSE, -- Mute incoming calls
  status resident_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habitation_id, user_id)
);

-- Create call_logs table
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habitation_id UUID REFERENCES public.habitations(id) ON DELETE CASCADE NOT NULL,
  visitor_phone TEXT,
  visitor_latitude DECIMAL(10, 8),
  visitor_longitude DECIMAL(11, 8),
  answered_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'ringing' -- ringing, answered, missed, rejected
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is resident of a habitation
CREATE OR REPLACE FUNCTION public.is_resident_of(_user_id UUID, _habitation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.residents
    WHERE user_id = _user_id AND habitation_id = _habitation_id AND status = 'verified'
  )
$$;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone_number', ''),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_anrs_updated_at BEFORE UPDATE ON public.anrs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_habitations_updated_at BEFORE UPDATE ON public.habitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles: only admins can manage, users can view own roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ANRs: public read for visitor access, authenticated write
CREATE POLICY "Anyone can view ANRs" ON public.anrs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create ANRs" ON public.anrs FOR INSERT TO authenticated WITH CHECK (true);

-- Habitations: residents can view their habitations, public can view for visitor selection
CREATE POLICY "Anyone can view habitations" ON public.habitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create habitations" ON public.habitations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owners can update habitations" ON public.habitations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.residents WHERE habitation_id = id AND user_id = auth.uid() AND is_owner = true)
);

-- Residents: users can view co-residents, manage own resident record
CREATE POLICY "Users can view residents of their habitations" ON public.residents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.residents r WHERE r.habitation_id = residents.habitation_id AND r.user_id = auth.uid())
  OR user_id = auth.uid()
);
CREATE POLICY "Users can insert themselves as resident" ON public.residents FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can manage residents" ON public.residents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.residents r WHERE r.habitation_id = residents.habitation_id AND r.user_id = auth.uid() AND r.is_owner = true)
  OR user_id = auth.uid()
);
CREATE POLICY "Owners can delete residents" ON public.residents FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.residents r WHERE r.habitation_id = residents.habitation_id AND r.user_id = auth.uid() AND r.is_owner = true)
);

-- Call logs: residents can view calls to their habitation
CREATE POLICY "Residents can view call logs" ON public.call_logs FOR SELECT USING (
  public.is_resident_of(auth.uid(), habitation_id)
);
CREATE POLICY "Anyone can create call logs" ON public.call_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Residents can update call logs" ON public.call_logs FOR UPDATE USING (
  public.is_resident_of(auth.uid(), habitation_id)
);

-- Constraint: max 5 residents per habitation
CREATE OR REPLACE FUNCTION public.check_max_residents()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.residents WHERE habitation_id = NEW.habitation_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 residents per habitation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_max_residents
  BEFORE INSERT ON public.residents
  FOR EACH ROW EXECUTE FUNCTION public.check_max_residents();