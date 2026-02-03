import { format } from "date-fns";
import { Syringe, Pill, MoreVertical, Edit, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MedRecordWithStatus, getCountdownText } from "@/lib/medRecordUtils";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MedRecordCardProps {
  record: MedRecordWithStatus;
  onEdit: (record: MedRecordWithStatus) => void;
  onDelete: (record: MedRecordWithStatus) => void;
}

export function MedRecordCard({ record, onEdit, onDelete }: MedRecordCardProps) {
  const { t } = useTranslation();
  
  const statusMap: Record<string, { type: "active" | "expiring" | "expired"; label: string }> = {
    active: { type: "active", label: t("medications.active") },
    "expiring-soon": { type: "expiring", label: t("medications.expiringSoon") },
    expired: { type: "expired", label: t("medications.expired") },
  };

  const status = statusMap[record.status];
  const Icon = record.record_type === "vaccine" ? Syringe : Pill;

  return (
    <GlassCard 
      variant="light"
      className={cn(
        "transition-all duration-300",
        record.status === "expired" && "border-destructive/30",
        record.status === "expiring-soon" && "border-warning/30"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
            record.record_type === "vaccine" 
              ? "bg-primary/10" 
              : "bg-muted"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              record.record_type === "vaccine" ? "text-primary" : "text-muted-foreground"
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-foreground truncate">{record.name}</h3>
              <StatusChip status={status.type} label={status.label} showIcon={false} />
            </div>

            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>{t("medications.given")}: {format(new Date(record.date_given), "MMM d, yyyy")}</p>
              <p>{t("medications.expires")}: {format(new Date(record.expires_on), "MMM d, yyyy")}</p>
              <p className={cn(
                "font-medium",
                record.status === "expired" && "text-destructive",
                record.status === "expiring-soon" && "text-warning"
              )}>
                {getCountdownText(new Date(record.expires_on), t)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card-modal rounded-xl">
              <DropdownMenuItem onClick={() => onEdit(record)} className="rounded-lg">
                <Edit className="h-4 w-4 mr-2" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(record)}
                className="text-destructive focus:text-destructive rounded-lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </GlassCard>
  );
}
