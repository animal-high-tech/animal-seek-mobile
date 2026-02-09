import { Platform } from 'react-native';

const impl =
  Platform.OS === 'web' ? require('./locationSharing.web') : require('./locationSharing.native');

// Delegation point for Play/Stop buttons.
// Later you can swap the internals for UWB without touching UI.
export const startLocationSharing = impl.startLocationSharing;
export const stopLocationSharing = impl.stopLocationSharing;
export const isLocationSharingActive = impl.isLocationSharingActive;

