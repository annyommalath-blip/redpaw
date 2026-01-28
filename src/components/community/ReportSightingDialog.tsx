import { useState } from "react";
import { MapPin, Eye, Loader2 } from "lucide-react";
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

interface ReportSightingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertId: string;
  dogName: string;
  onSuccess?: () => void;
}

export function ReportSightingDialog({
  open,
  onOpenChange,
  alertId,
  dogName,
  onSuccess,
}: ReportSightingDialogProps) {
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const isValid = message.trim() !== "";

  const handleSubmit = async () => {
    if (!isValid || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("sightings").insert({
        alert_id: alertId,
        reporter_id: user.id,
        message: message.trim(),
        location_text: location.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "👁️ Sighting Reported",
        description: "Thank you! The owner will be notified.",
      });

      setLocation("");
      setMessage("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error reporting sighting:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to report sighting",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setLocation("");
      setMessage("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Eye className="h-5 w-5" />
            <DialogTitle>Report a Sighting</DialogTitle>
          </div>
          <DialogDescription>
            Help find {dogName} by reporting where you saw them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="sighting-location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Where did you see them? (optional)
            </Label>
            <Input
              id="sighting-location"
              placeholder="e.g., Main Street near the bakery"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="sighting-message">
              Describe what you saw <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="sighting-message"
              placeholder="e.g., Saw a dog matching the description running towards the park around 2pm..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              rows={4}
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
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
