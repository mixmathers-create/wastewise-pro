// ============================================
// HR Tab Offline Types
// Types for offline HR functionality
// ============================================

import type { BasePendingItem } from './commonTypes';

// ============================================
// Cached Personnel Types
// ============================================

/**
 * Extended driver data with HR fields
 */
export interface CachedDriverExtended {
  id: string;
  name: string;
  contact_number: string | null;
  status: string | null;
  birthdate: string | null;
  leaves_available: number;
  id_number: string | null;
}

/**
 * Extended helper data with HR fields
 */
export interface CachedHelperExtended {
  id: string;
  name: string;
  contact_number: string | null;
  status: string | null;
  birthdate: string | null;
  leaves_available: number;
  id_number: string | null;
}

/**
 * Cached mechanic data
 */
export interface CachedMechanic {
  id: string;
  name: string;
  contact_number: string | null;
  status: string | null;
  birthdate: string | null;
  leaves_available: number;
  id_number: string | null;
}

/**
 * Cached recycler data
 */
export interface CachedRecycler {
  id: string;
  name: string;
  contact_number: string | null;
  status: string | null;
  birthdate: string | null;
  leaves_available: number;
  id_number: string | null;
}

/**
 * Cached management data
 */
export interface CachedManagement {
  id: string;
  name: string;
  contact_number: string | null;
  status: string | null;
  birthdate: string | null;
  leaves_available: number;
  id_number: string | null;
}

// ============================================
// Cached Time Logs (Read-only cache)
// ============================================

/**
 * Cached time log for offline viewing
 */
export interface CachedTimeLog {
  id: string;
  personnel_id: string;
  personnel_name: string;
  personnel_type: string;
  time_in: string;
  time_out: string | null;
  photo_url: string | null;
  truck_id: string | null;
  truck_code: string | null;
  latitude: number | null;
  longitude: number | null;
  group_session_id: string | null;
}

// ============================================
// Cached Leaves (Read-only cache)
// ============================================

/**
 * Cached leave record for offline viewing
 */
export interface CachedLeave {
  id: string;
  personnel_type: string;
  personnel_id: string;
  personnel_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  leave_days: number;
  is_paid: boolean;
  medical_certificate_url: string | null;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
}

// ============================================
// Pending Time In (Offline Queue)
// ============================================

/**
 * Personnel entry for time-in
 */
export interface TimeInPersonnel {
  id: string;
  name: string;
  type: 'driver' | 'helper' | 'recycler';
}

/**
 * Pending time-in to be synced when online
 */
export interface PendingTimeIn extends BasePendingItem {
  truck_id: string;
  truck_code: string;                 // For display
  personnel: TimeInPersonnel[];
  photo_base64: string | null;        // Base64 encoded photo (stored locally)
  latitude: number | null;
  longitude: number | null;
  group_session_id: string;
}

// ============================================
// Pending Time Out (Offline Queue)
// ============================================

/**
 * Pending time-out to be synced when online
 */
export interface PendingTimeOut extends BasePendingItem {
  time_log_ids: string[];             // IDs of time logs to time out
  personnel_names: string[];          // For display
  truck_code: string | null;          // For display
  time_out: Date;
}

// ============================================
// Pending Leave Request (Offline Queue)
// ============================================

/**
 * Pending leave request to be synced when online
 */
export interface PendingLeaveRequest extends BasePendingItem {
  personnel_type: string;
  personnel_id: string;
  personnel_name: string;             // For display
  personnel_id_number: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  leave_days: number;
  is_paid: boolean;
  medical_certificate_base64: string | null;  // Base64 encoded file
}

// ============================================
// Pending Incident Report (Offline Queue)
// ============================================

export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Pending incident report to be synced when online
 */
export interface PendingIncidentReport extends BasePendingItem {
  incident_type: string;
  incident_date: string;
  incident_time: string | null;
  location: string | null;
  description: string;
  severity: Severity;
  reporter_name: string;              // For display
}

// ============================================
// Pending Mechanical Report (Offline Queue)
// ============================================

/**
 * Pending mechanical report to be synced when online
 */
export interface PendingMechanicalReport extends BasePendingItem {
  truck_id: string;
  truck_code: string;                 // For display
  issue_description: string;
  severity: Severity;
  truck_operational: boolean;
  reporter_name: string;              // For display
  report_date: string;               
}

