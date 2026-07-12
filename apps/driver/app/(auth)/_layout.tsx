import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(app)');
    }
  }, [user, loading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
