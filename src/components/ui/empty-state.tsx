import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <GlassCard 
      variant="light" 
      className={cn("animate-fade-in", className)}
    >
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {/* Icon container with subtle gradient */}
        <div className="relative mb-5">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <div className="text-muted-foreground">
              {icon}
            </div>
          </div>
          {/* Decorative paw */}
          <span className="absolute -bottom-1 -right-1 text-2xl opacity-40">
            🐾
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        
        {description && (
          <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
            {description}
          </p>
        )}
        
        {action && (
          <Button 
            onClick={action.onClick}
            className="btn-glow"
          >
            {action.label}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
