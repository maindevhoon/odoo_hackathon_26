import { Tabs } from 'expo-router';

export default function AppLayout() {
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
