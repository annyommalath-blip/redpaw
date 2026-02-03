import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";

type StatusType = "active" | "expiring" | "expired" | "pending" | "lost";

interface StatusChipProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
  label: string;
  showIcon?: boolean;
}

const statusConfig: Record<StatusType, { 
  className: string; 
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  active: {
    className: "status-active",
    Icon: CheckCircle,
  },
  expiring: {
    className: "status-expiring",
    Icon: AlertTriangle,
  },
  expired: {
    className: "status-expired",
    Icon: XCircle,
  },
  pending: {
    className: "bg-muted text-muted-foreground border border-border",
    Icon: Clock,
  },
  lost: {
    className: "status-lost",
    Icon: AlertTriangle,
  },
};

export function StatusChip({ 
  status, 
  label, 
  showIcon = true, 
  className, 
  ...props 
}: StatusChipProps) {
  const config = statusConfig[status];
  const { Icon } = config;

  return (
    <div 
      className={cn("status-chip", config.className, className)} 
      {...props}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
    </div>
  );
}
