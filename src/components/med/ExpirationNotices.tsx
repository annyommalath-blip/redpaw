import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MedRecordWithStatus } from "@/lib/medRecordUtils";
import { cn } from "@/lib/utils";

interface ExpirationNoticesProps {
  records: MedRecordWithStatus[];
  onRecordClick: (record: MedRecordWithStatus) => void;
}

export function ExpirationNotices({ records, onRecordClick }: ExpirationNoticesProps) {
  const urgentRecords = records.filter(
    (r) => r.status === "expired" || r.status === "expiring-soon"
  ).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  if (urgentRecords.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        Needs Attention
      </h2>
      <div className="space-y-2">
        {urgentRecords.map((record) => (
          <Card
            key={record.id}
            className={cn(
              "cursor-pointer transition-all hover:scale-[1.01]",
              record.status === "expired"
                ? "border-destructive bg-destructive/5 hover:border-destructive"
                : "border-warning bg-warning/5 hover:border-warning"
            )}
            onClick={() => onRecordClick(record)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                record.status === "expired" ? "bg-destructive/10" : "bg-warning/10"
              )}>
                {record.status === "expired" ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <Clock className="h-4 w-4 text-warning" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  record.status === "expired" ? "text-destructive" : "text-warning"
                )}>
                  {record.name}
                </p>
                <p className={cn(
                  "text-xs",
                  record.status === "expired" ? "text-destructive/80" : "text-warning/80"
                )}>
                  {record.countdown}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
