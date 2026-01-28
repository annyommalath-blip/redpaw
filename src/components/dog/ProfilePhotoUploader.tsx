import { useState, useRef } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isValidImageType, isHeicFile, processImageFile } from "@/lib/imageUtils";

interface ProfilePhotoUploaderProps {
  userId: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}

export function ProfilePhotoUploader({ userId, photoUrl, onChange }: ProfilePhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isValidImageType(file)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please use JPG, PNG, WebP, or HEIC.",
      });
      return;
    }

    // Validate file size (15MB max for raw files)
    if (file.size > 15 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum size is 15MB.",
      });
      return;
    }

    setUploading(true);
    setStatusText(isHeicFile(file) ? "Converting..." : "Uploading...");

    try {
      // Process the image (convert HEIC if needed, compress)
      const processedFile = await processImageFile(file, (status) => {
        setStatusText(status);
      });

      setStatusText("Uploading...");

      // Generate filename with correct extension
      const fileExt = processedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("dog-photos")
        .upload(fileName, processedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("dog-photos")
        .getPublicUrl(fileName);

      // Update state with the new URL
      onChange(urlData.publicUrl);
      
      toast({ title: "Photo uploaded! 📸" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Please try again with a JPG or PNG image.",
      });
    } finally {
      setUploading(false);
      setStatusText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!photoUrl) return;

    try {
      const url = new URL(photoUrl);
      const pathParts = url.pathname.split("/dog-photos/");
      if (pathParts[1]) {
        await supabase.storage.from("dog-photos").remove([pathParts[1]]);
      }
    } catch (error) {
      console.error("Error removing file:", error);
    }

    onChange(null);
  };

  const handleAvatarClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Clickable Avatar */}
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploading}
          className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Avatar className="h-28 w-28 border-4 border-primary/20">
            <AvatarImage src={photoUrl || undefined} alt="Dog profile photo" />
            <AvatarFallback className="bg-muted">
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                  <span className="text-xs text-muted-foreground mt-1">{statusText}</span>
                </div>
              ) : (
                <Plus className="h-8 w-8 text-muted-foreground" />
              )}
            </AvatarFallback>
          </Avatar>

          {/* Upload overlay when uploading and photo exists */}
          {uploading && photoUrl && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
              <span className="text-xs text-white mt-1">{statusText}</span>
            </div>
          )}

          {/* Plus button overlay (bottom-right) */}
          {!uploading && (
            <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-background">
              <Plus className="h-4 w-4" />
            </div>
          )}
        </button>

        {/* Remove button (top-right, only when photo exists) */}
        {photoUrl && !uploading && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
