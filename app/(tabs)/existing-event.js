import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ICONS } from '../../constants/icons';
import { deleteSeekEventByGroupId, listSeekEvents, touchSeekEventByGroupId } from '../../services/seekEventsStore';

export default function ExistingEventScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const iconColor = useMemo(() => (scheme === 'dark' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.68)'), [scheme]);
  const deleteColor = useMemo(() => (scheme === 'dark' ? 'rgba(255,120,140,0.95)' : '#b00020'), [scheme]);

  const [events, setEvents] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const refresh = useCallback(() => {
    setEvents(listSeekEvents(200));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const renderItem = useCallback(
    ({ item }) => {
      const emoji = item.iconId && ICONS[item.iconId] ? ICONS[item.iconId] : '🐾';
      const subtitle = item.participantName ? item.participantName : '';

      const handleRemove = () => {
        if (deletingId) return;

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const ok = window.confirm('Remove event? This only removes it from this device.');
          if (!ok) return;
          setDeletingId(item.seekGroupId);
          try {
            deleteSeekEventByGroupId(item.seekGroupId);
            refresh();
          } finally {
            setDeletingId(null);
          }
          return;
        }

        Alert.alert('Remove event?', 'This only removes it from this device.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              setDeletingId(item.seekGroupId);
              try {
                deleteSeekEventByGroupId(item.seekGroupId);
                refresh();
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]);
      };

      return (
        <View style={styles.row}>
          <Text style={styles.rowEmoji}>{emoji}</Text>

          <Pressable
            style={styles.rowMainPress}
            onPress={() => {
              touchSeekEventByGroupId(item.seekGroupId);
              router.push(`/seek-group/${item.seekGroupId}`);
            }}
            accessibilityRole="button"
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.deleteBtn, deletingId === item.seekGroupId && styles.btnDisabled]}
            onPress={handleRemove}
            accessibilityRole="button"
            accessibilityLabel="Delete event"
            disabled={deletingId === item.seekGroupId}
          >
            {deletingId === item.seekGroupId ? (
              <ActivityIndicator size="small" color={deleteColor} />
            ) : (
              <FontAwesome name="trash" size={18} color={deleteColor} />
            )}
          </Pressable>
        </View>
      );
    },
    [deleteColor, deletingId, refresh]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Text style={styles.title}>Existing</Text>
        <Pressable
          style={styles.refreshBtn}
          onPress={refresh}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <FontAwesome name="refresh" size={18} color={iconColor} />
        </Pressable>
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e.seekGroupId}
        renderItem={renderItem}
        contentContainerStyle={events.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No events yet. Create one in “New” or join by Event ID.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  refreshBtn: {
    height: 32,
    minWidth: 34,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  listContainer: {
    paddingBottom: 20,
    gap: 10,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 50,
  },
  emptyText: {
    opacity: 0.7,
    lineHeight: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  rowEmoji: {
    fontSize: 26,
    width: 34,
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowMainPress: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  rowSubtitle: {
    opacity: 0.65,
  },
  deleteBtn: {
    height: 32,
    minWidth: 34,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(176,0,32,0.24)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  btnDisabled: {
    opacity: 0.55,
  },
});

