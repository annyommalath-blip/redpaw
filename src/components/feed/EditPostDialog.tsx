import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Users, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PostVisibility } from "./PostCard";

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  initialCaption: string;
  initialVisibility: PostVisibility;
  onSave: (postId: string, caption: string, visibility: PostVisibility) => Promise<void>;
}

export default function EditPostDialog({
  open,
  onOpenChange,
  postId,
  initialCaption,
  initialVisibility,
  onSave,
}: EditPostDialogProps) {
  const { t } = useTranslation();
  const [caption, setCaption] = useState(initialCaption);
  const [visibility, setVisibility] = useState<PostVisibility>(initialVisibility);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(postId, caption, visibility);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const visibilityOptions: { value: PostVisibility; label: string; icon: React.ReactNode }[] = [
    { value: "public", label: t("feed.public", "Public"), icon: <Globe className="h-4 w-4" /> },
    { value: "friends", label: t("feed.friendsOnly", "Friends only"), icon: <Users className="h-4 w-4" /> },
    { value: "private", label: t("feed.onlyMe", "Only me"), icon: <Lock className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("feed.editPost", "Edit Post")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("feed.caption", "Caption")}</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder={t("feed.writeCaption", "Write a caption...")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("feed.privacy", "Privacy")}</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as PostVisibility)}>
              {visibilityOptions.map((opt) => (
                <div key={opt.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50">
                  <RadioGroupItem value={opt.value} id={`vis-${opt.value}`} />
                  <label htmlFor={`vis-${opt.value}`} className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
                    {opt.icon}
                    {opt.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
