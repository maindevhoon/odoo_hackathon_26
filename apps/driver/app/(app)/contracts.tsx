import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { tierGte, type Tier } from '@transitops/shared';
import { useDriver } from '../../src/contexts/DriverContext';
import { getLocalOpenContracts, getLocalDriverContracts, markContractAssignedLocally, enqueueMutation } from '../../src/db/queries';
import { assignContract } from '@transitops/shared';
import { supabase } from '../../src/lib/supabase';
import { isOnline } from '../../src/lib/sync';

const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];
const TIER_COLORS: Record<Tier, string> = {
  bronze: '#d97706', silver: '#9ca3af', gold: '#ca8a04', platinum: '#7c3aed',
};

export default function ContractsScreen() {
  const { driver, tier, refresh, syncing } = useDriver();
  const [open, setOpen] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!driver) return;
    const eligible = TIER_ORDER.filter((t) => tierGte(tier, t));
    setOpen(getLocalOpenContracts(eligible));
    setMine(getLocalDriverContracts(driver.id));
  }, [driver, tier]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAccept(contractId: string) {
    if (!driver) return;
    setAccepting(contractId);
    try {
      if (await isOnline()) {
        const { error } = await assignContract(supabase, contractId, driver.id);
        if (error) {
          Alert.alert('Could not accept', error);
          return;
        }
        await refresh();
      } else {
        markContractAssignedLocally(contractId, driver.id);
        enqueueMutation('assign_contract', { contractId, driverId: driver.id });
        Alert.alert('Saved offline', 'This will be confirmed once you are back online.');
      }
      load();
    } finally {
      setAccepting(null);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        data={[...mine, ...open]}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} tintColor="#60a5fa" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Your tier: {tier.toUpperCase()}</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No contracts available for your tier yet.</Text>
        }
        renderItem={({ item }) => {
          const isMine = item.driver_id === driver?.id;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={[styles.tierBadge, { borderColor: TIER_COLORS[item.min_tier as Tier] }]}>
                  <Text style={[styles.tierBadgeText, { color: TIER_COLORS[item.min_tier as Tier] }]}>
                    {item.min_tier}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>{item.region} · {item.vehicle_class} · {item.cargo_type}</Text>
              <Text style={styles.cardMeta}>{item.start_date} → {item.end_date}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.pay}>₹{item.pay}</Text>
                {isMine ? (
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{item.status}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    disabled={accepting === item.id}
                    onPress={() => handleAccept(item.id)}
                  >
                    <Text style={styles.acceptBtnText}>{accepting === item.id ? 'Accepting…' : 'Accept'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 16, flex: 1 },
  tierBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  tierBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cardMeta: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  pay: { color: '#4ade80', fontWeight: '800', fontSize: 16 },
  acceptBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statusPill: { backgroundColor: 'rgba(96,165,250,0.15)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { color: '#60a5fa', fontWeight: '600', fontSize: 12, textTransform: 'capitalize' },
});
