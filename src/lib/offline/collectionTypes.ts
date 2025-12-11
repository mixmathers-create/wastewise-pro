// ============================================
// Collection Tab Offline Types
// Types for offline collection functionality
// ============================================

import type { BasePendingItem } from './commonTypes';

/**
 * Cached client data for offline collection forms
 */
export interface CachedClient {
  id: string;
  name: string;
  industry: string;
  address: string | null;
  qr_code: string;
  contact_person: string | null;
  contact_number: string | null;
}

/**
 * Cached driver data for offline collection forms
 */
export interface CachedDriver {
  id: string;
  name: string;
}

/**
 * Cached helper data for offline collection forms
 */
export interface CachedHelper {
  id: string;
  name: string;
}

/**
 * Waste item entry in a collection
 */
export interface WasteItem {
  waste_type: string;
  quantity: number;
  unit: string;
}

/**
 * Pending collection to be synced when online
 */
export interface PendingCollection extends BasePendingItem {
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
}

