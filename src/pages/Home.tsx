import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dog, PlusCircle } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DogCard } from "@/components/dog/DogCard";
import { QuickActions } from "@/components/dog/QuickActions";
import { HealthLogCard } from "@/components/dog/HealthLogCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Temporary mock data until database is set up
const mockDog = {
  id: "1",
  name: "Max",
  breed: "Golden Retriever",
  photoUrl: "",
  isLost: false,
};

const mockLogs = [
  { id: "1", type: "walk" as const, value: "30 minutes", createdAt: new Date(Date.now() - 1000 * 60 * 60) },
  { id: "2", type: "food" as const, value: "Morning kibble", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4) },
  { id: "3", type: "meds" as const, value: "Heartworm pill", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) },
];

export default function HomePage() {
  const [dog, setDog] = useState(mockDog);
  const [logs] = useState(mockLogs);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleLostToggle = (isLost: boolean) => {
    setDog((prev) => ({ ...prev, isLost }));
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
  };

  const hasDog = true; // Will be replaced with real data check

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
        {hasDog ? (
          <>
            {/* My Dog Card */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                My Dog
              </h2>
              <DogCard
                name={dog.name}
                breed={dog.breed}
                photoUrl={dog.photoUrl}
                isLost={dog.isLost}
                onLostToggle={handleLostToggle}
                onClick={() => navigate("/profile")}
              />
            </section>

            {/* Quick Actions */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Quick Actions
              </h2>
              <QuickActions
                isLost={dog.isLost}
                onToggleLost={() => handleLostToggle(!dog.isLost)}
              />
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
              <div className="space-y-3">
                {logs.map((log) => (
                  <HealthLogCard
                    key={log.id}
                    type={log.type}
                    value={log.value}
                    createdAt={log.createdAt}
                  />
                ))}
              </div>
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
    </MobileLayout>
  );
}
