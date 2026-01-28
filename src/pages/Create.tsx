import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PlusCircle, AlertTriangle, HandHeart, Clock, MapPin, FileText, Loader2, Pill, CalendarIcon, Syringe } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { calculateExpirationDate } from "@/lib/medRecordUtils";

type CreateType = "log" | "lost" | "care" | "meds" | null;

interface Dog {
  id: string;
  name: string;
}

export default function CreatePage() {
  const [searchParams] = useSearchParams();
  const [createType, setCreateType] = useState<CreateType>(
    (searchParams.get("type") as CreateType) || null
  );
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Dogs state
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string>("");
  const [loadingDogs, setLoadingDogs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Log form state
  const [logType, setLogType] = useState<string>("");
  const [logValue, setLogValue] = useState("");
  const [logNotes, setLogNotes] = useState("");

  // Lost alert form state
  const [lostDescription, setLostDescription] = useState("");
  const [lastSeenLocation, setLastSeenLocation] = useState("");

  // Med record form state
  const [medName, setMedName] = useState("");
  const [medType, setMedType] = useState<"vaccine" | "medication">("medication");
  const [medDateGiven, setMedDateGiven] = useState<Date | undefined>();
  const [medDurationValue, setMedDurationValue] = useState("");
  const [medDurationUnit, setMedDurationUnit] = useState<"days" | "months" | "years">("months");
  const [medNotes, setMedNotes] = useState("");

  // Care request form state
  const [careType, setCareType] = useState<string>("");
  const [timeWindow, setTimeWindow] = useState("");
  const [careLocation, setCareLocation] = useState("");
  const [careNotes, setCareNotes] = useState("");
  const [payOffered, setPayOffered] = useState("");

  useEffect(() => {
    if (user) {
      fetchDogs();
    }
  }, [user]);

  const fetchDogs = async () => {
    if (!user) return;
    setLoadingDogs(true);
    try {
      const { data } = await supabase
        .from("dogs")
        .select("id, name")
        .eq("owner_id", user.id);

      setDogs(data || []);
      if (data && data.length > 0) {
        setSelectedDogId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching dogs:", error);
    } finally {
      setLoadingDogs(false);
    }
  };

  const handleCreateLog = async () => {
    if (!logType || !selectedDogId) {
      toast({ variant: "destructive", title: "Please select a log type and dog" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("health_logs").insert({
        dog_id: selectedDogId,
        owner_id: user!.id,
        log_type: logType as any,
        value: logValue || null,
        notes: logNotes || null,
      });

      if (error) throw error;
      toast({ title: "Health log added! 🐾" });
      navigate("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMedRecord = async () => {
    if (!medName.trim() || !medDateGiven || !medDurationValue || !selectedDogId) {
      toast({ variant: "destructive", title: "Please fill in all required fields" });
      return;
    }

    const durVal = parseInt(medDurationValue, 10);
    if (isNaN(durVal) || durVal <= 0) {
      toast({ variant: "destructive", title: "Duration must be a positive number" });
      return;
    }

    const expiresOn = calculateExpirationDate(medDateGiven, durVal, medDurationUnit);

    setSubmitting(true);
    try {
      const { error } = await supabase.from("med_records").insert({
        dog_id: selectedDogId,
        owner_id: user!.id,
        name: medName.trim(),
        record_type: medType,
        date_given: format(medDateGiven, "yyyy-MM-dd"),
        duration_value: durVal,
        duration_unit: medDurationUnit,
        expires_on: format(expiresOn, "yyyy-MM-dd"),
        notes: medNotes.trim() || null,
      });

      if (error) throw error;
      toast({ title: "Medication record added! 💊" });
      navigate("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLostAlert = async () => {
    if (!lostDescription || !lastSeenLocation || !selectedDogId) {
      toast({ variant: "destructive", title: "Please fill in all fields" });
      return;
    }

    setSubmitting(true);
    try {
      const selectedDog = dogs.find(d => d.id === selectedDogId);

      // Update dog to lost mode
      await supabase
        .from("dogs")
        .update({ is_lost: true })
        .eq("id", selectedDogId);

      // Create lost alert
      const { error } = await supabase.from("lost_alerts").insert({
        dog_id: selectedDogId,
        owner_id: user!.id,
        title: `${selectedDog?.name || "Dog"} is Missing!`,
        description: lostDescription,
        last_seen_location: lastSeenLocation,
      });

      if (error) throw error;
      toast({ title: "Lost alert posted! 🚨", description: "The community will help find your pup." });
      navigate("/community");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCareRequest = async () => {
    if (!careType || !timeWindow || !careLocation || !selectedDogId) {
      toast({ variant: "destructive", title: "Please fill in all required fields" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("care_requests").insert({
        dog_id: selectedDogId,
        owner_id: user!.id,
        care_type: careType as any,
        time_window: timeWindow,
        location_text: careLocation,
        notes: careNotes || null,
        pay_offered: payOffered || null,
      });

      if (error) throw error;
      toast({ title: "Care request posted! 🐕", description: "Check messages for responses." });
      navigate("/community");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
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
                <p className="text-sm text-muted-foreground">Track walks, food, mood & more</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setCreateType("meds")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Pill className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Medication Records</h3>
                <p className="text-sm text-muted-foreground">Log medications & treatments</p>
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
            : createType === "meds"
            ? "Medication Records"
            : createType === "lost"
            ? "Post Lost Alert"
            : "Post Care Request"
        }
        showBack
      />

      <div className="p-4">
        {loadingDogs ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : dogs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">You need to add a dog first!</p>
              <Button onClick={() => navigate("/profile")}>
                Add Your Dog
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Dog Selector (if multiple dogs) */}
            {dogs.length > 1 && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <Label>Select Dog</Label>
                  <Select value={selectedDogId} onValueChange={setSelectedDogId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dogs.map((dog) => (
                        <SelectItem key={dog.id} value={dog.id}>
                          {dog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

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

                  <Button className="w-full" onClick={handleCreateLog} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                    Add Log
                  </Button>
                </CardContent>
              </Card>
            )}

            {createType === "meds" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-primary" />
                    Medication Records
                  </CardTitle>
                  <CardDescription>Track medications, treatments & vaccines with expiration dates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="e.g., Rabies, Heartworm, Flea treatment..."
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={medType} onValueChange={(v) => setMedType(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="medication">
                          <span className="flex items-center gap-2">
                            <Pill className="h-4 w-4" /> Medication
                          </span>
                        </SelectItem>
                        <SelectItem value="vaccine">
                          <span className="flex items-center gap-2">
                            <Syringe className="h-4 w-4" /> Vaccine
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Given *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !medDateGiven && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {medDateGiven ? format(medDateGiven, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={medDateGiven}
                          onSelect={setMedDateGiven}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration / Validity *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g., 12"
                        value={medDurationValue}
                        onChange={(e) => setMedDurationValue(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={medDurationUnit} onValueChange={(v) => setMedDurationUnit(v as any)}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Dosage, vet info, side effects..."
                      value={medNotes}
                      onChange={(e) => setMedNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleCreateMedRecord} 
                    disabled={submitting || !medName.trim() || !medDateGiven || !medDurationValue}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pill className="h-4 w-4 mr-2" />}
                    Add Medication Record
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

                  <Button className="w-full bg-lost hover:bg-lost/90" onClick={handleCreateLostAlert} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
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

                  <Button className="w-full" onClick={handleCreateCareRequest} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <HandHeart className="h-4 w-4 mr-2" />}
                    Post Request
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
