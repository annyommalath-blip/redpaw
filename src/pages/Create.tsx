import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PlusCircle, AlertTriangle, HandHeart, Calendar, Clock, MapPin, FileText } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type CreateType = "log" | "lost" | "care" | null;

export default function CreatePage() {
  const [searchParams] = useSearchParams();
  const [createType, setCreateType] = useState<CreateType>(
    (searchParams.get("type") as CreateType) || null
  );
  const navigate = useNavigate();
  const { toast } = useToast();

  // Log form state
  const [logType, setLogType] = useState<string>("");
  const [logValue, setLogValue] = useState("");
  const [logNotes, setLogNotes] = useState("");

  // Lost alert form state
  const [lostDescription, setLostDescription] = useState("");
  const [lastSeenLocation, setLastSeenLocation] = useState("");

  // Care request form state
  const [careType, setCareType] = useState<string>("");
  const [timeWindow, setTimeWindow] = useState("");
  const [careLocation, setCareLocation] = useState("");
  const [careNotes, setCareNotes] = useState("");
  const [payOffered, setPayOffered] = useState("");

  const handleCreateLog = () => {
    if (!logType) {
      toast({ variant: "destructive", title: "Please select a log type" });
      return;
    }
    // TODO: Save to database
    toast({ title: "Health log added! 🐾" });
    navigate("/");
  };

  const handleCreateLostAlert = () => {
    if (!lostDescription || !lastSeenLocation) {
      toast({ variant: "destructive", title: "Please fill in all fields" });
      return;
    }
    // TODO: Save to database
    toast({ title: "Lost alert posted! 🚨", description: "The community will help find your pup." });
    navigate("/community");
  };

  const handleCreateCareRequest = () => {
    if (!careType || !timeWindow || !careLocation) {
      toast({ variant: "destructive", title: "Please fill in all required fields" });
      return;
    }
    // TODO: Save to database
    toast({ title: "Care request posted! 🐕", description: "Check messages for responses." });
    navigate("/community");
  };

  if (!createType) {
    return (
      <MobileLayout>
        <PageHeader title="Create" subtitle="What would you like to do?" />

        <div className="p-4 space-y-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setCreateType("log")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <PlusCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Add Health Log</h3>
                <p className="text-sm text-muted-foreground">Track walks, food, meds & more</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-lost transition-colors"
            onClick={() => setCreateType("lost")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-full bg-lost/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-lost" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Post Lost Alert</h3>
                <p className="text-sm text-muted-foreground">Alert the community about your lost dog</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setCreateType("care")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <HandHeart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Post Care Request</h3>
                <p className="text-sm text-muted-foreground">Find help for walks, watching & more</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader
        title={
          createType === "log"
            ? "Add Health Log"
            : createType === "lost"
            ? "Post Lost Alert"
            : "Post Care Request"
        }
        showBack
      />

      <div className="p-4">
        {createType === "log" && (
          <Card>
            <CardHeader>
              <CardTitle>Log Health Event</CardTitle>
              <CardDescription>Track your dog's daily activities and health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={logType} onValueChange={setLogType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk">🚶 Walk</SelectItem>
                    <SelectItem value="food">🍖 Food</SelectItem>
                    <SelectItem value="meds">💊 Medication</SelectItem>
                    <SelectItem value="mood">😊 Mood</SelectItem>
                    <SelectItem value="symptom">🩺 Symptom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Value / Details</Label>
                <Input
                  placeholder="e.g., 30 minutes, Morning kibble..."
                  value={logValue}
                  onChange={(e) => setLogValue(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={handleCreateLog}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Log
              </Button>
            </CardContent>
          </Card>
        )}

        {createType === "lost" && (
          <Card className="border-lost">
            <CardHeader>
              <CardTitle className="text-lost">🚨 Lost Dog Alert</CardTitle>
              <CardDescription>Provide details to help the community find your dog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe your dog: color, size, collar, distinguishing features..."
                  value={lostDescription}
                  onChange={(e) => setLostDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Last Seen Location
                </Label>
                <Input
                  placeholder="e.g., Central Park near 72nd Street"
                  value={lastSeenLocation}
                  onChange={(e) => setLastSeenLocation(e.target.value)}
                />
              </div>

              <Button className="w-full bg-lost hover:bg-lost/90" onClick={handleCreateLostAlert}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Post Lost Alert
              </Button>
            </CardContent>
          </Card>
        )}

        {createType === "care" && (
          <Card>
            <CardHeader>
              <CardTitle>Care Request</CardTitle>
              <CardDescription>Find trusted help for your dog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Type of Care</Label>
                <Select value={careType} onValueChange={setCareType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk">🚶 Walk</SelectItem>
                    <SelectItem value="watch">👀 Short Watch</SelectItem>
                    <SelectItem value="overnight">🌙 Overnight</SelectItem>
                    <SelectItem value="check-in">👋 Check-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  <Clock className="h-4 w-4 inline mr-1" />
                  Time Window
                </Label>
                <Input
                  placeholder="e.g., Today 2-4 PM, or Jan 30 - Feb 2"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location
                </Label>
                <Input
                  placeholder="e.g., Upper East Side, Manhattan"
                  value={careLocation}
                  onChange={(e) => setCareLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  <FileText className="h-4 w-4 inline mr-1" />
                  Notes (optional)
                </Label>
                <Textarea
                  placeholder="Any special instructions or info about your dog..."
                  value={careNotes}
                  onChange={(e) => setCareNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Pay Offered (optional)</Label>
                <Input
                  placeholder="e.g., $25/hour"
                  value={payOffered}
                  onChange={(e) => setPayOffered(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={handleCreateCareRequest}>
                <HandHeart className="h-4 w-4 mr-2" />
                Post Request
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
