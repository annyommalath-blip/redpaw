import { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { processImageFile } from "@/lib/imageUtils";

interface FoundDogPhotoUploaderProps {
  photoUrls: string[];
  onPhotosChange: (urls: string[]) => void;
  maxPhotos?: number;
  bucket?: string;
}

export function FoundDogPhotoUploader({
  photoUrls,
  onPhotosChange,
  maxPhotos = 3,
  bucket = "found-dog-photos",
}: FoundDogPhotoUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const remainingSlots = maxPhotos - photoUrls.length;
    if (remainingSlots <= 0) {
      toast({
        variant: "destructive",
        title: `Maximum ${maxPhotos} photos allowed`,
      });
      return;
    }

    setUploading(true);

    try {
      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const newUrls: string[] = [];

      for (const file of filesToUpload) {
        // Process image (handle HEIC, resize, compress)
        const processedFile = await processImageFile(file);

        const fileExt = "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, processedFile, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        newUrls.push(urlData.publicUrl);
      }

      onPhotosChange([...photoUrls, ...newUrls]);
      toast({ title: "Photos uploaded! 📸" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = photoUrls.filter((_, i) => i !== index);
    onPhotosChange(newUrls);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {photoUrls.map((url, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => handleRemove(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {photoUrls.length < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1 bg-muted/50"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      <p className="text-xs text-muted-foreground">
        {photoUrls.length}/{maxPhotos} photos • At least 1 required
      </p>
    </div>
  );
}
