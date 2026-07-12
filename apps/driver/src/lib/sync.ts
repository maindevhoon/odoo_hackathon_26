import NetInfo from '@react-native-community/netinfo';
import {
  getContracts,
  getTrips,
  getLeaderboard,
  assignContract,
  completeTrip,
  createFuelLog,
  tierGte,
  TIER_ORDER,
  type Tier,
} from '@transitops/shared';
import { supabase } from './supabase';
import {
  upsertContracts,
  upsertTrips,
  upsertDriverProgress,
  replaceLeaderboard,
  getQueuedMutations,
  removeMutation,
  bumpMutationAttempt,
  setMeta,
} from '../db/queries';

let syncing = false;

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

/**
 * Pulls everything the driver app needs into SQLite: contracts the driver
 * qualifies for (or already holds), their trips, their XP/tier, and the
 * leaderboard. Called after login, on pull-to-refresh, and after a
 * successful push.
 */
export async function pullAll(driverId: string, driverTier: Tier): Promise<void> {
  const eligibleTiers = TIER_ORDER.filter((t) => tierGte(driverTier, t));

  const [openContracts, ownContracts, tripsRes, progressRes, leaderboardRes] = await Promise.all([
    getContracts(supabase, { status: 'open' }),
    getContracts(supabase, {}),
    getTrips(supabase, { driverId }),
    supabase.from('driver_progress').select('*').eq('driver_id', driverId).maybeSingle(),
    getLeaderboard(supabase),
  ]);

  const eligibleOpen = openContracts.data.filter((c) => eligibleTiers.includes(c.min_tier));
  const mine = ownContracts.data.filter((c) => c.driver_id === driverId);
  upsertContracts([...eligibleOpen, ...mine]);

  upsertTrips(tripsRes.data);

  if (progressRes.data) {
    upsertDriverProgress({ ...progressRes.data } as any);
  }

  if (leaderboardRes.data) {
    replaceLeaderboard(leaderboardRes.data);
  }

  setMeta('last_sync', new Date().toISOString());
}

/**
 * Drains the local mutation queue against Supabase RPCs, in order. Stops
 * on the first failure so retries stay in order; that mutation's attempt
 * counter is bumped for visibility.
 */
export async function pushQueue(): Promise<{ pushed: number; failed: number }> {
  if (syncing) return { pushed: 0, failed: 0 };
  syncing = true;
  let pushed = 0;
  let failed = 0;

  try {
    const queued = getQueuedMutations();
    for (const m of queued) {
      const payload = JSON.parse(m.payload_json);
      let error: string | null = null;

      try {
        if (m.type === 'complete_trip') {
          ({ error } = await completeTrip(supabase, payload.tripId, payload.finalOdometer, payload.fuelConsumed));
        } else if (m.type === 'assign_contract') {
          ({ error } = await assignContract(supabase, payload.contractId, payload.driverId));
        } else if (m.type === 'create_fuel_log') {
          const res = await createFuelLog(supabase, payload);
          error = res.error;
        }
      } catch (e: any) {
        error = e?.message ?? 'Unknown sync error';
      }

      if (error) {
        bumpMutationAttempt(m.id, error);
        failed += 1;
        break; // preserve order; stop draining until this one is resolved
      } else {
        removeMutation(m.id);
        pushed += 1;
      }
    }
  } finally {
    syncing = false;
  }

  return { pushed, failed };
}

/**
 * Full sync cycle: push queued offline mutations, then pull fresh state.
 * Safe to call opportunistically (on reconnect, on screen focus, on pull-
 * to-refresh) — it no-ops offline.
 */
export async function syncNow(driverId: string, driverTier: Tier): Promise<void> {
  if (!(await isOnline())) return;
  await pushQueue();
  await pullAll(driverId, driverTier);
}

export function subscribeToConnectivity(onReconnect: () => void): () => void {
  let wasOffline = false;
  const unsubscribe = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (!online) {
      wasOffline = true;
    } else if (wasOffline) {
      wasOffline = false;
      onReconnect();
    }
  });
  return unsubscribe;
}
