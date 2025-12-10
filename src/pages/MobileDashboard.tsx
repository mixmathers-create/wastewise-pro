import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Network } from "@capacitor/network";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Recycle, LogOut, QrCode, Clock, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { getCachedProfile, clearCacheOnLogout } from "@/lib/offlineDb";
import CollectionsTab from "@/components/dashboard/CollectionsTab";
import PendingTab from "@/components/dashboard/PendingTab";
// Commented out for offline mode - only Collections and Pending tabs
// import ClientsTab from "@/components/dashboard/ClientsTab";
// import SettingsTab from "@/components/dashboard/SettingsTab";

const MobileDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnline, connectionType } = useOnlineStatus();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isFirstRender = useRef(true);

  // Sync dropdown data for offline use
  const { 
    clients: cachedClients, 
    trucks: cachedTrucks, 
    drivers: cachedDrivers, 
    helpers: cachedHelpers,
    isSyncing,
    isSyncingPending,
    lastSyncedAt,
    lastPendingSyncResult,
  } = useOfflineSync({ isOnline, profile });

  const wasSyncing = useRef(false);

  // Show toast when online/offline status changes
  useEffect(() => {
    // Skip the first render to avoid showing toast on initial load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isOnline) {
      toast({
        title: "Back Online",
        description: `Connected via ${connectionType}`,
      });
    } else {
      toast({
        title: "You're Offline",
        description: "Collections will be saved locally",
        variant: "destructive",
      });
    }
  }, [isOnline]);

  // Show toast when offline mode becomes ready (sync complete)
  useEffect(() => {
    // Check if sync just completed (was syncing, now not syncing)
    if (wasSyncing.current && !isSyncing && cachedClients.length > 0) {
      toast({
        title: "Offline Mode Ready",
        description: `Synced ${cachedClients.length} clients, ${cachedTrucks.length} trucks, ${cachedDrivers.length} drivers`,
      });
    }
    wasSyncing.current = isSyncing;
  }, [isSyncing, cachedClients.length, cachedTrucks.length, cachedDrivers.length]);

  // Show toast when pending collections sync completes
  useEffect(() => {
    if (lastPendingSyncResult && (lastPendingSyncResult.synced > 0 || lastPendingSyncResult.failed > 0)) {
      if (lastPendingSyncResult.failed === 0) {
        toast({
          title: "Collections Synced",
          description: `Successfully uploaded ${lastPendingSyncResult.synced} collection(s)`,
        });
      } else if (lastPendingSyncResult.synced === 0) {
        toast({
          title: "Sync Failed",
          description: `Failed to sync ${lastPendingSyncResult.failed} collection(s)`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Partial Sync",
          description: `Synced ${lastPendingSyncResult.synced}, failed ${lastPendingSyncResult.failed}`,
          variant: "destructive",
        });
      }
    }
  }, [lastPendingSyncResult]);



  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const networkStatus = await Network.getStatus();
      const isCurrentlyOnline = networkStatus.connected;

      if (isCurrentlyOnline) {
        // ONLINE: Use getUser() for full verification + fetch fresh profile
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
        
      } else {
        // OFFLINE: Use getSession() (localStorage) + cached profile from Dexie
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Please connect to internet",
            description: "You need to login online at least once",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        setUser(session.user);

        const cachedProf = await getCachedProfile();
        
        if (!cachedProf) {
          toast({
            title: "No offline data",
            description: "Please connect to internet to sync data first",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        setProfile({
          id: cachedProf.id,
          user_id: cachedProf.user_id,
          full_name: cachedProf.full_name,
          email: cachedProf.email,
          role: cachedProf.role,
          user_type: cachedProf.user_type,
        });
      }
      
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
    await clearCacheOnLogout();
    
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
        </div>npx
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
          <div className="flex items-center gap-2">
            {/* Online/Offline indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="h-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Tabs defaultValue="collections" className="h-full flex flex-col">
          <div className="px-3 pt-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="collections" className="text-xs">
                <QrCode className="h-4 w-4 mr-1" />
                Collections
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">
                <Clock className="h-4 w-4 mr-1" />
                Pending
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-3">
            <TabsContent value="collections" className="mt-0">
              <CollectionsTab 
                profile={profile} 
                isOnline={isOnline}
                cachedClients={cachedClients}
                cachedTrucks={cachedTrucks}
                cachedDrivers={cachedDrivers}
                cachedHelpers={cachedHelpers}
              />
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              <PendingTab isOnline={isOnline} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default MobileDashboard;
