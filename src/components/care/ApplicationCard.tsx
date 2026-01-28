import { useState } from "react";
import { Check, X, MessageCircle, Clock, Undo2, MapPin, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface ApplicationCardProps {
  id: string;
  applicantName: string;
  applicantFirstName?: string | null;
  applicantLastName?: string | null;
  applicantCity?: string | null;
  applicantPostalCode?: string | null;
  applicantAvatarUrl?: string | null;
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
  onWithdraw?: () => void;
}

const statusConfig = {
  pending: { label: "Pending", className: "bg-warning text-warning-foreground" },
  approved: { label: "Approved", className: "bg-primary text-primary-foreground" },
  declined: { label: "Declined", className: "bg-muted text-muted-foreground" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground" },
};

export function ApplicationCard({
  id,
  applicantName,
  applicantFirstName,
  applicantLastName,
  applicantCity,
  applicantPostalCode,
  applicantAvatarUrl,
  message,
  status,
  createdAt,
  isOwner,
  canApprove,
  onApprove,
  onDecline,
  onChat,
  onWithdraw,
}: ApplicationCardProps) {
  const [loading, setLoading] = useState<"approve" | "decline" | "withdraw" | null>(null);
  const config = statusConfig[status];

  // Format full name
  const fullName = [applicantFirstName, applicantLastName].filter(Boolean).join(" ");
  const displayName = fullName || applicantName;
  
  // Format location
  const location = [applicantCity, applicantPostalCode].filter(Boolean).join(", ");

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

  const handleWithdraw = async () => {
    setLoading("withdraw");
    await onWithdraw?.();
    setLoading(null);
  };

  return (
    <Card className={status === "approved" ? "border-primary border-2" : ""}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={applicantAvatarUrl || ""} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-foreground">{displayName}</h4>
              {/* Show location for owner view */}
              {isOwner && location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{location}</span>
                </div>
              )}
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

        {/* Message */}
        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg mb-3">
          "{message}"
        </p>

        {/* Owner Actions */}
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

        {/* Applicant View */}
        {!isOwner && status === "approved" && (
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <Check className="h-4 w-4" />
            You've been approved! The owner will contact you.
          </div>
        )}

        {!isOwner && status === "pending" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Waiting for owner's response...
            </div>
            {onWithdraw && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleWithdraw}
                disabled={loading !== null}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                {loading === "withdraw" ? "..." : "Withdraw"}
              </Button>
            )}
          </div>
        )}

        {!isOwner && status === "declined" && (
          <div className="text-sm text-muted-foreground">
            This application was not accepted.
          </div>
        )}

        {!isOwner && status === "withdrawn" && (
          <div className="text-sm text-muted-foreground">
            You withdrew this application.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
