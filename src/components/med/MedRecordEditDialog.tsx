import { useState, useEffect } from "react";
import { format, addDays, addMonths, addYears } from "date-fns";
import { Loader2, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MedRecordWithStatus } from "@/lib/medRecordUtils";
import { cn } from "@/lib/utils";

interface MedRecordEditDialogProps {
  record: MedRecordWithStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MedRecordEditDialog({
  record,
  open,
  onOpenChange,
  onSuccess,
}: MedRecordEditDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [recordType, setRecordType] = useState<"vaccine" | "medication">("vaccine");
  const [dateGiven, setDateGiven] = useState<Date | undefined>(undefined);
  const [durationValue, setDurationValue] = useState("1");
  const [durationUnit, setDurationUnit] = useState<"days" | "months" | "years">("years");
  const [notes, setNotes] = useState("");

  // Populate form when record changes
  useEffect(() => {
    if (record) {
      setName(record.name);
      setRecordType(record.record_type);
      setDateGiven(new Date(record.date_given));
      setDurationValue(String(record.duration_value));
      setDurationUnit(record.duration_unit);
      setNotes(record.notes || "");
    }
  }, [record]);

  const calculateExpirationDate = (date: Date, value: number, unit: "days" | "months" | "years") => {
    switch (unit) {
      case "days":
        return addDays(date, value);
      case "months":
        return addMonths(date, value);
      case "years":
        return addYears(date, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!record || !name.trim() || !dateGiven) {
      toast({ variant: "destructive", title: "Please fill in all required fields" });
      return;
    }

    const durationNum = parseInt(durationValue, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      toast({ variant: "destructive", title: "Please enter a valid duration" });
      return;
    }

    setSubmitting(true);
    try {
      const expiresOn = calculateExpirationDate(dateGiven, durationNum, durationUnit);

      const { error } = await supabase
        .from("med_records")
        .update({
          name: name.trim(),
          record_type: recordType,
          date_given: format(dateGiven, "yyyy-MM-dd"),
          duration_value: durationNum,
          duration_unit: durationUnit,
          expires_on: format(expiresOn, "yyyy-MM-dd"),
          notes: notes.trim() || null,
        })
        .eq("id", record.id);

      if (error) throw error;

      toast({ title: "Record updated!" });
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Medication Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              placeholder="e.g., Rabies Vaccine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={recordType} onValueChange={(v) => setRecordType(v as "vaccine" | "medication")}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vaccine">Vaccine</SelectItem>
                <SelectItem value="medication">Medication</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Given */}
          <div className="space-y-2">
            <Label>Date Given *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateGiven && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateGiven ? format(dateGiven, "MMM d, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateGiven}
                  onSelect={setDateGiven}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Valid For *</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className="w-20"
              />
              <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as "days" | "months" | "years")}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                  <SelectItem value="years">Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
