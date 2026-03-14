-- Enable Supabase Realtime for lost_alerts so client-side subscriptions fire
-- when a new alert is inserted (used by useLostDogNearbyAlerts hook)
ALTER PUBLICATION supabase_realtime ADD TABLE public.lost_alerts;
