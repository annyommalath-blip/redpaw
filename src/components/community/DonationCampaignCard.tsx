import { useState } from "react";
import { MapPin, Heart, MoreVertical, Trash2, ChevronRight, MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const categoryConfig: Record<string, { emoji: string; color: string }> = {
  "vet-bill": { emoji: "🏥", color: "bg-primary/15 text-primary border-primary/25" },
  rescue: { emoji: "🐾", color: "bg-success/15 text-success border-success/25" },
  food: { emoji: "🍖", color: "bg-warning/15 text-warning border-warning/25" },
  medical: { emoji: "💊", color: "bg-primary/15 text-primary border-primary/25" },
  emergency: { emoji: "🚨", color: "bg-destructive/15 text-destructive border-destructive/25" },
  other: { emoji: "❤️", color: "bg-muted text-muted-foreground border-muted" },
};

interface DonationCampaignCardProps {
  id: string;
  title: string;
  caption: string;
  goalAmount: number;
  raisedAmount: number;
  category: string;
  photoUrls: string[];
  locationLabel?: string | null;
  createdAt: Date;
  isOwner?: boolean;
  onClick?: () => void;
  onDeleted?: () => void;
}

export function DonationCampaignCard({
  id, title, caption, goalAmount, raisedAmount, category, photoUrls,
  locationLabel, createdAt, isOwner, onClick, onDeleted,
}: DonationCampaignCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const percentage = Math.min(Math.round((raisedAmount / goalAmount) * 100), 100);
  const cat = categoryConfig[category] || categoryConfig.other;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("donation_campaigns").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Campaign deleted" });
      onDeleted?.();
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <GlassCard variant="light" hover={!!onClick} className="overflow-hidden animate-fade-in" onClick={onClick}>
        {/* Photo header */}
        {photoUrls.length > 0 && (
          <div className="h-40 w-full overflow-hidden">
            <img src={photoUrls[0]} alt={title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-4">
          {/* Header badges - matching care card style */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border", cat.color)}>
                {cat.emoji} {category.replace("-", " ")}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {formatDistanceToNow(createdAt, { addSuffix: false })}
              </span>
              {isOwner && (
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-card-modal rounded-xl">
                      <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive rounded-lg">
                        <Trash2 className="h-4 w-4 mr-2" /> {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {onClick && !isOwner && (
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </div>
          </div>

          <h3 className="font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{caption}</p>

          {/* Progress */}
          <div className="mt-3 space-y-1.5">
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-primary">${raisedAmount.toLocaleString()} raised</span>
              <span className="text-muted-foreground">{percentage}% of ${goalAmount.toLocaleString()}</span>
            </div>
          </div>

          {locationLabel && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
              <MapPin className="h-3.5 w-3.5" /> {locationLabel}
            </div>
          )}
        </div>
      </GlassCard>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-card-modal rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this donation campaign. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {deleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
