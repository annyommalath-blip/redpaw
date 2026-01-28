import { format } from "date-fns";
import { Syringe, Pill } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MedRecordWithStatus } from "@/lib/medRecordUtils";
import { cn } from "@/lib/utils";

interface MedRecordCardReadOnlyProps {
  record: MedRecordWithStatus;
}

export function MedRecordCardReadOnly({ record }: MedRecordCardReadOnlyProps) {
  const statusConfig = {
    active: {
      label: "Active",
      className: "bg-success/10 text-success border-success/20",
    },
    "expiring-soon": {
      label: "Expiring Soon",
      className: "bg-warning/10 text-warning border-warning/20",
    },
    expired: {
      label: "Expired",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const status = statusConfig[record.status];
  const Icon = record.record_type === "vaccine" ? Syringe : Pill;

  return (
    <Card className={cn(
      "transition-all",
      record.status === "expired" && "border-destructive/30 bg-destructive/5",
      record.status === "expiring-soon" && "border-warning/30 bg-warning/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
            record.record_type === "vaccine" ? "bg-primary/10" : "bg-secondary"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              record.record_type === "vaccine" ? "text-primary" : "text-muted-foreground"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{record.name}</h3>
              <Badge variant="outline" className={cn("text-xs shrink-0", status.className)}>
                {status.label}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>Given: {format(new Date(record.date_given), "MMM d, yyyy")}</p>
              <p>Expires: {format(new Date(record.expires_on), "MMM d, yyyy")}</p>
              <p className={cn(
                "font-medium",
                record.status === "expired" && "text-destructive",
                record.status === "expiring-soon" && "text-warning"
              )}>
                {record.countdown}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
