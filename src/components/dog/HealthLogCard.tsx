import { Card, CardContent } from "@/components/ui/card";
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

type LogType = "walk" | "food" | "meds" | "mood" | "symptom";

interface HealthLogCardProps {
  id?: string;
  type: LogType;
  value?: string;
  notes?: string;
  createdAt: Date;
  onDelete?: (id: string) => void;
}

const logTypeConfig: Record<LogType, { icon: string; label: string; color: string }> = {
  walk: { icon: "🚶", label: "Walk", color: "bg-success/10 text-success" },
  food: { icon: "🍖", label: "Food", color: "bg-warning/10 text-warning" },
  meds: { icon: "💊", label: "Medication", color: "bg-primary/10 text-primary" },
  mood: { icon: "😊", label: "Mood", color: "bg-accent text-accent-foreground" },
  symptom: { icon: "🩺", label: "Symptom", color: "bg-destructive/10 text-destructive" },
};

export function HealthLogCard({ id, type, value, notes, createdAt, onDelete }: HealthLogCardProps) {
  const { t } = useTranslation();
  const config = logTypeConfig[type];
  
  const getLogLabel = (logType: LogType) => {
    const labels: Record<LogType, string> = {
      walk: t("healthLog.walk"),
      food: t("healthLog.food"),
      meds: t("healthLog.meds"),
      mood: t("healthLog.mood"),
      symptom: t("healthLog.symptom"),
    };
    return labels[logType];
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg ${config.color}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{getLogLabel(type)}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
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
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onDelete(id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
