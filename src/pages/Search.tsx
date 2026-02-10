import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, X, HandHeart, AlertTriangle, Dog, Users, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowButton } from "@/components/social/FollowButton";
import { AnimatedList } from "@/components/ui/animated-list";
import { CareRequestCard } from "@/components/community/CareRequestCard";
import { LostAlertCard } from "@/components/community/LostAlertCard";
import { FoundDogCard } from "@/components/community/FoundDogCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConversation } from "@/hooks/useConversation";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface UserResult {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface CareResult {
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
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  location_source: string | null;
  dogs: { name: string; breed: string | null; photo_url: string | null } | null;
}

interface LostResult {
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
  dogs: { name: string; breed: string | null; photo_url: string | null } | null;
}

interface FoundResult {
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

function UserCard({ user }: { user: UserResult }) {
  const navigate = useNavigate();
  const name = user.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || "User";
  const initials = (user.first_name?.[0] || "") + (user.last_name?.[0] || "") || name[0] || "?";

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl bg-card border cursor-pointer transition-colors hover:bg-muted/50 active:scale-[0.98]"
      onClick={() => navigate(`/user/${user.user_id}`)}
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
          {initials.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{name}</p>
        {user.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2">{user.bio}</p>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <FollowButton targetUserId={user.user_id} size="sm" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openConversation } = useConversation();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [careResults, setCareResults] = useState<CareResult[]>([]);
  const [lostResults, setLostResults] = useState<LostResult[]>([]);
  const [foundResults, setFoundResults] = useState<FoundResult[]>([]);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      setCareResults([]);
      setLostResults([]);
      setFoundResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    const term = `%${q.trim()}%`;

    try {
      // Search users
      const { data: userData } = await supabase
        .from("profiles_public")
        .select("*")
        .or(`display_name.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},bio.ilike.${term}`);
      
      // Filter out current user
      setUsers((userData || []).filter((u: any) => u.user_id !== user?.id) as UserResult[]);

      // Search care requests via dog name/breed
      const { data: careData } = await supabase
        .from("care_requests")
        .select("*, dogs(name, breed, photo_url)")
        .eq("status", "open")
        .is("assigned_sitter_id", null)
        .or(`location_text.ilike.${term},notes.ilike.${term},location_label.ilike.${term}`);
      
      // Also search by dog name/breed
      const { data: dogMatchCare } = await supabase
        .from("dogs")
        .select("id")
        .or(`name.ilike.${term},breed.ilike.${term}`);
      
      const dogIds = new Set((dogMatchCare || []).map((d: any) => d.id));
      
      // Merge: care requests matching text OR matching dog
      const allCareIds = new Set<string>();
      const mergedCare: CareResult[] = [];
      
      for (const cr of (careData || []) as CareResult[]) {
        allCareIds.add(cr.id);
        mergedCare.push(cr);
      }
      
      if (dogIds.size > 0) {
        const { data: careDogMatch } = await supabase
          .from("care_requests")
          .select("*, dogs(name, breed, photo_url)")
          .eq("status", "open")
          .is("assigned_sitter_id", null)
          .in("dog_id", Array.from(dogIds));
        
        for (const cr of (careDogMatch || []) as CareResult[]) {
          if (!allCareIds.has(cr.id)) {
            mergedCare.push(cr);
          }
        }
      }
      
      setCareResults(mergedCare);

      // Search lost alerts
      const { data: lostData } = await supabase
        .from("lost_alerts")
        .select("*, dogs(name, breed, photo_url)")
        .eq("status", "active")
        .or(`title.ilike.${term},description.ilike.${term},last_seen_location.ilike.${term},location_label.ilike.${term}`);
      
      // Also lost alerts with matching dog
      const allLostIds = new Set((lostData || []).map((l: any) => l.id));
      const mergedLost: LostResult[] = [...((lostData || []) as LostResult[])];

      if (dogIds.size > 0) {
        const { data: lostDogMatch } = await supabase
          .from("lost_alerts")
          .select("*, dogs(name, breed, photo_url)")
          .eq("status", "active")
          .in("dog_id", Array.from(dogIds));
        
        for (const la of (lostDogMatch || []) as LostResult[]) {
          if (!allLostIds.has(la.id)) {
            mergedLost.push(la);
          }
        }
      }

      setLostResults(mergedLost);

      // Search found dogs
      const { data: foundData } = await supabase
        .from("found_dogs")
        .select("*")
        .eq("status", "active")
        .or(`description.ilike.${term},location_label.ilike.${term}`);

      setFoundResults((foundData || []) as FoundResult[]);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const totalResults = users.length + careResults.length + lostResults.length + foundResults.length;

  const handleContactOwner = async (alertId: string) => {
    if (!user) return;
    const alert = lostResults.find(a => a.id === alertId);
    if (!alert || user.id === alert.owner_id) return;
    await openConversation(alert.owner_id, "lostAlert", alertId);
  };

  const handleContactFoundDog = async (foundDogId: string) => {
    if (!user) return;
    const found = foundResults.find(f => f.id === foundDogId);
    if (!found || user.id === found.reporter_id) return;
    await openConversation(found.reporter_id, "foundDog", foundDogId);
  };

  return (
    <MobileLayout>
      {/* Search Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b px-4 pt-4 pb-3 safe-area-top">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={t("search.placeholder", "Search care, lost, found, or people...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <SearchIcon className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">{t("search.startTyping", "Start typing to search...")}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {searched && !loading && totalResults === 0 && (
          <EmptyState
            icon={<SearchIcon className="h-10 w-10 text-muted-foreground" />}
            title={t("search.noResults", "No results found")}
            description={t("search.tryDifferent", "Try a different search term")}
          />
        )}

        {searched && !loading && totalResults > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4 glass-card-light p-1 rounded-2xl">
              <TabsTrigger value="all" className="text-xs rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {t("common.all", "All")}
              </TabsTrigger>
              <TabsTrigger value="people" className="text-xs rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Users className="h-3 w-3 mr-1" />
                {users.length}
              </TabsTrigger>
              <TabsTrigger value="care" className="text-xs rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <HandHeart className="h-3 w-3 mr-1" />
                {careResults.length}
              </TabsTrigger>
              <TabsTrigger value="lost" className="text-xs rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {lostResults.length}
              </TabsTrigger>
              <TabsTrigger value="found" className="text-xs rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Dog className="h-3 w-3 mr-1" />
                {foundResults.length}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0 space-y-3">
              {users.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("search.people", "People")}</h3>
                  {users.slice(0, 3).map(u => <UserCard key={u.user_id} user={u} />)}
                  {users.length > 3 && (
                    <button onClick={() => setActiveTab("people")} className="text-xs text-primary font-medium">
                      {t("search.seeAll", "See all {{count}}", { count: users.length })}
                    </button>
                  )}
                </div>
              )}
              {careResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("search.careRequests", "Care Requests")}</h3>
                  {careResults.slice(0, 2).map(cr => (
                    <CareRequestCard
                      key={cr.id}
                      id={cr.id}
                      dogName={cr.dogs?.name || "Unknown"}
                      breed={cr.dogs?.breed || ""}
                      photoUrl={cr.dogs?.photo_url || undefined}
                      careType={cr.care_type}
                      timeWindow={cr.time_window}
                      location={cr.location_label || cr.location_text}
                      notes={cr.notes || undefined}
                      payOffered={cr.pay_offered || undefined}
                      createdAt={new Date(cr.created_at)}
                      status={cr.status}
                      isAssigned={!!cr.assigned_sitter_id}
                      hasApplied={false}
                      onClick={() => navigate(`/care-request/${cr.id}`)}
                      isOwner={user?.id === cr.owner_id}
                      ownerId={cr.owner_id}
                      requestData={{
                        id: cr.id, dog_id: cr.dog_id, dog_ids: cr.dog_ids,
                        care_type: cr.care_type, time_window: cr.time_window,
                        location_text: cr.location_text, notes: cr.notes,
                        pay_offered: cr.pay_offered, pay_amount: cr.pay_amount,
                        pay_currency: cr.pay_currency, request_date: cr.request_date,
                        start_time: cr.start_time, end_time: cr.end_time,
                        latitude: cr.latitude, longitude: cr.longitude,
                        location_label: cr.location_label, location_source: cr.location_source,
                      }}
                    />
                  ))}
                  {careResults.length > 2 && (
                    <button onClick={() => setActiveTab("care")} className="text-xs text-primary font-medium">
                      {t("search.seeAll", "See all {{count}}", { count: careResults.length })}
                    </button>
                  )}
                </div>
              )}
              {lostResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("search.lostDogs", "Lost Dogs")}</h3>
                  {lostResults.slice(0, 2).map(la => (
                    <LostAlertCard
                      key={la.id}
                      id={la.id}
                      dogName={la.dogs?.name || "Unknown"}
                      breed={la.dogs?.breed || ""}
                      photoUrl={la.photo_url || (la.dogs as any)?.photo_url || undefined}
                      description={la.description}
                      lastSeenLocation={la.last_seen_location}
                      locationLabel={la.location_label}
                      latitude={la.latitude}
                      longitude={la.longitude}
                      createdAt={new Date(la.created_at)}
                      status={la.status}
                      ownerId={la.owner_id}
                      onContact={() => handleContactOwner(la.id)}
                      onReportSighting={() => {}}
                    />
                  ))}
                  {lostResults.length > 2 && (
                    <button onClick={() => setActiveTab("lost")} className="text-xs text-primary font-medium">
                      {t("search.seeAll", "See all {{count}}", { count: lostResults.length })}
                    </button>
                  )}
                </div>
              )}
              {foundResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("search.foundDogs", "Found Dogs")}</h3>
                  {foundResults.slice(0, 2).map(fd => (
                    <FoundDogCard
                      key={fd.id}
                      id={fd.id}
                      photoUrls={fd.photo_urls}
                      description={fd.description}
                      locationLabel={fd.location_label}
                      latitude={fd.latitude}
                      longitude={fd.longitude}
                      foundAt={new Date(fd.found_at)}
                      status={fd.status}
                      createdAt={new Date(fd.created_at)}
                      onContact={() => handleContactFoundDog(fd.id)}
                    />
                  ))}
                  {foundResults.length > 2 && (
                    <button onClick={() => setActiveTab("found")} className="text-xs text-primary font-medium">
                      {t("search.seeAll", "See all {{count}}", { count: foundResults.length })}
                    </button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="people" className="mt-0 space-y-2">
              {users.map(u => <UserCard key={u.user_id} user={u} />)}
              {users.length === 0 && (
                <EmptyState icon={<Users className="h-8 w-8 text-muted-foreground" />} title={t("search.noPeople", "No people found")} description="" />
              )}
            </TabsContent>

            <TabsContent value="care" className="mt-0 space-y-3">
              {careResults.map(cr => (
                <CareRequestCard
                  key={cr.id}
                  id={cr.id}
                  dogName={cr.dogs?.name || "Unknown"}
                  breed={cr.dogs?.breed || ""}
                  photoUrl={cr.dogs?.photo_url || undefined}
                  careType={cr.care_type}
                  timeWindow={cr.time_window}
                  location={cr.location_label || cr.location_text}
                  notes={cr.notes || undefined}
                  payOffered={cr.pay_offered || undefined}
                  createdAt={new Date(cr.created_at)}
                  status={cr.status}
                  isAssigned={!!cr.assigned_sitter_id}
                  hasApplied={false}
                  onClick={() => navigate(`/care-request/${cr.id}`)}
                  isOwner={user?.id === cr.owner_id}
                  ownerId={cr.owner_id}
                  requestData={{
                    id: cr.id, dog_id: cr.dog_id, dog_ids: cr.dog_ids,
                    care_type: cr.care_type, time_window: cr.time_window,
                    location_text: cr.location_text, notes: cr.notes,
                    pay_offered: cr.pay_offered, pay_amount: cr.pay_amount,
                    pay_currency: cr.pay_currency, request_date: cr.request_date,
                    start_time: cr.start_time, end_time: cr.end_time,
                    latitude: cr.latitude, longitude: cr.longitude,
                    location_label: cr.location_label, location_source: cr.location_source,
                  }}
                />
              ))}
              {careResults.length === 0 && (
                <EmptyState icon={<HandHeart className="h-8 w-8 text-muted-foreground" />} title={t("search.noCare", "No care requests found")} description="" />
              )}
            </TabsContent>

            <TabsContent value="lost" className="mt-0 space-y-3">
              {lostResults.map(la => (
                <LostAlertCard
                  key={la.id}
                  id={la.id}
                  dogName={la.dogs?.name || "Unknown"}
                  breed={la.dogs?.breed || ""}
                  photoUrl={la.photo_url || (la.dogs as any)?.photo_url || undefined}
                  description={la.description}
                  lastSeenLocation={la.last_seen_location}
                  locationLabel={la.location_label}
                  latitude={la.latitude}
                  longitude={la.longitude}
                  createdAt={new Date(la.created_at)}
                  status={la.status}
                  ownerId={la.owner_id}
                  onContact={() => handleContactOwner(la.id)}
                  onReportSighting={() => {}}
                />
              ))}
              {lostResults.length === 0 && (
                <EmptyState icon={<AlertTriangle className="h-8 w-8 text-muted-foreground" />} title={t("search.noLost", "No lost dogs found")} description="" />
              )}
            </TabsContent>

            <TabsContent value="found" className="mt-0 space-y-3">
              {foundResults.map(fd => (
                <FoundDogCard
                  key={fd.id}
                  id={fd.id}
                  photoUrls={fd.photo_urls}
                  description={fd.description}
                  locationLabel={fd.location_label}
                  latitude={fd.latitude}
                  longitude={fd.longitude}
                  foundAt={new Date(fd.found_at)}
                  status={fd.status}
                  createdAt={new Date(fd.created_at)}
                  onContact={() => handleContactFoundDog(fd.id)}
                />
              ))}
              {foundResults.length === 0 && (
                <EmptyState icon={<Dog className="h-8 w-8 text-muted-foreground" />} title={t("search.noFound", "No found dogs")} description="" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MobileLayout>
  );
}
