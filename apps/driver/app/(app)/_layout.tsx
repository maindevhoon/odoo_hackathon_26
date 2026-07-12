import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, router } from 'expo-router';
import { DriverProvider } from '../../src/contexts/DriverContext';
import { useAuth } from '../../src/contexts/AuthContext';

function AppTabsWithGuard() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/sign-in');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#60a5fa" size="large" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#172554' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: '#172554', borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: '#475569',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'My Trips',
          tabBarLabel: 'Trips',
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: 'Contracts',
          tabBarLabel: 'Contracts',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}

export default function AppLayout() {
  return (
    <DriverProvider>
      <AppTabsWithGuard />
    </DriverProvider>
  );
}
