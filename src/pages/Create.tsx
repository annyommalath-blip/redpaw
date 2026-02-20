import { useState, useEffect } from "react";
import { GuestAuthPrompt } from "@/components/auth/GuestAuthPrompt";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PlusCircle, AlertTriangle, HandHeart, FileText, Loader2, Pill, CalendarIcon, Syringe, Dog, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { SingleDateTimePicker, validateSingleDateTime, formatSingleDateTimeWindow, convertTimeToDbFormat } from "@/components/care/SingleDateTimePicker";
import { CurrencyInput } from "@/components/care/CurrencyInput";
import { formatPayAmount } from "@/data/currencies";
import { DogMultiSelector } from "@/components/dog/DogMultiSelector";
import { LocationPicker } from "@/components/location/LocationPicker";
import { useGeolocation } from "@/hooks/useGeolocation";
import { FoundDogPhotoUploader } from "@/components/community/FoundDogPhotoUploader";
import { FoundDogForm } from "@/components/community/FoundDogForm";

type CreateType = "log" | "lost" | "care" | "meds" | "found" | null;

interface DogData {
  id: string;
  name: string;
  photo_url?: string | null;
}

export default function CreatePage() {
  const [searchParams] = useSearchParams();
  const [createType, setCreateType] = useState<CreateType>(
    (searchParams.get("type") as CreateType) || null
  );
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isGuest } = useAuth();
  const { t } = useTranslation();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Show auth prompt for guests
  useEffect(() => {
    if (isGuest) {
      setShowAuthPrompt(true);
    }
  }, [isGuest]);

  // Dogs state
  const [dogs, setDogs] = useState<DogData[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string>("");
  const [selectedDogIds, setSelectedDogIds] = useState<string[]>([]); // For care requests (multi-select)
  const [loadingDogs, setLoadingDogs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Log form state
  const [logType, setLogType] = useState<string>("");
  const [logValue, setLogValue] = useState("");
  const [logNotes, setLogNotes] = useState("");

  // Lost alert form state
  const [lostDescription, setLostDescription] = useState("");
  const lostLocation = useGeolocation();

  // Med record form state
  const [medName, setMedName] = useState("");
  const [medType, setMedType] = useState<"vaccine" | "medication">("medication");
  const [medDateGiven, setMedDateGiven] = useState<Date | undefined>();
  const [medDurationValue, setMedDurationValue] = useState("");
  const [medDurationUnit, setMedDurationUnit] = useState<"days" | "months" | "years">("months");
  const [medNotes, setMedNotes] = useState("");

  // Care request form state
  const [careType, setCareType] = useState<string>("");
  const [careDate, setCareDate] = useState<Date | undefined>();
  const [careStartTime, setCareStartTime] = useState<string>("");
  const [careEndTime, setCareEndTime] = useState<string>("");
  const [careTimeError, setCareTimeError] = useState<string>("");
  const careLocation = useGeolocation();
  const [careNotes, setCareNotes] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("USD");

  // Found dog form state
  const [foundPhotoUrls, setFoundPhotoUrls] = useState<string[]>([]);
  const [foundDescription, setFoundDescription] = useState("");
  const foundLocation = useGeolocation();
  const [foundDate, setFoundDate] = useState<Date | undefined>();
  const [foundTime, setFoundTime] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchDogs();
    }
  }, [user]);

  // Pre-select dog from URL query param
  useEffect(() => {
    const dogIdFromUrl = searchParams.get("dog_id");
    if (dogIdFromUrl && dogs.length > 0) {
      const dogExists = dogs.some(d => d.id === dogIdFromUrl);
      if (dogExists) {
        setSelectedDogId(dogIdFromUrl);
      }
    }
  }, [searchParams, dogs]);

  const fetchDogs = async () => {
    if (!user) return;
    setLoadingDogs(true);
    try {
      const { data } = await supabase
        .from("dogs")
        .select("id, name, photo_url")
        .eq("owner_id", user.id);

      setDogs(data || []);
      if (data && data.length > 0) {
        // Check URL for dog_id first
        const dogIdFromUrl = searchParams.get("dog_id");
        if (dogIdFromUrl && data.some(d => d.id === dogIdFromUrl)) {
          setSelectedDogId(dogIdFromUrl);
          setSelectedDogIds([dogIdFromUrl]); // Pre-select for care request too
        } else {
          setSelectedDogId(data[0].id);
          setSelectedDogIds([data[0].id]);
        }
      }
    } catch (error) {
      console.error("Error fetching dogs:", error);
    } finally {
      setLoadingDogs(false);
    }
  };

  const handleToggleDog = (dogId: string) => {
    setSelectedDogIds(prev => {
      if (prev.includes(dogId)) {
        // Don't allow deselecting if it's the only one
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== dogId);
      } else {
        return [...prev, dogId];
      }
    });
  };

  const handleCreateLog = async () => {
    if (!logType || !selectedDogId) {
      toast({ variant: "destructive", title: t("healthLog.selectLogTypeAndDog") });
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
      toast({ title: t("healthLog.healthLogAdded") });
      navigate("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMedRecord = async () => {
    if (!medName.trim() || !medDateGiven || !medDurationValue || !selectedDogId) {
      toast({ variant: "destructive", title: t("create.fillAllFields") });
      return;
    }

    const durVal = parseInt(medDurationValue, 10);
    if (isNaN(durVal) || durVal <= 0) {
      toast({ variant: "destructive", title: t("create.durationPositive") });
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
      toast({ title: t("medications.recordAdded") });
      navigate("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLostAlert = async () => {
    if (!lostDescription || !lostLocation.locationLabel || !selectedDogId) {
      toast({ variant: "destructive", title: t("create.fillAllFields") });
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

      // Create lost alert with location data
      const { error } = await supabase.from("lost_alerts").insert({
        dog_id: selectedDogId,
        owner_id: user!.id,
        title: `${selectedDog?.name || "Dog"} is Missing!`,
        description: lostDescription,
        last_seen_location: lostLocation.locationLabel,
        latitude: lostLocation.latitude,
        longitude: lostLocation.longitude,
        location_label: lostLocation.locationLabel,
        location_source: lostLocation.locationSource,
      });

      if (error) throw error;
      toast({ title: t("lost.lostAlertPosted"), description: t("lost.communityWillHelp") });
      navigate("/community");
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCareRequest = async () => {
    // Validate datetime
    const timeError = validateSingleDateTime(careDate, careStartTime, careEndTime);
    if (timeError) {
      setCareTimeError(timeError);
      toast({ variant: "destructive", title: timeError });
      return;
    }
    setCareTimeError("");

    if (!careType || !careLocation.locationLabel || selectedDogIds.length === 0) {
      toast({ variant: "destructive", title: t("create.fillAllFields") });
      return;
    }

    const timeWindow = formatSingleDateTimeWindow(careDate!, careStartTime, careEndTime);
    const payAmountNum = payAmount ? parseFloat(payAmount) : null;

    setSubmitting(true);
    try {
      // Create a single care request with all selected dogs
      // dog_id is set to the first dog for backward compatibility
      // dog_ids contains all selected dogs
      const { error } = await supabase.from("care_requests").insert({
        dog_id: selectedDogIds[0], // Primary dog for backward compatibility
        dog_ids: selectedDogIds,   // All selected dogs
        owner_id: user!.id,
        care_type: careType as any,
        time_window: timeWindow,
        location_text: careLocation.locationLabel,
        notes: careNotes || null,
        pay_offered: payAmountNum ? formatPayAmount(payAmountNum, payCurrency) : null,
        request_date: format(careDate!, "yyyy-MM-dd"),
        start_time: convertTimeToDbFormat(careStartTime),
        end_time: convertTimeToDbFormat(careEndTime),
        pay_amount: payAmountNum,
        pay_currency: payAmountNum ? payCurrency : null,
        latitude: careLocation.latitude,
        longitude: careLocation.longitude,
        location_label: careLocation.locationLabel,
        location_source: careLocation.locationSource,
      });

      if (error) throw error;
      
      const dogCount = selectedDogIds.length;
      toast({ 
        title: t("care.careRequestPosted"), 
        description: dogCount > 1 
          ? t("care.postedForDogs", { count: dogCount })
          : t("care.checkCommunity") 
      });
      navigate("/community?tab=care");
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFoundDog = async () => {
    // Validate required fields
    if (foundPhotoUrls.length === 0) {
      toast({ variant: "destructive", title: t("found.uploadAtLeastOnePhoto") });
      return;
    }
    if (!foundLocation.locationLabel) {
      toast({ variant: "destructive", title: t("found.setFoundLocation") });
      return;
    }
    if (!foundDate || !foundTime) {
      toast({ variant: "destructive", title: t("found.setWhenFound") });
      return;
    }

    // Combine date and time into timestamp
    const [hours, minutes] = foundTime.split(":").map(Number);
    const foundAt = new Date(foundDate);
    foundAt.setHours(hours, minutes, 0, 0);

    setSubmitting(true);
    try {
      const { error } = await supabase.from("found_dogs").insert({
        reporter_id: user!.id,
        photo_urls: foundPhotoUrls,
        description: foundDescription.trim() || null,
        location_label: foundLocation.locationLabel,
        latitude: foundLocation.latitude,
        longitude: foundLocation.longitude,
        location_source: foundLocation.locationSource,
        found_at: foundAt.toISOString(),
        status: "active",
      });

      if (error) throw error;
      
      toast({ 
        title: t("found.foundDogReported"), 
        description: t("found.thankYouHelping") 
      });
      navigate("/community?tab=lost");
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (isGuest) {
    return (
      <MobileLayout>
        <PageHeader title={t("create.title")} subtitle={t("create.subtitle")} />
        <div className="p-4">
          <GuestAuthPrompt open={showAuthPrompt} onOpenChange={(open) => {
            setShowAuthPrompt(open);
            if (!open) navigate(-1);
          }} />
        </div>
      </MobileLayout>
    );
  }

  if (!createType) {
    return (
      <MobileLayout>
        <PageHeader title={t("create.title")} subtitle={t("create.subtitle")} />

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
                <h3 className="font-semibold text-foreground">{t("create.healthLog")}</h3>
                <p className="text-sm text-muted-foreground">{t("create.healthLogDesc")}</p>
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
                <h3 className="font-semibold text-foreground">{t("create.medRecord")}</h3>
                <p className="text-sm text-muted-foreground">{t("create.medRecordDesc")}</p>
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
                <h3 className="font-semibold text-foreground">{t("lost.postLostAlert")}</h3>
                <p className="text-sm text-muted-foreground">{t("lost.alertCommunity")}</p>
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
                <h3 className="font-semibold text-foreground">{t("care.postCareRequest")}</h3>
                <p className="text-sm text-muted-foreground">{t("create.findHelpForWalks")}</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-success transition-colors"
            onClick={() => setCreateType("found")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <Dog className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t("found.reportFound")}</h3>
                <p className="text-sm text-muted-foreground">{t("found.helpLostDogFindOwner")}</p>
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
            ? t("healthLog.title")
            : createType === "meds"
            ? t("medications.title")
            : createType === "lost"
            ? t("lost.postLostAlert")
            : createType === "found"
            ? t("found.reportFound")
            : t("care.postCareRequest")
        }
        showBack
        onBack={() => setCreateType(null)}
      />

      <div className="p-4">
        {/* Found Dog form doesn't require user's dogs - show it directly */}
        {createType === "found" ? (
          <FoundDogForm
            photoUrls={foundPhotoUrls}
            onPhotosChange={setFoundPhotoUrls}
            description={foundDescription}
            onDescriptionChange={setFoundDescription}
            location={foundLocation}
            date={foundDate}
            onDateChange={setFoundDate}
            time={foundTime}
            onTimeChange={setFoundTime}
            submitting={submitting}
            onSubmit={handleCreateFoundDog}
          />
        ) : loadingDogs ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : dogs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">{t("dogs.needToAddDog")}</p>
              <Button onClick={() => navigate("/profile")}>
                {t("dogs.addYourDog")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Dog Selector (if multiple dogs) - NOT shown for care requests which have their own multi-selector */}
            {dogs.length > 1 && createType !== "care" && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <Label>{t("dogs.selectDog")}</Label>
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
                  <CardTitle>{t("healthLog.logHealthEvent")}</CardTitle>
                  <CardDescription>{t("healthLog.trackWalksFoodMood")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("healthLog.type")}</Label>
                    <Select value={logType} onValueChange={setLogType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("healthLog.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk">🚶 {t("healthLog.walk")}</SelectItem>
                        <SelectItem value="food">🍖 {t("healthLog.food")}</SelectItem>
                        <SelectItem value="mood">😊 {t("healthLog.mood")}</SelectItem>
                        <SelectItem value="symptom">🩺 {t("healthLog.symptom")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("healthLog.valueDetails")}</Label>
                    <Input
                      placeholder={t("healthLog.valuePlaceholder")}
                      value={logValue}
                      onChange={(e) => setLogValue(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("healthLog.notesOptional")}</Label>
                    <Textarea
                      placeholder={t("healthLog.notesPlaceholder")}
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                    />
                  </div>

                  <Button className="w-full" onClick={handleCreateLog} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                    {t("healthLog.addLog")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {createType === "meds" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-primary" />
                    {t("medications.title")}
                  </CardTitle>
                  <CardDescription>{t("medications.trackMeds")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("create.name")} *</Label>
                    <Input
                      placeholder={t("medications.namePlaceholder")}
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("healthLog.type")} *</Label>
                    <Select value={medType} onValueChange={(v) => setMedType(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="medication">
                          <span className="flex items-center gap-2">
                            <Pill className="h-4 w-4" /> {t("medications.medication")}
                          </span>
                        </SelectItem>
                        <SelectItem value="vaccine">
                          <span className="flex items-center gap-2">
                            <Syringe className="h-4 w-4" /> {t("medications.vaccine")}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("medications.dateGiven")} *</Label>
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
                          {medDateGiven ? format(medDateGiven, "PPP") : t("create.selectDate")}
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
                    <Label>{t("medications.durationValidity")} *</Label>
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
                          <SelectItem value="days">{t("medications.days")}</SelectItem>
                          <SelectItem value="months">{t("medications.months")}</SelectItem>
                          <SelectItem value="years">{t("medications.years")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("care.notesOptional")}</Label>
                    <Textarea
                      placeholder={t("medications.notesPlaceholder")}
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
                    {t("medications.addRecord")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {createType === "lost" && (
              <Card className="border-lost">
                <CardHeader>
                  <CardTitle className="text-lost">🚨 {t("lost.title")}</CardTitle>
                  <CardDescription>{t("lost.provideDetails")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("lost.description")}</Label>
                    <Textarea
                      placeholder={t("lost.descriptionPlaceholder")}
                      value={lostDescription}
                      onChange={(e) => setLostDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <LocationPicker
                    latitude={lostLocation.latitude}
                    longitude={lostLocation.longitude}
                    locationLabel={lostLocation.locationLabel}
                    locationSource={lostLocation.locationSource}
                    loading={lostLocation.loading}
                    error={lostLocation.error}
                    permissionDenied={lostLocation.permissionDenied}
                    onRequestLocation={lostLocation.requestLocation}
                    onManualLocation={lostLocation.setManualLocation}
                    onLocationTextChange={lostLocation.setLocationFromText}
                    onSearchAddress={lostLocation.searchAddress}
                    required
                    placeholder={t("lost.whereLastSeen")}
                    description={t("lost.locationDesc")}
                  />

                  <Button className="w-full bg-lost hover:bg-lost/90" onClick={handleCreateLostAlert} disabled={submitting || !lostLocation.locationLabel}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                    {t("lost.postLostAlert")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {createType === "care" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("care.title")}</CardTitle>
                  <CardDescription>{t("care.findTrustedHelp")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Multi-dog selector for care requests */}
                  {dogs.length > 1 && (
                    <div className="space-y-2">
                      <Label>{selectedDogIds.length > 1 ? t("dogs.selectDogs") : t("dogs.selectDog")} *</Label>
                      <p className="text-xs text-muted-foreground">{t("care.selectDogsForCare")}</p>
                      <DogMultiSelector
                        dogs={dogs}
                        selectedDogIds={selectedDogIds}
                        onToggleDog={handleToggleDog}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t("care.typeOfCare")}</Label>
                    <Select value={careType} onValueChange={setCareType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("healthLog.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk">🚶 {t("care.walk")}</SelectItem>
                        <SelectItem value="watch">👀 {t("care.shortWatch")}</SelectItem>
                        <SelectItem value="overnight">🌙 {t("care.overnight")}</SelectItem>
                        <SelectItem value="check-in">👋 {t("care.checkIn")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <SingleDateTimePicker
                    date={careDate}
                    startTime={careStartTime}
                    endTime={careEndTime}
                    onDateChange={setCareDate}
                    onStartTimeChange={setCareStartTime}
                    onEndTimeChange={setCareEndTime}
                    error={careTimeError}
                  />

                  <LocationPicker
                    latitude={careLocation.latitude}
                    longitude={careLocation.longitude}
                    locationLabel={careLocation.locationLabel}
                    locationSource={careLocation.locationSource}
                    loading={careLocation.loading}
                    error={careLocation.error}
                    permissionDenied={careLocation.permissionDenied}
                    onRequestLocation={careLocation.requestLocation}
                    onManualLocation={careLocation.setManualLocation}
                    onLocationTextChange={careLocation.setLocationFromText}
                    onSearchAddress={careLocation.searchAddress}
                    required
                    placeholder={t("care.whereToCome")}
                    description={t("care.whereToMeet")}
                  />

                  <div className="space-y-2">
                    <Label>
                      <FileText className="h-4 w-4 inline mr-1" />
                      {t("care.notesOptional")}
                    </Label>
                    <Textarea
                      placeholder={t("care.specialInstructions")}
                      value={careNotes}
                      onChange={(e) => setCareNotes(e.target.value)}
                    />
                  </div>

                  <CurrencyInput
                    amount={payAmount}
                    currency={payCurrency}
                    onAmountChange={setPayAmount}
                    onCurrencyChange={setPayCurrency}
                    label={t("care.payOffered")}
                    optional={true}
                  />

                  <Button 
                    className="w-full" 
                    onClick={handleCreateCareRequest} 
                    disabled={submitting || !careType || !careDate || !careStartTime || !careEndTime || !careLocation.locationLabel || selectedDogIds.length === 0}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <HandHeart className="h-4 w-4 mr-2" />}
                    {selectedDogIds.length > 1 ? t("care.postRequestForDogs", { count: selectedDogIds.length }) : t("care.postRequest")}
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
