import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function MobileLayout({ children, hideNav = false }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-redpaw flex flex-col">
      <main className={cn("flex-1", !hideNav && "pb-24")}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
