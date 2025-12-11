import Dexie, { type EntityTable } from 'dexie';

// ============================================
// Import Types from Separate Schema Files
// ============================================

// Common types
import type { 
  CachedProfile, 
  SyncMetadata, 
  CachedTruck 
} from './offline/commonTypes';

// Collection types
import type { 
  CachedClient, 
  CachedDriver, 
  CachedHelper,
  PendingCollection 
} from './offline/collectionTypes';

// HR types
import type {
  CachedMechanic,
  CachedRecycler,
  CachedManagement,
  CachedTimeLog,
  CachedLeave,
  PendingTimeIn,
  PendingTimeOut,
  PendingLeaveRequest,
  PendingIncidentReport,
  PendingMechanicalReport,
} from './offline/hrTypes';

// Re-export all types for backward compatibility
export * from './offline/commonTypes';
export * from './offline/collectionTypes';
export * from './offline/hrTypes';

// ============================================
// Dexie Database Definition
// ============================================

class OfflineDatabase extends Dexie {
  // Common tables
  cachedProfile!: EntityTable<CachedProfile, 'id'>;
  syncMetadata!: EntityTable<SyncMetadata, 'id'>;
  trucks!: EntityTable<CachedTruck, 'id'>;
  
  // Collection tab tables
  clients!: EntityTable<CachedClient, 'id'>;
  drivers!: EntityTable<CachedDriver, 'id'>;
  helpers!: EntityTable<CachedHelper, 'id'>;
  pendingCollections!: EntityTable<PendingCollection, 'id'>;
  
  // HR Tab - Cached personnel tables
  mechanics!: EntityTable<CachedMechanic, 'id'>;
  recyclers!: EntityTable<CachedRecycler, 'id'>;
  management!: EntityTable<CachedManagement, 'id'>;
  
  // HR Tab - Cached read-only data
  cachedTimeLogs!: EntityTable<CachedTimeLog, 'id'>;
  cachedLeaves!: EntityTable<CachedLeave, 'id'>;
  
  // HR Tab - Pending queues (offline operations)
  pendingTimeIns!: EntityTable<PendingTimeIn, 'id'>;
  pendingTimeOuts!: EntityTable<PendingTimeOut, 'id'>;
  pendingLeaveRequests!: EntityTable<PendingLeaveRequest, 'id'>;
  pendingIncidentReports!: EntityTable<PendingIncidentReport, 'id'>;
  pendingMechanicalReports!: EntityTable<PendingMechanicalReport, 'id'>;

  constructor() {
    super('WasteWiseOfflineDB');
    
    // Version 1 - Original schema (Collections)
    this.version(1).stores({
      cachedProfile: 'id, user_id',
      clients: 'id, name, qr_code',
      trucks: 'id, code',
      drivers: 'id, name',
      helpers: 'id, name',
      pendingCollections: 'id, status, created_at, user_id',
      syncMetadata: 'id'
    });
    
    // Version 2 - HR Tab offline support
    this.version(2).stores({
      // Keep all existing tables
      cachedProfile: 'id, user_id',
      clients: 'id, name, qr_code',
      trucks: 'id, code',
      drivers: 'id, name',
      helpers: 'id, name',
      pendingCollections: 'id, status, created_at, user_id',
      syncMetadata: 'id',
      
      // HR - Additional personnel types
      mechanics: 'id, name',
      recyclers: 'id, name',
      management: 'id, name',
      
      // HR - Cached data for viewing
      cachedTimeLogs: 'id, personnel_id, personnel_type, truck_id, [personnel_type+time_in]',
      cachedLeaves: 'id, personnel_id, personnel_type, status, [status+created_at]',
      
      // HR - Pending queues (offline operations)
      pendingTimeIns: 'id, status, created_at, user_id',
      pendingTimeOuts: 'id, status, created_at, user_id',
      pendingLeaveRequests: 'id, status, created_at, user_id',
      pendingIncidentReports: 'id, status, created_at, user_id',
      pendingMechanicalReports: 'id, status, created_at, user_id'
    });
  }
}

// Single instance of the database
export const offlineDb = new OfflineDatabase();

// ============================================
// Helper function to generate local IDs
// ============================================

export function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Profile Cache Functions
// ============================================

/**
 * Get the cached profile (if exists)
 */
export async function getCachedProfile(): Promise<CachedProfile | undefined> {
  const profiles = await offlineDb.cachedProfile.toArray();
  return profiles[0];
}

/**
 * Save/update the cached profile
 */
export async function setCachedProfile(profile: Omit<CachedProfile, 'cached_at'>): Promise<void> {
  await offlineDb.cachedProfile.clear();
  await offlineDb.cachedProfile.add({
    ...profile,
    cached_at: new Date()
  });
}

// ============================================
// Collection Pending Count Functions
// ============================================

/**
 * Get count of pending collections for a specific user
 */
export async function getPendingCollectionsCount(userId?: string): Promise<number> {
  if (userId) {
    return await offlineDb.pendingCollections
      .where('user_id')
      .equals(userId)
      .count();
  }
  return await offlineDb.pendingCollections.count();
}

/**
 * Check if user has any pending collections that haven't been synced
 */
export async function hasPendingCollections(userId?: string): Promise<boolean> {
  const count = await getPendingCollectionsCount(userId);
  return count > 0;
}

// ============================================
// HR Pending Count Functions
// ============================================

/**
 * Get count of all pending HR items for a specific user
 */
export async function getPendingHRItemsCount(userId?: string): Promise<{
  timeIns: number;
  timeOuts: number;
  leaveRequests: number;
  incidentReports: number;
  mechanicalReports: number;
  total: number;
}> {
  const filter = (table: any) => {
    if (userId) {
      return table.where('user_id').equals(userId).and((item: any) => 
        item.status === 'pending' || item.status === 'failed'
      );
    }
    return table.where('status').anyOf(['pending', 'failed']);
  };

  const [timeIns, timeOuts, leaveRequests, incidentReports, mechanicalReports] = await Promise.all([
    filter(offlineDb.pendingTimeIns).count(),
    filter(offlineDb.pendingTimeOuts).count(),
    filter(offlineDb.pendingLeaveRequests).count(),
    filter(offlineDb.pendingIncidentReports).count(),
    filter(offlineDb.pendingMechanicalReports).count(),
  ]);

  return {
    timeIns,
    timeOuts,
    leaveRequests,
    incidentReports,
    mechanicalReports,
    total: timeIns + timeOuts + leaveRequests + incidentReports + mechanicalReports,
  };
}

/**
 * Check if user has any pending HR items
 */
export async function hasPendingHRItems(userId?: string): Promise<boolean> {
  const counts = await getPendingHRItemsCount(userId);
  return counts.total > 0;
}

// ============================================
// Clear Cache Functions
// ============================================

/**
 * Clear all cached data on logout
 * Called when user logs out to ensure clean state for next user
 */
export async function clearCacheOnLogout(): Promise<void> {
  await Promise.all([
    // Profile & metadata
    offlineDb.cachedProfile.clear(),
    offlineDb.syncMetadata.clear(),
    
    // Collection tab data
    offlineDb.clients.clear(),
    offlineDb.trucks.clear(),
    offlineDb.drivers.clear(),
    offlineDb.helpers.clear(),
    offlineDb.pendingCollections.clear(),
    
    // HR tab - personnel
    offlineDb.mechanics.clear(),
    offlineDb.recyclers.clear(),
    offlineDb.management.clear(),
    
    // HR tab - cached data
    offlineDb.cachedTimeLogs.clear(),
    offlineDb.cachedLeaves.clear(),
    
    // HR tab - pending queues
    offlineDb.pendingTimeIns.clear(),
    offlineDb.pendingTimeOuts.clear(),
    offlineDb.pendingLeaveRequests.clear(),
    offlineDb.pendingIncidentReports.clear(),
    offlineDb.pendingMechanicalReports.clear(),
  ]);
}

/**
 * Clear only HR cached data (useful for refreshing HR data)
 */
export async function clearHRCache(): Promise<void> {
  await Promise.all([
    offlineDb.mechanics.clear(),
    offlineDb.recyclers.clear(),
    offlineDb.management.clear(),
    offlineDb.cachedTimeLogs.clear(),
    offlineDb.cachedLeaves.clear(),
  ]);
}

/**
 * Clear completed pending items (cleanup after successful sync)
 */
export async function clearCompletedPendingItems(): Promise<void> {
  await Promise.all([
    offlineDb.pendingCollections.where('status').equals('completed').delete(),
    offlineDb.pendingTimeIns.where('status').equals('completed').delete(),
    offlineDb.pendingTimeOuts.where('status').equals('completed').delete(),
    offlineDb.pendingLeaveRequests.where('status').equals('completed').delete(),
    offlineDb.pendingIncidentReports.where('status').equals('completed').delete(),
    offlineDb.pendingMechanicalReports.where('status').equals('completed').delete(),
  ]);
}
