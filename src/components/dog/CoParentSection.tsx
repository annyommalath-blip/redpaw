import { useState } from "react";
import { Users, Plus, X, Crown, UserCheck, Clock, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDogMembers, DogMember } from "@/hooks/useDogMembers";
import { useAuth } from "@/hooks/useAuth";

interface CoParentSectionProps {
  dogId: string;
  dogName: string;
  ownerId: string;
}

export function CoParentSection({ dogId, dogName, ownerId }: CoParentSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { members, loading, inviteMember, removeMember } = useDogMembers(dogId);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingMember, setRemovingMember] = useState<DogMember | null>(null);

  const isOwner = user?.id === ownerId;
  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "invited");

  const getMemberName = (member: DogMember | null) => {
    if (!member) return t("coParent.unknownUser");
    if (member.profile?.first_name && member.profile?.last_name) {
      return `${member.profile.first_name} ${member.profile.last_name}`.trim();
    }
    return member.profile?.display_name || t("coParent.unknownUser");
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const success = await inviteMember(inviteEmail.trim());
    if (success) {
      setInviteEmail("");
      setInviteDialogOpen(false);
    }
    setInviting(false);
  };

  const handleRemove = async () => {
    if (!removingMember) return;
    await removeMember(removingMember.id);
    setRemovingMember(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            {t("coParent.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Owner */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10">
                  <Crown className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {user?.id === ownerId ? t("coParent.you") : t("coParent.owner")}
              </p>
              <p className="text-xs text-muted-foreground">{t("coParent.primaryOwner")}</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {t("coParent.owner")}
            </Badge>
          </div>

          {/* Active Co-Parents */}
          {activeMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.profile?.avatar_url || ""} />
                <AvatarFallback className="bg-muted">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {member.user_id === user?.id ? t("coParent.you") : getMemberName(member)}
                </p>
                <p className="text-xs text-muted-foreground">{t("coParent.coParent")}</p>
              </div>
              {isOwner && member.user_id !== user?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setRemovingMember(member)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {/* Pending Invites */}
          {pendingMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3 opacity-60">
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.profile?.avatar_url || ""} />
                <AvatarFallback className="bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{getMemberName(member)}</p>
                <p className="text-xs text-muted-foreground">{t("coParent.pendingInvite")}</p>
              </div>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setRemovingMember(member)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {/* Invite Button - Only for Owner */}
          {isOwner && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("coParent.inviteCoParent")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("coParent.inviteCoParent")}</DialogTitle>
                  <DialogDescription>
                    {t("coParent.inviteDescription", { dogName })}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("coParent.emailAddress")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("coParent.emailPlaceholder")}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("coParent.inviteHintEmail")}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                    {inviting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {t("coParent.sendInvite")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removingMember?.status === "invited"
                ? t("coParent.cancelInvite")
                : t("coParent.removeCoParent")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removingMember?.status === "invited"
                ? t("coParent.cancelInviteDesc", { name: getMemberName(removingMember) })
                : t("coParent.removeCoParentDesc", { name: getMemberName(removingMember!) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingMember?.status === "invited" ? t("coParent.cancelInvite") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
