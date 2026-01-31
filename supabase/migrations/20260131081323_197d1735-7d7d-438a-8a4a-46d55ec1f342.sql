-- Create enum for member roles
CREATE TYPE public.dog_member_role AS ENUM ('owner', 'coparent');

-- Create enum for member status
CREATE TYPE public.dog_member_status AS ENUM ('invited', 'active', 'removed');

-- Create dog_members join table
CREATE TABLE public.dog_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role dog_member_role NOT NULL DEFAULT 'coparent',
  status dog_member_status NOT NULL DEFAULT 'invited',
  invited_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dog_id, user_id)
);

-- Enable RLS
ALTER TABLE public.dog_members ENABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE TRIGGER update_dog_members_updated_at
  BEFORE UPDATE ON public.dog_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add new notification type
ALTER TYPE public.notification_type ADD VALUE 'dog_invite';
ALTER TYPE public.notification_type ADD VALUE 'dog_invite_accepted';
ALTER TYPE public.notification_type ADD VALUE 'dog_invite_declined';

-- Helper function to check if user has access to a dog (owner or active co-parent)
CREATE OR REPLACE FUNCTION public.has_dog_access(p_user_id UUID, p_dog_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM dogs WHERE id = p_dog_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM dog_members 
    WHERE dog_id = p_dog_id 
    AND user_id = p_user_id 
    AND status = 'active'
  );
$$;

-- Helper function to check if user is primary owner of a dog
CREATE OR REPLACE FUNCTION public.is_dog_owner(p_user_id UUID, p_dog_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM dogs WHERE id = p_dog_id AND owner_id = p_user_id
  );
$$;

-- RLS Policies for dog_members

-- Users can view members of dogs they have access to
CREATE POLICY "Users can view dog members they have access to"
ON public.dog_members
FOR SELECT
USING (
  public.has_dog_access(auth.uid(), dog_id) 
  OR user_id = auth.uid()
);

-- Only dog owners can invite members
CREATE POLICY "Dog owners can invite members"
ON public.dog_members
FOR INSERT
WITH CHECK (
  public.is_dog_owner(auth.uid(), dog_id) 
  AND invited_by = auth.uid()
);

-- Invitees can update their own invite (accept/decline), owners can update any member
CREATE POLICY "Users can update their invites or owners can manage members"
ON public.dog_members
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR public.is_dog_owner(auth.uid(), dog_id)
);

-- Only owners can delete members, or users can remove themselves
CREATE POLICY "Owners can remove members or users can leave"
ON public.dog_members
FOR DELETE
USING (
  public.is_dog_owner(auth.uid(), dog_id) 
  OR user_id = auth.uid()
);

-- Update dogs table RLS to allow co-parents to view/edit
DROP POLICY IF EXISTS "Users can view dogs" ON public.dogs;
CREATE POLICY "Users can view dogs"
ON public.dogs
FOR SELECT
USING (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), id)
  OR EXISTS (
    SELECT 1 FROM care_requests cr
    WHERE cr.status = 'open' AND (cr.dog_id = dogs.id OR dogs.id = ANY(cr.dog_ids))
  )
  OR EXISTS (
    SELECT 1 FROM lost_alerts la
    WHERE la.dog_id = dogs.id AND la.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can update their own dogs" ON public.dogs;
CREATE POLICY "Users can update dogs they have access to"
ON public.dogs
FOR UPDATE
USING (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), id)
);

-- Only primary owner can delete dogs (keep existing policy)
-- DELETE policy remains: auth.uid() = owner_id

-- Update health_logs RLS to allow co-parents
DROP POLICY IF EXISTS "Users can view their own health logs" ON public.health_logs;
CREATE POLICY "Users can view health logs for accessible dogs"
ON public.health_logs
FOR SELECT
USING (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), dog_id)
);

DROP POLICY IF EXISTS "Users can insert their own health logs" ON public.health_logs;
CREATE POLICY "Users can insert health logs for accessible dogs"
ON public.health_logs
FOR INSERT
WITH CHECK (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), dog_id)
);

DROP POLICY IF EXISTS "Users can delete their own health logs" ON public.health_logs;
CREATE POLICY "Users can delete health logs for accessible dogs"
ON public.health_logs
FOR DELETE
USING (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), dog_id)
);

-- Update med_records RLS to allow co-parents
DROP POLICY IF EXISTS "Users can view their own med records" ON public.med_records;
CREATE POLICY "Users can view med records for accessible dogs"
ON public.med_records
FOR SELECT
USING (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), dog_id)
);

DROP POLICY IF EXISTS "Users can create their own med records" ON public.med_records;
CREATE POLICY "Users can create med records for accessible dogs"
ON public.med_records
FOR INSERT
WITH CHECK (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), dog_id)
);

DROP POLICY IF EXISTS "Users can update their own med records" ON public.med_records;
CREATE POLICY "Users can update med records for accessible dogs"
ON public.med_records
FOR UPDATE
USING (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), dog_id)
);

DROP POLICY IF EXISTS "Users can delete their own med records" ON public.med_records;
CREATE POLICY "Users can delete med records for accessible dogs"
ON public.med_records
FOR DELETE
USING (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), dog_id)
);

-- Update lost_alerts RLS to allow co-parents to view/manage
DROP POLICY IF EXISTS "Authenticated users can view active lost alerts" ON public.lost_alerts;
CREATE POLICY "Authenticated users can view active lost alerts"
ON public.lost_alerts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    status = 'active' 
    OR owner_id = auth.uid()
    OR public.has_dog_access(auth.uid(), dog_id)
  )
);

DROP POLICY IF EXISTS "Users can insert their own lost alerts" ON public.lost_alerts;
CREATE POLICY "Users can insert lost alerts for accessible dogs"
ON public.lost_alerts
FOR INSERT
WITH CHECK (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), dog_id)
);

DROP POLICY IF EXISTS "Users can update their own lost alerts" ON public.lost_alerts;
CREATE POLICY "Users can update lost alerts for accessible dogs"
ON public.lost_alerts
FOR UPDATE
USING (
  auth.uid() = owner_id 
  OR public.has_dog_access(auth.uid(), dog_id)
);

-- Trigger to create notification when someone is invited
CREATE OR REPLACE FUNCTION public.create_dog_invite_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dog dogs%ROWTYPE;
  v_inviter_profile profiles%ROWTYPE;
  v_inviter_name TEXT;
BEGIN
  -- Only trigger on new invite
  IF NEW.status = 'invited' THEN
    SELECT * INTO v_dog FROM dogs WHERE id = NEW.dog_id;
    SELECT * INTO v_inviter_profile FROM profiles WHERE user_id = NEW.invited_by;
    
    v_inviter_name := COALESCE(
      NULLIF(TRIM(COALESCE(v_inviter_profile.first_name, '') || ' ' || COALESCE(v_inviter_profile.last_name, '')), ''),
      v_inviter_profile.display_name,
      'Someone'
    );
    
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
    VALUES (
      NEW.user_id,
      'dog_invite',
      'Co-Pet Parent Invitation',
      v_inviter_name || ' invited you to co-parent ' || v_dog.name,
      'dog_invite',
      NEW.id,
      jsonb_build_object('inviterName', v_inviter_name, 'dogName', v_dog.name)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_dog_member_invited
  AFTER INSERT ON public.dog_members
  FOR EACH ROW
  EXECUTE FUNCTION public.create_dog_invite_notification();

-- Trigger to notify inviter when invite is accepted/declined
CREATE OR REPLACE FUNCTION public.create_dog_invite_response_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dog dogs%ROWTYPE;
  v_invitee_profile profiles%ROWTYPE;
  v_invitee_name TEXT;
  v_notification_type notification_type;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Only trigger when status changes from 'invited'
  IF OLD.status = 'invited' AND NEW.status IN ('active', 'removed') THEN
    SELECT * INTO v_dog FROM dogs WHERE id = NEW.dog_id;
    SELECT * INTO v_invitee_profile FROM profiles WHERE user_id = NEW.user_id;
    
    v_invitee_name := COALESCE(
      NULLIF(TRIM(COALESCE(v_invitee_profile.first_name, '') || ' ' || COALESCE(v_invitee_profile.last_name, '')), ''),
      v_invitee_profile.display_name,
      'Someone'
    );
    
    IF NEW.status = 'active' THEN
      v_notification_type := 'dog_invite_accepted';
      v_title := 'Invitation Accepted';
      v_body := v_invitee_name || ' accepted your invitation to co-parent ' || v_dog.name;
    ELSE
      v_notification_type := 'dog_invite_declined';
      v_title := 'Invitation Declined';
      v_body := v_invitee_name || ' declined your invitation to co-parent ' || v_dog.name;
    END IF;
    
    -- Notify the inviter
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
    VALUES (
      NEW.invited_by,
      v_notification_type,
      v_title,
      v_body,
      'dog',
      NEW.dog_id,
      jsonb_build_object('inviteeName', v_invitee_name, 'dogName', v_dog.name)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_dog_invite_response
  AFTER UPDATE ON public.dog_members
  FOR EACH ROW
  EXECUTE FUNCTION public.create_dog_invite_response_notification();