import { getSupabaseClient } from '@transitops/shared';

/**
 * Singleton Supabase client for the admin app.
 * Initialized in main.tsx before React mounts.
 */
export const supabase = getSupabaseClient();
