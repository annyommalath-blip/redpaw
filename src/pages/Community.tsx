import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, HandHeart, Dog, Heart, PawPrint, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LostAlertCard } from "@/components/community/LostAlertCard";
import { CareRequestCard } from "@/components/community/CareRequestCard";
import { FoundDogCard } from "@/components/community/FoundDogCard";
import { DonationCampaignCard } from "@/components/community/DonationCampaignCard";
import { AdoptionPostCard } from "@/components/community/AdoptionPostCard";
import { EmptyState } from "@/components/ui/empty-state";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedList } from "@/components/ui/animated-list";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConversation } from "@/hooks/useConversation";
import { useViewerLocation } from "@/hooks/useViewerLocation";
import { GuestAuthPrompt } from "@/components/auth/GuestAuthPrompt";

interface LostAlert {
  id: string; title: string; description: string; last_seen_location: string;
  photo_url: string | null; status: "active" | "resolved"; created_at: string;
  latitude: number | null; longitude: number | null; location_label: string | null;
  owner_id: string;
  dogs: { name: string; breed: string | null } | null;
}

interface FoundDog {
  id: string; reporter_id: string; photo_urls: string[]; description: string | null;
  location_label: string; latitude: number | null; longitude: number | null;
  found_at: string; status: "active" | "reunited" | "closed"; created_at: string;
}

interface DogInfo { name: string; breed: string | null; photo_url: string | null; }

interface CareRequest {
  id: string; owner_id: string; care_type: "walk" | "watch" | "overnight" | "check-in";
  time_window: string; location_text: string; notes: string | null;
  pay_offered: string | null; pay_amount: number | null; pay_currency: string | null;
  request_date: string | null; start_time: string | null; end_time: string | null;
  status: "open" | "closed"; assigned_sitter_id: string | null; created_at: string;
  dog_id: string; dog_ids: string[] | null; dogs: DogInfo | null; allDogs?: DogInfo[];
  latitude: number | null; longitude: number | null; location_label: string | null;
  location_source: string | null;
}

type HelpFilter = "all" | "care" | "donation" | "adoption";

export default function CommunityPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("help");
  const [helpFilter, setHelpFilter] = useState<HelpFilter>("all");
  const [lostAlerts, setLostAlerts] = useState<LostAlert[]>([]);
  const [foundDogs, setFoundDogs] = useState<FoundDog[]>([]);
  const [lostFoundFilter, setLostFoundFilter] = useState<string>("all");
  const [careRequests, setCareRequests] = useState<CareRequest[]>([]);
  const [donationCampaigns, setDonationCampaigns] = useState<any[]>([]);
  const [adoptionPosts, setAdoptionPosts] = useState<any[]>([]);
  const [userApplications, setUserApplications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { openConversation } = useConversation();
  const viewerLocation = useViewerLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "lost") setActiveTab("lost");
    else if (tab === "help" || tab === "care") setActiveTab("help");
  }, []);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, foundRes, requestsRes, campaignsRes, adoptionRes] = await Promise.all([
        supabase.from("lost_alerts").select(`*, dogs (name, breed, photo_url, age, weight, weight_unit, date_of_birth)`).eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("found_dogs").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("care_requests").select(`*, dogs (name, breed, photo_url)`).eq("status", "open").order("created_at", { ascending: false }),
        supabase.from("donation_campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("adoption_posts").select("*").in("status", ["available", "pending"]).order("created_at", { ascending: false }),
      ]);

      setLostAlerts((alertsRes.data as any) || []);
      setFoundDogs((foundRes.data as FoundDog[]) || []);
      setDonationCampaigns(campaignsRes.data || []);
      setAdoptionPosts(adoptionRes.data || []);

      // Filter care requests to unassigned only
      const publicRequests = (requestsRes.data || []).filter((r: any) => !r.assigned_sitter_id);

      // Enrich with multi-dog data
      const allDogIds = new Set<string>();
      publicRequests.forEach((req: any) => {
        if (req.dog_ids && Array.isArray(req.dog_ids)) req.dog_ids.forEach((id: string) => allDogIds.add(id));
      });
      let dogsMap: Record<string, DogInfo> = {};
      if (allDogIds.size > 0) {
        const { data: dogsData } = await supabase.from("dogs").select("id, name, breed, photo_url").in("id", Array.from(allDogIds));
        if (dogsData) dogsData.forEach((dog: any) => { dogsMap[dog.id] = { name: dog.name, breed: dog.breed, photo_url: dog.photo_url }; });
      }
      const enriched = publicRequests.map((req: any) => {
        if (req.dog_ids?.length > 0) req.allDogs = req.dog_ids.map((id: string) => dogsMap[id]).filter(Boolean);
        return req;
      });
      setCareRequests(enriched as any);

      if (user) {
        const { data: apps } = await supabase.from("care_applications").select("request_id").eq("applicant_id", user.id).in("status", ["pending", "approved"]);
        if (apps) setUserApplications(new Set(apps.map(a => a.request_id)));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactOwner = async (alertId: string) => {
    if (isGuest || !user) { setShowAuthPrompt(true); return; }
    const alert = lostAlerts.find(a => a.id === alertId);
    if (!alert || user.id === alert.owner_id) return;
    await openConversation(alert.owner_id, "lostAlert", alertId);
  };

  const handleContactFoundDogReporter = async (foundDogId: string) => {
    if (isGuest || !user) { setShowAuthPrompt(true); return; }
    const foundDog = foundDogs.find(f => f.id === foundDogId);
    if (!foundDog || user.id === foundDog.reporter_id) return;
    await openConversation(foundDog.reporter_id, "foundDog", foundDogId);
  };

  const handleReportSighting = (alertId: string) => { console.log("Report sighting for", alertId); };

  const handleCareRequestClick = (requestId: string) => {
    if (isGuest) { setShowAuthPrompt(true); return; }
    navigate(`/care-request/${requestId}`);
  };

  const handleDonationClick = (campaignId: string) => {
    navigate(`/donation/${campaignId}`);
  };

  const handleAdoptionClick = (postId: string) => {
    navigate(`/adoption/${postId}`);
  };

  // Filters
  const filteredLostAlerts = lostFoundFilter === "found" ? [] : lostAlerts;
  const filteredFoundDogs = lostFoundFilter === "lost" ? [] : foundDogs;
  const combinedFeed = [
    ...filteredLostAlerts.map(alert => ({ type: "lost" as const, data: alert, createdAt: new Date(alert.created_at) })),
    ...filteredFoundDogs.map(found => ({ type: "found" as const, data: found, createdAt: new Date(found.created_at) })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const showCare = helpFilter === "all" || helpFilter === "care";
  const showDonation = helpFilter === "all" || helpFilter === "donation";
  const showAdoption = helpFilter === "all" || helpFilter === "adoption";

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title={t("community.title")} subtitle={t("community.subtitle")} />
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
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
        <button
          onClick={() => navigate("/search")}
          className="w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl bg-card border shadow-sm text-muted-foreground text-sm transition-all hover:shadow-md active:scale-[0.98]"
        >
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <span>{t("search.placeholder", "Search care, lost, found, or people...")}</span>
        </button>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 glass-card-light p-1 rounded-2xl">
            <TabsTrigger value="help" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <HandHeart className="h-4 w-4" />
              {t("community.careHub")}
            </TabsTrigger>
            <TabsTrigger value="lost" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <AlertTriangle className="h-4 w-4" />
              {t("community.lostAndFound")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="help" className="mt-0">
            {/* Care Hub filter chips */}
            <ToggleGroup
              type="single"
              value={helpFilter}
              onValueChange={(val) => val && setHelpFilter(val as HelpFilter)}
              className="justify-start bg-muted/30 p-1 rounded-xl w-fit mb-4 flex-wrap"
            >
              <ToggleGroupItem value="all" size="sm" className="text-xs px-4 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm">
                {t("common.all")}
              </ToggleGroupItem>
              <ToggleGroupItem value="care" size="sm" className="text-xs px-3 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm">
                🤝 Care
              </ToggleGroupItem>
              <ToggleGroupItem value="donation" size="sm" className="text-xs px-3 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm">
                ❤️ Donation
              </ToggleGroupItem>
              <ToggleGroupItem value="adoption" size="sm" className="text-xs px-3 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm">
                🏠 Adoption
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Care Requests */}
            {showCare && careRequests.length > 0 && (
              <AnimatedList className="space-y-4 mb-4">
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
                      id: request.id, dog_id: request.dog_id, dog_ids: request.dog_ids,
                      care_type: request.care_type, time_window: request.time_window,
                      location_text: request.location_text, notes: request.notes,
                      pay_offered: request.pay_offered, pay_amount: request.pay_amount,
                      pay_currency: request.pay_currency, request_date: request.request_date,
                      start_time: request.start_time, end_time: request.end_time,
                      latitude: request.latitude, longitude: request.longitude,
                      location_label: request.location_label, location_source: request.location_source,
                    }}
                    viewerLatitude={viewerLocation.latitude}
                    viewerLongitude={viewerLocation.longitude}
                    onDeleted={fetchData}
                    onUpdated={fetchData}
                  />
                ))}
              </AnimatedList>
            )}

            {/* Donation Campaigns */}
            {showDonation && donationCampaigns.length > 0 && (
              <AnimatedList className="space-y-4 mb-4">
                {donationCampaigns.map((campaign) => (
                  <DonationCampaignCard
                    key={campaign.id}
                    id={campaign.id}
                    title={campaign.title}
                    caption={campaign.caption}
                    goalAmount={campaign.goal_amount}
                    raisedAmount={campaign.raised_amount}
                    category={campaign.category}
                    photoUrls={campaign.photo_urls}
                    locationLabel={campaign.location_label}
                    createdAt={new Date(campaign.created_at)}
                    isOwner={user?.id === campaign.owner_id}
                    onClick={() => handleDonationClick(campaign.id)}
                    onDeleted={fetchData}
                  />
                ))}
              </AnimatedList>
            )}

            {/* Adoption Posts */}
            {showAdoption && adoptionPosts.length > 0 && (
              <AnimatedList className="space-y-4 mb-4">
                {adoptionPosts.map((post) => (
                  <AdoptionPostCard
                    key={post.id}
                    id={post.id}
                    petName={post.pet_name}
                    petType={post.pet_type}
                    breed={post.breed}
                    age={post.age}
                    size={post.size}
                    photoUrls={post.photo_urls}
                    locationLabel={post.location_label}
                    status={post.status}
                    adoptionFee={post.adoption_fee}
                    adoptionFeeCurrency={post.adoption_fee_currency}
                    createdAt={new Date(post.created_at)}
                    onClick={() => handleAdoptionClick(post.id)}
                  />
                ))}
              </AnimatedList>
            )}

            {/* Empty states */}
            {((helpFilter === "all" && careRequests.length === 0 && donationCampaigns.length === 0 && adoptionPosts.length === 0) ||
              (helpFilter === "care" && careRequests.length === 0) ||
              (helpFilter === "donation" && donationCampaigns.length === 0) ||
              (helpFilter === "adoption" && adoptionPosts.length === 0)) && (
              <EmptyState
                icon={<HandHeart className="h-10 w-10 text-muted-foreground" />}
                title={
                  helpFilter === "care" ? t("care.noCareRequestsArea") :
                  helpFilter === "donation" ? "No donation campaigns yet" :
                  helpFilter === "adoption" ? "No adoption posts yet" :
                  "No help requests yet"
                }
                description=""
              />
            )}
          </TabsContent>

          <TabsContent value="lost" className="mt-0">
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

      <GuestAuthPrompt open={showAuthPrompt} onOpenChange={setShowAuthPrompt} />
    </MobileLayout>
  );
}
