import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  offlineDb,
  setCachedProfile,
  getCachedProfile,
  type CachedClient,
  type CachedTruck,
  type CachedDriver,
  type CachedHelper,
  type CachedProfile,
  type PendingCollection,
} from '@/lib/offlineDb';

interface UseCollectionOfflineSyncProps {
  isOnline: boolean;
  profile: any;
}

interface SyncResult {
  synced: number;
  failed: number;
}

interface UseCollectionOfflineSyncReturn {
  clients: CachedClient[];
  trucks: CachedTruck[];
  drivers: CachedDriver[];
  helpers: CachedHelper[];
  cachedProfile: CachedProfile | null;
  isSyncing: boolean;
  isSyncingPending: boolean;
  lastSyncedAt: Date | null;
  lastPendingSyncResult: SyncResult | null;
  syncDropdownData: () => Promise<void>;
  syncPendingCollections: () => Promise<SyncResult>;
}

/**
 * Hook to sync Collection tab data from Supabase to Dexie for offline use
 */
export function useCollectionOfflineSync({ isOnline, profile }: UseCollectionOfflineSyncProps): UseCollectionOfflineSyncReturn {
  const [clients, setClients] = useState<CachedClient[]>([]);
  const [trucks, setTrucks] = useState<CachedTruck[]>([]);
  const [drivers, setDrivers] = useState<CachedDriver[]>([]);
  const [helpers, setHelpers] = useState<CachedHelper[]>([]);
  const [cachedProfile, setCachedProfileState] = useState<CachedProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingPending, setIsSyncingPending] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastPendingSyncResult, setLastPendingSyncResult] = useState<SyncResult | null>(null);
  const wasOnline = useRef(isOnline);

  // Load cached data from Dexie on mount
  const loadCachedData = useCallback(async () => {
    try {
      const [
        cachedClients,
        cachedTrucks,
        cachedDrivers,
        cachedHelpers,
        cachedProf,
        syncMeta
      ] = await Promise.all([
        offlineDb.clients.toArray(),
        offlineDb.trucks.toArray(),
        offlineDb.drivers.toArray(),
        offlineDb.helpers.toArray(),
        getCachedProfile(),
        offlineDb.syncMetadata.get('dropdown_sync')
      ]);

      setClients(cachedClients);
      setTrucks(cachedTrucks);
      setDrivers(cachedDrivers);
      setHelpers(cachedHelpers);
      setCachedProfileState(cachedProf || null);
      setLastSyncedAt(syncMeta?.last_synced_at || null);
    } catch (error) {
      // Silent fail - cache might not exist yet
    }
  }, []);

  // Sync dropdown data from Supabase to Dexie
  // Use ref to track if sync is in progress (prevents concurrent syncs)
  const isSyncingRef = useRef(false);

  const syncDropdownData = useCallback(async () => {
    if (!isOnline) return;
    if (isSyncingRef.current) return; // Already syncing, skip

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      // Fetch ALL needed fields for both Collections and HR (single source of truth)
      const [clientsRes, trucksRes, driversRes, helpersRes] = await Promise.all([
        supabase.from('clients').select('id, name, industry, address, qr_code, contact_person, contact_number').order('name'),
        supabase.from('trucks').select('id, code, type, plate_number'),
        supabase.from('drivers').select('id, name, contact_number, status, birthdate, leaves_available, id_number'),
        supabase.from('helpers').select('id, name, contact_number, status, birthdate, leaves_available, id_number'),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (trucksRes.error) throw trucksRes.error;
      if (driversRes.error) throw driversRes.error;
      if (helpersRes.error) throw helpersRes.error;

      await offlineDb.transaction('rw', 
        [offlineDb.clients, offlineDb.trucks, offlineDb.drivers, offlineDb.helpers, offlineDb.syncMetadata],
        async () => {
          await Promise.all([
            offlineDb.clients.clear(),
            offlineDb.trucks.clear(),
            offlineDb.drivers.clear(),
            offlineDb.helpers.clear(),
          ]);

          if (clientsRes.data?.length) {
            await offlineDb.clients.bulkAdd(clientsRes.data as CachedClient[]);
          }
          if (trucksRes.data?.length) {
            await offlineDb.trucks.bulkAdd(trucksRes.data as CachedTruck[]);
          }
          if (driversRes.data?.length) {
            await offlineDb.drivers.bulkAdd(driversRes.data as CachedDriver[]);
          }
          if (helpersRes.data?.length) {
            await offlineDb.helpers.bulkAdd(helpersRes.data as CachedHelper[]);
          }

          await offlineDb.syncMetadata.put({
            id: 'dropdown_sync',
            last_synced_at: new Date()
          });
        }
      );

      setClients(clientsRes.data || []);
      setTrucks(trucksRes.data || []);
      setDrivers(driversRes.data || []);
      setHelpers(helpersRes.data || []);
      setLastSyncedAt(new Date());

    } catch (error) {
      // Silent fail - will retry on next online
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Cache user profile when it changes
  useEffect(() => {
    const cacheProfile = async () => {
      if (profile && isOnline) {
        try {
          await setCachedProfile({
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            role: profile.role,
            user_type: profile.user_type,
          });
          setCachedProfileState({
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            role: profile.role,
            user_type: profile.user_type,
            cached_at: new Date(),
          });
        } catch (error) {
          // Silent fail
        }
      }
    };

    cacheProfile();
  }, [profile, isOnline]);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  // Sync pending collections to Supabase
  const syncPendingCollections = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncingPending(true);
    let synced = 0;
    let failed = 0;

    try {
      // Get all pending and failed collections
      const pendingItems = await offlineDb.pendingCollections
        .where('status')
        .anyOf(['pending', 'failed'])
        .toArray();

      if (pendingItems.length === 0) {
        setIsSyncingPending(false);
        return { synced: 0, failed: 0 };
      }

      // Process each pending collection
      for (const item of pendingItems) {
        try {
          // Update status to syncing
          await offlineDb.pendingCollections.update(item.id, { status: 'syncing' });

          // Generate QR code for the receipt
          const receiptQR = `RECEIPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Insert into Supabase
          const { error } = await supabase
            .from('collection_receipts')
            .insert({
              client_id: item.client_id,
              truck_id: item.truck_id,
              driver_id: item.driver_id,
              helper_ids: item.helper_ids,
              items: item.items,
              tally_entries: item.tally_entries,
              waste_types: item.waste_types,
              qr_code: receiptQR,
              signed_by: item.signed_by,
              signature_data: null,
              created_by: item.user_id,
            });

          if (error) throw error;

          // Success - mark as completed (not delete)
          await offlineDb.pendingCollections.update(item.id, { 
            status: 'completed', 
            error_message: undefined 
          });
          synced++;

        } catch (error: any) {
          // Failed - update status and error message
          await offlineDb.pendingCollections.update(item.id, { 
            status: 'failed', 
            error_message: error.message || 'Sync failed' 
          });
          failed++;
        }
      }

    } catch (error) {
      // Silent fail on overall error
    } finally {
      setIsSyncingPending(false);
      setLastPendingSyncResult({ synced, failed });
    }

    return { synced, failed };
  }, [isOnline]);

  // Auto-sync dropdown data when coming online (and profile exists)
  useEffect(() => {
    if (isOnline && profile) {
      syncDropdownData();
    }
  }, [isOnline, profile, syncDropdownData]);

  // Auto-sync pending collections when coming back online
  useEffect(() => {
    // Detect transition from offline to online
    if (isOnline && !wasOnline.current && profile) {
      syncPendingCollections();
    }
    wasOnline.current = isOnline;
  }, [isOnline, profile, syncPendingCollections]);

  return {
    clients,
    trucks,
    drivers,
    helpers,
    cachedProfile,
    isSyncing,
    isSyncingPending,
    lastSyncedAt,
    lastPendingSyncResult,
    syncDropdownData,
    syncPendingCollections,
  };
}

// Keep backward compatibility alias
export const useOfflineSync = useCollectionOfflineSync;

