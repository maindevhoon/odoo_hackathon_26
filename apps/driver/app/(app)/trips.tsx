import { useCallback, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { completeTrip } from '@transitops/shared';
import { useDriver } from '../../src/contexts/DriverContext';
import { getLocalDriverTrips, markTripCompletedLocally, insertFuelLogLocally, enqueueMutation } from '../../src/db/queries';
import { supabase } from '../../src/lib/supabase';
import { isOnline } from '../../src/lib/sync';

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8', dispatched: '#60a5fa', completed: '#4ade80', cancelled: '#f87171',
};

export default function TripsScreen() {
  const { driver, refresh, syncing } = useDriver();
  const [trips, setTrips] = useState<any[]>([]);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [odometer, setOdometer] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!driver) return;
    setTrips(getLocalDriverTrips(driver.id));
  }, [driver]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function startCompleting(tripId: string) {
    setCompletingId(tripId);
    setOdometer('');
    setFuelLiters('');
    setFuelCost('');
  }

  async function submitCompletion(trip: any) {
    const finalOdometer = Number(odometer);
    const fuelConsumed = Number(fuelLiters);
    const cost = Number(fuelCost) || 0;

    if (!finalOdometer || !fuelConsumed) {
      Alert.alert('Missing info', 'Enter both final odometer and fuel consumed.');
      return;
    }

    setSubmitting(true);
    try {
      if (await isOnline()) {
        const { error } = await completeTrip(supabase, trip.id, finalOdometer, fuelConsumed);
        if (error) {
          Alert.alert('Could not complete trip', error);
          return;
        }
        if (cost > 0) {
          await supabase.from('fuel_logs').insert({
            vehicle_id: trip.vehicle_id, trip_id: trip.id, liters: fuelConsumed, cost,
          });
        }
        await refresh();
      } else {
        markTripCompletedLocally(trip.id, finalOdometer, fuelConsumed);
        enqueueMutation('complete_trip', { tripId: trip.id, finalOdometer, fuelConsumed });
        if (cost > 0) {
          const localId = `local-${Date.now()}`;
          insertFuelLogLocally({
            id: localId, vehicle_id: trip.vehicle_id, trip_id: trip.id,
            liters: fuelConsumed, cost, logged_at: new Date().toISOString(),
          });
          enqueueMutation('create_fuel_log', {
            vehicle_id: trip.vehicle_id, trip_id: trip.id, liters: fuelConsumed, cost,
          });
        }
        Alert.alert('Saved offline', 'This trip will sync once you are back online.');
      }
      setCompletingId(null);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} tintColor="#60a5fa" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.empty}>No trips assigned yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.source} → {item.destination}</Text>
              <View style={[styles.statusBadge, { borderColor: STATUS_COLORS[item.status] }]}>
                <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>{item.vehicle_reg_no ?? item.vehicle_id} · {item.cargo_weight_kg}kg · {item.planned_distance}km</Text>

            {item.status === 'dispatched' && (
              completingId === item.id ? (
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder="Final odometer (km)"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={odometer}
                    onChangeText={setOdometer}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Fuel consumed (L)"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={fuelLiters}
                    onChangeText={setFuelLiters}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Fuel cost (optional)"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={fuelCost}
                    onChangeText={setFuelCost}
                  />
                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setCompletingId(null)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.submitBtn}
                      disabled={submitting}
                      onPress={() => submitCompletion(item)}
                    >
                      <Text style={styles.submitBtnText}>{submitting ? 'Saving…' : 'Complete Trip'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.completeBtn} onPress={() => startCompleting(item.id)}>
                  <Text style={styles.completeBtnText}>Complete Trip</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15, flex: 1 },
  cardMeta: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  statusBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  completeBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  form: { marginTop: 12, gap: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 10, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  cancelBtnText: { color: '#94a3b8', fontWeight: '600' },
  submitBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
