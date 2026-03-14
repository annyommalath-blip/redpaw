import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConversation } from "@/hooks/useConversation";
import { Loader2 } from "lucide-react";

export default function NewConversation() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { openConversation } = useConversation();

  useEffect(() => {
    if (!userId) {
      navigate("/messages", { replace: true });
      return;
    }

    openConversation(userId).catch(() => {
      navigate("/messages", { replace: true });
    });
  }, [userId]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
