import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface MobileLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function MobileLayout({ children, hideNav = false }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className={cn("flex-1", !hideNav && "pb-20")}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
