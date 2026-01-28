import { useState } from "react";
import { Check, X, MessageCircle, User, Clock, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface ApplicationCardProps {
  id: string;
  applicantName: string;
  availabilityText: string;
  message: string;
  rateOffered?: string | null;
  status: "pending" | "approved" | "declined" | "withdrawn";
  createdAt: string;
  isOwner: boolean;
  canApprove: boolean;
  onApprove?: () => void;
  onDecline?: () => void;
  onChat?: () => void;
}

const statusConfig = {
  pending: { label: "Pending", className: "bg-warning text-warning-foreground" },
  approved: { label: "Approved", className: "bg-primary text-primary-foreground" },
  declined: { label: "Declined", className: "bg-muted text-muted-foreground" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground" },
};

export function ApplicationCard({
  applicantName,
  availabilityText,
  message,
  rateOffered,
  status,
  createdAt,
  isOwner,
  canApprove,
  onApprove,
  onDecline,
  onChat,
}: ApplicationCardProps) {
  const [loading, setLoading] = useState<"approve" | "decline" | null>(null);
  const config = statusConfig[status];

  const handleApprove = async () => {
    setLoading("approve");
    await onApprove?.();
    setLoading(null);
  };

  const handleDecline = async () => {
    setLoading("decline");
    await onDecline?.();
    setLoading(null);
  };

  return (
    <Card className={status === "approved" ? "border-primary border-2" : ""}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {applicantName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-foreground">{applicantName}</h4>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          <Badge className={config.className}>
            {status === "approved" && <Check className="h-3 w-3 mr-1" />}
            {config.label}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-foreground">{availabilityText}</span>
          </div>
          {rateOffered && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-success shrink-0" />
              <span className="text-success font-medium">{rateOffered}</span>
            </div>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg mb-3">
          "{message}"
        </p>

        {/* Actions */}
        {isOwner && status === "pending" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onChat}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground"
              onClick={handleDecline}
              disabled={loading !== null}
            >
              <X className="h-4 w-4" />
            </Button>
            {canApprove && (
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={loading !== null}
              >
                <Check className="h-4 w-4 mr-1" />
                {loading === "approve" ? "..." : "Approve"}
              </Button>
            )}
          </div>
        )}

        {isOwner && status === "approved" && (
          <Button className="w-full" onClick={onChat}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Message Sitter
          </Button>
        )}

        {!isOwner && status === "approved" && (
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <Check className="h-4 w-4" />
            You've been approved! The owner will contact you.
          </div>
        )}

        {!isOwner && status === "pending" && (
          <div className="text-sm text-muted-foreground">
            Waiting for owner's response...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
