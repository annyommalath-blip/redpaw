import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, AlertTriangle, Loader2, Shield } from "lucide-react";
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
  const [coatShade, setCoatShade] = useState("");
  const [collarDescription, setCollarDescription] = useState("");
  const [markings, setMarkings] = useState("");
  const [verificationSecret, setVerificationSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isValid = location.locationLabel.trim() !== "" && lastSeenWhen.trim() !== "";

  const handlePost = async () => {
    if (!isValid || !user) return;

    setIsSubmitting(true);
    try {
      // Update dog's lost status + identity details for matching
      const dogUpdate: any = { is_lost: true };
      if (coatShade.trim()) dogUpdate.coat_shade = coatShade.trim();
      if (collarDescription.trim()) dogUpdate.collar_description = collarDescription.trim();
      if (markings.trim()) dogUpdate.markings = markings.split(",").map((m: string) => m.trim()).filter(Boolean);
      if (verificationSecret.trim()) dogUpdate.verification_secret = verificationSecret.trim();

      const { error: dogError } = await supabase
        .from("dogs")
        .update(dogUpdate)
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
      setCoatShade("");
      setCollarDescription("");
      setMarkings("");
      setVerificationSecret("");
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
      setCoatShade("");
      setCollarDescription("");
      setMarkings("");
      setVerificationSecret("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Identity Details for Matching */}
          <div className="space-y-3 border-t pt-3">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              Help us match {dog.name} (optional but recommended)
            </Label>

            <div className="space-y-2">
              <Label htmlFor="coat" className="text-xs text-muted-foreground">
                Coat color shade (be specific, e.g. "deep reddish gold" not just "brown")
              </Label>
              <Input
                id="coat"
                placeholder="e.g., light cream, dark chocolate, brindle tan"
                value={coatShade}
                onChange={(e) => setCoatShade(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collar" className="text-xs text-muted-foreground">
                What was {dog.name} wearing? (collar, harness, tags)
              </Label>
              <Input
                id="collar"
                placeholder="e.g., red leather collar with bone tag"
                value={collarDescription}
                onChange={(e) => setCollarDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="markings" className="text-xs text-muted-foreground">
                Distinctive markings? (separate with commas)
              </Label>
              <Input
                id="markings"
                placeholder="e.g., white chest patch, scar on left ear, dark muzzle"
                value={markings}
                onChange={(e) => setMarkings(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret" className="text-xs text-muted-foreground">
                Verification secret — something only you'd know about {dog.name}
              </Label>
              <Input
                id="secret"
                placeholder="e.g., birthmark on belly, responds to 'cookie' command"
                value={verificationSecret}
                onChange={(e) => setVerificationSecret(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-muted-foreground">
                This is never shared publicly. It's used to verify your ownership if someone claims to have found {dog.name}.
              </p>
            </div>
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
