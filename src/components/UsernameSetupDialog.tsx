import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, AtSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UsernameSetupDialogProps {
  open: boolean;
  onComplete: (username: string) => void;
}

const USERNAME_RE = /^[a-z0-9_.]{1,30}$/;

export default function UsernameSetupDialog({ open, onComplete }: UsernameSetupDialogProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const validate = (val: string): string => {
    if (!val) return "Username is required";
    if (val.length < 3) return "At least 3 characters";
    if (!USERNAME_RE.test(val)) return "Only lowercase letters, numbers, _ and .";
    return "";
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmed = username.trim().toLowerCase();
    const validationError = validate(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", trimmed)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      setError("Username already taken");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: trimmed })
      .eq("user_id", user.id);

    if (updateError) {
      if (updateError.message?.includes("chk_username_format")) {
        setError("Invalid username format");
      } else if (updateError.message?.includes("idx_profiles_username")) {
        setError("Username already taken");
      } else {
        setError("Failed to save");
      }
      setSaving(false);
      return;
    }

    toast.success("Username set!");
    onComplete(trimmed);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5 text-primary" />
            Choose your username
          </DialogTitle>
          <DialogDescription>
            Pick a unique username for your profile. Others can mention you with @username.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
                  setUsername(val);
                  setError("");
                }}
                placeholder="your.username"
                className="pl-7"
                maxLength={30}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, underscores and dots only.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || !username.trim()} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Set Username
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
