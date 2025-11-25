import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Recycle, LogOut, QrCode, Users, Truck, UserCog, BarChart3, Settings, Calendar, Wrench, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Lazy load tab components for better performance
const CollectionsTab = lazy(() => import("@/components/dashboard/CollectionsTab"));
const ClientsTab = lazy(() => import("@/components/dashboard/ClientsTab"));
const TrucksTab = lazy(() => import("@/components/dashboard/TrucksTab"));
const DriversHelpersTab = lazy(() => import("@/components/dashboard/DriversHelpersTab"));
const SchedulingTab = lazy(() => import("@/components/dashboard/SchedulingTab"));
const EnhancedAnalyticsTab = lazy(() => import("@/components/dashboard/EnhancedAnalyticsTab"));
const EnhancedSettingsTab = lazy(() => import("@/components/dashboard/EnhancedSettingsTab"));
const MechanicsTab = lazy(() => import("@/components/dashboard/MechanicsTab").then(m => ({ default: m.MechanicsTab })));
const HRTab = lazy(() => import("@/components/dashboard/HRTab").then(m => ({ default: m.HRTab })));

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
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Recycle className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">WasteWise</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {profile?.full_name} <span className="text-xs">({profile?.role})</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-[1400px]">
        <Tabs defaultValue="collections" className="space-y-6">
          <TabsList className="inline-flex h-auto w-auto bg-muted/50 p-1 rounded-lg gap-1">
            <TabsTrigger value="collections" className="gap-2 data-[state=active]:bg-background">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">Collections</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2 data-[state=active]:bg-background">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="trucks" className="gap-2 data-[state=active]:bg-background">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Trucks</span>
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2 data-[state=active]:bg-background">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Personnel</span>
            </TabsTrigger>
            <TabsTrigger value="mechanics" className="gap-2 data-[state=active]:bg-background">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Mechanics</span>
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="gap-2 data-[state=active]:bg-background">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="hr" className="gap-2 data-[state=active]:bg-background hidden md:flex">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">HR</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-background">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-background">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <Suspense fallback={<div className="flex items-center justify-center p-8"><Recycle className="h-8 w-8 animate-spin text-primary" /></div>}>
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

            <TabsContent value="mechanics">
              <MechanicsTab />
            </TabsContent>

            <TabsContent value="hr" className="hidden md:block">
              <HRTab />
            </TabsContent>

            <TabsContent value="settings">
              <EnhancedSettingsTab profile={profile} />
            </TabsContent>
          </Suspense>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
