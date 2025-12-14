import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  offlineDb,
  generateLocalId,
  getPendingHRItemsCount,
  type CachedTruck,
  type CachedMechanic,
  type CachedRecycler,
  type CachedManagement,
  type CachedTimeLog,
  type CachedLeave,
  type CachedDriverExtended,
  type CachedHelperExtended,
  type PendingTimeIn,
  type PendingTimeOut,
  type PendingLeaveRequest,
  type PendingIncidentReport,
  type PendingMechanicalReport,
  type TimeInPersonnel,
  type Severity,
} from '@/lib/offlineDb';

// ============================================
// Types
// ============================================

interface UseHROfflineSyncProps {
  isOnline: boolean;
  profile: any;
}

interface SyncResult {
  synced: number;
  failed: number;
}

interface PendingCounts {
  timeIns: number;
  timeOuts: number;
  leaveRequests: number;
  incidentReports: number;
  mechanicalReports: number;
  total: number;
}

export interface UseHROfflineSyncReturn {
  // Cached data for dropdowns/display
  trucks: CachedTruck[];
  drivers: CachedDriverExtended[];
  helpers: CachedHelperExtended[];
  mechanics: CachedMechanic[];
  recyclers: CachedRecycler[];
  management: CachedManagement[];
  
  // Cached read-only data
  cachedTimeLogs: CachedTimeLog[];
  cachedLeaves: CachedLeave[];
  
  // Pending items (for display in UI)
  pendingTimeIns: PendingTimeIn[];
  pendingTimeOuts: PendingTimeOut[];
  pendingLeaveRequests: PendingLeaveRequest[];
  pendingIncidentReports: PendingIncidentReport[];
  pendingMechanicalReports: PendingMechanicalReport[];
  pendingCounts: PendingCounts;
  
  // Status
  isSyncing: boolean;
  isSyncingPending: boolean;
  lastSyncedAt: Date | null;
  lastPendingSyncResult: SyncResult | null;
  
  // Actions - Sync
  syncHRData: () => Promise<void>;
  syncPendingHRItems: () => Promise<SyncResult>;
  
  // Actions - Create pending items (offline-capable)
  createPendingTimeIn: (data: Omit<PendingTimeIn, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  createPendingTimeOut: (data: Omit<PendingTimeOut, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  createPendingLeaveRequest: (data: Omit<PendingLeaveRequest, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  createPendingIncidentReport: (data: Omit<PendingIncidentReport, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  createPendingMechanicalReport: (data: Omit<PendingMechanicalReport, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  
  // Actions - Refresh
  refreshPendingItems: () => Promise<void>;
}

// ============================================
// Hook Implementation
// ============================================

export function useHROfflineSync({ isOnline, profile }: UseHROfflineSyncProps): UseHROfflineSyncReturn {
  // Cached dropdown data
  const [trucks, setTrucks] = useState<CachedTruck[]>([]);
  const [drivers, setDrivers] = useState<CachedDriverExtended[]>([]);
  const [helpers, setHelpers] = useState<CachedHelperExtended[]>([]);
  const [mechanics, setMechanics] = useState<CachedMechanic[]>([]);
  const [recyclers, setRecyclers] = useState<CachedRecycler[]>([]);
  const [management, setManagement] = useState<CachedManagement[]>([]);
  
  // Cached read-only data
  const [cachedTimeLogs, setCachedTimeLogs] = useState<CachedTimeLog[]>([]);
  const [cachedLeaves, setCachedLeaves] = useState<CachedLeave[]>([]);
  
  // Pending items
  const [pendingTimeIns, setPendingTimeIns] = useState<PendingTimeIn[]>([]);
  const [pendingTimeOuts, setPendingTimeOuts] = useState<PendingTimeOut[]>([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<PendingLeaveRequest[]>([]);
  const [pendingIncidentReports, setPendingIncidentReports] = useState<PendingIncidentReport[]>([]);
  const [pendingMechanicalReports, setPendingMechanicalReports] = useState<PendingMechanicalReport[]>([]);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({
    timeIns: 0, timeOuts: 0, leaveRequests: 0, incidentReports: 0, mechanicalReports: 0, total: 0
  });
  
  // Status
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingPending, setIsSyncingPending] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastPendingSyncResult, setLastPendingSyncResult] = useState<SyncResult | null>(null);
  
  const wasOnline = useRef(isOnline);

  // ============================================
  // Load cached data from Dexie on mount
  // ============================================
  
  const loadCachedData = useCallback(async () => {
    try {
      const [
        cachedTrucks,
        cachedDrivers,
        cachedHelpers,
        cachedMechanics,
        cachedRecyclers,
        cachedManagement,
        cachedLogs,
        cachedLeaveData,
        syncMeta
      ] = await Promise.all([
        offlineDb.trucks.toArray(),
        offlineDb.drivers.toArray(),
        offlineDb.helpers.toArray(),
        offlineDb.mechanics.toArray(),
        offlineDb.recyclers.toArray(),
        offlineDb.management.toArray(),
        offlineDb.cachedTimeLogs.toArray(),
        offlineDb.cachedLeaves.toArray(),
        offlineDb.syncMetadata.get('hr_sync')
      ]);

      setTrucks(cachedTrucks);
      // Cast to extended types - Dexie stores all fields even if only some are indexed
      setDrivers(cachedDrivers as CachedDriverExtended[]);
      setHelpers(cachedHelpers as CachedHelperExtended[]);
      setMechanics(cachedMechanics);
      setRecyclers(cachedRecyclers);
      setManagement(cachedManagement);
      setCachedTimeLogs(cachedLogs);
      setCachedLeaves(cachedLeaveData);
      setLastSyncedAt(syncMeta?.last_synced_at || null);
    } catch (error) {
      console.error('Error loading cached HR data:', error);
    }
  }, []);

  // ============================================
  // Load pending items from Dexie
  // ============================================
  
  const refreshPendingItems = useCallback(async () => {
    try {
      const userId = profile?.user_id;
      
      const [timeIns, timeOuts, leaves, incidents, mechanical, counts] = await Promise.all([
        offlineDb.pendingTimeIns.where('status').anyOf(['pending', 'failed']).toArray(),
        offlineDb.pendingTimeOuts.where('status').anyOf(['pending', 'failed']).toArray(),
        offlineDb.pendingLeaveRequests.where('status').anyOf(['pending', 'failed']).toArray(),
        offlineDb.pendingIncidentReports.where('status').anyOf(['pending', 'failed']).toArray(),
        offlineDb.pendingMechanicalReports.where('status').anyOf(['pending', 'failed']).toArray(),
        getPendingHRItemsCount(userId),
      ]);

      setPendingTimeIns(timeIns);
      setPendingTimeOuts(timeOuts);
      setPendingLeaveRequests(leaves);
      setPendingIncidentReports(incidents);
      setPendingMechanicalReports(mechanical);
      setPendingCounts(counts);
    } catch (error) {
      console.error('Error refreshing pending items:', error);
    }
  }, [profile?.user_id]);

  // ============================================
  // Sync HR dropdown data from Supabase to Dexie
  // ============================================
  
  // Use ref to track if sync is in progress (prevents concurrent syncs)
  const isSyncingRef = useRef(false);

  const syncHRData = useCallback(async () => {
    if (!isOnline) return;
    if (isSyncingRef.current) return; // Already syncing, skip

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      // Only fetch HR-specific data (trucks, drivers, helpers are synced by useCollectionOfflineSync)
      const [
        mechanicsRes,
        recyclersRes,
        managementRes,
        timeLogsRes,
        leavesRes
      ] = await Promise.all([
        supabase.from('mechanics').select('id, name, contact_number, status, birthdate, leaves_available, id_number'),
        supabase.from('recyclers').select('id, name, contact_number, status, birthdate, leaves_available, id_number'),
        supabase.from('management').select('id, name, contact_number, status, birthdate, leaves_available, id_number'),
        supabase.from('personnel_time_logs')
          .select('id, personnel_id, personnel_name, personnel_type, time_in, time_out, photo_url, truck_id, latitude, longitude, group_session_id, trucks:truck_id(code)')
          .order('time_in', { ascending: false })
          .limit(100),
        supabase.from('leaves')
          .select('id, personnel_type, personnel_id, personnel_name, leave_type, start_date, end_date, reason, status, leave_days, is_paid, medical_certificate_url, created_at, reviewed_at, review_notes')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      // Check for errors
      if (mechanicsRes.error) throw mechanicsRes.error;
      if (recyclersRes.error) throw recyclersRes.error;
      if (managementRes.error) throw managementRes.error;

      // Transform time logs to include truck_code
      const transformedTimeLogs: CachedTimeLog[] = (timeLogsRes.data || []).map((log: any) => ({
        ...log,
        truck_code: log.trucks?.code || null,
        trucks: undefined, // Remove the nested object
      }));

      // Save HR-specific data to Dexie (trucks, drivers, helpers handled by Collection sync)
      await offlineDb.transaction('rw', 
        [offlineDb.mechanics, offlineDb.recyclers, offlineDb.management, 
         offlineDb.cachedTimeLogs, offlineDb.cachedLeaves, offlineDb.syncMetadata],
        async () => {
          // Clear and repopulate HR-specific tables only
          await Promise.all([
            offlineDb.mechanics.clear(),
            offlineDb.recyclers.clear(),
            offlineDb.management.clear(),
            offlineDb.cachedTimeLogs.clear(),
            offlineDb.cachedLeaves.clear(),
          ]);

          // Add HR-specific data
          if (mechanicsRes.data?.length) {
            await offlineDb.mechanics.bulkAdd(mechanicsRes.data as CachedMechanic[]);
          }
          if (recyclersRes.data?.length) {
            await offlineDb.recyclers.bulkAdd(recyclersRes.data as CachedRecycler[]);
          }
          if (managementRes.data?.length) {
            await offlineDb.management.bulkAdd(managementRes.data as CachedManagement[]);
          }
          if (transformedTimeLogs.length) {
            await offlineDb.cachedTimeLogs.bulkAdd(transformedTimeLogs);
          }
          if (leavesRes.data?.length) {
            await offlineDb.cachedLeaves.bulkAdd(leavesRes.data as CachedLeave[]);
          }

          // Update sync metadata
          await offlineDb.syncMetadata.put({
            id: 'hr_sync',
            last_synced_at: new Date()
          });
        }
      );

      // Read trucks, drivers, helpers from Dexie (synced by Collection sync)
      const [cachedTrucks, cachedDrivers, cachedHelpers] = await Promise.all([
        offlineDb.trucks.toArray(),
        offlineDb.drivers.toArray(),
        offlineDb.helpers.toArray(),
      ]);

      // Update state with all data
      setTrucks(cachedTrucks);
      setDrivers(cachedDrivers as CachedDriverExtended[]);
      setHelpers(cachedHelpers as CachedHelperExtended[]);
      setMechanics(mechanicsRes.data || []);
      setRecyclers(recyclersRes.data || []);
      setManagement(managementRes.data || []);
      setCachedTimeLogs(transformedTimeLogs);
      setCachedLeaves(leavesRes.data || []);
      setLastSyncedAt(new Date());

    } catch (error) {
      console.error('Error syncing HR data:', error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline]);

  // ============================================
  // Sync pending HR items to Supabase
  // ============================================
  
  const syncPendingHRItems = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncingPending(true);
    let synced = 0;
    let failed = 0;

    try {
      // Sync Time Ins
      const pendingTimeInsToSync = await offlineDb.pendingTimeIns
        .where('status').anyOf(['pending', 'failed']).toArray();
      
      for (const item of pendingTimeInsToSync) {
        try {
          await offlineDb.pendingTimeIns.update(item.id, { status: 'syncing' });

          // Upload photo if exists
          let photoUrl = null;
          if (item.photo_base64) {
            const photoBlob = await fetch(item.photo_base64).then(r => r.blob());
            const photoFileName = `time-logs/${item.group_session_id}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from('time-logs')
              .upload(photoFileName, photoBlob);
            
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('time-logs')
                .getPublicUrl(photoFileName);
              photoUrl = publicUrl;
            }
          }

          // Create time logs for each personnel
          const logs = item.personnel.map(p => ({
            personnel_id: p.id,
            personnel_type: p.type,
            personnel_name: p.name,
            time_in: item.created_at.toISOString(),
            photo_url: photoUrl,
            latitude: item.latitude,
            longitude: item.longitude,
            group_session_id: item.group_session_id,
            truck_id: item.truck_id
          }));

          const { error } = await supabase.from('personnel_time_logs').insert(logs);
          if (error) throw error;

          await offlineDb.pendingTimeIns.update(item.id, { status: 'completed' });
          synced++;
        } catch (error: any) {
          await offlineDb.pendingTimeIns.update(item.id, { 
            status: 'failed', 
            error_message: error.message 
          });
          failed++;
        }
      }

      // Sync Time Outs
      const pendingTimeOutsToSync = await offlineDb.pendingTimeOuts
        .where('status').anyOf(['pending', 'failed']).toArray();
      
      for (const item of pendingTimeOutsToSync) {
        try {
          await offlineDb.pendingTimeOuts.update(item.id, { status: 'syncing' });

          const { error } = await supabase
            .from('personnel_time_logs')
            .update({ time_out: item.time_out.toISOString() })
            .in('id', item.time_log_ids);

          if (error) throw error;

          await offlineDb.pendingTimeOuts.update(item.id, { status: 'completed' });
          synced++;
        } catch (error: any) {
          await offlineDb.pendingTimeOuts.update(item.id, { 
            status: 'failed', 
            error_message: error.message 
          });
          failed++;
        }
      }

      // Sync Leave Requests
      const pendingLeavesToSync = await offlineDb.pendingLeaveRequests
        .where('status').anyOf(['pending', 'failed']).toArray();
      
      for (const item of pendingLeavesToSync) {
        try {
          await offlineDb.pendingLeaveRequests.update(item.id, { status: 'syncing' });

          // Upload medical certificate if exists
          let medicalUrl = null;
          if (item.medical_certificate_base64) {
            const fileBlob = await fetch(item.medical_certificate_base64).then(r => r.blob());
            const fileName = `medical-certificates/${generateLocalId()}.pdf`;
            const { error: uploadError } = await supabase.storage
              .from('personnel-photos')
              .upload(fileName, fileBlob);
            
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('personnel-photos')
                .getPublicUrl(fileName);
              medicalUrl = publicUrl;
            }
          }

          const { error } = await supabase.from('leaves').insert({
            personnel_type: item.personnel_type,
            personnel_id: item.personnel_id,
            personnel_name: item.personnel_name,
            personnel_id_number: item.personnel_id_number,
            leave_type: item.leave_type,
            start_date: item.start_date,
            end_date: item.end_date,
            reason: item.reason,
            leave_days: item.leave_days,
            is_paid: item.is_paid,
            medical_certificate_url: medicalUrl,
            status: 'pending',
          });

          if (error) throw error;

          await offlineDb.pendingLeaveRequests.update(item.id, { status: 'completed' });
          synced++;
        } catch (error: any) {
          await offlineDb.pendingLeaveRequests.update(item.id, { 
            status: 'failed', 
            error_message: error.message 
          });
          failed++;
        }
      }

      // Sync Incident Reports
      const pendingIncidentsToSync = await offlineDb.pendingIncidentReports
        .where('status').anyOf(['pending', 'failed']).toArray();
      
      for (const item of pendingIncidentsToSync) {
        try {
          await offlineDb.pendingIncidentReports.update(item.id, { status: 'syncing' });

          const { error } = await supabase.from('incident_reports').insert({
            reported_by: item.user_id,
            reporter_name: item.reporter_name,
            incident_type: item.incident_type,
            incident_date: item.incident_date,
            incident_time: item.incident_time,
            location: item.location,
            description: item.description,
            severity: item.severity,
            photos: item.photos_base64,
          });

          if (error) throw error;

          await offlineDb.pendingIncidentReports.update(item.id, { status: 'completed' });
          synced++;
        } catch (error: any) {
          await offlineDb.pendingIncidentReports.update(item.id, { 
            status: 'failed', 
            error_message: error.message 
          });
          failed++;
        }
      }

      // Sync Mechanical Reports
      const pendingMechanicalToSync = await offlineDb.pendingMechanicalReports
        .where('status').anyOf(['pending', 'failed']).toArray();
      
      for (const item of pendingMechanicalToSync) {
        try {
          await offlineDb.pendingMechanicalReports.update(item.id, { status: 'syncing' });

          const { error } = await supabase.from('mechanical_reports').insert({
            reported_by: item.user_id,
            reporter_name: item.reporter_name,
            truck_id: item.truck_id,
            report_date: item.report_date,
            issue_description: item.issue_description,
            severity: item.severity,
            truck_operational: item.truck_operational,
          });

          if (error) throw error;

          await offlineDb.pendingMechanicalReports.update(item.id, { status: 'completed' });
          synced++;
        } catch (error: any) {
          await offlineDb.pendingMechanicalReports.update(item.id, { 
            status: 'failed', 
            error_message: error.message 
          });
          failed++;
        }
      }

    } catch (error) {
      console.error('Error syncing pending HR items:', error);
    } finally {
      setIsSyncingPending(false);
      setLastPendingSyncResult({ synced, failed });
      await refreshPendingItems();
    }

    return { synced, failed };
  }, [isOnline, refreshPendingItems]);

  // ============================================
  // Create pending item functions (offline-capable)
  // ============================================
  
  const createPendingTimeIn = useCallback(async (
    data: Omit<PendingTimeIn, 'id' | 'created_at' | 'status' | 'user_id'>
  ): Promise<string> => {
    const id = generateLocalId();
    const item: PendingTimeIn = {
      ...data,
      id,
      created_at: new Date(),
      status: 'pending',
      user_id: profile?.user_id || '',
    };
    await offlineDb.pendingTimeIns.add(item);
    await refreshPendingItems();
    return id;
  }, [profile?.user_id, refreshPendingItems]);

  const createPendingTimeOut = useCallback(async (
    data: Omit<PendingTimeOut, 'id' | 'created_at' | 'status' | 'user_id'>
  ): Promise<string> => {
    const id = generateLocalId();
    const item: PendingTimeOut = {
      ...data,
      id,
      created_at: new Date(),
      status: 'pending',
      user_id: profile?.user_id || '',
    };
    await offlineDb.pendingTimeOuts.add(item);
    await refreshPendingItems();
    return id;
  }, [profile?.user_id, refreshPendingItems]);

  const createPendingLeaveRequest = useCallback(async (
    data: Omit<PendingLeaveRequest, 'id' | 'created_at' | 'status' | 'user_id'>
  ): Promise<string> => {
    const id = generateLocalId();
    const item: PendingLeaveRequest = {
      ...data,
      id,
      created_at: new Date(),
      status: 'pending',
      user_id: profile?.user_id || '',
    };
    await offlineDb.pendingLeaveRequests.add(item);
    await refreshPendingItems();
    return id;
  }, [profile?.user_id, refreshPendingItems]);

  const createPendingIncidentReport = useCallback(async (
    data: Omit<PendingIncidentReport, 'id' | 'created_at' | 'status' | 'user_id'>
  ): Promise<string> => {
    const id = generateLocalId();
    const item: PendingIncidentReport = {
      ...data,
      id,
      created_at: new Date(),
      status: 'pending',
      user_id: profile?.user_id || '',
    };
    await offlineDb.pendingIncidentReports.add(item);
    await refreshPendingItems();
    return id;
  }, [profile?.user_id, refreshPendingItems]);

  const createPendingMechanicalReport = useCallback(async (
    data: Omit<PendingMechanicalReport, 'id' | 'created_at' | 'status' | 'user_id'>
  ): Promise<string> => {
    const id = generateLocalId();
    const item: PendingMechanicalReport = {
      ...data,
      id,
      created_at: new Date(),
      status: 'pending',
      user_id: profile?.user_id || '',
    };
    await offlineDb.pendingMechanicalReports.add(item);
    await refreshPendingItems();
    return id;
  }, [profile?.user_id, refreshPendingItems]);

  // ============================================
  // Effects
  // ============================================

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
    refreshPendingItems();
  }, [loadCachedData, refreshPendingItems]);

  // Auto-sync HR data when coming online (and profile exists)
  useEffect(() => {
    if (isOnline && profile) {
      syncHRData();
    }
  }, [isOnline, profile, syncHRData]);

  // Auto-sync pending items when coming back online
  useEffect(() => {
    if (isOnline && !wasOnline.current && profile) {
      syncPendingHRItems();
    }
    wasOnline.current = isOnline;
  }, [isOnline, profile, syncPendingHRItems]);

  // ============================================
  // Return
  // ============================================

  return {
    // Cached data
    trucks,
    drivers,
    helpers,
    mechanics,
    recyclers,
    management,
    cachedTimeLogs,
    cachedLeaves,
    
    // Pending items
    pendingTimeIns,
    pendingTimeOuts,
    pendingLeaveRequests,
    pendingIncidentReports,
    pendingMechanicalReports,
    pendingCounts,
    
    // Status
    isSyncing,
    isSyncingPending,
    lastSyncedAt,
    lastPendingSyncResult,
    
    // Actions
    syncHRData,
    syncPendingHRItems,
    createPendingTimeIn,
    createPendingTimeOut,
    createPendingLeaveRequest,
    createPendingIncidentReport,
    createPendingMechanicalReport,
    refreshPendingItems,
  };
}

