import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/useDateLocale";
import { cn } from "@/lib/utils";

type LogType = "walk" | "food" | "meds" | "mood" | "symptom";

interface HealthLogCardProps {
  id?: string;
  type: LogType;
  value?: string;
  notes?: string;
  createdAt: Date;
  onDelete?: (id: string) => void;
}

const logTypeConfig: Record<LogType, { icon: string; labelKey: string; bgColor: string; iconBg: string }> = {
  walk: { icon: "🚶", labelKey: "healthLog.walk", bgColor: "bg-success/5", iconBg: "bg-success/15" },
  food: { icon: "🍖", labelKey: "healthLog.food", bgColor: "bg-warning/5", iconBg: "bg-warning/15" },
  meds: { icon: "💊", labelKey: "healthLog.meds", bgColor: "bg-primary/5", iconBg: "bg-primary/15" },
  mood: { icon: "😊", labelKey: "healthLog.mood", bgColor: "bg-accent/50", iconBg: "bg-accent" },
  symptom: { icon: "🩺", labelKey: "healthLog.symptom", bgColor: "bg-destructive/5", iconBg: "bg-destructive/15" },
};

export function HealthLogCard({ id, type, value, notes, createdAt, onDelete }: HealthLogCardProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const config = logTypeConfig[type];

  return (
    <GlassCard variant="light" className={cn("transition-all", config.bgColor)}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center text-lg shrink-0",
            config.iconBg
          )}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">{t(config.labelKey)}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocale })}
              </span>
            </div>
            {value && (
              <p className="text-sm text-foreground mt-1">{value}</p>
            )}
            {notes && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notes}</p>
            )}
          </div>
          
          {onDelete && id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card-modal rounded-xl">
                <DropdownMenuItem 
                  onClick={() => onDelete(id)}
                  className="text-destructive focus:text-destructive rounded-lg"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
