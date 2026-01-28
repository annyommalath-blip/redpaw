import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, AlertTriangle, Loader2 } from "lucide-react";
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
  const [lastSeenLocation, setLastSeenLocation] = useState("");
  const [lastSeenWhen, setLastSeenWhen] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isValid = lastSeenLocation.trim() !== "" && lastSeenWhen.trim() !== "";

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

      // Create lost alert post
      const description = extraNotes.trim()
        ? `Last seen: ${lastSeenWhen.trim()}. ${extraNotes.trim()}`
        : `Last seen: ${lastSeenWhen.trim()}`;

      const { error: alertError } = await supabase.from("lost_alerts").insert({
        dog_id: dog.id,
        owner_id: user.id,
        title: `${dog.name} is missing!`,
        description: description,
        last_seen_location: lastSeenLocation.trim(),
        photo_url: dog.photo_url,
        status: "active",
      });

      if (alertError) throw alertError;

      toast({
        title: "🚨 Lost Alert Posted",
        description: "Your lost dog alert is now visible to the community.",
        variant: "destructive",
      });

      // Reset form
      setLastSeenLocation("");
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
      setLastSeenLocation("");
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
            <DialogTitle>Report {dog.name} as Lost</DialogTitle>
          </div>
          <DialogDescription>
            Provide details to help the community find your dog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Last Seen Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Last seen where? <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location"
              placeholder="e.g., Central Park, near the fountain"
              value={lastSeenLocation}
              onChange={(e) => setLastSeenLocation(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Last Seen When */}
          <div className="space-y-2">
            <Label htmlFor="when" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Last seen when? <span className="text-destructive">*</span>
            </Label>
            <Input
              id="when"
              placeholder="e.g., Today around 3pm"
              value={lastSeenWhen}
              onChange={(e) => setLastSeenWhen(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Extra Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional details (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Was wearing a red collar, responds to treats..."
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
            Cancel
          </Button>
          <Button
            onClick={handlePost}
            disabled={!isValid || isSubmitting}
            className="bg-lost hover:bg-lost/90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Alert"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
