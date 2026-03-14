import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calculateDistanceKm } from "@/lib/distanceUtils";

const NEARBY_RADIUS_KM = 10;
const SEEN_ALERTS_KEY = "redpaw_seen_lost_alerts";

function getSeenAlerts(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_ALERTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markAlertSeen(id: string) {
  try {
    const seen = getSeenAlerts();
    seen.add(id);
    localStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify(Array.from(seen).slice(-200)));
  } catch { /* ignore */ }
}

async function notifyNearbyAlert(
  alert: any,
  userId: string,
  viewerLat: number,
  viewerLon: number
) {
  const distKm = calculateDistanceKm(viewerLat, viewerLon, alert.latitude, alert.longitude);
  if (distKm > NEARBY_RADIUS_KM) return;
  if (getSeenAlerts().has(alert.id)) return;

  markAlertSeen(alert.id);

  const distMi = (distKm * 0.621371).toFixed(1);
  const locationLabel = alert.location_label || alert.last_seen_location || "nearby";

  let dogName = "A dog";
  const { data: dogData } = await supabase.from("dogs").select("name").eq("id", alert.dog_id).maybeSingle();
  if (dogData?.name) dogName = dogData.name;

  toast.warning("🚨 Lost dog nearby!", {
    description: `${dogName} was last seen ${distMi} mi away near ${locationLabel}.`,
    duration: 8000,
    action: {
      label: "View",
      onClick: () => { window.location.href = `/lost-alert/${alert.id}`; },
    },
  });

  // Avoid duplicate DB notifications
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("link_id", alert.id)
    .eq("type", "lost_dog_nearby")
    .maybeSingle();

  if (!existing) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "lost_dog_nearby",
      title: "Lost dog nearby",
      body: `${dogName} was last seen ${distMi} mi away near ${locationLabel}.`,
      body_params: { dog_name: dogName, distance: distMi, location: locationLabel },
      link_type: "lost_alert",
      link_id: alert.id,
      is_read: false,
    });
  }
}

/**
 * Watches for lost dog alerts near the current user.
 * - On mount (once location is known): scans existing active alerts from the last 7 days
 * - Realtime: fires whenever a new alert is inserted into lost_alerts
 * Alerts within NEARBY_RADIUS_KM trigger a toast + DB notification.
 */
export function useLostDogNearbyAlerts(
  viewerLatitude: number | null,
  viewerLongitude: number | null
) {
  const { user } = useAuth();
  const viewerLatRef = useRef(viewerLatitude);
  const viewerLonRef = useRef(viewerLongitude);
  const didScanRef = useRef(false);

  useEffect(() => {
    viewerLatRef.current = viewerLatitude;
    viewerLonRef.current = viewerLongitude;
  }, [viewerLatitude, viewerLongitude]);

  // Scan existing recent alerts once we have location
  useEffect(() => {
    if (!user || !viewerLatitude || !viewerLongitude || didScanRef.current) return;
    didScanRef.current = true;

    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: alerts } = await supabase
        .from("lost_alerts")
        .select("id, owner_id, dog_id, latitude, longitude, location_label, last_seen_location")
        .eq("status", "active")
        .gte("created_at", sevenDaysAgo)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (!alerts) return;

      for (const alert of alerts) {
        if (alert.owner_id === user.id) continue;
        await notifyNearbyAlert(alert, user.id, viewerLatitude, viewerLongitude);
      }
    })();
  }, [user, viewerLatitude, viewerLongitude]);

  // Realtime subscription for new alerts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("lost-alerts-nearby-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lost_alerts" }, async (payload) => {
        const alert = payload.new as any;
        if (alert.owner_id === user.id) return;
        const vLat = viewerLatRef.current;
        const vLon = viewerLonRef.current;
        if (!vLat || !vLon || !alert.latitude || !alert.longitude) return;
        await notifyNearbyAlert(alert, user.id, vLat, vLon);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);
}
