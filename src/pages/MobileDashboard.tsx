import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Network } from "@capacitor/network";
import { App } from "@capacitor/app";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Recycle, LogOut, QrCode, Users, Settings, Briefcase, 
  Clock, Wifi, WifiOff 
} from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCollectionOfflineSync } from "@/hooks/useCollectionOfflineSync";
import { useHROfflineSync } from "@/hooks/useHROfflineSync";
import { getCachedProfile, clearCacheOnLogout } from "@/lib/offlineDb";
import CollectionsTab from "@/components/dashboard/CollectionsTab";
import ClientsTab from "@/components/dashboard/ClientsTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import MobileHRTab from "@/components/dashboard/MobileHRTab";
import PendingTab from "@/components/dashboard/PendingTab";

const MobileDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnline, connectionType } = useOnlineStatus();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isFirstRender = useRef(true);
  const [pendingRefreshTrigger, setPendingRefreshTrigger] = useState(0);

  // Callback to refresh PendingTab when a new pending item is added
  const handlePendingItemAdded = () => {
    setPendingRefreshTrigger(prev => prev + 1);
  };

  // Sync dropdown data for offline use (Collections)
  const { 
    clients: cachedClients, 
    trucks: cachedTrucks, 
    drivers: cachedDrivers, 
    helpers: cachedHelpers,
    isSyncing,
    isSyncingPending,
    lastSyncedAt,
    lastPendingSyncResult,
    syncDropdownData,
  } = useCollectionOfflineSync({ isOnline, profile });

  // Sync HR data for offline use (called at app level so data is ready when visiting HR tab)
  const hrSync = useHROfflineSync({ 
    isOnline, 
    profile: profile || { user_id: 'temp' } 
  });

  const wasSyncing = useRef(false);
  const lastResumeSync = useRef<Date | null>(null);

  // Sync data when app resumes from background (to keep data fresh)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppStateChange = async (state: { isActive: boolean }) => {
      if (state.isActive && isOnline && profile) {
        // App became active (resumed from background)
        const now = new Date();
        const lastSync = lastResumeSync.current;
        
        // Only sync if at least 5 minutes have passed since last resume sync
        // This prevents excessive syncing if user rapidly switches apps
        const minSyncInterval = 5 * 60 * 1000; // 5 minutes
        
        if (!lastSync || (now.getTime() - lastSync.getTime()) > minSyncInterval) {
          lastResumeSync.current = now;
          
          // Trigger sync for both Collections and HR data
          syncDropdownData();
          hrSync.syncHRData();
        }
      }
    };

    const listener = App.addListener('appStateChange', handleAppStateChange);

    return () => {
      listener.then(l => l.remove());
    };
  }, [isOnline, profile, syncDropdownData, hrSync.syncHRData]);

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
        description: "Data synced for Collections and HR pages",
      });
    }
    wasSyncing.current = isSyncing;
  }, [isSyncing, cachedClients.length, cachedTrucks.length, cachedDrivers.length]);

  // Show toast when pending items sync completes
  useEffect(() => {
    if (lastPendingSyncResult && (lastPendingSyncResult.synced > 0 || lastPendingSyncResult.failed > 0)) {
      if (lastPendingSyncResult.failed === 0) {
        toast({
          title: "Pending Items Synced",
          description: `Successfully uploaded ${lastPendingSyncResult.synced} pending item(s)`,
        });
      } else if (lastPendingSyncResult.synced === 0) {
        toast({
          title: "Sync Failed",
          description: `Failed to sync ${lastPendingSyncResult.failed} pending item(s)`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Partial Sync",
          description: `Synced ${lastPendingSyncResult.synced}, failed ${lastPendingSyncResult.failed} item(s)`,
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
          {/* MERGE: Combining the two TabsList structures */}
          <div className="px-3 pt-3">
            {/* Using a grid-cols-5 if all tabs are needed, otherwise, make it dynamic/conditional */}
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="collections" className="text-xs">
                <QrCode className="h-4 w-4 mr-1" />
                Collections
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">
                <Clock className="h-4 w-4 mr-1" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="clients" className="text-xs">
                <Users className="h-4 w-4 mr-1" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="hr" className="text-xs">
                <Briefcase className="h-4 w-4 mr-1" />
                HR
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Settings className="h-4 w-4 mr-1" />
                Settings
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
              <PendingTab 
                isOnline={isOnline} 
                profile={profile} 
                refreshTrigger={pendingRefreshTrigger}
                lastSyncResult={lastPendingSyncResult}
                lastHRSyncResult={hrSync.lastPendingSyncResult}
              />
            </TabsContent>
            {/* Content for Clients Tab (from caching-and-pagination) */}
            <TabsContent value="clients" className="mt-0">
              <ClientsTab profile={profile} />
            </TabsContent>
            {/* Content for HR Tab (from caching-and-pagination) */}
            <TabsContent value="hr" className="mt-0">
              <MobileHRTab 
                profile={profile} 
                isOnline={isOnline} 
                hrSync={hrSync}
                onPendingItemAdded={handlePendingItemAdded}
              />
            </TabsContent>
            {/* Content for Settings Tab (from caching-and-pagination) */}
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
