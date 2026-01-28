import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

type LogType = "walk" | "food" | "meds" | "mood" | "symptom";

interface HealthLogCardProps {
  type: LogType;
  value?: string;
  notes?: string;
  createdAt: Date;
}

const logTypeConfig: Record<LogType, { icon: string; label: string; color: string }> = {
  walk: { icon: "🚶", label: "Walk", color: "bg-success/10 text-success" },
  food: { icon: "🍖", label: "Food", color: "bg-warning/10 text-warning" },
  meds: { icon: "💊", label: "Medication", color: "bg-primary/10 text-primary" },
  mood: { icon: "😊", label: "Mood", color: "bg-accent text-accent-foreground" },
  symptom: { icon: "🩺", label: "Symptom", color: "bg-destructive/10 text-destructive" },
};

export function HealthLogCard({ type, value, notes, createdAt }: HealthLogCardProps) {
  const config = logTypeConfig[type];

  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg ${config.color}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{config.label}</span>
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
        </div>
      </CardContent>
    </Card>
  );
}
