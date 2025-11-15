import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Recycle, LogOut, QrCode, Users, Truck, UserCog, BarChart3, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CollectionsTab from "@/components/dashboard/CollectionsTab";
import ClientsTab from "@/components/dashboard/ClientsTab";
import TrucksTab from "@/components/dashboard/TrucksTab";
import DriversHelpersTab from "@/components/dashboard/DriversHelpersTab";
import AnalyticsTab from "@/components/dashboard/AnalyticsTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import SchedulingTab from "@/components/dashboard/SchedulingTab";
import EnhancedAnalyticsTab from "@/components/dashboard/EnhancedAnalyticsTab";
import EnhancedSettingsTab from "@/components/dashboard/EnhancedSettingsTab";

const Dashboard = () => {
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Recycle className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Recycle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">WasteWise</h1>
              <p className="text-xs text-muted-foreground">Waste Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <Tabs defaultValue="collections" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="collections">
              <QrCode className="mr-2 h-4 w-4" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Users className="mr-2 h-4 w-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="trucks">
              <Truck className="mr-2 h-4 w-4" />
              Trucks
            </TabsTrigger>
            <TabsTrigger value="drivers">
              <UserCog className="mr-2 h-4 w-4" />
              Drivers & Helpers
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections">
            <CollectionsTab profile={profile} />
          </TabsContent>

          <TabsContent value="clients">
            <ClientsTab profile={profile} />
          </TabsContent>

          <TabsContent value="trucks">
            <TrucksTab profile={profile} />
          </TabsContent>

          <TabsContent value="drivers">
            <DriversHelpersTab profile={profile} />
          </TabsContent>

          <TabsContent value="scheduling">
            <SchedulingTab profile={profile} />
          </TabsContent>

          <TabsContent value="analytics">
            <EnhancedAnalyticsTab profile={profile} />
          </TabsContent>

          <TabsContent value="settings">
            <EnhancedSettingsTab profile={profile} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
