import { useState } from "react";
import { format, isAfter, isBefore, setHours, setMinutes } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DateTimeRangePickerProps {
  startDate: Date | undefined;
  startTime: string;
  endDate: Date | undefined;
  endTime: string;
  onStartDateChange: (date: Date | undefined) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateChange: (date: Date | undefined) => void;
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

export function DateTimeRangePicker({
  startDate,
  startTime,
  endDate,
  endTime,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  error,
}: DateTimeRangePickerProps) {
  return (
    <div className="space-y-4">
      {/* Start Date/Time */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Start *
        </Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={onStartDateChange}
                disabled={(date) => isBefore(date, new Date(new Date().setHours(0, 0, 0, 0)))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Select value={startTime} onValueChange={onStartTimeChange}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-background border shadow-lg z-50">
              {timeOptions.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* End Date/Time */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          End *
        </Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={onEndDateChange}
                disabled={(date) => {
                  const today = new Date(new Date().setHours(0, 0, 0, 0));
                  return isBefore(date, startDate || today);
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Select value={endTime} onValueChange={onEndTimeChange}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-background border shadow-lg z-50">
              {timeOptions.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview */}
      {startDate && startTime && endDate && endTime && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          📅 {format(startDate, "MMM d")}, {startTime} – {format(endDate, "MMM d")}, {endTime}
          {format(startDate, "yyyy") !== format(endDate, "yyyy") && ` ${format(endDate, "yyyy")}`}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

export function formatTimeWindow(
  startDate: Date,
  startTime: string,
  endDate: Date,
  endTime: string
): string {
  const sameDay = format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd");
  
  if (sameDay) {
    return `${format(startDate, "MMM d")}, ${startTime} – ${endTime}`;
  }
  
  return `${format(startDate, "MMM d")}, ${startTime} – ${format(endDate, "MMM d")}, ${endTime}`;
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

export function validateDateTimeRange(
  startDate: Date | undefined,
  startTime: string,
  endDate: Date | undefined,
  endTime: string
): string | null {
  if (!startDate || !startTime || !endDate || !endTime) {
    return "Please select start and end date/time";
  }
  
  const sameDay = format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd");
  
  if (isBefore(endDate, startDate)) {
    return "End date must be after start date";
  }
  
  if (sameDay) {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    
    if (endMinutes <= startMinutes) {
      return "End time must be after start time";
    }
  }
  
  return null;
}
