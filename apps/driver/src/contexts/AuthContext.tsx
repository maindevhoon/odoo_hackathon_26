import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '@transitops/shared';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null, loading: true,
  });

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data as Profile | null;
  }

  useEffect(() => {
    let mounted = true;
    // Never leave the root route on its blue loading screen when the device
    // cannot reach the local Supabase host (common before Android port setup).
    const loadSession = async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth startup timed out')), 5000),
          ),
        ]);
        const session = result.data.session;
        let profile: Profile | null = null;
        if (session?.user) {
          try {
            profile = await Promise.race([
              fetchProfile(session.user.id),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
            ]);
          } catch {
            profile = null;
          }
        }
        if (mounted) setState({ user: session?.user ?? null, session, profile, loading: false });
      } catch {
        if (mounted) setState({ user: null, session: null, profile: null, loading: false });
      }
    };
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      try {
        const profile = session?.user ? await fetchProfile(session.user.id) : null;
        if (mounted) setState({ user: session?.user ?? null, session, profile, loading: false });
      } catch {
        if (mounted) setState({ user: session?.user ?? null, session, profile: null, loading: false });
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
