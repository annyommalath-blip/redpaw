import { Link } from "react-router-dom";
import { PlusCircle, AlertTriangle, HandHeart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  dogId?: string;
  isLost?: boolean;
  onToggleLost?: () => void;
}

export function QuickActions({ dogId, isLost, onToggleLost }: QuickActionsProps) {
  const { t } = useTranslation();
  // Build URLs with dog_id query param if provided
  const logUrl = dogId ? `/create?type=log&dog_id=${dogId}` : "/create?type=log";
  const careUrl = dogId ? `/create?type=care&dog_id=${dogId}` : "/create?type=care";

  return (
    <div className="grid grid-cols-3 gap-3">
      <Link to={logUrl}>
        <Button
          variant="outline"
          className="w-full h-auto flex-col gap-2 py-4 rounded-xl bg-card hover:bg-accent"
        >
          <PlusCircle className="h-6 w-6 text-primary" />
          <span className="text-xs font-medium">{t("quickActions.addLog")}</span>
        </Button>
      </Link>

      <Button
        variant="outline"
        className={`w-full h-auto flex-col gap-2 py-4 rounded-xl ${
          isLost
            ? "bg-lost text-lost-foreground border-lost hover:bg-lost/90"
            : "bg-card hover:bg-accent"
        }`}
        onClick={onToggleLost}
      >
        <AlertTriangle className={`h-6 w-6 ${isLost ? "" : "text-lost"}`} />
        <span className="text-xs font-medium">
          {isLost ? t("quickActions.endLost") : t("quickActions.lostMode")}
        </span>
      </Button>

      <Link to={careUrl}>
        <Button
          variant="outline"
          className="w-full h-auto flex-col gap-2 py-4 rounded-xl bg-card hover:bg-accent"
        >
          <HandHeart className="h-6 w-6 text-success" />
          <span className="text-xs font-medium">{t("quickActions.careRequest")}</span>
        </Button>
      </Link>
    </div>
  );
}
