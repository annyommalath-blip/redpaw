import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Dog, Edit, Calendar, Scale, FileText, Camera, Loader2, ArrowLeft, Cpu, Syringe, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CoParentSection } from "@/components/dog/CoParentSection";
import { HealthLogCard } from "@/components/dog/HealthLogCard";
import { MedRecordCardReadOnly } from "@/components/med/MedRecordCardReadOnly";
import { ExpirationNotices } from "@/components/med/ExpirationNotices";
import { MedRecordEditDialog } from "@/components/med/MedRecordEditDialog";
import { enrichRecordWithStatus, MedRecordWithStatus } from "@/lib/medRecordUtils";

interface DogData {
  id: string;
  name: string;
  breed: string | null;
  age: string | null;
  weight: string | null;
  weight_unit: string | null;
  microchip_no: string | null;
  notes: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  date_of_birth: string | null;
  is_lost: boolean;
  owner_id: string;
}

interface HealthLog {
  id: string;
  dog_id: string;
  log_type: "walk" | "food" | "meds" | "mood" | "symptom";
  value: string | null;
  created_at: string;
}

export default function DogDetailPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dog, setDog] = useState<DogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [medRecords, setMedRecords] = useState<MedRecordWithStatus[]>([]);
  const [showMedRecords, setShowMedRecords] = useState(false);
  const [showRecentLogs, setShowRecentLogs] = useState(false);
  const [editingMedRecord, setEditingMedRecord] = useState<MedRecordWithStatus | null>(null);
  const [deletingMedRecord, setDeletingMedRecord] = useState<MedRecordWithStatus | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  useEffect(() => {
    if (dogId && user) {
      fetchDog();
      fetchLogsAndMeds();
    }
  }, [dogId, user]);

  const fetchDog = async () => {
    if (!dogId || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dogs")
        .select("*")
        .eq("id", dogId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ variant: "destructive", title: t("dogDetail.dogNotFound") });
        navigate("/");
        return;
      }

      setDog(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogsAndMeds = async () => {
    if (!dogId) return;
    const [logsResult, medResult] = await Promise.all([
      supabase
        .from("health_logs")
        .select("id, dog_id, log_type, value, created_at")
        .eq("dog_id", dogId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("med_records")
        .select("*")
        .eq("dog_id", dogId)
        .order("expires_on", { ascending: true }),
    ]);
    setLogs((logsResult.data || []) as HealthLog[]);
    const enrichedRecords = (medResult.data || []).map((r) =>
      enrichRecordWithStatus(r as any)
    );
    setMedRecords(enrichedRecords);
  };

  const handleDeleteMedRecord = async () => {
    if (!deletingMedRecord) return;
    try {
      const { error } = await supabase
        .from("med_records")
        .delete()
        .eq("id", deletingMedRecord.id);
      if (error) throw error;
      setMedRecords((prev) => prev.filter((r) => r.id !== deletingMedRecord.id));
      toast({ title: t("home.recordDeleted") });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeletingMedRecord(null);
    }
  };

  const handleMedRecordUpdated = () => {
    fetchLogsAndMeds();
    setEditingMedRecord(null);
  };

  const handleDeleteLog = async () => {
    if (!deletingLogId) return;
    try {
      const { error } = await supabase
        .from("health_logs")
        .delete()
        .eq("id", deletingLogId);
      if (error) throw error;
      setLogs((prev) => prev.filter((l) => l.id !== deletingLogId));
      toast({ title: t("home.logDeleted") });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeletingLogId(null);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-4 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!dog) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <p className="text-muted-foreground">{t("dogDetail.dogNotFound")}</p>
          <Button variant="ghost" onClick={() => navigate("/")}>{t("dogDetail.goHome")}</Button>
        </div>
      </MobileLayout>
    );
  }

  const allPhotos = [
    ...(dog.photo_url ? [dog.photo_url] : []),
    ...(dog.photo_urls || []),
  ];

  const isOwner = user?.id === dog.owner_id;

  return (
    <MobileLayout>
      {/* Header with back button */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">{dog.name}</h1>
          {isOwner ? (
            <Button variant="ghost" size="icon" onClick={() => navigate(`/profile/edit-dog/${dog.id}`)}>
              <Edit className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" /> 
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center">
          <div className={`relative ${dog.is_lost ? "ring-4 ring-destructive animate-pulse" : ""}`}>
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage src={dog.photo_url || ""} alt={dog.name} className="object-cover" />
              <AvatarFallback className="bg-muted">
                <Dog className="h-16 w-16 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            {dog.is_lost && (
              <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground">
                🚨 {t("dogs.lost")}
              </Badge>
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">{dog.name}</h2>
          {dog.breed && (
            <p className="text-muted-foreground">{dog.breed}</p>
          )}
        </div>

        {/* Dog Details Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {dog.age && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.age")}</p>
                  <p className="font-medium text-foreground">{dog.age}</p>
                </div>
              </div>
            )}

            {dog.date_of_birth && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.birthday")}</p>
                  <p className="font-medium text-foreground">
                    {new Date(dog.date_of_birth).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}

            {dog.weight && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.weight")}</p>
                  <p className="font-medium text-foreground">
                    {dog.weight} {dog.weight_unit || "lbs"}
                  </p>
                </div>
              </div>
            )}

            {/* Microchip - Only visible to owner */}
            {dog.microchip_no && dog.owner_id === user?.id && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.microchip")}</p>
                  <p className="font-medium text-foreground font-mono">{dog.microchip_no}</p>
                </div>
              </div>
            )}

            {dog.notes && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.notes")}</p>
                  <p className="font-medium text-foreground">{dog.notes}</p>
                </div>
              </div>
            )}

            {!dog.age && !dog.weight && !dog.notes && !dog.date_of_birth && !dog.microchip_no && (
              <p className="text-center text-muted-foreground py-4">
                {t("dogDetail.noDetails")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        {allPhotos.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("dogs.photos")} ({allPhotos.length})
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allPhotos.map((url, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-xl overflow-hidden bg-muted"
                >
                  <img
                    src={url}
                    alt={`${dog.name} photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Expiration Notices */}
        <ExpirationNotices records={medRecords} />

        {/* Medication Records - Collapsible */}
        <section>
          <button
            onClick={() => setShowMedRecords(!showMedRecords)}
            className="w-full flex items-center justify-between mb-3"
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Syringe className="h-4 w-4" />
              {t("profile.medicationRecords")}
            </h2>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); navigate("/create?type=meds"); }}
                className="text-primary rounded-xl"
              >
                {t("common.add")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showMedRecords ? "rotate-180" : ""}`} />
            </div>
          </button>
          {showMedRecords && (
            medRecords.length > 0 ? (
              <div className="space-y-3">
                {medRecords.map((record) => (
                  <MedRecordCardReadOnly
                    key={record.id}
                    record={record}
                    onEdit={setEditingMedRecord}
                    onDelete={setDeletingMedRecord}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-2xl">
                {t("profile.noMedRecordsYet")}
              </p>
            )
          )}
        </section>

        {/* Recent Logs - Collapsible */}
        <section>
          <button
            onClick={() => setShowRecentLogs(!showRecentLogs)}
            className="w-full flex items-center justify-between mb-3"
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("profile.recentLogs")}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate("/create?type=log"); }} className="text-primary rounded-xl">
                {t("common.add")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showRecentLogs ? "rotate-180" : ""}`} />
            </div>
          </button>
          {showRecentLogs && (
            logs.length > 0 ? (
              <div className="space-y-3">
                {logs.slice(0, 5).map((log) => (
                  <HealthLogCard
                    key={log.id}
                    id={log.id}
                    type={log.log_type}
                    value={log.value || ""}
                    createdAt={new Date(log.created_at)}
                    onDelete={setDeletingLogId}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-2xl">
                {t("profile.noHealthLogsYet")}
              </p>
            )
          )}
        </section>

        {/* Co-Pet Parents Section */}
        <CoParentSection dogId={dog.id} dogName={dog.name} ownerId={dog.owner_id} />

        {/* Edit Button - Only for Owner */}
        {isOwner && (
          <Button
            className="w-full"
            onClick={() => navigate(`/profile/edit-dog/${dog.id}`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {t("dogDetail.editProfile")}
          </Button>
        )}
      </div>

      <MedRecordEditDialog
        record={editingMedRecord}
        open={!!editingMedRecord}
        onOpenChange={(open) => !open && setEditingMedRecord(null)}
        onSuccess={handleMedRecordUpdated}
      />

      <AlertDialog open={!!deletingMedRecord} onOpenChange={(open) => !open && setDeletingMedRecord(null)}>
        <AlertDialogContent className="glass-card-modal rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteRecord")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("home.deleteRecordConfirm", { name: deletingMedRecord?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMedRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingLogId} onOpenChange={(open) => !open && setDeletingLogId(null)}>
        <AlertDialogContent className="glass-card-modal rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteLog")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("home.deleteLogConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLog} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}