import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  showBack = false, 
  onBack, 
  action,
  className 
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 glass-nav safe-area-top",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="shrink-0 rounded-xl hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}
