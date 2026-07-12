import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/contexts/AuthContext';
import { useDriver } from '../../src/contexts/DriverContext';
import { getQueueSize } from '../../src/db/queries';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { driver, tier, xp, online, syncing, refresh } = useDriver();
  const pending = getQueueSize();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] ?? 'Driver'} 👋</Text>
        <Text style={[styles.subGreeting, { color: online ? '#4ade80' : '#f87171' }]}>
          {online ? (syncing ? 'Syncing…' : 'Online — up to date') : 'Offline — working from local data'}
        </Text>
      </View>

      <View style={styles.successCard}>
        <Text style={styles.successTitle}>{driver ? `${tier.toUpperCase()} · ${xp} XP` : 'Driver profile loading…'}</Text>
        <Text style={styles.successText}>
          Trips, contracts, and fuel logs are stored on this device and work fully offline.
          {pending > 0 ? ` ${pending} change${pending === 1 ? '' : 's'} waiting to sync.` : ''}
        </Text>
      </View>

      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonTitle}>Quick links</Text>
        <Text style={styles.comingSoonText}>• My Trips — complete active dispatches{'\n'}• Contracts — accept tier-gated jobs{'\n'}• Profile — XP, tier &amp; leaderboard</Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={refresh}>
        <Text style={styles.signOutText}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 60 },
  header: { marginBottom: 28 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subGreeting: { fontSize: 14, color: '#22c55e' },
  successCard: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', borderRadius: 16, padding: 20, marginBottom: 20,
  },
  successTitle: { color: '#86efac', fontWeight: '700', fontSize: 16, marginBottom: 8 },
  successText: { color: '#6ee7b7', fontSize: 13, lineHeight: 20 },
  comingSoon: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  comingSoonTitle: { color: '#94a3b8', fontWeight: '600', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  comingSoonText: { color: '#64748b', fontSize: 14, lineHeight: 24 },
  signOutBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  signOutText: { color: '#fca5a5', fontWeight: '600', fontSize: 14 },
});
