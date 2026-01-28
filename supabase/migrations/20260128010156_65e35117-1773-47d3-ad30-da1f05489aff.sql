-- RedPaw Database Schema

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dogs table
CREATE TABLE public.dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  age TEXT,
  weight TEXT,
  photo_url TEXT,
  notes TEXT,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create health_logs table
CREATE TYPE public.log_type AS ENUM ('walk', 'food', 'meds', 'mood', 'symptom');

CREATE TABLE public.health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_type public.log_type NOT NULL,
  value TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lost_alerts table
CREATE TYPE public.alert_status AS ENUM ('active', 'resolved');

CREATE TABLE public.lost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  last_seen_location TEXT NOT NULL,
  photo_url TEXT,
  status public.alert_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sightings table
CREATE TABLE public.sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.lost_alerts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  location_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create care_requests table
CREATE TYPE public.care_type AS ENUM ('walk', 'watch', 'overnight', 'check-in');
CREATE TYPE public.request_status AS ENUM ('open', 'closed');

CREATE TABLE public.care_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  care_type public.care_type NOT NULL,
  time_window TEXT NOT NULL,
  location_text TEXT NOT NULL,
  notes TEXT,
  pay_offered TEXT,
  status public.request_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids UUID[] NOT NULL,
  last_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dogs_updated_at
  BEFORE UPDATE ON public.dogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lost_alerts_updated_at
  BEFORE UPDATE ON public.lost_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_care_requests_updated_at
  BEFORE UPDATE ON public.care_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Dogs RLS Policies
CREATE POLICY "Users can view their own dogs"
  ON public.dogs FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own dogs"
  ON public.dogs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own dogs"
  ON public.dogs FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own dogs"
  ON public.dogs FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Health Logs RLS Policies
CREATE POLICY "Users can view their own health logs"
  ON public.health_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own health logs"
  ON public.health_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own health logs"
  ON public.health_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Lost Alerts RLS Policies (public read for community)
CREATE POLICY "Anyone can view active lost alerts"
  ON public.lost_alerts FOR SELECT
  TO authenticated
  USING (status = 'active' OR auth.uid() = owner_id);

CREATE POLICY "Users can insert their own lost alerts"
  ON public.lost_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own lost alerts"
  ON public.lost_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own lost alerts"
  ON public.lost_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Sightings RLS Policies
CREATE POLICY "Users can view sightings for active alerts"
  ON public.sightings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lost_alerts la
      WHERE la.id = alert_id AND (la.status = 'active' OR la.owner_id = auth.uid())
    )
    OR auth.uid() = reporter_id
  );

CREATE POLICY "Users can insert sightings"
  ON public.sightings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Care Requests RLS Policies (public read for community)
CREATE POLICY "Anyone can view open care requests"
  ON public.care_requests FOR SELECT
  TO authenticated
  USING (status = 'open' OR auth.uid() = owner_id);

CREATE POLICY "Users can insert their own care requests"
  ON public.care_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own care requests"
  ON public.care_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own care requests"
  ON public.care_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Conversations RLS Policies
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can insert conversations they're part of"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = ANY(participant_ids));

-- Messages RLS Policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND auth.uid() = ANY(c.participant_ids)
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND auth.uid() = ANY(c.participant_ids)
    )
  );

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_dogs_owner_id ON public.dogs(owner_id);
CREATE INDEX idx_health_logs_dog_id ON public.health_logs(dog_id);
CREATE INDEX idx_health_logs_owner_id ON public.health_logs(owner_id);
CREATE INDEX idx_lost_alerts_status ON public.lost_alerts(status);
CREATE INDEX idx_lost_alerts_owner_id ON public.lost_alerts(owner_id);
CREATE INDEX idx_care_requests_status ON public.care_requests(status);
CREATE INDEX idx_care_requests_owner_id ON public.care_requests(owner_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_conversations_participant_ids ON public.conversations USING GIN(participant_ids);