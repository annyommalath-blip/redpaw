import { useState } from "react";
import { Clock, Dog, Check, ChevronRight, Banknote, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditCareRequestDialog } from "@/components/care/EditCareRequestDialog";
import { LocationLink } from "@/components/location/LocationLink";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getDistanceLabel } from "@/lib/distanceUtils";
import { useTranslation } from "react-i18next";

type CareType = "walk" | "watch" | "overnight" | "check-in";

interface DogInfo {
  name: string;
  breed?: string | null;
  photo_url?: string | null;
}

interface CareRequestCardProps {
  id: string;
  dogName: string;
  breed: string;
  photoUrl?: string;
  careType: CareType;
  timeWindow: string;
  location: string;
  notes?: string;
  payOffered?: string;
  createdAt: Date;
  status: "open" | "closed";
  isAssigned?: boolean;
  hasApplied?: boolean;
  onClick?: () => void;
  dogs?: DogInfo[];
  isOwner?: boolean;
  requestData?: {
    id: string;
    dog_id: string;
    dog_ids: string[] | null;
    care_type: CareType;
    time_window: string;
    location_text: string;
    notes: string | null;
    pay_offered: string | null;
    pay_amount: number | null;
    pay_currency: string | null;
    request_date: string | null;
    start_time: string | null;
    end_time: string | null;
    latitude?: number | null;
    longitude?: number | null;
    location_label?: string | null;
    location_source?: string | null;
  };
  viewerLatitude?: number | null;
  viewerLongitude?: number | null;
  onDeleted?: () => void;
  onUpdated?: () => void;
}

const careTypeConfig: Record<CareType, { icon: string; labelKey: string; color: string }> = {
  walk: { icon: "🚶", labelKey: "care.walk", color: "bg-success text-success-foreground" },
  watch: { icon: "👀", labelKey: "care.shortWatch", color: "bg-warning text-warning-foreground" },
  overnight: { icon: "🌙", labelKey: "care.overnight", color: "bg-primary text-primary-foreground" },
  "check-in": { icon: "👋", labelKey: "care.checkIn", color: "bg-accent text-accent-foreground" },
};

export function CareRequestCard({
  id,
  dogName,
  breed,
  photoUrl,
  careType,
  timeWindow,
  location,
  notes,
  payOffered,
  createdAt,
  status,
  isAssigned,
  hasApplied,
  onClick,
  dogs,
  isOwner,
  requestData,
  viewerLatitude,
  viewerLongitude,
  onDeleted,
  onUpdated,
}: CareRequestCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const config = careTypeConfig[careType];
  
  // Calculate distance from viewer
  const distanceLabel = getDistanceLabel(
    viewerLatitude ?? null,
    viewerLongitude ?? null,
    requestData?.latitude,
    requestData?.longitude
  );

  const displayDogs = dogs && dogs.length > 0 
    ? dogs 
    : [{ name: dogName, breed, photo_url: photoUrl }];
  
  const isMultipleDogs = displayDogs.length > 1;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("care_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: t("care.careRequestDeleted") });
      onDeleted?.();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <Card 
        className={`overflow-hidden ${onClick ? "cursor-pointer hover:border-primary transition-colors" : ""}`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={config.color}>
                {config.icon} {t(config.labelKey)}
              </Badge>
              {isMultipleDogs && (
                <Badge variant="outline" className="border-primary text-primary">
                  🐾 {displayDogs.length} {t("care.dogsLabel")}
                </Badge>
              )}
              {isAssigned && (
                <Badge className="bg-primary text-primary-foreground">
                  <Check className="h-3 w-3 mr-1" />
                  {t("common.assigned")}
                </Badge>
              )}
              {hasApplied && !isAssigned && (
                <Badge className="bg-success text-success-foreground">
                  <Check className="h-3 w-3 mr-1" />
                  {t("care.applied")}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
              {isOwner && !isAssigned && requestData && (
                <div onClick={handleMenuClick}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>

          {/* Dogs Display */}
          {isMultipleDogs ? (
            <div className="flex gap-2 mb-3">
              <div className="flex -space-x-3">
                {displayDogs.slice(0, 4).map((dog, index) => (
                  <div 
                    key={index}
                    className="h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-background"
                    style={{ zIndex: displayDogs.length - index }}
                  >
                    {dog.photo_url ? (
                      <img src={dog.photo_url} alt={dog.name} className="h-full w-full object-cover" />
                    ) : (
                      <Dog className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                ))}
                {displayDogs.length > 4 && (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border-2 border-background text-xs font-medium text-muted-foreground">
                    +{displayDogs.length - 4}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground">
                  {displayDogs.length <= 3 
                    ? displayDogs.map(d => d.name).join(", ")
                    : `${displayDogs.slice(0, 3).map(d => d.name).join(", ")} +${displayDogs.length - 3} more`
                  }
                </h3>
                <p className="text-sm text-muted-foreground">
                  {displayDogs.length} {t("common.dogsNeedCare")}
                </p>
              </div>
              {onClick && (
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
                {displayDogs[0].photo_url ? (
                  <img src={displayDogs[0].photo_url} alt={displayDogs[0].name} className="h-full w-full object-cover" />
                ) : (
                  <Dog className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground">{displayDogs[0].name || t("common.unknownBreed")}</h3>
                <p className="text-sm text-muted-foreground">{displayDogs[0].breed || t("common.unknownBreed")}</p>
              </div>
              {onClick && (
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </div>
          )}

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{timeWindow}</span>
            </div>
            <div className="flex items-center gap-2">
              <LocationLink
                latitude={requestData?.latitude}
                longitude={requestData?.longitude}
                locationLabel={requestData?.location_label || location}
                className="text-muted-foreground hover:text-primary"
              />
              {distanceLabel && (
                <span className="text-xs text-muted-foreground shrink-0">• {distanceLabel} {t("common.away")}</span>
              )}
            </div>
            {payOffered && (
              <div className="flex items-center gap-2 text-sm text-success font-medium">
                <Banknote className="h-4 w-4 shrink-0" />
                <span>{payOffered}</span>
              </div>
            )}
          </div>

          {notes && (
            <p className="text-sm text-foreground mt-3 line-clamp-2">{notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Care Request Dialog */}
      {requestData && (
        <EditCareRequestDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          request={requestData}
          onSuccess={() => onUpdated?.()}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("care.deleteCareRequest")}</AlertDialogTitle>
            <AlertDialogDescription>{t("care.deleteCareRequestDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
