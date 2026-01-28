import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Dog, Settings, LogOut, Edit, Camera } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Mock dog data
const mockDog = {
  id: "1",
  name: "Max",
  breed: "Golden Retriever",
  age: "3 years",
  weight: "65 lbs",
  photoUrl: "",
};

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [dog] = useState(mockDog);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    } else {
      toast({
        title: "Signed out",
        description: "See you soon! 🐾",
      });
      navigate("/auth");
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="Profile" subtitle="Manage your account" />

      <div className="p-4 space-y-6">
        {/* User Profile Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                >
                  <Camera className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {user?.email?.split("@")[0] || "Dog Lover"}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* My Dogs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              My Dogs
            </h2>
            <Button variant="ghost" size="sm">
              Add Dog
            </Button>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                  {dog.photoUrl ? (
                    <img src={dog.photoUrl} alt={dog.name} className="h-full w-full object-cover" />
                  ) : (
                    <Dog className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{dog.name}</h3>
                  <p className="text-sm text-muted-foreground">{dog.breed}</p>
                  <p className="text-xs text-muted-foreground">{dog.age} • {dog.weight}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => navigate("/profile/edit-dog")}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Settings */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Settings
          </h2>
          <Card>
            <CardContent className="p-0">
              <button className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">App Settings</span>
              </button>
              <Separator />
              <button
                className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </CardContent>
          </Card>
        </section>

        {/* App Info */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>RedPaw v1.0.0 🐾</p>
          <p className="mt-1">Made with ❤️ for dog lovers</p>
        </div>
      </div>
    </MobileLayout>
  );
}
