import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TIER_THRESHOLDS, TIER_ORDER, type Tier } from '@transitops/shared';
import { useAuth } from '../../src/contexts/AuthContext';
import { useDriver } from '../../src/contexts/DriverContext';
import { getLocalLeaderboard, getLocalDriverProgress } from '../../src/db/queries';

const TIER_COLORS: Record<Tier, string> = {
  bronze: '#d97706', silver: '#9ca3af', gold: '#ca8a04', platinum: '#7c3aed',
};

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const { driver, tier, xp, refresh, syncing, online } = useDriver();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [progress, setProgress] = useState<{ contracts_completed: number; contracts_breached: number } | null>(null);

  const load = useCallback(() => {
    setLeaderboard(getLocalLeaderboard());
    if (driver) setProgress(getLocalDriverProgress(driver.id) as any);
  }, [driver]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const nextTierIndex = Math.min(TIER_ORDER.indexOf(tier) + 1, TIER_ORDER.length - 1);
  const nextTier = TIER_ORDER[nextTierIndex];
  const currentFloor = TIER_THRESHOLDS[tier];
  const nextCeiling = TIER_THRESHOLDS[nextTier];
  const span = Math.max(nextCeiling - currentFloor, 1);
  const progressPct = tier === 'platinum' ? 100 : Math.min(100, Math.round(((xp - currentFloor) / span) * 100));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.driver_id}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} tintColor="#60a5fa" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.greeting}>{profile?.full_name ?? 'Driver'}</Text>
              <Text style={[styles.onlineTag, { color: online ? '#4ade80' : '#f87171' }]}>
                {online ? '● Online' : '● Offline'}
              </Text>
            </View>

            <View style={[styles.tierCard, { borderColor: TIER_COLORS[tier] }]}>
              <Text style={[styles.tierLabel, { color: TIER_COLORS[tier] }]}>{tier.toUpperCase()}</Text>
              <Text style={styles.xpLabel}>{xp} XP</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: TIER_COLORS[tier] }]} />
              </View>
              <Text style={styles.progressCaption}>
                {tier === 'platinum' ? 'Top tier reached' : `${nextCeiling - xp} XP to ${nextTier}`}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{progress?.contracts_completed ?? 0}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{progress?.contracts_breached ?? 0}</Text>
                <Text style={styles.statLabel}>Breached</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{driver?.safety_score ?? '—'}</Text>
                <Text style={styles.statLabel}>Safety</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Leaderboard</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.leaderRow, item.driver_id === driver?.id && styles.leaderRowMine]}>
            <Text style={styles.leaderRank}>#{index + 1}</Text>
            <Text style={styles.leaderName}>{item.driver_name}</Text>
            <Text style={[styles.leaderTier, { color: TIER_COLORS[item.tier as Tier] }]}>{item.tier}</Text>
            <Text style={styles.leaderXp}>{item.xp} XP</Text>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  onlineTag: { fontSize: 12, fontWeight: '700' },
  tierCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1,
  },
  tierLabel: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  xpLabel: { color: '#e2e8f0', fontSize: 14, marginTop: 2, marginBottom: 10 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 999 },
  progressCaption: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: { color: '#fff', fontWeight: '800', fontSize: 18 },
  statLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2, textTransform: 'uppercase' },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  leaderRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 6, gap: 10,
  },
  leaderRowMine: { borderWidth: 1, borderColor: '#60a5fa' },
  leaderRank: { color: '#64748b', fontWeight: '700', width: 28 },
  leaderName: { color: '#fff', flex: 1, fontWeight: '600' },
  leaderTier: { fontWeight: '700', fontSize: 12, textTransform: 'uppercase', marginRight: 8 },
  leaderXp: { color: '#94a3b8', fontWeight: '600', fontSize: 12 },
  signOutBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20,
  },
  signOutText: { color: '#fca5a5', fontWeight: '600', fontSize: 14 },
});
