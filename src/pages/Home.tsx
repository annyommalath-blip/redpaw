import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dog, PlusCircle, Loader2, Syringe, ChevronRight } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DogCard } from "@/components/dog/DogCard";
import { QuickActions } from "@/components/dog/QuickActions";
import { HealthLogCard } from "@/components/dog/HealthLogCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { MedRecordCardReadOnly } from "@/components/med/MedRecordCardReadOnly";
import { ExpirationNotices } from "@/components/med/ExpirationNotices";
import { LostModeDialog } from "@/components/dog/LostModeDialog";
import { MedRecordEditDialog } from "@/components/med/MedRecordEditDialog";
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
import { enrichRecordWithStatus, MedRecordWithStatus } from "@/lib/medRecordUtils";

interface UserDog {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  is_lost: boolean;
}

interface HealthLog {
  id: string;
  log_type: "walk" | "food" | "meds" | "mood" | "symptom";
  value: string | null;
  created_at: string;
}

export default function HomePage() {
  const [dogs, setDogs] = useState<UserDog[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [medRecords, setMedRecords] = useState<MedRecordWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lostModeDialogOpen, setLostModeDialogOpen] = useState(false);
  
  // Edit/Delete states
  const [editingMedRecord, setEditingMedRecord] = useState<MedRecordWithStatus | null>(null);
  const [deletingMedRecord, setDeletingMedRecord] = useState<MedRecordWithStatus | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch dogs
      const { data: dogsData } = await supabase
        .from("dogs")
        .select("id, name, breed, photo_url, is_lost")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      setDogs(dogsData || []);

      // Fetch recent health logs and med records
      if (dogsData && dogsData.length > 0) {
        const [logsResult, medResult] = await Promise.all([
          supabase
            .from("health_logs")
            .select("id, log_type, value, created_at")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("med_records")
            .select("*")
            .eq("owner_id", user.id)
            .order("expires_on", { ascending: true }),
        ]);

        setLogs(logsResult.data || []);
        
        const enrichedRecords = (medResult.data || []).map((r) =>
          enrichRecordWithStatus(r as any)
        );
        setMedRecords(enrichedRecords);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLostModeToggle = (dogId: string, currentlyLost: boolean) => {
    if (currentlyLost) {
      handleEndLostMode(dogId);
    } else {
      setLostModeDialogOpen(true);
    }
  };

  const handleEndLostMode = async (dogId: string) => {
    try {
      const { error: dogError } = await supabase
        .from("dogs")
        .update({ is_lost: false })
        .eq("id", dogId);

      if (dogError) throw dogError;

      await supabase
        .from("lost_alerts")
        .update({ status: "resolved" })
        .eq("dog_id", dogId)
        .eq("status", "active");

      setDogs((prev) =>
        prev.map((d) => (d.id === dogId ? { ...d, is_lost: false } : d))
      );

      toast({
        title: "✅ Lost Mode Deactivated",
        description: "Glad your pup is safe! The alert has been resolved.",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleLostModeSuccess = () => {
    fetchData();
  };

  // Med Record handlers
  const handleDeleteMedRecord = async () => {
    if (!deletingMedRecord) return;
    
    try {
      const { error } = await supabase
        .from("med_records")
        .delete()
        .eq("id", deletingMedRecord.id);

      if (error) throw error;

      setMedRecords((prev) => prev.filter((r) => r.id !== deletingMedRecord.id));
      toast({ title: "Record deleted" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeletingMedRecord(null);
    }
  };

  const handleMedRecordUpdated = () => {
    fetchData();
    setEditingMedRecord(null);
  };

  // Health Log handlers
  const handleDeleteLog = async () => {
    if (!deletingLogId) return;
    
    try {
      const { error } = await supabase
        .from("health_logs")
        .delete()
        .eq("id", deletingLogId);

      if (error) throw error;

      setLogs((prev) => prev.filter((l) => l.id !== deletingLogId));
      toast({ title: "Log deleted" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeletingLogId(null);
    }
  };

  const primaryDog = dogs[0];

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="RedPaw 🐾" subtitle="Welcome back!" />
        <div className="p-4 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader
        title="RedPaw 🐾"
        subtitle="Welcome back!"
        action={
          <Button size="icon" variant="ghost" onClick={() => navigate("/profile")}>
            <Dog className="h-5 w-5" />
          </Button>
        }
      />

      <div className="p-4 space-y-6">
        {primaryDog ? (
          <>
            {/* Expiration Notices */}
            <ExpirationNotices records={medRecords} />

            {/* My Dog Card */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                My Dog
              </h2>
              <DogCard
                name={primaryDog.name}
                breed={primaryDog.breed || "Mixed breed"}
                photoUrl={primaryDog.photo_url || ""}
                isLost={primaryDog.is_lost}
                onLostToggle={(isLost) => handleLostModeToggle(primaryDog.id, primaryDog.is_lost)}
                onClick={() => navigate(`/dog/${primaryDog.id}`)}
              />
            </section>

            {/* Lost Mode Dialog */}
            <LostModeDialog
              open={lostModeDialogOpen}
              onOpenChange={setLostModeDialogOpen}
              dog={{
                id: primaryDog.id,
                name: primaryDog.name,
                breed: primaryDog.breed,
                photo_url: primaryDog.photo_url,
              }}
              onSuccess={handleLostModeSuccess}
            />

            {/* Quick Actions */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Quick Actions
              </h2>
              <QuickActions
                isLost={primaryDog.is_lost}
                onToggleLost={() => handleLostModeToggle(primaryDog.id, primaryDog.is_lost)}
              />
            </section>

            {/* Medication Records */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Syringe className="h-4 w-4" />
                  Medication Records
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/create?type=meds")}
                  className="text-muted-foreground"
                >
                  Add
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              {medRecords.length > 0 ? (
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  No medication records yet. Start tracking!
                </p>
              )}
            </section>

            {/* Recent Logs */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Recent Logs
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate("/create?type=log")}>
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map((log) => (
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  No health logs yet. Start tracking!
                </p>
              )}
            </section>
          </>
        ) : (
          <EmptyState
            icon={<Dog className="h-10 w-10 text-muted-foreground" />}
            title="No dog profile yet"
            description="Add your furry friend to start tracking their health and keep them safe!"
            action={{
              label: "Add My Dog",
              onClick: () => navigate("/profile/add-dog"),
            }}
          />
        )}
      </div>

      {/* Edit Med Record Dialog */}
      <MedRecordEditDialog
        record={editingMedRecord}
        open={!!editingMedRecord}
        onOpenChange={(open) => !open && setEditingMedRecord(null)}
        onSuccess={handleMedRecordUpdated}
      />

      {/* Delete Med Record Confirmation */}
      <AlertDialog open={!!deletingMedRecord} onOpenChange={(open) => !open && setDeletingMedRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingMedRecord?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMedRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Log Confirmation */}
      <AlertDialog open={!!deletingLogId} onOpenChange={(open) => !open && setDeletingLogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Log?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this health log? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLog} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}
