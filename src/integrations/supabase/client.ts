import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Build URL from project id if explicit URL is missing
const SUPABASE_URL = SUPABASE_URL_ENV || (PROJECT_ID ? `https://${PROJECT_ID}.supabase.co` : '');

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn('Supabase env vars missing. Ensure VITE_SUPABASE_URL or VITE_SUPABASE_PROJECT_ID, and VITE_SUPABASE_PUBLISHABLE_KEY are set.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});