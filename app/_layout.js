import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { initSeekEventsStore } from '../services/seekEventsStore';

export default function RootLayout() {
  useEffect(() => {
    initSeekEventsStore();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

