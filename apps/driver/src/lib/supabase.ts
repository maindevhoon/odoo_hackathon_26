import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createSupabaseClient } from '@transitops/shared';
import Constants from 'expo-constants';

/**
 * SecureStore adapter — keeps Supabase session persisted on device securely.
 * Falls back gracefully on web/simulator where SecureStore is unavailable.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  '';

const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Override the auth storage to use SecureStore
(supabase.auth as unknown as { storage: unknown }).storage = ExpoSecureStoreAdapter;
