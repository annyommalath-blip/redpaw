import { PawPrint } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import welcomePoster from "@/assets/welcome-poster.jpg";

export default function WelcomePost() {
  return (
    <GlassCard variant="light" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 pb-2">
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
          <PawPrint className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground">RedPaw</span>
            <span className="text-xs text-primary">✓ Official</span>
          </div>
          <p className="text-xs text-muted-foreground">Welcome to the community</p>
        </div>
      </div>

      {/* Caption */}
      <div className="px-3 pb-2">
        <p className="text-sm text-foreground">
          Welcome to <span className="font-semibold text-primary">RedPaw</span>! 🐾 We're so happy you're here. Share moments with your furry friends, find trusted sitters, and connect with dog lovers near you. Let's make tails wag together! 🐶❤️
        </p>
      </div>

      {/* Poster */}
      <div className="w-full bg-muted">
        <img
          src={welcomePoster}
          alt="Welcome to RedPaw"
          className="w-full object-cover"
          style={{ aspectRatio: "4/5" }}
        />
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5">
        <p className="text-xs text-muted-foreground text-center">
          📸 Add your dog · 🏠 Find a sitter · 🐕 Join the pack
        </p>
      </div>
    </GlassCard>
  );
}
