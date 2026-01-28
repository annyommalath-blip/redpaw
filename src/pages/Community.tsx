import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, HandHeart, Dog, Loader2, MapPin, RefreshCw } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LostAlertCard } from "@/components/community/LostAlertCard";
import { CareRequestCard } from "@/components/community/CareRequestCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useViewerLocation } from "@/hooks/useViewerLocation";

interface LostAlert {
  id: string;
  title: string;
  description: string;
  last_seen_location: string;
  photo_url: string | null;
  status: "active" | "resolved";
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  dogs: {
    name: string;
    breed: string | null;
  } | null;
}

interface DogInfo {
  name: string;
  breed: string | null;
  photo_url: string | null;
}

interface CareRequest {
  id: string;
  owner_id: string;
  care_type: "walk" | "watch" | "overnight" | "check-in";
  time_window: string;
  location_text: string;
  notes: string | null;
  pay_offered: string | null;
  pay_amount: number | null;
  pay_currency: string | null;
  request_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: "open" | "closed";
  assigned_sitter_id: string | null;
  created_at: string;
  dog_id: string;
  dog_ids: string[] | null;
  dogs: DogInfo | null;
  allDogs?: DogInfo[];
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  location_source: string | null;
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("care");
  const [lostAlerts, setLostAlerts] = useState<LostAlert[]>([]);
  const [careRequests, setCareRequests] = useState<CareRequest[]>([]);
  const [userApplications, setUserApplications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const viewerLocation = useViewerLocation();

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
      // Fetch lost alerts with owner_id and dog details including photo, age, weight
      const { data: alertsData } = await supabase
        .from("lost_alerts")
        .select(`
          *,
          dogs (name, breed, photo_url, age, weight, weight_unit, date_of_birth)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setLostAlerts((alertsData as any) || []);

      // Fetch care requests - filter to show:
      // 1. Open requests without assigned sitter (public)
      // 2. Requests owned by current user
      // 3. Requests where current user is assigned sitter
      const { data: requestsData } = await supabase
        .from("care_requests")
        .select(`
          *,
          dogs (name, breed, photo_url)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      // Only show unassigned public requests in Community tab
      // Assigned requests are shown on Profile tab for owner/sitter
      const publicRequests = (requestsData || []).filter((request: any) => {
        return !request.assigned_sitter_id;
      });

      // Fetch all dogs for requests with multiple dog_ids
      const allDogIds = new Set<string>();
      publicRequests.forEach((req: any) => {
        if (req.dog_ids && Array.isArray(req.dog_ids)) {
          req.dog_ids.forEach((id: string) => allDogIds.add(id));
        }
      });

      let dogsMap: Record<string, DogInfo> = {};
      if (allDogIds.size > 0) {
        const { data: dogsData } = await supabase
          .from("dogs")
          .select("id, name, breed, photo_url")
          .in("id", Array.from(allDogIds));
        
        if (dogsData) {
          dogsData.forEach((dog: any) => {
            dogsMap[dog.id] = { name: dog.name, breed: dog.breed, photo_url: dog.photo_url };
          });
        }
      }

      // Attach allDogs array to each request
      const enrichedRequests = publicRequests.map((req: any) => {
        if (req.dog_ids && Array.isArray(req.dog_ids) && req.dog_ids.length > 0) {
          req.allDogs = req.dog_ids.map((id: string) => dogsMap[id]).filter(Boolean);
        }
        return req;
      });

      setCareRequests(enrichedRequests as any);

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
        navigate(`/messages/${existingConvo.id}`);
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
        navigate(`/messages/${newConvo.id}`);
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
        {/* Location permission banner */}
        {viewerLocation.permissionDenied && (
          <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Enable location to see distance</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={viewerLocation.requestLocation}
              className="text-primary"
            >
              Enable
            </Button>
          </div>
        )}
        
        {/* Refresh location button (only show if has location) */}
        {viewerLocation.hasLocation && (
          <div className="mb-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={viewerLocation.refreshLocation}
              disabled={viewerLocation.loading}
              className="text-xs text-muted-foreground"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${viewerLocation.loading ? 'animate-spin' : ''}`} />
              Update location
            </Button>
          </div>
        )}

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
                  location={request.location_label || request.location_text}
                  notes={request.notes || undefined}
                  payOffered={request.pay_offered || undefined}
                  createdAt={new Date(request.created_at)}
                  status={request.status}
                  isAssigned={!!request.assigned_sitter_id}
                  hasApplied={userApplications.has(request.id)}
                  onClick={() => handleCareRequestClick(request.id)}
                  dogs={request.allDogs}
                  isOwner={user?.id === request.owner_id}
                  requestData={{
                    id: request.id,
                    dog_id: request.dog_id,
                    dog_ids: request.dog_ids,
                    care_type: request.care_type,
                    time_window: request.time_window,
                    location_text: request.location_text,
                    notes: request.notes,
                    pay_offered: request.pay_offered,
                    pay_amount: request.pay_amount,
                    pay_currency: request.pay_currency,
                    request_date: request.request_date,
                    start_time: request.start_time,
                    end_time: request.end_time,
                    latitude: request.latitude,
                    longitude: request.longitude,
                    location_label: request.location_label,
                    location_source: request.location_source,
                  }}
                  viewerLatitude={viewerLocation.latitude}
                  viewerLongitude={viewerLocation.longitude}
                  onDeleted={fetchData}
                  onUpdated={fetchData}
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
                  photoUrl={alert.photo_url || (alert.dogs as any)?.photo_url || undefined}
                  age={(alert.dogs as any)?.date_of_birth || (alert.dogs as any)?.age || undefined}
                  weight={(alert.dogs as any)?.weight || undefined}
                  weightUnit={(alert.dogs as any)?.weight_unit || undefined}
                  description={alert.description}
                  lastSeenLocation={alert.last_seen_location}
                  locationLabel={alert.location_label}
                  latitude={alert.latitude}
                  longitude={alert.longitude}
                  viewerLatitude={viewerLocation.latitude}
                  viewerLongitude={viewerLocation.longitude}
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
