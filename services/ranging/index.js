import { Platform } from 'react-native';

const impl =
  Platform.OS === 'web' ? require('./ranging.web') : require('./ranging.native');

export const startDiscovery = impl.startDiscovery;
export const stopDiscovery = impl.stopDiscovery;
export const startRanging = impl.startRanging;
export const stopRanging = impl.stopRanging;
export const addRangingListener = impl.addRangingListener;
export const getRangingStatus = impl.getRangingStatus;

