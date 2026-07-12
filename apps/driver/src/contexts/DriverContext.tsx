import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getDriverByProfileId, xpToTier, type Driver, type Tier } from '@transitops/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { initDb } from '../db/schema';
import { getLocalDriverProgress, setMeta, getMeta } from '../db/queries';
import { syncNow, subscribeToConnectivity, isOnline } from '../lib/sync';

interface DriverContextValue {
  driver: Driver | null;
  tier: Tier;
  xp: number;
  loading: boolean;
  online: boolean;
  syncing: boolean;
  refresh: () => Promise<void>;
}

const DriverContext = createContext<DriverContextValue | null>(null);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [tier, setTier] = useState<Tier>('bronze');
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const hydrateFromLocal = useCallback((driverId: string) => {
    const progress = getLocalDriverProgress(driverId);
    if (progress) {
      setXp(progress.xp);
      setTier(progress.tier as Tier);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!driver) return;
    const onlineNow = await isOnline();
    setOnline(onlineNow);
    if (onlineNow) {
      setSyncing(true);
      try {
        await syncNow(driver.id, tier);
        hydrateFromLocal(driver.id);
      } finally {
        setSyncing(false);
      }
    }
  }, [driver, tier, hydrateFromLocal]);

  // Init local DB once + resolve driver row for the signed-in profile.
  useEffect(() => {
    if (!user) {
      setDriver(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      initDb();

      const cachedDriverId = getMeta('driver_id');
      const { data } = await getDriverByProfileId(supabase, user.id);
      if (cancelled) return;

      if (data) {
        setDriver(data);
        setMeta('driver_id', data.id);
        hydrateFromLocal(data.id);
        setXp((prev) => prev || 0);
        setTier((prev) => prev ?? xpToTier(0));
      } else if (cachedDriverId) {
        // Offline on first-ever launch: fall back to cached id with no row yet.
        hydrateFromLocal(cachedDriverId);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, hydrateFromLocal]);

  // Kick a sync once we know who the driver is, then resync on reconnect.
  useEffect(() => {
    if (!driver) return;
    refresh();
    const unsubscribe = subscribeToConnectivity(() => refresh());
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]);

  return (
    <DriverContext.Provider value={{ driver, tier, xp, loading, online, syncing, refresh }}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver must be inside DriverProvider');
  return ctx;
}
