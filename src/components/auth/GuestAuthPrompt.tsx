import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogIn, UserPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";

interface GuestAuthPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestAuthPrompt({ open, onOpenChange }: GuestAuthPromptProps) {
  const navigate = useNavigate();
  const { exitGuestMode } = useAuthContext();

  const handleGoToAuth = () => {
    onOpenChange(false);
    exitGuestMode();
    navigate("/auth");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-lg">
            Sign in to continue
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Create an account or sign in to post, message, and connect with other dog parents.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button className="rounded-xl" onClick={handleGoToAuth}>
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={handleGoToAuth}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
        </div>
        <AlertDialogCancel className="rounded-xl mt-1">Not now</AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>
  );
}
