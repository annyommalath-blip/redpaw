import { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { processImageFile } from "@/lib/imageUtils";

interface CreatePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
  userProfile?: { display_name: string | null; first_name: string | null; avatar_url: string | null } | null;
}

export default function CreatePostSheet({ open, onOpenChange, onPostCreated, userProfile }: CreatePostSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const userName = userProfile?.first_name || userProfile?.display_name || "You";

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processImageFile(file);
      setPhotoFile(processed);
      setPhotoPreview(URL.createObjectURL(processed));
    } catch (err) {
      toast.error("Failed to process image");
    }
  };

  const handlePost = async () => {
    if (!user || (!caption.trim() && !photoFile)) return;
    setPosting(true);

    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("post-photos")
          .upload(path, photoFile, { contentType: "image/jpeg" });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("post-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        caption: caption.trim() || null,
        photo_url: photoUrl,
      });

      if (error) throw error;

      toast.success(t("home.postShared"));
      setCaption("");
      setPhotoFile(null);
      setPhotoPreview(null);
      onOpenChange(false);
      onPostCreated();
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("home.createPost")}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Author preview */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {userProfile?.avatar_url && <AvatarImage src={userProfile.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm">{userName}</span>
          </div>

          {/* Caption */}
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t("home.writeCaption")}
            className="min-h-[100px] rounded-xl resize-none border-none bg-muted/50 focus-visible:ring-0"
          />

          {/* Photo preview */}
          {photoPreview && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={photoPreview} alt="Preview" className="w-full max-h-64 object-cover rounded-xl" />
              <button
                onClick={clearPhoto}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" className="rounded-xl gap-2" onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" />
              {t("home.sharePhoto")}
            </Button>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handlePhotoSelect} />

            <Button onClick={handlePost} disabled={posting || (!caption.trim() && !photoFile)} className="rounded-xl gap-2">
              {posting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.post")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
