import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SingleDateTimePicker, validateSingleDateTime, formatSingleDateTimeWindow, convertTimeToDbFormat, parseDbTimeToInput } from "@/components/care/SingleDateTimePicker";
import { CurrencyInput } from "@/components/care/CurrencyInput";
import { DogMultiSelector } from "@/components/dog/DogMultiSelector";
import { LocationPicker } from "@/components/location/LocationPicker";
import { useGeolocation } from "@/hooks/useGeolocation";
import { formatPayAmount } from "@/data/currencies";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type CareType = "walk" | "watch" | "overnight" | "check-in";

interface Dog {
  id: string;
  name: string;
  photo_url?: string | null;
}

interface CareRequest {
  id: string;
  dog_id: string;
  dog_ids: string[] | null;
  care_type: CareType;
  time_window: string;
  location_text: string;
  notes: string | null;
  pay_offered: string | null;
  pay_amount: number | null;
  pay_currency: string | null;
  request_date: string | null;
  start_time: string | null;
  end_time: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_label?: string | null;
  location_source?: string | null;
}

interface EditCareRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: CareRequest;
  onSuccess: () => void;
}

export function EditCareRequestDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: EditCareRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useGeolocation();

  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogIds, setSelectedDogIds] = useState<string[]>([]);
  const [careType, setCareType] = useState<string>(request.care_type);
  const [careDate, setCareDate] = useState<Date | undefined>();
  const [careStartTime, setCareStartTime] = useState<string>("");
  const [careEndTime, setCareEndTime] = useState<string>("");
  const [careTimeError, setCareTimeError] = useState<string>("");
  const [careNotes, setCareNotes] = useState(request.notes || "");
  const [payAmount, setPayAmount] = useState(request.pay_amount?.toString() || "");
  const [payCurrency, setPayCurrency] = useState(request.pay_currency || "USD");
  const [submitting, setSubmitting] = useState(false);
  const [loadingDogs, setLoadingDogs] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchDogs();
      // Initialize form with request data
      setSelectedDogIds(request.dog_ids || [request.dog_id]);
      setCareType(request.care_type);
      setCareNotes(request.notes || "");
      setPayAmount(request.pay_amount?.toString() || "");
      setPayCurrency(request.pay_currency || "USD");
      
      // Initialize location
      if (request.latitude && request.longitude) {
        location.setManualLocation(request.latitude, request.longitude, request.location_label || request.location_text);
      } else {
        location.setLocationFromText(request.location_label || request.location_text);
      }
      
      // Parse date and times
      if (request.request_date) {
        setCareDate(new Date(request.request_date));
      }
      if (request.start_time) {
        setCareStartTime(parseDbTimeToInput(request.start_time));
      }
      if (request.end_time) {
        setCareEndTime(parseDbTimeToInput(request.end_time));
      }
    }
  }, [open, user, request]);

  const fetchDogs = async () => {
    if (!user) return;
    setLoadingDogs(true);
    try {
      const { data } = await supabase
        .from("dogs")
        .select("id, name, photo_url")
        .eq("owner_id", user.id);
      setDogs(data || []);
    } catch (error) {
      console.error("Error fetching dogs:", error);
    } finally {
      setLoadingDogs(false);
    }
  };

  const handleToggleDog = (dogId: string) => {
    setSelectedDogIds(prev => {
      if (prev.includes(dogId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== dogId);
      } else {
        return [...prev, dogId];
      }
    });
  };

  const handleSubmit = async () => {
    // Validate datetime
    const timeError = validateSingleDateTime(careDate, careStartTime, careEndTime);
    if (timeError) {
      setCareTimeError(timeError);
      toast({ variant: "destructive", title: timeError });
      return;
    }
    setCareTimeError("");

    if (!careType || !location.locationLabel || selectedDogIds.length === 0) {
      toast({ variant: "destructive", title: "Please fill in all required fields" });
      return;
    }

    const timeWindow = formatSingleDateTimeWindow(careDate!, careStartTime, careEndTime);
    const payAmountNum = payAmount ? parseFloat(payAmount) : null;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("care_requests")
        .update({
          dog_id: selectedDogIds[0],
          dog_ids: selectedDogIds,
          care_type: careType as any,
          time_window: timeWindow,
          location_text: location.locationLabel,
          notes: careNotes || null,
          pay_offered: payAmountNum ? formatPayAmount(payAmountNum, payCurrency) : null,
          request_date: format(careDate!, "yyyy-MM-dd"),
          start_time: convertTimeToDbFormat(careStartTime),
          end_time: convertTimeToDbFormat(careEndTime),
          pay_amount: payAmountNum,
          pay_currency: payAmountNum ? payCurrency : null,
          latitude: location.latitude,
          longitude: location.longitude,
          location_label: location.locationLabel,
          location_source: location.locationSource,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({ title: "Care request updated! ✅" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Care Request</DialogTitle>
        </DialogHeader>

        {loadingDogs ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Dog Multi-Selector (if multiple dogs) */}
            {dogs.length > 1 && (
              <DogMultiSelector
                dogs={dogs}
                selectedDogIds={selectedDogIds}
                onToggleDog={handleToggleDog}
              />
            )}

            <div className="space-y-2">
              <Label>Care Type</Label>
              <Select value={careType} onValueChange={setCareType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select care type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk">🚶 Walk</SelectItem>
                  <SelectItem value="watch">👀 Short Watch</SelectItem>
                  <SelectItem value="overnight">🌙 Overnight</SelectItem>
                  <SelectItem value="check-in">👋 Check-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SingleDateTimePicker
              date={careDate}
              onDateChange={setCareDate}
              startTime={careStartTime}
              onStartTimeChange={setCareStartTime}
              endTime={careEndTime}
              onEndTimeChange={setCareEndTime}
              error={careTimeError}
            />

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
              placeholder="Where should they come?"
              description="Help sitters know where to meet you."
            />

            <CurrencyInput
              amount={payAmount}
              currency={payCurrency}
              onAmountChange={setPayAmount}
              onCurrencyChange={setPayCurrency}
            />

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any special instructions..."
                value={careNotes}
                onChange={(e) => setCareNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
