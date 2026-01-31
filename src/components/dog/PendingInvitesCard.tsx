import { Dog, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePendingInvites } from "@/hooks/useDogMembers";

interface PendingInvitesCardProps {
  onInviteAccepted?: () => void;
}

export function PendingInvitesCard({ onInviteAccepted }: PendingInvitesCardProps) {
  const { t } = useTranslation();
  const { invites, acceptInvite, declineInvite } = usePendingInvites();

  if (invites.length === 0) return null;

  const handleAccept = async (inviteId: string) => {
    await acceptInvite(inviteId);
    onInviteAccepted?.();
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-primary">
          {t("coParent.pendingInvites")} ({invites.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={invite.dog_photo_url || ""} />
              <AvatarFallback className="bg-muted">
                <Dog className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{invite.dog_name}</p>
              <p className="text-xs text-muted-foreground">
                {t("coParent.invitedBy", { name: invite.inviter_name })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => declineInvite(invite.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAccept(invite.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
