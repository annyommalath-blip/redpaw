import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PET_TYPE_PRESETS } from "@/lib/petTypes";

interface PetTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

/**
 * Dropdown of common pet types with a free-text fallback when "Other" is picked.
 * Stores either a preset value (dog/cat/...) or the custom text the user enters.
 */
export function PetTypeSelector({ value, onChange, label = "Pet type", required }: PetTypeSelectorProps) {
  const isPreset = PET_TYPE_PRESETS.some((p) => p.value === value);
  const [mode, setMode] = useState<string>(isPreset ? value : value ? "other" : "dog");
  const [customText, setCustomText] = useState<string>(isPreset ? "" : (value ?? ""));

  // Keep parent in sync when mode changes to a preset
  useEffect(() => {
    if (mode !== "other") {
      onChange(mode);
    } else if (customText.trim()) {
      onChange(customText.trim().toLowerCase());
    } else {
      onChange("other");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleCustom = (text: string) => {
    setCustomText(text);
    onChange(text.trim() ? text.trim().toLowerCase() : "other");
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={mode} onValueChange={setMode}>
        <SelectTrigger>
          <SelectValue placeholder="Select pet type" />
        </SelectTrigger>
        <SelectContent>
          {PET_TYPE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              <span className="mr-2">{p.emoji}</span>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {mode === "other" && (
        <Input
          placeholder="What kind of pet? (e.g., hamster, ferret, parrot)"
          value={customText}
          onChange={(e) => handleCustom(e.target.value)}
          maxLength={40}
        />
      )}
    </div>
  );
}
