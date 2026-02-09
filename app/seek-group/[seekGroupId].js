import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ICONS } from '../../constants/icons';
import ContributorIconPicker from '../../components/ContributorIconPicker';
import { pickRandomContributorIconId } from '../../constants/icons';
import {
  getSeekGroup,
  getSeekMembersByGroup,
  deleteSeekMember,
  postSeekMember,
  putSeekGroup,
  putSeekMember,
  putSeekMemberLocation,
} from '../../services/animalSeekCore';
import SeekGroupSettingsModal from '../../components/SeekGroupSettingsModal';
import { getDeviceUuid } from '../../services/deviceId';
import { isLocationSharingActive, startLocationSharing, stopLocationSharing } from '../../services/locationSharing';
import { listSeekEvents } from '../../services/seekEventsStore';

export default function SeekGroupDetailScreen() {
  const { seekGroupId } = useLocalSearchParams();
  const id = useMemo(() => String(seekGroupId || ''), [seekGroupId]);
  const scheme = useColorScheme() ?? 'light';
  const iconColor = scheme === 'dark' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.68)';
  const insets = useSafeAreaInsets();
  const currentDeviceUuid = useMemo(() => getDeviceUuid(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberIconId, setNewMemberIconId] = useState(undefined);
  const [addingMember, setAddingMember] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');

  const load = useCallback(
    async (mode = 'initial') => {
      if (!id) return;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [g, m] = await Promise.all([getSeekGroup(id), getSeekMembersByGroup(id)]);
        setGroup(g?.payload ?? null);
        setMembers(Array.isArray(m?.payload) ? m.payload : []);
        setName(String(g?.payload?.name ?? ''));
      } catch (e) {
        setError(e?.message ?? 'Failed to load');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  useEffect(() => {
    if (!newMemberIconId) setNewMemberIconId(pickRandomContributorIconId());
  }, [newMemberIconId]);

  const canSave = useMemo(() => name.trim().length > 0 && !saving && !!group?.id, [name, saving, group]);

  async function onSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await putSeekGroup(id, { name: name.trim() });
      setGroup(res?.payload ?? null);
      Alert.alert('Saved', 'Group updated.');
    } catch (e) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  const memberCount = members?.length ?? 0;
  const storedMemberId = useMemo(() => {
    try {
      const events = listSeekEvents?.() ?? [];
      const ev = events.find((e) => String(e?.seekGroupId) === id);
      return ev?.memberId ? String(ev.memberId) : '';
    } catch {
      return '';
    }
  }, [id]);

  const myMember = useMemo(() => {
    if (storedMemberId) {
      return members.find((m) => String(m?.id) === storedMemberId) ?? null;
    }
    return members.find((m) => m?.deviceUuid && m.deviceUuid === currentDeviceUuid) ?? null;
  }, [members, storedMemberId, currentDeviceUuid]);

  // Best-effort: older app versions could create a member without setting deviceUuid,
  // making it appear "unoccupied" even though a device is using it.
  useEffect(() => {
    if (!id || !storedMemberId || !myMember?.id) return;
    if (myMember.deviceUuid) return;
    putSeekMember(storedMemberId, { deviceUuid: currentDeviceUuid }).catch(() => {
      // ignore (may conflict if member is already claimed elsewhere)
    });
  }, [id, storedMemberId, myMember?.id, myMember?.deviceUuid, currentDeviceUuid]);

  useEffect(() => {
    setSharing(isLocationSharingActive(id));
  }, [id]);

  useEffect(() => {
    return () => {
      // Best-effort stop on unmount (avoid leaking watchers).
      stopLocationSharing(id);
    };
  }, [id]);

  return (
    <ScrollView
      style={StyleSheet.absoluteFill}
      contentContainerStyle={[styles.container, { paddingTop: 16 + insets.top, flexGrow: 1 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {loading ? <ActivityIndicator /> : null}

      {!loading && !group ? (
        <View style={[styles.sectionCard, { marginTop: 6 }]}>
          <Text style={styles.sectionTitle}>Couldn’t load this event</Text>
          <Text style={styles.error}>{error || 'Network error. Please try again.'}</Text>
          <View style={styles.heroActions}>
            <Pressable
              style={[styles.primaryBtn, refreshing && styles.btnDisabled]}
              onPress={() => load('refresh')}
              disabled={refreshing}
              accessibilityRole="button"
            >
              {refreshing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Retry</Text>}
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => router.back()} accessibilityRole="button">
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>Tip: you can also pull down to refresh.</Text>
        </View>
      ) : null}

      {group ? (
        <>
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroNavRow}>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.heroNavIconBtn}
              >
                <FontAwesome name="chevron-left" size={18} color={iconColor} />
              </Pressable>

              <View style={styles.heroNavSpacer} />

              <View style={styles.heroNavRight}>
                <Pressable
                  onPress={() => setSettingsOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  style={styles.heroNavIconBtn}
                >
                  <FontAwesome name="cog" size={18} color={iconColor} />
                </Pressable>

                <Pressable
                  onPress={async () => {
                    try {
                      await Share.share({
                        message: `AnimalSeek Event\n\nEvent ID:\n${id}`,
                      });
                    } catch {
                      // ignore
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Share event"
                  style={styles.heroNavBtn}
                >
                  <FontAwesome name="share-square-o" size={18} color={iconColor} />
                  <Text style={styles.heroNavBtnText}>Share</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.heroTitle}>{group.name || 'Event'}</Text>
            <Text style={styles.heroMetaText}>{memberCount} members</Text>

            {/* Location sharing (moved into header/hero) */}
            <View style={styles.heroSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Location sharing</Text>
                <Text style={styles.mutedSmall}>{sharing ? 'On' : 'Off'}</Text>
              </View>

              {myMember ? (
                <Text style={styles.muted}>
                  Sharing GPS updates for <Text style={{ fontWeight: '900' }}>{myMember.name || 'this device'}</Text>{' '}
                  when you move.
                </Text>
              ) : (
                <Text style={styles.muted}>Claim a member on this device to start sharing GPS.</Text>
              )}

              {shareError ? <Text style={styles.error}>{shareError}</Text> : null}

              <View style={styles.playStopRow}>
                <Pressable
                  style={[styles.playBtn, (sharing || !myMember) && styles.btnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Start location sharing"
                  disabled={sharing || !myMember}
                  onPress={async () => {
                    if (!id || sharing || !myMember?.id) return;
                    setShareError('');
                    try {
                      await startLocationSharing({
                        seekGroupId: id,
                        onLocation: async (pos) => {
                          const coords = pos?.coords ?? {};
                          const lat = Number(coords.latitude);
                          const lng = Number(coords.longitude);
                          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                          await putSeekMemberLocation(myMember.id, {
                            deviceUuid: currentDeviceUuid,
                            latitude: lat,
                            longitude: lng,
                            accuracy: coords.accuracy,
                            altitude: coords.altitude,
                            heading: coords.heading,
                            speed: coords.speed,
                            recordedAt: new Date(pos?.timestamp ?? Date.now()).toISOString(),
                          });
                        },
                      });
                      setSharing(true);
                      await load('refresh');
                    } catch (e) {
                      setShareError(e?.message ?? 'Failed to start location sharing');
                      setSharing(false);
                    }
                  }}
                >
                  <FontAwesome name="play" size={16} color="#fff" />
                  <Text style={styles.playStopText}>Start</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.stopBtn,
                    sharing ? styles.stopBtnActive : null,
                    !sharing && styles.btnDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Stop location sharing"
                  disabled={!sharing}
                  onPress={async () => {
                    setShareError('');
                    try {
                      await stopLocationSharing(id);
                    } finally {
                      setSharing(false);
                    }
                  }}
                >
                  <FontAwesome name="stop" size={16} color={sharing ? '#fff' : '#111'} />
                  <Text style={[styles.playStopTextStop, sharing ? styles.playStopTextStopActive : null]}>
                    Stop
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Members */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Members</Text>
              <Pressable
                style={[styles.smallBtn, addingMember && styles.btnDisabled]}
                onPress={() => {
                  setNewMemberName('');
                  setNewMemberIconId(pickRandomContributorIconId());
                  setAddMemberOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Add member"
                disabled={addingMember}
              >
                <FontAwesome name="plus" size={18} color={iconColor} />
              </Pressable>
            </View>

            {memberCount === 0 ? (
              <Text style={styles.muted}>No members yet.</Text>
            ) : (
              members.map((m) => {
                const iconId = m?.icon;
                const emoji = iconId && ICONS[iconId] ? ICONS[iconId] : '🐾';
                const occupiedByThis = Boolean(m?.deviceUuid && m.deviceUuid === currentDeviceUuid);
                const occupiedByOther = Boolean(m?.deviceUuid && m.deviceUuid !== currentDeviceUuid);
                const isOccupied = Boolean(m?.deviceUuid);
                const isDeleting = deletingMemberId && String(deletingMemberId) === String(m?.id);
                const disabled = false;
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.row, (occupiedByThis || occupiedByOther) && styles.rowDisabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Open member"
                    disabled={disabled}
                    onPress={() => router.push(`/seek-group/${id}/member/${m.id}`)}
                  >
                    <Text style={styles.rowEmoji}>{emoji}</Text>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {m.name || 'Unknown'}
                      </Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {occupiedByOther ? 'Occupied' : occupiedByThis ? 'This device' : 'Tap to range'}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.iconBtn, (addingMember || isDeleting) && styles.btnDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Delete member"
                      disabled={addingMember || isDeleting}
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        if (!id || addingMember || isDeleting) return;
                        const memberName = String(m?.name || 'this member');
                        Alert.alert('Delete member?', `This will permanently delete ${memberName}.`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              setDeletingMemberId(String(m?.id || ''));
                              try {
                                // Best-effort: if deleting the member claimed by this device, stop sharing.
                                if (occupiedByThis) {
                                  try {
                                    await stopLocationSharing(id);
                                  } catch {
                                    // ignore
                                  }
                                  setSharing(false);
                                }
                                await deleteSeekMember(String(m?.id || ''));
                                await load('refresh');
                              } catch (err) {
                                Alert.alert('Could not delete member', err?.message ?? 'Please try again.');
                              } finally {
                                setDeletingMemberId('');
                              }
                            },
                          },
                        ]);
                      }}
                    >
                      {isDeleting ? (
                        <ActivityIndicator />
                      ) : (
                        <FontAwesome name="trash" size={18} color={occupiedByOther ? 'rgba(0,0,0,0.35)' : iconColor} />
                      )}
                    </Pressable>
                    <View style={[styles.statusDot, isOccupied ? styles.statusDotOccupied : styles.statusDotFree]} />
                  </Pressable>
                );
              })
            )}
          </View>
        </>
      ) : null}

      {group ? (
        <SeekGroupSettingsModal
          open={settingsOpen}
          groupName={group?.name ?? ''}
          disabled={loading || refreshing || saving}
          onClose={() => setSettingsOpen(false)}
          onSaveName={async (nextName) => {
            const next = String(nextName || '').trim();
            if (!next) {
              Alert.alert('Missing title', 'Please enter an event title.');
              return;
            }
            const res = await putSeekGroup(id, { name: next });
            setGroup(res?.payload ?? null);
            setName(next);
            setSettingsOpen(false);
          }}
        />
      ) : null}

      <Modal visible={addMemberOpen} animationType="slide" onRequestClose={() => setAddMemberOpen(false)}>
        <View style={[styles.modalRoot, { paddingTop: 16 + insets.top, paddingBottom: 16 + insets.bottom }]}>
          <Text style={styles.modalTitle}>Add member</Text>
          <Text style={styles.modalHint}>This will add an unclaimed member (not tied to this device).</Text>
          <View style={styles.rowInline}>
            <TextInput
              value={newMemberName}
              onChangeText={setNewMemberName}
              placeholder="Member name"
              style={[styles.input, { flex: 1 }]}
              autoCapitalize="words"
              editable={!addingMember}
            />
            <ContributorIconPicker value={newMemberIconId} onChange={setNewMemberIconId} />
          </View>

          <View style={styles.heroActions}>
            <Pressable style={styles.secondaryBtn} onPress={() => setAddMemberOpen(false)} accessibilityRole="button">
              <Text style={styles.secondaryBtnText}>Close</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryBtn,
                (!newMemberName.trim() || addingMember || !id) && styles.btnDisabled,
              ]}
              onPress={async () => {
                if (!id || addingMember) return;
                const nm = newMemberName.trim();
                if (!nm) return;
                setAddingMember(true);
                try {
                  await postSeekMember(id, {
                    name: nm,
                    icon: newMemberIconId,
                  });
                  setAddMemberOpen(false);
                  await load('refresh');
                } catch (e) {
                  Alert.alert('Could not add member', e?.message ?? 'Please try again.');
                } finally {
                  setAddingMember(false);
                }
              }}
              accessibilityRole="button"
              disabled={!newMemberName.trim() || addingMember || !id}
            >
              {addingMember ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Add</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginTop: 6,
  },
  heroNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroNavSpacer: { flex: 1 },
  heroNavRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroNavIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroNavIconBtnStop: {
    borderColor: 'rgba(176,0,32,0.18)',
    backgroundColor: '#b00020',
  },
  heroNavBtn: {
    height: 36,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroNavBtnText: { fontWeight: '800' },
  heroTitle: { fontSize: 22, fontWeight: '900' },
  heroMetaText: { marginTop: 6, opacity: 0.7 },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginTop: 14,
    gap: 12,
  },
  heroSectionCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    gap: 12,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  smallBtn: {
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
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  rowInline: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  modalRoot: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalHint: { opacity: 0.7, lineHeight: 20, marginTop: -10 },
  heroActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', alignItems: 'center' },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7d32',
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  secondaryBtnText: { fontWeight: '700' },
  muted: { opacity: 0.7, lineHeight: 20 },
  mutedSmall: { opacity: 0.7, fontSize: 12, fontWeight: '800' },
  error: { color: '#b00020' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rowDisabled: { opacity: 0.5 },
  rowEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { fontWeight: '900' },
  rowSubtitle: { opacity: 0.6, marginTop: 2, fontSize: 12 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  statusDotFree: {
    backgroundColor: '#b00020',
  },
  statusDotOccupied: {
    backgroundColor: '#2f7d32',
  },
  playStopRow: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', alignItems: 'center' },
  playBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7d32',
  },
  stopBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  stopBtnActive: {
    borderColor: 'rgba(176,0,32,0.18)',
    backgroundColor: '#b00020',
  },
  playStopText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  playStopTextStop: { color: '#111', fontSize: 16, fontWeight: '900' },
  playStopTextStopActive: { color: '#fff' },
});

