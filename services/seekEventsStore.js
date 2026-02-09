import { Platform } from 'react-native';

const impl = Platform.OS === 'web' ? require('./seekEventsStore.web') : require('./seekEventsStore.native');

export const initSeekEventsStore = impl.initSeekEventsStore;
export const upsertSeekEvent = impl.upsertSeekEvent;
export const touchSeekEventByGroupId = impl.touchSeekEventByGroupId;
export const deleteSeekEventByGroupId = impl.deleteSeekEventByGroupId;
export const listSeekEvents = impl.listSeekEvents;

