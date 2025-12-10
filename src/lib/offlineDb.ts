import Dexie, { type EntityTable } from 'dexie';

// ============================================
// Type Definition for Cached User Profile
// ============================================

export interface CachedProfile {
  id: string;              // profile id (primary key in Dexie)
  user_id: string;         // supabase auth user id - needed for created_by
  full_name: string;
  email: string;
  role: string;
  user_type: string;
  cached_at: Date;         // when this was cached
}

// ============================================
// Type Definitions for Cached Dropdown Data
// ============================================

export interface CachedClient {
  id: string;
  name: string;
  industry: string;
  address: string | null;
  qr_code: string;
  contact_person: string | null;
  contact_number: string | null;
}

export interface CachedTruck {
  id: string;
  code: string;
  type: string;
}

export interface CachedDriver {
  id: string;
  name: string;
}

export interface CachedHelper {
  id: string;
  name: string;
}

// ============================================
// Type Definition for Pending Collections
// ============================================

export interface WasteItem {
  waste_type: string;
  quantity: number;
  unit: string;
}

export interface PendingCollection {
  id: string;                    // Local UUID generated offline
  client_id: string;
  client_name: string;           // For display in pending tab
  truck_id: string;
  truck_code: string;            // For display
  driver_id: string;
  driver_name: string;           // For display
  helper_ids: string[];
  helper_names: string[];        // For display
  items: WasteItem[];
  tally_entries: WasteItem[];
  waste_types: string[];
  signed_by: string;
  created_at: Date;              // When created offline
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error_message?: string;        // If sync failed
  user_id: string;               // The user who created it
}

// ============================================
// Metadata for tracking last sync
// ============================================

export interface SyncMetadata {
  id: string;                    // 'dropdown_sync' - single record
  last_synced_at: Date | null;
}

// ============================================
// Dexie Database Definition
// ============================================

class OfflineDatabase extends Dexie {
  cachedProfile!: EntityTable<CachedProfile, 'id'>;
  clients!: EntityTable<CachedClient, 'id'>;
  trucks!: EntityTable<CachedTruck, 'id'>;
  drivers!: EntityTable<CachedDriver, 'id'>;
  helpers!: EntityTable<CachedHelper, 'id'>;
  pendingCollections!: EntityTable<PendingCollection, 'id'>;
  syncMetadata!: EntityTable<SyncMetadata, 'id'>;

  constructor() {
    super('WasteWiseOfflineDB');
    
    this.version(1).stores({
      // Cached user profile (single record)
      cachedProfile: 'id, user_id',
      
      // Dropdown data tables - indexed by id
      clients: 'id, name, qr_code',
      trucks: 'id, code',
      drivers: 'id, name',
      helpers: 'id, name',
      
      // Pending collections queue
      pendingCollections: 'id, status, created_at, user_id',
      
      // Sync metadata
      syncMetadata: 'id'
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
// Cache Management Functions
// ============================================

/**
 * Clear all cached data on logout
 * Called when user logs out to ensure clean state for next user
 */
export async function clearCacheOnLogout(): Promise<void> {
  await Promise.all([
    offlineDb.cachedProfile.clear(),
    offlineDb.clients.clear(),
    offlineDb.trucks.clear(),
    offlineDb.drivers.clear(),
    offlineDb.helpers.clear(),
    offlineDb.syncMetadata.clear(),
    offlineDb.pendingCollections.clear(), // Clear all - new user shouldn't see old user's items
  ]);
}

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

/**
 * Get the cached profile (if exists)
 */
export async function getCachedProfile(): Promise<CachedProfile | undefined> {
  // We only store one profile at a time
  const profiles = await offlineDb.cachedProfile.toArray();
  return profiles[0];
}

/**
 * Save/update the cached profile
 */
export async function setCachedProfile(profile: Omit<CachedProfile, 'cached_at'>): Promise<void> {
  // Clear any existing profile first (should only be one)
  await offlineDb.cachedProfile.clear();
  
  // Add the new profile
  await offlineDb.cachedProfile.add({
    ...profile,
    cached_at: new Date()
  });
}

