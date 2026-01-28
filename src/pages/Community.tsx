import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, HandHeart, Dog, Loader2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LostAlertCard } from "@/components/community/LostAlertCard";
import { CareRequestCard } from "@/components/community/CareRequestCard";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LostAlert {
  id: string;
  title: string;
  description: string;
  last_seen_location: string;
  photo_url: string | null;
  status: "active" | "resolved";
  created_at: string;
  dogs: {
    name: string;
    breed: string | null;
  } | null;
}

interface CareRequest {
  id: string;
  care_type: "walk" | "watch" | "overnight" | "check-in";
  time_window: string;
  location_text: string;
  notes: string | null;
  pay_offered: string | null;
  status: "open" | "closed";
  assigned_sitter_id: string | null;
  created_at: string;
  dogs: {
    name: string;
    breed: string | null;
    photo_url: string | null;
  } | null;
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("care");
  const [lostAlerts, setLostAlerts] = useState<LostAlert[]>([]);
  const [careRequests, setCareRequests] = useState<CareRequest[]>([]);
  const [userApplications, setUserApplications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check for tab parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "lost" || tab === "care") {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch lost alerts with owner_id
      const { data: alertsData } = await supabase
        .from("lost_alerts")
        .select(`
          *,
          dogs (name, breed)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setLostAlerts((alertsData as any) || []);

      // Fetch care requests
      const { data: requestsData } = await supabase
        .from("care_requests")
        .select(`
          *,
          dogs (name, breed, photo_url)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      setCareRequests((requestsData as any) || []);

      // Fetch user's applications to show "Applied" badge
      if (user) {
        const { data: applicationsData } = await supabase
          .from("care_applications")
          .select("request_id")
          .eq("applicant_id", user.id)
          .in("status", ["pending", "approved"]);

        if (applicationsData) {
          setUserApplications(new Set(applicationsData.map(a => a.request_id)));
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactOwner = async (alertId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Find the alert to get owner_id
    const alert = lostAlerts.find(a => a.id === alertId);
    if (!alert) return;
    
    // Don't message yourself
    if (user.id === (alert as any).owner_id) return;
    
    try {
      // Check for existing conversation for this lost alert
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, participant_ids")
        .eq("context_type", "lostAlert")
        .eq("context_id", alertId);
      
      const ownerId = (alert as any).owner_id;
      
      // Find existing conversation between these two users
      const existingConvo = conversations?.find(c => 
        c.participant_ids.includes(user.id) && c.participant_ids.includes(ownerId)
      );
      
      if (existingConvo) {
        navigate(`/chat/${existingConvo.id}`);
      } else {
        // Create new conversation
        const { data: newConvo, error } = await supabase
          .from("conversations")
          .insert({
            participant_ids: [user.id, ownerId],
            context_type: "lostAlert",
            context_id: alertId,
          })
          .select()
          .single();
        
        if (error) throw error;
        navigate(`/chat/${newConvo.id}`);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const handleReportSighting = (alertId: string) => {
    console.log("Report sighting for", alertId);
  };

  const handleCareRequestClick = (requestId: string) => {
    navigate(`/care-request/${requestId}`);
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Community" subtitle="Help fellow dog owners" />
        <div className="p-4 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="Community" subtitle="Help fellow dog owners" />

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="care" className="gap-2">
              <HandHeart className="h-4 w-4" />
              Care Requests
            </TabsTrigger>
            <TabsTrigger value="lost" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Lost Dogs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="care" className="space-y-4 mt-0">
            {careRequests.length > 0 ? (
              careRequests.map((request) => (
                <CareRequestCard
                  key={request.id}
                  id={request.id}
                  dogName={request.dogs?.name || "Unknown"}
                  breed={request.dogs?.breed || ""}
                  photoUrl={request.dogs?.photo_url || undefined}
                  careType={request.care_type}
                  timeWindow={request.time_window}
                  location={request.location_text}
                  notes={request.notes || undefined}
                  payOffered={request.pay_offered || undefined}
                  createdAt={new Date(request.created_at)}
                  status={request.status}
                  isAssigned={!!request.assigned_sitter_id}
                  hasApplied={userApplications.has(request.id)}
                  onClick={() => handleCareRequestClick(request.id)}
                />
              ))
            ) : (
              <EmptyState
                icon={<HandHeart className="h-10 w-10 text-muted-foreground" />}
                title="No care requests"
                description="There are no open care requests in your area right now."
              />
            )}
          </TabsContent>

          <TabsContent value="lost" className="space-y-4 mt-0">
            {lostAlerts.length > 0 ? (
              lostAlerts.map((alert) => (
                <LostAlertCard
                  key={alert.id}
                  id={alert.id}
                  dogName={alert.dogs?.name || "Unknown"}
                  breed={alert.dogs?.breed || ""}
                  photoUrl={alert.photo_url || undefined}
                  description={alert.description}
                  lastSeenLocation={alert.last_seen_location}
                  createdAt={new Date(alert.created_at)}
                  status={alert.status}
                  onContact={() => handleContactOwner(alert.id)}
                  onReportSighting={() => handleReportSighting(alert.id)}
                />
              ))
            ) : (
              <EmptyState
                icon={<Dog className="h-10 w-10 text-muted-foreground" />}
                title="No lost dogs"
                description="Great news! There are no lost dogs in your area right now."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
