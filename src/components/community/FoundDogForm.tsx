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
