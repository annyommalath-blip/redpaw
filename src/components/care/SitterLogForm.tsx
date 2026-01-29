import { useState, useRef } from "react";
import { Camera, Video, X, Upload, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SitterLogFormProps {
  requestId: string;
  dogId: string;
  ownerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type LogType = "walk" | "meal" | "potty" | "play" | "note";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function SitterLogForm({
  requestId,
  dogId,
  ownerId,
  onSuccess,
  onCancel,
}: SitterLogFormProps) {
  const [logType, setLogType] = useState<LogType | "">("");
  const [noteText, setNoteText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file sizes
    const invalidFiles = selectedFiles.filter(f => f.size > MAX_FILE_SIZE);
    if (invalidFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 50MB",
      });
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    const paths: string[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const fileName = `${requestId}/${Date.now()}-${i}.${ext}`;

      const { data, error } = await supabase.storage
        .from("sitter-logs")
        .upload(fileName, file);

      if (error) throw error;

      // Store the file path (not public URL) since bucket is now private
      paths.push(data.path);
      setUploadProgress(((i + 1) / files.length) * 100);
    }

    return paths;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!logType) {
      toast({ variant: "destructive", title: "Please select a log type" });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload media files
      let mediaUrls: string[] = [];
      if (files.length > 0) {
        mediaUrls = await uploadFiles();
      }

      // Create sitter log
      const { error } = await supabase.from("sitter_logs").insert({
        request_id: requestId,
        dog_id: dogId,
        owner_id: ownerId,
        sitter_id: user.id,
        log_type: logType,
        note_text: noteText.trim() || null,
        media_urls: mediaUrls,
      });

      if (error) throw error;

      toast({ title: "Update posted! 🐾" });
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          Add Job Update
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Activity Type *</Label>
            <Select value={logType} onValueChange={(v) => setLogType(v as LogType)}>
              <SelectTrigger>
                <SelectValue placeholder="What did you do?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk">🚶 Walk</SelectItem>
                <SelectItem value="meal">🍖 Meal</SelectItem>
                <SelectItem value="potty">🚽 Potty Break</SelectItem>
                <SelectItem value="play">🎾 Play Time</SelectItem>
                <SelectItem value="note">📝 General Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="How did it go? Any observations..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Photos / Videos (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <div className="grid grid-cols-4 gap-2">
              {files.map((file, index) => (
                <div key={index} className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                  {file.type.startsWith("video/") ? (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors"
                >
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add</span>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Max 5 files, 50MB each</p>
          </div>

          {uploading && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={uploading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Post Update
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
