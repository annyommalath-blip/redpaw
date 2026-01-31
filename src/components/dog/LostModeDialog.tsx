import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { LocationPicker } from "@/components/location/LocationPicker";
import { useGeolocation } from "@/hooks/useGeolocation";

interface LostModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dog: {
    id: string;
    name: string;
    breed: string | null;
    photo_url: string | null;
  };
  onSuccess: () => void;
}

export function LostModeDialog({
  open,
  onOpenChange,
  dog,
  onSuccess,
}: LostModeDialogProps) {
  const { t } = useTranslation();
  const location = useGeolocation();
  const [lastSeenWhen, setLastSeenWhen] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isValid = location.locationLabel.trim() !== "" && lastSeenWhen.trim() !== "";

  const handlePost = async () => {
    if (!isValid || !user) return;

    setIsSubmitting(true);
    try {
      // Update dog's lost status
      const { error: dogError } = await supabase
        .from("dogs")
        .update({ is_lost: true })
        .eq("id", dog.id);

      if (dogError) throw dogError;

      // Create lost alert post with location data
      const description = extraNotes.trim()
        ? `Last seen: ${lastSeenWhen.trim()}. ${extraNotes.trim()}`
        : `Last seen: ${lastSeenWhen.trim()}`;

      const { error: alertError } = await supabase.from("lost_alerts").insert({
        dog_id: dog.id,
        owner_id: user.id,
        title: `${dog.name} is missing!`,
        description: description,
        last_seen_location: location.locationLabel.trim(),
        photo_url: dog.photo_url,
        status: "active",
        latitude: location.latitude,
        longitude: location.longitude,
        location_label: location.locationLabel.trim(),
        location_source: location.locationSource,
      });

      if (alertError) throw alertError;

      toast({
        title: t("lost.alertPosted"),
        description: t("lost.alertPostedDesc"),
        variant: "destructive",
      });

      // Reset form
      location.reset();
      setLastSeenWhen("");
      setExtraNotes("");
      onOpenChange(false);
      onSuccess();

      // Navigate to Community tab with Lost Dogs feed
      navigate("/community?tab=lost");
    } catch (error: any) {
      console.error("Error posting lost alert:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to post lost alert",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      location.reset();
      setLastSeenWhen("");
      setExtraNotes("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-lost">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>{t("lost.reportAsLost", { name: dog.name })}</DialogTitle>
          </div>
          <DialogDescription>
            {t("lost.provideDetails")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location Picker */}
          <LocationPicker
            latitude={location.latitude}
            longitude={location.longitude}
            locationLabel={location.locationLabel}
            locationSource={location.locationSource}
            loading={location.loading}
            error={location.error}
            permissionDenied={location.permissionDenied}
            onRequestLocation={location.requestLocation}
            onManualLocation={location.setManualLocation}
            onLocationTextChange={location.setLocationFromText}
            onSearchAddress={location.searchAddress}
            required
            placeholder={t("lost.whereLastSeen")}
            description={t("lost.locationDesc")}
          />

          {/* Last Seen When */}
          <div className="space-y-2">
            <Label htmlFor="when" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t("lost.lastSeenWhen")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="when"
              placeholder={t("lost.lastSeenWhenPlaceholder")}
              value={lastSeenWhen}
              onChange={(e) => setLastSeenWhen(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Extra Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("lost.additionalDetails")}</Label>
            <Textarea
              id="notes"
              placeholder={t("lost.additionalDetailsPlaceholder")}
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handlePost}
            disabled={!isValid || isSubmitting}
            className="bg-lost hover:bg-lost/90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("lost.posting")}
              </>
            ) : (
              t("lost.postAlert")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
