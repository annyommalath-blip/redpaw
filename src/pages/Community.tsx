import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, HandHeart, Dog } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LostAlertCard } from "@/components/community/LostAlertCard";
import { CareRequestCard } from "@/components/community/CareRequestCard";
import { EmptyState } from "@/components/ui/empty-state";

// Mock data until database is set up
const mockLostAlerts = [
  {
    id: "1",
    dogName: "Buddy",
    breed: "Labrador",
    photoUrl: "",
    description: "Yellow lab, friendly, wearing blue collar with tags. Last seen near Central Park.",
    lastSeenLocation: "Central Park West, near 72nd Street",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    status: "active" as const,
  },
  {
    id: "2",
    dogName: "Luna",
    breed: "Husky",
    photoUrl: "",
    description: "Blue eyes, very friendly but skittish. Responds to her name.",
    lastSeenLocation: "Brooklyn Heights Promenade",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    status: "active" as const,
  },
];

const mockCareRequests = [
  {
    id: "1",
    dogName: "Charlie",
    breed: "Beagle",
    photoUrl: "",
    careType: "walk" as const,
    timeWindow: "Today, 2:00 PM - 4:00 PM",
    location: "Upper East Side, Manhattan",
    notes: "He loves the park! Very friendly with other dogs.",
    payOffered: "$25/hour",
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    status: "open" as const,
  },
  {
    id: "2",
    dogName: "Daisy",
    breed: "French Bulldog",
    photoUrl: "",
    careType: "overnight" as const,
    timeWindow: "Jan 30 - Feb 2",
    location: "Williamsburg, Brooklyn",
    notes: "Very calm, needs meds at 8am and 8pm.",
    payOffered: "$80/night",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    status: "open" as const,
  },
];

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("lost");
  const navigate = useNavigate();

  const handleContactOwner = (alertId: string) => {
    // TODO: Create conversation and navigate to messages
    navigate(`/messages`);
  };

  const handleReportSighting = (alertId: string) => {
    // TODO: Open sighting report modal
    console.log("Report sighting for", alertId);
  };

  const handleRespondToRequest = (requestId: string) => {
    // TODO: Create conversation and navigate to messages
    navigate(`/messages`);
  };

  return (
    <MobileLayout>
      <PageHeader title="Community" subtitle="Help fellow dog owners" />

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="lost" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Lost Dogs
            </TabsTrigger>
            <TabsTrigger value="care" className="gap-2">
              <HandHeart className="h-4 w-4" />
              Care Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lost" className="space-y-4 mt-0">
            {mockLostAlerts.length > 0 ? (
              mockLostAlerts.map((alert) => (
                <LostAlertCard
                  key={alert.id}
                  id={alert.id}
                  dogName={alert.dogName}
                  breed={alert.breed}
                  photoUrl={alert.photoUrl}
                  description={alert.description}
                  lastSeenLocation={alert.lastSeenLocation}
                  createdAt={alert.createdAt}
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

          <TabsContent value="care" className="space-y-4 mt-0">
            {mockCareRequests.length > 0 ? (
              mockCareRequests.map((request) => (
                <CareRequestCard
                  key={request.id}
                  id={request.id}
                  dogName={request.dogName}
                  breed={request.breed}
                  photoUrl={request.photoUrl}
                  careType={request.careType}
                  timeWindow={request.timeWindow}
                  location={request.location}
                  notes={request.notes}
                  payOffered={request.payOffered}
                  createdAt={request.createdAt}
                  status={request.status}
                  onRespond={() => handleRespondToRequest(request.id)}
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
        </Tabs>
      </div>
    </MobileLayout>
  );
}
