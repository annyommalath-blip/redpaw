import { useState, useRef } from "react";
import { Camera, X, Loader2, Globe, Users, Lock, Plus, Grid3X3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { processImageFile } from "@/lib/imageUtils";
import type { PostVisibility } from "@/components/feed/PostCard";
import ImageCropDialog from "./ImageCropDialog";

const MAX_PHOTOS = 6;

interface PhotoItem {
  id: string;
  croppedBlob: Blob;
  previewUrl: string;
}

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
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const userName = userProfile?.first_name || userProfile?.display_name || "You";

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }

    // Process first file, open crop dialog
    const file = files[0];
    try {
      const processed = await processImageFile(file);
      setPendingFile(processed);
      setCropSrc(URL.createObjectURL(processed));
    } catch (err) {
      toast.error("Failed to process image");
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleCropConfirm = (croppedBlob: Blob) => {
    const previewUrl = URL.createObjectURL(croppedBlob);
    const item: PhotoItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      croppedBlob,
      previewUrl,
    };
    setPhotos((prev) => [...prev, item]);

    // Clean up
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPendingFile(null);
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPendingFile(null);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handlePost = async () => {
    if (!user || (!caption.trim() && photos.length === 0)) return;
    setPosting(true);

    try {
      const uploadedUrls: string[] = [];

      // Upload all cropped photos
      for (const photo of photos) {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("post-photos")
          .upload(path, photo.croppedBlob, { contentType: "image/jpeg" });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("post-photos").getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        caption: caption.trim() || null,
        photo_url: uploadedUrls[0] || null,
        photo_urls: uploadedUrls,
        visibility,
      } as any);

      if (error) throw error;

      toast.success(t("home.postShared"));
      setCaption("");
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      onOpenChange(false);
      onPostCreated();
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const clearAll = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
  };

  return (
    <>
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

            {/* Photo previews grid */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    {photos.length}/{MAX_PHOTOS} photos
                  </span>
                  {photos.length > 1 && (
                    <button onClick={clearAll} className="text-xs text-destructive hover:underline">
                      Remove all
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/5" }}>
                      <img src={photo.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <X className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:bg-muted/50 transition-colors"
                      style={{ aspectRatio: "4/5" }}
                    >
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Add</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl gap-2"
                  onClick={() => fileRef.current?.click()}
                  disabled={photos.length >= MAX_PHOTOS}
                >
                  <Camera className="h-4 w-4" />
                  {photos.length === 0 ? t("home.sharePhoto") : "Add"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                {/* Visibility picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-xl gap-1.5 text-muted-foreground">
                      {visibility === "public" && <Globe className="h-3.5 w-3.5" />}
                      {visibility === "friends" && <Users className="h-3.5 w-3.5" />}
                      {visibility === "private" && <Lock className="h-3.5 w-3.5" />}
                      <span className="text-xs capitalize">{t(`home.visibility.${visibility}`)}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setVisibility("public")} className="gap-2">
                      <Globe className="h-4 w-4" />
                      <div>
                        <p className="font-medium text-sm">{t("home.visibility.public")}</p>
                        <p className="text-xs text-muted-foreground">{t("home.visibility.publicDesc")}</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVisibility("friends")} className="gap-2">
                      <Users className="h-4 w-4" />
                      <div>
                        <p className="font-medium text-sm">{t("home.visibility.friends")}</p>
                        <p className="text-xs text-muted-foreground">{t("home.visibility.friendsDesc")}</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVisibility("private")} className="gap-2">
                      <Lock className="h-4 w-4" />
                      <div>
                        <p className="font-medium text-sm">{t("home.visibility.private")}</p>
                        <p className="text-xs text-muted-foreground">{t("home.visibility.privateDesc")}</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button onClick={handlePost} disabled={posting || (!caption.trim() && photos.length === 0)} className="rounded-xl gap-2">
                {posting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.post")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Crop dialog */}
      <ImageCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc || ""}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </>
  );
}
