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
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {dogs.map((dog) => {
        const isActive = dog.id === activeDogId;
        
        return (
          <button
            key={dog.id}
            onClick={() => onSelectDog(dog.id)}
            className={cn(
              "flex flex-col items-center gap-2 min-w-[80px] p-3 rounded-xl transition-all",
              isActive
                ? "bg-primary/10 ring-2 ring-primary"
                : "bg-card hover:bg-accent",
              dog.is_lost && "ring-2 ring-lost"
            )}
          >
            {/* Photo */}
            <div
              className={cn(
                "relative h-14 w-14 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0",
                isActive && "ring-2 ring-primary ring-offset-2",
                dog.is_lost && "ring-2 ring-lost ring-offset-2"
              )}
            >
              {dog.photo_url ? (
                <img
                  src={dog.photo_url}
                  alt={dog.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Dog className="h-6 w-6 text-muted-foreground" />
              )}
              {dog.is_lost && (
                <div className="absolute inset-0 bg-lost/20 flex items-center justify-center">
                  <span className="text-lg">🚨</span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-center">
              <p className={cn(
                "text-xs font-medium truncate max-w-[70px]",
                isActive ? "text-primary" : "text-foreground"
              )}>
                {dog.name}
              </p>
              {dog.breed && (
                <p className="text-[10px] text-muted-foreground truncate max-w-[70px]">
                  {dog.breed}
                </p>
              )}
            </div>

            {/* Lost indicator */}
            {dog.is_lost && (
              <span className="text-[10px] font-semibold text-lost">LOST</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
