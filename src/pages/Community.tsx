import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, HandHeart, Dog, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LostAlertCard } from "@/components/community/LostAlertCard";
import { CareRequestCard } from "@/components/community/CareRequestCard";
import { FoundDogCard } from "@/components/community/FoundDogCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedList } from "@/components/ui/animated-list";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConversation } from "@/hooks/useConversation";
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
  owner_id: string;
  dogs: {
    name: string;
    breed: string | null;
  } | null;
}

interface FoundDog {
  id: string;
  reporter_id: string;
  photo_urls: string[];
  description: string | null;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  found_at: string;
  status: "active" | "reunited" | "closed";
  created_at: string;
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("care");
  const [lostAlerts, setLostAlerts] = useState<LostAlert[]>([]);
  const [foundDogs, setFoundDogs] = useState<FoundDog[]>([]);
  const [lostFoundFilter, setLostFoundFilter] = useState<string>("all");
  const [careRequests, setCareRequests] = useState<CareRequest[]>([]);
  const [userApplications, setUserApplications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openConversation } = useConversation();
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

      // Fetch found dogs
      const { data: foundData } = await supabase
        .from("found_dogs")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setFoundDogs((foundData as FoundDog[]) || []);

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
    if (user.id === alert.owner_id) return;
    
    await openConversation(alert.owner_id, "lostAlert", alertId);
  };

  const handleContactFoundDogReporter = async (foundDogId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    const foundDog = foundDogs.find(f => f.id === foundDogId);
    if (!foundDog) return;
    
    // Don't message yourself
    if (user.id === foundDog.reporter_id) return;
    
    await openConversation(foundDog.reporter_id, "foundDog", foundDogId);
  };

  const handleReportSighting = (alertId: string) => {
    console.log("Report sighting for", alertId);
  };

  // Filter lost/found posts based on filter selection
  const filteredLostAlerts = lostFoundFilter === "found" ? [] : lostAlerts;
  const filteredFoundDogs = lostFoundFilter === "lost" ? [] : foundDogs;
  
  // Combined and sorted feed for lost & found
  const combinedFeed = [
    ...filteredLostAlerts.map(alert => ({ type: "lost" as const, data: alert, createdAt: new Date(alert.created_at) })),
    ...filteredFoundDogs.map(found => ({ type: "found" as const, data: found, createdAt: new Date(found.created_at) })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const handleCareRequestClick = (requestId: string) => {
    navigate(`/care-request/${requestId}`);
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title={t("community.title")} subtitle={t("community.subtitle")} />
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title={t("community.title")} subtitle={t("community.subtitle")} />

      <div className="p-4">



        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 glass-card-light p-1 rounded-2xl">
            <TabsTrigger value="care" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <HandHeart className="h-4 w-4" />
              {t("community.careRequests")}
            </TabsTrigger>
            <TabsTrigger value="lost" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <AlertTriangle className="h-4 w-4" />
              {t("community.lostAndFound")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="care" className="mt-0">
            {careRequests.length > 0 ? (
              <AnimatedList className="space-y-4">
                {careRequests.map((request) => (
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
                    ownerId={request.owner_id}
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
                ))}
              </AnimatedList>
            ) : (
              <EmptyState
                icon={<HandHeart className="h-10 w-10 text-muted-foreground" />}
                title={t("care.noCareRequestsArea")}
                description=""
              />
            )}
          </TabsContent>

          <TabsContent value="lost" className="mt-0">
            {/* Filter chips */}
            <ToggleGroup 
              type="single" 
              value={lostFoundFilter}
              onValueChange={(val) => val && setLostFoundFilter(val)}
              className="justify-start bg-muted/30 p-1 rounded-xl w-fit mb-4"
            >
              <ToggleGroupItem value="all" size="sm" className="text-xs px-4 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm">
                {t("common.all")}
              </ToggleGroupItem>
              <ToggleGroupItem value="lost" size="sm" className="text-xs px-4 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm">
                {t("community.lost")}
              </ToggleGroupItem>
              <ToggleGroupItem value="found" size="sm" className="text-xs px-4 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm">
                {t("community.found")}
              </ToggleGroupItem>
            </ToggleGroup>

            {combinedFeed.length > 0 ? (
              <AnimatedList className="space-y-4">
                {combinedFeed.map((item) => 
                  item.type === "lost" ? (
                    <LostAlertCard
                      key={`lost-${item.data.id}`}
                      id={item.data.id}
                      dogName={(item.data as LostAlert).dogs?.name || "Unknown"}
                      breed={(item.data as LostAlert).dogs?.breed || ""}
                      photoUrl={(item.data as LostAlert).photo_url || ((item.data as LostAlert).dogs as any)?.photo_url || undefined}
                      age={((item.data as LostAlert).dogs as any)?.date_of_birth || ((item.data as LostAlert).dogs as any)?.age || undefined}
                      weight={((item.data as LostAlert).dogs as any)?.weight || undefined}
                      weightUnit={((item.data as LostAlert).dogs as any)?.weight_unit || undefined}
                      description={(item.data as LostAlert).description}
                      lastSeenLocation={(item.data as LostAlert).last_seen_location}
                      locationLabel={(item.data as LostAlert).location_label}
                      latitude={(item.data as LostAlert).latitude}
                      longitude={(item.data as LostAlert).longitude}
                      viewerLatitude={viewerLocation.latitude}
                      viewerLongitude={viewerLocation.longitude}
                      createdAt={new Date((item.data as LostAlert).created_at)}
                      status={(item.data as LostAlert).status}
                      ownerId={(item.data as LostAlert).owner_id}
                      onContact={() => handleContactOwner(item.data.id)}
                      onReportSighting={() => handleReportSighting(item.data.id)}
                    />
                  ) : (
                    <FoundDogCard
                      key={`found-${item.data.id}`}
                      id={item.data.id}
                      photoUrls={(item.data as FoundDog).photo_urls}
                      description={(item.data as FoundDog).description}
                      locationLabel={(item.data as FoundDog).location_label}
                      latitude={(item.data as FoundDog).latitude}
                      longitude={(item.data as FoundDog).longitude}
                      viewerLatitude={viewerLocation.latitude}
                      viewerLongitude={viewerLocation.longitude}
                      foundAt={new Date((item.data as FoundDog).found_at)}
                      status={(item.data as FoundDog).status}
                      createdAt={new Date((item.data as FoundDog).created_at)}
                      onContact={() => handleContactFoundDogReporter(item.data.id)}
                    />
                  )
                )}
              </AnimatedList>
            ) : (
              <EmptyState
                icon={<Dog className="h-10 w-10 text-muted-foreground" />}
                title="No lost or found dogs"
                description="Great news! There are no lost dogs in your area right now."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
