import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Recycle, LogOut, QrCode, Users, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CollectionsTab from "@/components/dashboard/CollectionsTab";
import ClientsTab from "@/components/dashboard/ClientsTab";
import SettingsTab from "@/components/dashboard/SettingsTab";

const MobileDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Recycle className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact Header for Mobile */}
      <header className="border-b bg-card shrink-0">
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Recycle className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold">WasteWise</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="h-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Tabs defaultValue="collections" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 shrink-0 mx-3 mt-3">
            <TabsTrigger value="collections" className="text-xs">
              <QrCode className="h-4 w-4 mr-1" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="clients" className="text-xs">
              <Users className="h-4 w-4 mr-1" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-3">
            <TabsContent value="collections" className="mt-0">
              <CollectionsTab profile={profile} />
            </TabsContent>
            <TabsContent value="clients" className="mt-0">
              <ClientsTab profile={profile} />
            </TabsContent>
            <TabsContent value="settings" className="mt-0">
              <SettingsTab profile={profile} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default MobileDashboard;
