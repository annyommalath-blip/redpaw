import { format } from "date-fns";
import { Syringe, Pill, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  
  const statusConfig = {
    active: {
      label: t("medications.active"),
      className: "bg-success/10 text-success border-success/20",
    },
    "expiring-soon": {
      label: t("medications.expiringSoon"),
      className: "bg-warning/10 text-warning border-warning/20",
    },
    expired: {
      label: t("medications.expired"),
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => onEdit(record)}>
                <Edit className="h-4 w-4 mr-2" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(record)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
