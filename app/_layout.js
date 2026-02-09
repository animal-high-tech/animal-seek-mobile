import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initSeekEventsStore } from '../services/seekEventsStore';

export default function RootLayout() {
  useEffect(() => {
    initSeekEventsStore();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </SafeAreaProvider>
  );
}

