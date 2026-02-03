import { Link } from "react-router-dom";
import { PlusCircle, AlertTriangle, HandHeart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  dogId?: string;
  isLost?: boolean;
  onToggleLost?: () => void;
}

export function QuickActions({ dogId, isLost, onToggleLost }: QuickActionsProps) {
  const { t } = useTranslation();
  const logUrl = dogId ? `/create?type=log&dog_id=${dogId}` : "/create?type=log";
  const careUrl = dogId ? `/create?type=care&dog_id=${dogId}` : "/create?type=care";

  return (
    <div className="grid grid-cols-3 gap-3">
      <Link to={logUrl}>
        <GlassCard 
          variant="light" 
          hover 
          className="w-full h-auto flex flex-col items-center gap-2 py-5 px-3"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <PlusCircle className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground text-center">{t("quickActions.addLog")}</span>
        </GlassCard>
      </Link>

      <GlassCard 
        variant="light"
        hover
        className={cn(
          "w-full h-auto flex flex-col items-center gap-2 py-5 px-3 cursor-pointer transition-all duration-300",
          isLost && "bg-lost/20 border-lost/40"
        )}
        onClick={onToggleLost}
      >
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
          isLost ? "bg-lost/20" : "bg-lost/10"
        )}>
          <AlertTriangle className={cn("h-6 w-6", isLost ? "text-lost" : "text-lost")} />
        </div>
        <span className={cn(
          "text-xs font-semibold text-center",
          isLost ? "text-lost" : "text-foreground"
        )}>
          {isLost ? t("quickActions.endLost") : t("quickActions.lostMode")}
        </span>
      </GlassCard>

      <Link to={careUrl}>
        <GlassCard 
          variant="light" 
          hover 
          className="w-full h-auto flex flex-col items-center gap-2 py-5 px-3"
        >
          <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
            <HandHeart className="h-6 w-6 text-success" />
          </div>
          <span className="text-xs font-semibold text-foreground text-center">{t("quickActions.careRequest")}</span>
        </GlassCard>
      </Link>
    </div>
  );
}
