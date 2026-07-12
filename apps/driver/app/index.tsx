import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

/**
 * Phase 0 — Driver app shell.
 * Full screens added in Phase 1+.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Icon placeholder */}
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>🚚</Text>
      </View>

      <Text style={styles.title}>TransitOps</Text>
      <Text style={styles.subtitle}>Driver App</Text>

      <View style={styles.badge}>
        <View style={styles.dot} />
        <Text style={styles.badgeText}>Phase 0 — Scaffold Complete ✓</Text>
      </View>

      {/* Status list */}
      <View style={styles.card}>
        <StatusItem label="Expo + NativeWind" done />
        <StatusItem label="expo-sqlite (offline)" done />
        <StatusItem label="packages/shared" done />
        <StatusItem label="Auth + RBAC" pending />
        <StatusItem label="Trip management" pending />
      </View>

      <Text style={styles.hint}>Phase 1: Auth → coming next</Text>
    </View>
  );
}

function StatusItem({ label, done, pending }: { label: string; done?: boolean; pending?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.bullet, done ? styles.bulletDone : styles.bulletPending]}>
        {done && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.rowText, done ? styles.rowTextDone : styles.rowTextPending]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#172554',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#93c5fd',
    marginTop: -8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletDone: {
    backgroundColor: '#22c55e',
  },
  bulletPending: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  rowText: {
    fontSize: 14,
  },
  rowTextDone: {
    color: '#ffffff',
  },
  rowTextPending: {
    color: '#93c5fd',
  },
  hint: {
    color: '#93c5fd',
    fontSize: 13,
    marginTop: 8,
  },
});
