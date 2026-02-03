import { Dog } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  
  return (
    <GlassCard
      variant={isLost ? "default" : "default"}
      hover
      className={cn(
        "overflow-hidden transition-all duration-300",
        isLost && "lost-mode"
      )}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Dog Photo */}
          <div
            className={cn(
              "relative h-20 w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0 shadow-sm",
              isLost && "ring-3 ring-lost ring-offset-2 ring-offset-card"
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
              <div className="absolute inset-0 bg-lost/20 flex items-center justify-center backdrop-blur-[1px]">
                <span className="text-2xl animate-pulse">🚨</span>
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
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-lost/15 text-lost text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lost opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-lost"></span>
                  </span>
                  {t("dogs.lostModeActive")}
                </span>
              </div>
            )}
          </div>

          {/* Lost Toggle */}
          <div
            className="flex flex-col items-center gap-1.5 pl-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={isLost}
              onCheckedChange={onLostToggle}
              className={cn(
                "data-[state=checked]:bg-lost"
              )}
            />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t("dogs.lost")}
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
