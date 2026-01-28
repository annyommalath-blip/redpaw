import { useState, useRef } from "react";
import { MapPin, Eye, Loader2, Camera, X, Image, Video } from "lucide-react";
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
import { processImageForUpload } from "@/lib/imageUtils";

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
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const isValid = message.trim() !== "";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 3 files
    const newFiles = files.slice(0, 3 - mediaFiles.length);
    
    for (const file of newFiles) {
      // Check file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Maximum file size is 50MB",
        });
        continue;
      }

      let processedFile = file;
      
      // Process images (resize, convert HEIC) - only for images
      if (file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".heic")) {
        try {
          const result = await processImageForUpload(file, { userId: user?.id || "anon" });
          if ("blob" in result) {
            processedFile = new File([result.blob], result.filename, { type: "image/jpeg" });
          }
        } catch (error) {
          console.error("Error processing image:", error);
        }
      }

      setMediaFiles(prev => [...prev, processedFile]);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(processedFile);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (): Promise<string[]> => {
    if (!user || mediaFiles.length === 0) return [];

    const urls: string[] = [];
    const totalFiles = mediaFiles.length;

    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/${alertId}-${Date.now()}-${i}.${fileExt}`;

      const { error } = await supabase.storage
        .from("sighting-media")
        .upload(fileName, file);

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("sighting-media")
        .getPublicUrl(fileName);

      urls.push(urlData.publicUrl);
      setUploadProgress(((i + 1) / totalFiles) * 100);
    }

    return urls;
  };

  const handleSubmit = async () => {
    if (!isValid || !user) return;

    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      // Upload media files first
      let mediaUrls: string[] = [];
      if (mediaFiles.length > 0) {
        mediaUrls = await uploadMedia();
      }

      const { error } = await supabase.from("sightings").insert({
        alert_id: alertId,
        reporter_id: user.id,
        message: message.trim(),
        location_text: location.trim() || null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      });

      if (error) throw error;

      toast({
        title: "👁️ Sighting Reported",
        description: "Thank you! The owner will be notified.",
      });

      resetForm();
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
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setLocation("");
    setMessage("");
    setMediaFiles([]);
    setMediaPreviews([]);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
          {/* Media Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              Add Photo/Video (optional)
            </Label>
            
            {/* Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {mediaFiles[index]?.type.startsWith("video/") ? (
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ) : (
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Media Button */}
            {mediaFiles.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="w-full"
              >
                <Image className="h-4 w-4 mr-2" />
                {mediaFiles.length === 0 ? "Add Photo or Video" : "Add More"}
              </Button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.heic,.heif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              Up to 3 photos or videos (max 50MB each)
            </p>
          </div>

          {/* Description */}
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

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="sighting-location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Last seen location (optional)
            </Label>
            <Input
              id="sighting-location"
              placeholder="e.g., Main Street near the bakery"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Progress Bar */}
        {isSubmitting && uploadProgress > 0 && (
          <div className="w-full bg-muted rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

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
                {uploadProgress > 0 ? "Uploading..." : "Submitting..."}
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
