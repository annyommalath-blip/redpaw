/**
 * Pet type presets — used in Add/Edit Pet, Found Pet, map pins, and AI assistant.
 * Internal value is stored in the `pet_type` column (text) on `dogs` and `found_dogs`.
 * Anything outside the preset list is stored as a free-text custom value.
 */

export interface PetTypePreset {
  value: string;
  label: string;
  emoji: string;
}

export const PET_TYPE_PRESETS: PetTypePreset[] = [
  { value: "dog", label: "Dog", emoji: "🐶" },
  { value: "cat", label: "Cat", emoji: "🐱" },
  { value: "bird", label: "Bird", emoji: "🦜" },
  { value: "rabbit", label: "Rabbit", emoji: "🐰" },
  { value: "reptile", label: "Reptile", emoji: "🦎" },
  { value: "fish", label: "Fish", emoji: "🐠" },
  { value: "other", label: "Other", emoji: "🐾" },
];

const EMOJI_MAP: Record<string, string> = PET_TYPE_PRESETS.reduce(
  (acc, p) => ({ ...acc, [p.value]: p.emoji }),
  {} as Record<string, string>,
);

/** Get an emoji for any pet_type string. Falls back to the universal paw. */
export function getPetEmoji(petType?: string | null): string {
  if (!petType) return "🐾";
  const key = petType.toLowerCase().trim();
  return EMOJI_MAP[key] ?? "🐾";
}

/** Human-readable label for any pet_type (custom values capitalized). */
export function getPetTypeLabel(petType?: string | null): string {
  if (!petType) return "Pet";
  const key = petType.toLowerCase().trim();
  const preset = PET_TYPE_PRESETS.find((p) => p.value === key);
  if (preset) return preset.label;
  return petType.charAt(0).toUpperCase() + petType.slice(1);
}
