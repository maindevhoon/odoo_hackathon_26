import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/contexts/AuthContext';

export default function HomeScreen() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] ?? 'Driver'} 👋</Text>
        <Text style={styles.subGreeting}>Phase 1 Auth Complete ✓</Text>
      </View>

      {/* Auth success card */}
      <View style={styles.successCard}>
        <Text style={styles.successTitle}>🔐 Authenticated</Text>
        <Text style={styles.successText}>
          You're signed in and your session is persisted securely on-device via SecureStore.
          Works offline!
        </Text>
      </View>

      {/* Coming soon */}
      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonTitle}>Coming in Phase 3</Text>
        <Text style={styles.comingSoonText}>• My Trips{'\n'}• Contract Board{'\n'}• XP &amp; Tier Progress{'\n'}• Fuel Logging</Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
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
