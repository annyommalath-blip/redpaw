import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import heic2any from "heic2any";

interface ProfilePhotoUploaderProps {
  userId: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}

// Convert HEIC/HEIF to JPEG
async function convertHeicToJpeg(file: File): Promise<File> {
  const blob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  const newFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([resultBlob], newFileName, { type: "image/jpeg" });
}

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || 
         file.type === 'image/heic' || file.type === 'image/heif';
}

function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];
  const name = file.name.toLowerCase();
  return validTypes.includes(file.type) || validExtensions.some(ext => name.endsWith(ext));
}

export function ProfilePhotoUploader({
  userId,
  photoUrl,
  onChange,
}: ProfilePhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageType(file)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please use JPG, PNG, WebP, or HEIC.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum size is 10MB.",
      });
      return;
    }

    setUploading(true);

    try {
      let processedFile = file;

      // Convert HEIC to JPEG
      if (isHeicFile(file)) {
        toast({ title: "Converting photo...", description: "Converting to JPEG format." });
        try {
          processedFile = await convertHeicToJpeg(file);
        } catch {
          toast({
            variant: "destructive",
            title: "Conversion failed",
            description: "Please convert to JPG/PNG manually.",
          });
          setUploading(false);
          return;
        }
      }

      const fileExt = processedFile.name.split(".").pop() || "jpg";
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

      onChange(urlData.publicUrl);
      toast({ title: "Profile photo uploaded! 📸" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Please try again.",
      });
    } finally {
      setUploading(false);
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

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className="h-28 w-28 border-4 border-primary/20">
          <AvatarImage src={photoUrl || undefined} alt="Dog profile photo" />
          <AvatarFallback className="bg-muted">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground" />
            )}
          </AvatarFallback>
        </Avatar>

        {photoUrl && !uploading && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            {photoUrl ? "Change Photo" : "Add Profile Photo"}
          </>
        )}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
