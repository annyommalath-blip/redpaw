import { supabase } from "@/integrations/supabase/client";

const MED_NOTIFICATION_CHECK_KEY = "redpaw_med_notification_check";

/**
 * Check for expiring/expired medications and create notifications if not already notified.
 * This runs on app open to catch any medications that need attention.
 * Only runs once per day to avoid spamming.
 */
export async function checkMedicationNotifications(userId: string): Promise<void> {
  // Check if we already ran today
  const lastCheck = localStorage.getItem(MED_NOTIFICATION_CHECK_KEY);
  const today = new Date().toDateString();
  
  if (lastCheck === today) {
    return; // Already checked today
  }

  try {
    const todayDate = new Date();
    const thirtyDaysFromNow = new Date(todayDate);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get all med records for this user with dog names
    const { data: records, error: recordsError } = await supabase
      .from("med_records")
      .select("id, dog_id, name, expires_on, dogs(name)")
      .eq("owner_id", userId);

    if (recordsError) throw recordsError;
    if (!records || records.length === 0) {
      localStorage.setItem(MED_NOTIFICATION_CHECK_KEY, today);
      return;
    }

    // Get existing medication notifications for this user (to avoid duplicates)
    const { data: existingNotifs, error: notifsError } = await supabase
      .from("notifications")
      .select("link_id")
      .eq("user_id", userId)
      .eq("type", "medication_expiring");

    if (notifsError) throw notifsError;

    const notifiedRecordIds = new Set((existingNotifs || []).map(n => n.link_id));

    // Check each record
    for (const record of records) {
      // Skip if already notified
      if (notifiedRecordIds.has(record.id)) continue;

      const expiresOn = new Date(record.expires_on);
      const dogName = (record.dogs as any)?.name || "your dog";

      let notification: {
        user_id: string;
        type: "medication_expiring";
        title: string;
        body: string;
        link_type: string;
        link_id: string;
      } | null = null;

      // Check if expired
      if (expiresOn < todayDate) {
        notification = {
          user_id: userId,
          type: "medication_expiring",
          title: "Medication Expired",
          body: `${record.name} for ${dogName} has expired.`,
          link_type: "dog",
          link_id: record.dog_id,
        };
      }
      // Check if expiring within 30 days
      else if (expiresOn <= thirtyDaysFromNow) {
        const daysUntil = Math.ceil((expiresOn.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        notification = {
          user_id: userId,
          type: "medication_expiring",
          title: "Medication Expiring Soon",
          body: `${record.name} for ${dogName} expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`,
          link_type: "dog",
          link_id: record.dog_id,
        };
      }

      // Insert notification
      if (notification) {
        const { error: insertError } = await supabase
          .from("notifications")
          .insert(notification);

        if (insertError) {
          console.error("Error creating medication notification:", insertError);
        }
      }
    }

    // Mark as checked today
    localStorage.setItem(MED_NOTIFICATION_CHECK_KEY, today);
  } catch (error) {
    console.error("Error checking medication notifications:", error);
  }
}
