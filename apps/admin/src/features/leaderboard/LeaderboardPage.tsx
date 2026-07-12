import { useState, useEffect, useCallback } from 'react';
import { getLeaderboard, subscribeToLeaderboard, TIER_CONFIG, type DriverProgressRow } from '@transitops/shared';
import type { Tier } from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TIER_XP: Record<Tier, number> = { bronze: 0, silver: 500, gold: 1500, platinum: 3500 };
const NEXT_TIER: Record<Tier, Tier | null> = {
  bronze: 'silver', silver: 'gold', gold: 'platinum', platinum: null,
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function XPBar({ xp, tier }: { xp: number; tier: Tier }) {
  const next = NEXT_TIER[tier];
  if (!next) return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-purple-100 rounded-full overflow-hidden">
        <div className="h-full w-full bg-purple-500 rounded-full"/>
      </div>
      <span className="text-xs text-purple-600 font-semibold">MAX</span>
    </div>
  );
  const from  = TIER_XP[tier];
  const to    = TIER_XP[next];
  const pct   = Math.min(100, Math.round(((xp - from) / (to - from)) * 100));
  const tc    = TIER_CONFIG[next];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', tc.bg.replace('bg-','bg-').replace('-50','-400'))}
          style={{ width: `${pct}%`, background: tc.ring }}
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">{pct}% → {tc.label}</span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [entries,  setEntries]  = useState<DriverProgressRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tierFilter, setTierFilter] = useState<Tier | ''>('');
  const [pulse,    setPulse]    = useState(false); // flash on realtime update

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await getLeaderboard(supabase);
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // Realtime — re-fetch + flash indicator
  useEffect(() => {
    const ch = subscribeToLeaderboard(supabase, () => {
      setPulse(true);
      fetchLeaderboard();
      setTimeout(() => setPulse(false), 1500);
    });
    return () => { supabase.removeChannel(ch); };
  }, [fetchLeaderboard]);

  const filtered = tierFilter
    ? entries.filter(e => e.tier === tierFilter)
    : entries;

  // Tier summary
  const tierCounts = (['bronze','silver','gold','platinum'] as Tier[]).map(t => ({
    tier: t,
    count: entries.filter(e => e.tier === t).length,
  }));

  return (
    <div className="p-6 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Leaderboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ranked by XP · Updates live</p>
        </div>
        <span className={cn(
          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors duration-300',
          pulse
            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', pulse ? 'bg-emerald-600' : 'bg-emerald-500')} />
          {pulse ? 'Updated!' : 'Live Realtime'}
        </span>
      </div>

      {/* Tier distribution */}
      <div className="grid grid-cols-4 gap-4">
        {tierCounts.map(({ tier, count }) => {
          const tc = TIER_CONFIG[tier];
          return (
            <button key={tier} onClick={() => setTierFilter(tierFilter === tier ? '' : tier)}
              className={cn('rounded-2xl border p-4 text-left transition-all', tierFilter === tier ? `${tc.bg} ${tc.border} ring-2 ring-offset-1` : `${tc.bg} ${tc.border} hover:scale-[1.02]`)}
              style={{ ...(tierFilter === tier ? { '--tw-ring-color': tc.ring } as React.CSSProperties : {}) }}
            >
              <p className={cn('text-2xl font-bold', tc.color)}>{count}</p>
              <p className={cn('text-xs font-semibold mt-0.5', tc.color)}>{tc.label} Drivers</p>
            </button>
          );
        })}
      </div>

      {/* Top 3 podium */}
      {!loading && filtered.length >= 3 && !tierFilter && (
        <div className="grid grid-cols-3 gap-4">
          {filtered.slice(0, 3).map((e, i) => {
            const tc = TIER_CONFIG[e.tier as Tier] ?? TIER_CONFIG.bronze;
            return (
              <div key={e.driver_id} className={cn('rounded-2xl border bg-white shadow-sm p-5 flex flex-col items-center gap-2', i === 0 && 'ring-2 ring-yellow-300')}>
                <span className="text-3xl">{RANK_MEDALS[i]}</span>
                <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold', tc.bg, tc.color)}>
                  {e.driver?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <p className="font-bold text-gray-800 text-center leading-tight">{e.driver?.name ?? 'Unknown'}</p>
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', tc.bg, tc.color, tc.border)}>
                  {tc.label}
                </span>
                <p className="text-lg font-bold text-gray-700 tabular-nums">{e.xp.toLocaleString()} <span className="text-xs font-normal text-gray-400">XP</span></p>
                <XPBar xp={e.xp} tier={e.tier as Tier} />
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <p className="font-bold text-gray-800 text-sm">{filtered.length} Driver{filtered.length !== 1 ? 's' : ''}</p>
          {tierFilter && (
            <button onClick={() => setTierFilter('')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              Clear filter
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {['Rank', 'Driver', 'Tier', 'XP', 'Progress', 'Contracts', 'Safety', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-4 first:pl-5"><div className="h-4 bg-gray-100 rounded animate-pulse w-4/5"/></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                    No drivers on the leaderboard yet
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const rank = entries.findIndex(x => x.driver_id === e.driver_id) + 1;
                  const tc = TIER_CONFIG[e.tier as Tier] ?? TIER_CONFIG.bronze;
                  const isTop3 = rank <= 3;
                  return (
                    <tr key={e.driver_id} className={cn('border-t border-gray-50 hover:bg-gray-50/60 transition-colors', isTop3 && 'bg-yellow-50/20')}>
                      <td className="px-4 py-4 pl-5">
                        <span className="font-bold text-gray-500 tabular-nums">
                          {rank <= 3 ? RANK_MEDALS[rank - 1] : `#${rank}`}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0', tc.bg, tc.color)}>
                            {e.driver?.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <p className="font-semibold text-gray-800">{e.driver?.name ?? '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border', tc.bg, tc.color, tc.border)}>
                          {tc.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-800 tabular-nums">{e.xp.toLocaleString()}</td>
                      <td className="px-4 py-4 min-w-[140px]">
                        <XPBar xp={e.xp} tier={e.tier as Tier} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-600 text-xs font-semibold">✓ {e.contracts_completed}</span>
                          <span className="text-red-400 text-xs">✗ {e.contracts_breached}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 tabular-nums text-gray-600">
                        {e.driver?.safety_score ?? '—'}/100
                      </td>
                      <td className="px-4 py-4 pr-5">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium',
                          e.driver?.status === 'available' ? 'text-emerald-600' :
                          e.driver?.status === 'on_trip'   ? 'text-blue-600' :
                          e.driver?.status === 'suspended' ? 'text-red-500' :
                          'text-gray-400'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full',
                            e.driver?.status === 'available' ? 'bg-emerald-400' :
                            e.driver?.status === 'on_trip'   ? 'bg-blue-400' :
                            e.driver?.status === 'suspended' ? 'bg-red-400' :
                            'bg-gray-300'
                          )}/>
                          <span className="capitalize">{e.driver?.status?.replace('_',' ') ?? '—'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
