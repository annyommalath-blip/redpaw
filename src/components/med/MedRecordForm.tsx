import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Syringe, Pill } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { calculateExpirationDate } from "@/lib/medRecordUtils";
import { MedRecordWithStatus } from "@/lib/medRecordUtils";

interface MedRecordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    record_type: "vaccine" | "medication";
    date_given: string;
    duration_value: number;
    duration_unit: "days" | "months" | "years";
    expires_on: string;
    notes: string | null;
  }) => Promise<void>;
  editingRecord?: MedRecordWithStatus | null;
  submitting: boolean;
}

export function MedRecordForm({
  open,
  onOpenChange,
  onSubmit,
  editingRecord,
  submitting,
}: MedRecordFormProps) {
  const [name, setName] = useState("");
  const [recordType, setRecordType] = useState<"vaccine" | "medication">("vaccine");
  const [dateGiven, setDateGiven] = useState<Date | undefined>();
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<"days" | "months" | "years">("months");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingRecord) {
      setName(editingRecord.name);
      setRecordType(editingRecord.record_type);
      setDateGiven(new Date(editingRecord.date_given));
      setDurationValue(String(editingRecord.duration_value));
      setDurationUnit(editingRecord.duration_unit);
      setNotes(editingRecord.notes || "");
    } else {
      resetForm();
    }
  }, [editingRecord, open]);

  const resetForm = () => {
    setName("");
    setRecordType("vaccine");
    setDateGiven(undefined);
    setDurationValue("");
    setDurationUnit("months");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !dateGiven || !durationValue) return;

    const durVal = parseInt(durationValue, 10);
    if (isNaN(durVal) || durVal <= 0) return;

    const expiresOn = calculateExpirationDate(dateGiven, durVal, durationUnit);

    await onSubmit({
      name: name.trim(),
      record_type: recordType,
      date_given: format(dateGiven, "yyyy-MM-dd"),
      duration_value: durVal,
      duration_unit: durationUnit,
      expires_on: format(expiresOn, "yyyy-MM-dd"),
      notes: notes.trim() || null,
    });

    resetForm();
  };

  const isValid = name.trim() && dateGiven && durationValue && parseInt(durationValue, 10) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? "Edit Record" : "Add Medication/Vaccine Record"}
          </DialogTitle>
          <DialogDescription>
            Track vaccinations and medications for your dog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Rabies, DHPP, Heartworm..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={recordType} onValueChange={(v) => setRecordType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="vaccine">
                  <span className="flex items-center gap-2">
                    <Syringe className="h-4 w-4" /> Vaccine
                  </span>
                </SelectItem>
                <SelectItem value="medication">
                  <span className="flex items-center gap-2">
                    <Pill className="h-4 w-4" /> Medication
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
                    !dateGiven && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateGiven ? format(dateGiven, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="single"
                  selected={dateGiven}
                  onSelect={setDateGiven}
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
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className="flex-1"
              />
              <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as any)}>
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
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Dosage, vet info, side effects..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingRecord ? "Save Changes" : "Add Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
