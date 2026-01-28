import { Dog } from "lucide-react";
import { cn } from "@/lib/utils";

interface DogItem {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  is_lost: boolean;
}

interface DogSelectorProps {
  dogs: DogItem[];
  activeDogId: string;
  onSelectDog: (dogId: string) => void;
}

export function DogSelector({ dogs, activeDogId, onSelectDog }: DogSelectorProps) {
  if (dogs.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
      {dogs.map((dog) => {
        const isActive = dog.id === activeDogId;
        
        return (
          <button
            key={dog.id}
            onClick={() => onSelectDog(dog.id)}
            className={cn(
              "flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all border",
              "w-[72px]",
              isActive
                ? "bg-primary/10 border-primary"
                : "bg-card border-border hover:bg-accent",
              dog.is_lost && !isActive && "border-lost"
            )}
          >
            {/* Photo */}
            <div
              className={cn(
                "relative h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0",
                isActive && "ring-2 ring-primary",
                dog.is_lost && "ring-2 ring-lost"
              )}
            >
              {dog.photo_url ? (
                <img
                  src={dog.photo_url}
                  alt={dog.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Dog className="h-5 w-5 text-muted-foreground" />
              )}
              {dog.is_lost && (
                <div className="absolute inset-0 bg-lost/20 flex items-center justify-center">
                  <span className="text-xs">🚨</span>
                </div>
              )}
            </div>

            {/* Name */}
            <p className={cn(
              "text-[11px] font-medium truncate w-full text-center",
              isActive ? "text-primary" : "text-foreground"
            )}>
              {dog.name}
            </p>

            {/* Lost indicator */}
            {dog.is_lost && (
              <span className="text-[9px] font-semibold text-lost leading-none">LOST</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
