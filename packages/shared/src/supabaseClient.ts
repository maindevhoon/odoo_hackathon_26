import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client.
 * Call once at app startup with URL + key from env.
 */
export function createSupabaseClient(url: string, key: string): SupabaseClient {
  if (_client) return _client;
  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _client;
}

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    throw new Error('Supabase client not initialized. Call createSupabaseClient() first.');
  }
  return _client;
}
