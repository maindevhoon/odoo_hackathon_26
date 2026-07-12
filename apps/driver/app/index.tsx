import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

/**
 * Root index — immediately redirect based on auth state.
 */
export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/(app)');
    } else {
      router.replace('/(auth)/sign-in');
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#60a5fa" size="large" />
    </View>
  );
}
