import { format } from "date-fns";
import { CalendarIcon, Clock, Dog, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LocationPicker } from "@/components/location/LocationPicker";
import { FoundDogPhotoUploader } from "@/components/community/FoundDogPhotoUploader";

// Generate time options in 15-minute increments
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour24 = h.toString().padStart(2, "0");
      const min = m.toString().padStart(2, "0");
      const value = `${hour24}:${min}`;
      
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${min} ${ampm}`;
      
      options.push({ value, label });
    }
  }
  return options;
}

const timeOptions = generateTimeOptions();

export interface FinderObservations {
  behavior_observed: string;
  collar_visible: string;
  walking_normally: string;
  direction_heading: string;
  still_in_sight: string;
}

interface FoundDogFormProps {
  photoUrls: string[];
  onPhotosChange: (urls: string[]) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  location: {
    latitude: number | null;
    longitude: number | null;
    locationLabel: string;
    locationSource: "gps" | "manual";
    loading: boolean;
    error: string | null;
    permissionDenied: boolean;
    requestLocation: () => void;
    setManualLocation: (lat: number, lng: number, label: string) => void;
    setLocationFromText: (text: string) => void;
    searchAddress: (query: string) => Promise<boolean>;
  };
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  time: string;
  onTimeChange: (time: string) => void;
  finderObservations: FinderObservations;
  onFinderObservationsChange: (obs: FinderObservations) => void;
  submitting: boolean;
  onSubmit: () => void;
}

export function FoundDogForm({
  photoUrls,
  onPhotosChange,
  description,
  onDescriptionChange,
  location,
  date,
  onDateChange,
  time,
  onTimeChange,
  finderObservations,
  onFinderObservationsChange,
  submitting,
  onSubmit,
}: FoundDogFormProps) {
  const { t } = useTranslation();
  const isValid = photoUrls.length > 0 && location.locationLabel && date && time;

  return (
    <Card className="border-success">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-success">
          <Dog className="h-5 w-5" />
          {t("found.reportFound")}
        </CardTitle>
        <CardDescription>
          {t("found.helpLostDogFindOwner")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Photo Upload - Required */}
        <div className="space-y-2">
          <Label>{t("found.photos")} *</Label>
          <p className="text-xs text-muted-foreground">
            {t("found.photosHint")}
          </p>
          <FoundDogPhotoUploader
            photoUrls={photoUrls}
            onPhotosChange={onPhotosChange}
            maxPhotos={5}
          />
        </div>

        {/* Found Location - Required */}
        <LocationPicker
          latitude={location.latitude}
          longitude={location.longitude}
          locationLabel={location.locationLabel}
          locationSource={location.locationSource}
          loading={location.loading}
          error={location.error}
          permissionDenied={location.permissionDenied}
          onRequestLocation={location.requestLocation}
          onManualLocation={location.setManualLocation}
          onLocationTextChange={location.setLocationFromText}
          onSearchAddress={location.searchAddress}
          required
          placeholder={t("found.whereFoundPlaceholder")}
          description={t("found.whereFoundHint")}
        />

        {/* Found Date/Time - Required */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {t("found.whenFound")} *
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "MMM d, yyyy") : t("found.date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={onDateChange}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Select value={time} onValueChange={onTimeChange}>
              <SelectTrigger className={cn(!time && "text-muted-foreground")}>
                <SelectValue placeholder={t("found.time")} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Observations - Optional but helps matching */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Quick observations (helps us match the dog faster)</Label>
          <p className="text-xs text-muted-foreground">Answer what you can — all fields are optional.</p>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">When the dog noticed you, did it...</Label>
            <Select
              value={finderObservations.behavior_observed}
              onValueChange={(v) => onFinderObservationsChange({ ...finderObservations, behavior_observed: v })}
            >
              <SelectTrigger className={cn(!finderObservations.behavior_observed && "text-muted-foreground")}>
                <SelectValue placeholder="Select behavior..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approached">Come toward me</SelectItem>
                <SelectItem value="stayed_still">Stay still</SelectItem>
                <SelectItem value="ran_away">Run away</SelectItem>
                <SelectItem value="ignored">Ignore me completely</SelectItem>
                <SelectItem value="not_sure">Not sure / too far away</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Did you see anything around its neck? (collar, harness, bandana)</Label>
            <Select
              value={finderObservations.collar_visible}
              onValueChange={(v) => onFinderObservationsChange({ ...finderObservations, collar_visible: v })}
            >
              <SelectTrigger className={cn(!finderObservations.collar_visible && "text-muted-foreground")}>
                <SelectValue placeholder="Collar visible?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collar_yes">Yes — collar</SelectItem>
                <SelectItem value="harness_yes">Yes — harness</SelectItem>
                <SelectItem value="bandana">Yes — bandana or clothing</SelectItem>
                <SelectItem value="nothing">No, nothing visible</SelectItem>
                <SelectItem value="not_sure">Couldn't tell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Did the dog walk normally, or favor one leg?</Label>
            <Select
              value={finderObservations.walking_normally}
              onValueChange={(v) => onFinderObservationsChange({ ...finderObservations, walking_normally: v })}
            >
              <SelectTrigger className={cn(!finderObservations.walking_normally && "text-muted-foreground")}>
                <SelectValue placeholder="Walking?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Walking normally</SelectItem>
                <SelectItem value="limping">Limping / favoring a leg</SelectItem>
                <SelectItem value="not_moving">Not moving / lying down</SelectItem>
                <SelectItem value="not_sure">Couldn't tell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Direction heading?</Label>
              <Select
                value={finderObservations.direction_heading}
                onValueChange={(v) => onFinderObservationsChange({ ...finderObservations, direction_heading: v })}
              >
                <SelectTrigger className={cn(!finderObservations.direction_heading && "text-muted-foreground")}>
                  <SelectValue placeholder="Direction..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="north">North</SelectItem>
                  <SelectItem value="south">South</SelectItem>
                  <SelectItem value="east">East</SelectItem>
                  <SelectItem value="west">West</SelectItem>
                  <SelectItem value="stationary">Not moving</SelectItem>
                  <SelectItem value="unknown">Don't know</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Still there now?</Label>
              <Select
                value={finderObservations.still_in_sight}
                onValueChange={(v) => onFinderObservationsChange({ ...finderObservations, still_in_sight: v })}
              >
                <SelectTrigger className={cn(!finderObservations.still_in_sight && "text-muted-foreground")}>
                  <SelectValue placeholder="Still there?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes_with_me">Yes, I have it with me</SelectItem>
                  <SelectItem value="yes_nearby">Yes, still in sight</SelectItem>
                  <SelectItem value="no">No, it moved on</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Description - Optional */}
        <div className="space-y-2">
          <Label>{t("found.descriptionOptional")}</Label>
          <Textarea
            placeholder={t("found.descriptionPlaceholder")}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
          />
        </div>

        {/* Contact note */}
        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          {t("found.contactNote")}
        </p>

        {/* Submit */}
        <Button
          className="w-full bg-success hover:bg-success/90"
          onClick={onSubmit}
          disabled={submitting || !isValid}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Dog className="h-4 w-4 mr-2" />
          )}
          {t("found.reportFound")}
        </Button>
      </CardContent>
    </Card>
  );
}
