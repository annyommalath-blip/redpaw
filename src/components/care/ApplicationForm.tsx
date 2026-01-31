import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ApplicationFormProps {
  requestId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ApplicationForm({ requestId, onSuccess, onCancel }: ApplicationFormProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({ variant: "destructive", title: t("application.writeMessage") });
      return;
    }

    if (message.trim().length > 500) {
      toast({ variant: "destructive", title: t("application.messageTooLong") });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("care_applications").insert({
        request_id: requestId,
        applicant_id: user.id,
        availability_text: "Available", // Default value since we simplified
        message: message.trim(),
        last_applied_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: t("application.alreadyApplied") });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: t("application.applicationSent"), description: t("application.ownerWillReview") });
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
        <CardTitle className="text-lg">{t("application.title")}</CardTitle>
        <CardDescription>{t("application.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">{t("application.messageToOwner")} *</Label>
            <Textarea
              id="message"
              placeholder={t("application.messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !message.trim()}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? t("common.sending") : t("application.sendApplication")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
