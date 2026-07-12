import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { DriverProvider } from '../src/contexts/DriverContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <DriverProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </DriverProvider>
    </AuthProvider>
  );
}
