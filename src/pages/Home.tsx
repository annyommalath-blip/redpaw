import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dog, PlusCircle, Loader2, Syringe } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DogCard } from "@/components/dog/DogCard";
import { QuickActions } from "@/components/dog/QuickActions";
import { HealthLogCard } from "@/components/dog/HealthLogCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { MedRecordCard } from "@/components/med/MedRecordCard";
import { MedRecordForm } from "@/components/med/MedRecordForm";
import { ExpirationNotices } from "@/components/med/ExpirationNotices";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { enrichRecordWithStatus, MedRecordWithStatus } from "@/lib/medRecordUtils";
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedRecordWithStatus | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MedRecordWithStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const handleLostToggle = async (dogId: string, isLost: boolean) => {
    try {
      const { error } = await supabase
        .from("dogs")
        .update({ is_lost: isLost })
        .eq("id", dogId);

      if (error) throw error;

      setDogs((prev) =>
        prev.map((d) => (d.id === dogId ? { ...d, is_lost: isLost } : d))
      );

      if (isLost) {
        toast({
          title: "🚨 Lost Mode Activated",
          description: "Your dog's profile is now in Lost Mode. Post an alert in Community.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Lost Mode Deactivated",
          description: "Glad your pup is safe!",
        });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleAddRecord = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  const handleEditRecord = (record: MedRecordWithStatus) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!deleteRecord) return;
    try {
      const { error } = await supabase
        .from("med_records")
        .delete()
        .eq("id", deleteRecord.id);

      if (error) throw error;

      setMedRecords((prev) => prev.filter((r) => r.id !== deleteRecord.id));
      toast({ title: "Record deleted" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeleteRecord(null);
    }
  };

  const handleSubmitRecord = async (data: {
    name: string;
    record_type: "vaccine" | "medication";
    date_given: string;
    duration_value: number;
    duration_unit: "days" | "months" | "years";
    expires_on: string;
    notes: string | null;
  }) => {
    if (!user || !dogs[0]) return;
    setSubmitting(true);

    try {
      if (editingRecord) {
        // Update
        const { data: updated, error } = await supabase
          .from("med_records")
          .update(data)
          .eq("id", editingRecord.id)
          .select()
          .single();

        if (error) throw error;

        setMedRecords((prev) =>
          prev.map((r) =>
            r.id === editingRecord.id ? enrichRecordWithStatus(updated as any) : r
          ).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
        );
        toast({ title: "Record updated! 💉" });
      } else {
        // Insert
        const { data: inserted, error } = await supabase
          .from("med_records")
          .insert({
            ...data,
            dog_id: dogs[0].id,
            owner_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        setMedRecords((prev) =>
          [...prev, enrichRecordWithStatus(inserted as any)].sort(
            (a, b) => a.daysUntilExpiry - b.daysUntilExpiry
          )
        );
        toast({ title: "Record added! 💉" });
      }

      setFormOpen(false);
      setEditingRecord(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
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
            <ExpirationNotices
              records={medRecords}
              onRecordClick={handleEditRecord}
            />

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
                onLostToggle={(isLost) => handleLostToggle(primaryDog.id, isLost)}
                onClick={() => navigate(`/dog/${primaryDog.id}`)}
              />
            </section>

            {/* Quick Actions */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Quick Actions
              </h2>
              <QuickActions
                isLost={primaryDog.is_lost}
                onToggleLost={() => handleLostToggle(primaryDog.id, !primaryDog.is_lost)}
              />
            </section>

            {/* Medication & Vaccine Records */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Syringe className="h-4 w-4" />
                  Medication & Vaccine Records
                </h2>
                <Button variant="ghost" size="sm" onClick={handleAddRecord}>
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {medRecords.length > 0 ? (
                <div className="space-y-3">
                  {medRecords.map((record) => (
                    <MedRecordCard
                      key={record.id}
                      record={record}
                      onEdit={handleEditRecord}
                      onDelete={setDeleteRecord}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-muted/30 rounded-xl border border-dashed">
                  <Syringe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No records yet. Track vaccines & medications!
                  </p>
                  <Button variant="outline" size="sm" onClick={handleAddRecord}>
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add Record
                  </Button>
                </div>
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
                      type={log.log_type}
                      value={log.value || ""}
                      createdAt={new Date(log.created_at)}
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

      {/* Med Record Form Dialog */}
      <MedRecordForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmitRecord}
        editingRecord={editingRecord}
        submitting={submitting}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRecord} onOpenChange={() => setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteRecord?.name} record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}