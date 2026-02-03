import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "rounded-2xl bg-muted/50 relative overflow-hidden",
        className
      )} 
      {...props}
    >
      <div 
        className="absolute inset-0 -translate-x-full animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--background) / 0.4), transparent)',
        }}
      />
    </div>
  );
}

export { Skeleton };
