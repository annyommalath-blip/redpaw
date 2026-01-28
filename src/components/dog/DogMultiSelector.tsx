import { Dog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface DogItem {
  id: string;
  name: string;
  photo_url?: string | null;
}

interface DogMultiSelectorProps {
  dogs: DogItem[];
  selectedDogIds: string[];
  onToggleDog: (dogId: string) => void;
}

export function DogMultiSelector({ dogs, selectedDogIds, onToggleDog }: DogMultiSelectorProps) {
  if (dogs.length === 0) return null;

  return (
    <div className="space-y-2">
      {dogs.map((dog) => {
        const isSelected = selectedDogIds.includes(dog.id);
        
        return (
          <div
            key={dog.id}
            onClick={() => onToggleDog(dog.id)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
              isSelected
                ? "bg-primary/10 border-primary"
                : "bg-card border-border hover:bg-accent"
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleDog(dog.id)}
              className="pointer-events-none"
            />
            
            <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {dog.photo_url ? (
                <img
                  src={dog.photo_url}
                  alt={dog.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Dog className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            
            <span className={cn(
              "font-medium",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {dog.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
