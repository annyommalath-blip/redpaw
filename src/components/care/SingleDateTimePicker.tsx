import { format, isBefore } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SingleDateTimePickerProps {
  date: Date | undefined;
  startTime: string;
  endTime: string;
  onDateChange: (date: Date | undefined) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  error?: string;
}

const timeOptions = [
  "12:00 AM", "12:30 AM", "1:00 AM", "1:30 AM", "2:00 AM", "2:30 AM",
  "3:00 AM", "3:30 AM", "4:00 AM", "4:30 AM", "5:00 AM", "5:30 AM",
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
];

export function SingleDateTimePicker({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  error,
}: SingleDateTimePickerProps) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          {t("care.date")} *
        </Label>
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
              {date ? format(date, "EEEE, MMMM d, yyyy") : t("care.selectDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              disabled={(d) => isBefore(d, new Date(new Date().setHours(0, 0, 0, 0)))}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Range */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {t("care.timeSlot")} *
        </Label>
        <div className="flex items-center gap-2">
          <Select value={startTime} onValueChange={onStartTimeChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("care.startTime")} />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-background border shadow-lg z-50">
              {timeOptions.map((time) => (
                <SelectItem key={`start-${time}`} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">{t("care.to")}</span>
          <Select value={endTime} onValueChange={onEndTimeChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("care.endTime")} />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-background border shadow-lg z-50">
              {timeOptions.map((time) => (
                <SelectItem key={`end-${time}`} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview */}
      {date && startTime && endTime && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          📅 {format(date, "MMM d, yyyy")}, {startTime} – {endTime}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

export function parseTimeToMinutes(time: string): number {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

export function validateSingleDateTime(
  date: Date | undefined,
  startTime: string,
  endTime: string
): string | null {
  if (!date) {
    return "Please select a date";
  }
  if (!startTime || !endTime) {
    return "Please select start and end time";
  }
  
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  if (endMinutes <= startMinutes) {
    return "End time must be after start time";
  }
  
  return null;
}

export function formatSingleDateTimeWindow(
  date: Date,
  startTime: string,
  endTime: string
): string {
  return `${format(date, "MMM d")}, ${startTime} – ${endTime}`;
}

export function convertTimeToDbFormat(time: string): string {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "00:00:00";
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
}

export function convertDbTimeToDisplay(dbTime: string): string {
  if (!dbTime) return "";
  
  const parts = dbTime.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const period = hours >= 12 ? "PM" : "AM";
  
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  
  return `${hours}:${minutes} ${period}`;
}

export function parseDbTimeToInput(dbTime: string): string {
  if (!dbTime) return "";
  
  const parts = dbTime.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const period = hours >= 12 ? "PM" : "AM";
  
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  
  return `${hours}:${minutes} ${period}`;
}
