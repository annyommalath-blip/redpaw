import { Dog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface DogCardProps {
  name: string;
  breed: string;
  photoUrl?: string;
  isLost: boolean;
  onLostToggle: (isLost: boolean) => void;
  onClick?: () => void;
}

export function DogCard({
  name,
  breed,
  photoUrl,
  isLost,
  onLostToggle,
  onClick,
}: DogCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 cursor-pointer",
        isLost && "border-lost bg-lost/10 animate-pulse-soft"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-4">
          {/* Dog Photo */}
          <div
            className={cn(
              "relative h-20 w-20 rounded-2xl overflow-hidden bg-muted flex items-center justify-center shrink-0",
              isLost && "ring-4 ring-lost"
            )}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Dog className="h-10 w-10 text-muted-foreground" />
            )}
            {isLost && (
              <div className="absolute inset-0 bg-lost/20 flex items-center justify-center">
                <span className="text-2xl">🚨</span>
              </div>
            )}
          </div>

          {/* Dog Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{breed}</p>
            {isLost && (
              <p className="text-sm font-semibold text-lost mt-1">
                🔴 Lost Mode Active
              </p>
            )}
          </div>

          {/* Lost Toggle */}
          <div
            className="flex flex-col items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={isLost}
              onCheckedChange={onLostToggle}
              className={cn(
                isLost && "data-[state=checked]:bg-lost"
              )}
            />
            <span className="text-xs text-muted-foreground">Lost</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
