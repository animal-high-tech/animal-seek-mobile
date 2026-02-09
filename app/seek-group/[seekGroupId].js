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
import { getSeekGroup, getSeekMembersByGroup, postSeekMember, putSeekGroup } from '../../services/animalSeekCore';
import SeekGroupSettingsModal from '../../components/SeekGroupSettingsModal';
import { getDeviceUuid } from '../../services/deviceId';

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
                const disabled = occupiedByThis || occupiedByOther;
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.row, disabled && styles.rowDisabled]}
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
                        {occupiedByOther ? 'Occupied' : occupiedByThis ? 'This device' : ''}
                      </Text>
                    </View>
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
          <Text style={styles.modalHint}>This member will be claimed by the current device.</Text>
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
                  await postSeekMember(id, { name: nm, icon: newMemberIconId, deviceUuid: currentDeviceUuid });
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
  error: { color: '#b00020' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rowDisabled: { opacity: 0.5 },
  rowEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { fontWeight: '900' },
  rowSubtitle: { opacity: 0.6, marginTop: 2, fontSize: 12 },
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
});

