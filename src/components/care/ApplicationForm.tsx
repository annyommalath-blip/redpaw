import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ApplicationFormProps {
  requestId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ApplicationForm({ requestId, onSuccess, onCancel }: ApplicationFormProps) {
  const [availabilityText, setAvailabilityText] = useState("");
  const [message, setMessage] = useState("");
  const [rateOffered, setRateOffered] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!availabilityText.trim() || !message.trim()) {
      toast({ variant: "destructive", title: "Please fill in all required fields" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("care_applications").insert({
        request_id: requestId,
        applicant_id: user.id,
        availability_text: availabilityText.trim(),
        message: message.trim(),
        rate_offered: rateOffered.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "You've already applied to this request" });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Application sent! 🐾", description: "The owner will review your application." });
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Apply for this job</CardTitle>
        <CardDescription>Tell the owner why you're a great fit</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="availability">Your Availability *</Label>
            <Input
              id="availability"
              placeholder="e.g., Available all day today, or Mon-Fri evenings"
              value={availabilityText}
              onChange={(e) => setAvailabilityText(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message to Owner *</Label>
            <Textarea
              id="message"
              placeholder="Introduce yourself and share your experience with dogs..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate">Your Rate (optional)</Label>
            <Input
              id="rate"
              placeholder="e.g., $20/hour"
              value={rateOffered}
              onChange={(e) => setRateOffered(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Sending..." : "Apply"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
