import { Link } from "react-router-dom";
import { PlusCircle, AlertTriangle, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  isLost?: boolean;
  onToggleLost?: () => void;
}

export function QuickActions({ isLost, onToggleLost }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Link to="/create?type=log">
        <Button
          variant="outline"
          className="w-full h-auto flex-col gap-2 py-4 rounded-xl bg-card hover:bg-accent"
        >
          <PlusCircle className="h-6 w-6 text-primary" />
          <span className="text-xs font-medium">Add Log</span>
        </Button>
      </Link>

      <Button
        variant="outline"
        className={`w-full h-auto flex-col gap-2 py-4 rounded-xl ${
          isLost
            ? "bg-lost text-lost-foreground border-lost hover:bg-lost/90"
            : "bg-card hover:bg-accent"
        }`}
        onClick={onToggleLost}
      >
        <AlertTriangle className={`h-6 w-6 ${isLost ? "" : "text-lost"}`} />
        <span className="text-xs font-medium">
          {isLost ? "End Lost" : "Lost Mode"}
        </span>
      </Button>

      <Link to="/create?type=care">
        <Button
          variant="outline"
          className="w-full h-auto flex-col gap-2 py-4 rounded-xl bg-card hover:bg-accent"
        >
          <HandHeart className="h-6 w-6 text-success" />
          <span className="text-xs font-medium">Care Request</span>
        </Button>
      </Link>
    </div>
  );
}
