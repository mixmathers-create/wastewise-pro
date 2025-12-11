// ============================================
// Common Offline Types
// Shared types used across all offline modules
// ============================================

/**
 * Cached user profile for offline authentication context
 */
export interface CachedProfile {
  id: string;              // profile id (primary key in Dexie)
  user_id: string;         // supabase auth user id - needed for created_by
  full_name: string;
  email: string;
  role: string;
  user_type: string;
  cached_at: Date;         // when this was cached
}

/**
 * Metadata for tracking last sync time
 */
export interface SyncMetadata {
  id: string;                    // e.g., 'dropdown_sync', 'hr_sync'
  last_synced_at: Date | null;
}

/**
 * Base pending status for all offline queue items
 */
export type PendingStatus = 'pending' | 'syncing' | 'failed' | 'completed';

/**
 * Base interface for all pending items in offline queues
 */
export interface BasePendingItem {
  id: string;                    // Local UUID generated offline
  created_at: Date;              // When created offline
  status: PendingStatus;
  error_message?: string;        // If sync failed
  user_id: string;               // The user who created it
}

/**
 * Cached truck data (shared between Collection and HR)
 */
export interface CachedTruck {
  id: string;
  code: string;
  type: string;
  plate_number?: string | null;
}

