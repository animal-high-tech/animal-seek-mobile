import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import ContributorIconPicker from '../../components/ContributorIconPicker';
import { ICONS, pickRandomContributorIconId } from '../../constants/icons';
import { getApiBaseUrl, getSeekGroup, getSeekMembersByGroup, postSeekGroup, postSeekMember, putSeekMember } from '../../services/animalSeekCore';
import { getDeviceUuid } from '../../services/deviceId';
import { upsertSeekEvent } from '../../services/seekEventsStore';
import { Text, View } from 'react-native';

export default function NewEventScreen() {
  const placeholderTextColor =
    (useColorScheme() ?? 'light') === 'dark' ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.32)';
  const [eventName, setEventName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [iconId, setIconId] = useState(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [memberChoiceOpen, setMemberChoiceOpen] = useState(false);
  const [joinGroup, setJoinGroup] = useState(null);
  const [joinMembers, setJoinMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [joinMemberName, setJoinMemberName] = useState('');
  const [joinMemberIconId, setJoinMemberIconId] = useState(undefined);
  const [creatingMember, setCreatingMember] = useState(false);
  const currentDeviceUuid = useMemo(() => getDeviceUuid(), []);

  // When returning to this screen, reset the form so users don't see stale state.
  useFocusEffect(
    useCallback(() => {
      setEventName('');
      setParticipantName('');
      setIconId(pickRandomContributorIconId());
      setSubmitting(false);
      setStatus('');
      setErrorMsg('');
      setJoinOpen(false);
      setJoinId('');
      setJoinSubmitting(false);
      setMemberChoiceOpen(false);
      setJoinGroup(null);
      setJoinMembers([]);
      setSelectedMemberId('');
      setJoinMemberName('');
      setJoinMemberIconId(undefined);
      setCreatingMember(false);
    }, [])
  );

  useEffect(() => {
    if (!iconId) setIconId(pickRandomContributorIconId());
  }, [iconId]);

  const canSubmit = useMemo(
    () => eventName.trim().length > 0 && participantName.trim().length > 0,
    [eventName, participantName]
  );

  async function handleCreate() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    setStatus('Creating event…');
    try {
      const { payload } = await postSeekGroup({
        name: eventName.trim(),
        lang: 'en-US',
      });

      const seekGroupId = payload.id;
      setStatus('Adding you to the event…');
      const deviceUuid = getDeviceUuid();
      const createdMemberRes = await postSeekMember(seekGroupId, {
        name: participantName.trim(),
        icon: iconId,
        deviceUuid,
      });
      const createdMemberId = createdMemberRes?.payload?.id;

      upsertSeekEvent({
        seekGroupId,
        name: eventName.trim(),
        participantName: participantName.trim(),
        iconId,
        memberId: createdMemberId,
      });

      setStatus('Created! Opening event…');
      router.push(`/seek-group/${seekGroupId}`);
    } catch (e) {
      const details = e?.message ?? 'Please try again.';
      setErrorMsg(details);
      setStatus('');
      console.log('[NewEvent] create failed', e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    const id = joinId.trim();
    if (!id || joinSubmitting) return;
    setJoinSubmitting(true);
    setErrorMsg('');
    try {
      const [g, m] = await Promise.all([getSeekGroup(id), getSeekMembersByGroup(id)]);
      const payload = g?.payload;
      const members = Array.isArray(m?.payload) ? m.payload : [];

      const deviceUuid = getDeviceUuid();
      setJoinGroup(payload ?? { id, name: payload?.name ?? id });
      setJoinMembers(members);
      setSelectedMemberId('');
      setJoinMemberName(participantName.trim());
      setJoinMemberIconId(iconId);
      setJoinOpen(false);
      setMemberChoiceOpen(true);
    } catch (e) {
      setErrorMsg('Could not join event. Please provide a valid Event ID.');
      console.log('[NewEvent] join failed', e);
    } finally {
      setJoinSubmitting(false);
    }
  }

  async function finishJoin(params) {
    const groupId = String(params.seekGroupId || '').trim();
    if (!groupId) return;

    upsertSeekEvent({
      seekGroupId: groupId,
      name: params.groupName ?? groupId,
      participantName: params.memberName ?? undefined,
      iconId: params.memberIconId ?? undefined,
      memberId: params.memberId ?? undefined,
    });

    setStatus('Joined! Opening event…');
    setMemberChoiceOpen(false);
    setJoinGroup(null);
    setJoinMembers([]);
    setJoinId('');
    router.push(`/seek-group/${groupId}`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.header}>
          <Text>🌿 </Text>
          <Text style={styles.headerStrong}>Create a new event</Text>
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Event title</Text>
          <TextInput
            value={eventName}
            onChangeText={setEventName}
            placeholder="e.g. Ski tour"
            placeholderTextColor={placeholderTextColor}
            style={styles.input}
            autoCapitalize="sentences"
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Your name</Text>
          <View style={styles.row}>
            <TextInput
              value={participantName}
              onChangeText={setParticipantName}
              placeholder="e.g. Chris"
              placeholderTextColor={placeholderTextColor}
              style={[styles.input, styles.flex1]}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <ContributorIconPicker value={iconId} onChange={setIconId} />
          </View>
          <Text style={styles.help}>
            This will be your default name for this event. Icon: {iconId ? ICONS[iconId] : '🙂'}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryBtnCompact, (!canSubmit || submitting) && styles.btnDisabled]}
            onPress={handleCreate}
            accessibilityRole="button"
            disabled={!canSubmit || submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Submit</Text>}
          </Pressable>

          <Pressable
            style={styles.secondaryBtnCompact}
            onPress={() => {
              setEventName('');
              setParticipantName('');
              setIconId(pickRandomContributorIconId());
            }}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Clear</Text>
          </Pressable>
        </View>

        <Pressable style={styles.joinLink} onPress={() => setJoinOpen(true)} accessibilityRole="button">
          <Text style={styles.joinLinkText}>Join by Event ID</Text>
        </Pressable>

        {status ? <Text style={styles.status}>{status}</Text> : null}
        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        <Text style={styles.meta}>Backend: {getApiBaseUrl()}</Text>
      </View>

      <Modal visible={joinOpen} animationType="slide" onRequestClose={() => setJoinOpen(false)}>
        <View style={styles.modalRoot}>
          <Text style={styles.modalTitle}>Join by Event ID</Text>
          <TextInput
            value={joinId}
            onChangeText={setJoinId}
            placeholder="Paste Event ID"
            placeholderTextColor={placeholderTextColor}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtnCompact} onPress={() => setJoinOpen(false)} accessibilityRole="button">
              <Text style={styles.secondaryBtnText}>Close</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtnCompact, (!joinId.trim() || joinSubmitting) && styles.btnDisabled]}
              onPress={handleJoin}
              accessibilityRole="button"
              disabled={!joinId.trim() || joinSubmitting}
            >
              {joinSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Submit</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={memberChoiceOpen} animationType="slide" onRequestClose={() => setMemberChoiceOpen(false)}>
        <View style={styles.modalRoot}>
          <Text style={styles.modalTitle}>Join as a member</Text>
          <Text style={styles.modalHint}>
            Pick an existing member, or create a new one for this device.
          </Text>

          <Text style={styles.modalLabel}>Existing members</Text>
          {(joinMembers?.length ?? 0) === 0 ? (
            <Text style={styles.muted}>No members yet.</Text>
          ) : (
            joinMembers.map((m) => {
              const emoji = m?.icon && ICONS[m.icon] ? ICONS[m.icon] : '🐾';
              const selected = String(m.id) === selectedMemberId;
              const occupiedByOther = Boolean(m?.deviceUuid && m.deviceUuid !== currentDeviceUuid);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedMemberId(String(m.id))}
                  style={[styles.pickRow, selected && styles.pickRowSelected, occupiedByOther && styles.pickRowDisabled]}
                  accessibilityRole="button"
                  disabled={occupiedByOther}
                >
                  <Text style={styles.pickEmoji}>{emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickTitle} numberOfLines={1}>
                      {m.name || 'Unknown'}
                    </Text>
                    <Text style={styles.pickSub} numberOfLines={1}>
                      {occupiedByOther ? 'Occupied' : m.id}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}

          <Text style={[styles.modalLabel, { marginTop: 14 }]}>Or create a new member</Text>
          <View style={styles.row}>
            <TextInput
              value={joinMemberName}
              onChangeText={setJoinMemberName}
              placeholder="Your name"
              placeholderTextColor={placeholderTextColor}
              style={[styles.input, styles.flex1]}
              autoCapitalize="words"
              editable={!creatingMember}
            />
            <ContributorIconPicker value={joinMemberIconId} onChange={setJoinMemberIconId} />
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtnCompact} onPress={() => setMemberChoiceOpen(false)} accessibilityRole="button">
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[
                styles.primaryBtnCompact,
                (!joinGroup?.id || creatingMember) && styles.btnDisabled,
              ]}
              onPress={async () => {
                const groupId = String(joinGroup?.id || '').trim();
                if (!groupId || creatingMember) return;

                // Option A: select existing member (no backend call)
                if (selectedMemberId) {
                  const m = joinMembers.find((x) => String(x.id) === String(selectedMemberId));
                  // Claim the member for this device (occupy semantics)
                  await putSeekMember(String(selectedMemberId), { deviceUuid: currentDeviceUuid });
                  await finishJoin({
                    seekGroupId: groupId,
                    groupName: joinGroup?.name ?? groupId,
                    memberId: selectedMemberId,
                    memberName: m?.name,
                    memberIconId: m?.icon,
                  });
                  return;
                }

                // Option B: create a new member
                const nm = String(joinMemberName || '').trim();
                if (!nm) {
                  Alert.alert('Missing name', 'Please enter your name, or select an existing member.');
                  return;
                }

                setCreatingMember(true);
                try {
                  const res = await postSeekMember(groupId, { name: nm, icon: joinMemberIconId, deviceUuid: currentDeviceUuid });
                  const memberId = res?.payload?.id;
                  await finishJoin({
                    seekGroupId: groupId,
                    groupName: joinGroup?.name ?? groupId,
                    memberId,
                    memberName: nm,
                    memberIconId: joinMemberIconId,
                  });
                } catch (e) {
                  Alert.alert('Could not create member', e?.message ?? 'Please try again.');
                } finally {
                  setCreatingMember(false);
                }
              }}
              accessibilityRole="button"
              disabled={!joinGroup?.id || creatingMember}
            >
              {creatingMember ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continue</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    gap: 14,
  },
  header: {
    fontSize: 18,
  },
  headerStrong: {
    fontWeight: '800',
  },
  field: {
    gap: 6,
  },
  label: {
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  help: {
    opacity: 0.7,
    lineHeight: 20,
  },
  meta: {
    opacity: 0.55,
    fontSize: 12,
    textAlign: 'center',
  },
  status: {
    opacity: 0.8,
    textAlign: 'center',
  },
  error: {
    color: '#b00020',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  primaryBtnCompact: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d6a4f',
    maxWidth: 180,
    flexGrow: 0,
    flexShrink: 0,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
  secondaryBtnCompact: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    backgroundColor: 'rgba(255,255,255,0.5)',
    maxWidth: 140,
    flexGrow: 0,
    flexShrink: 0,
  },
  secondaryBtnText: {
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  joinLink: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  joinLinkText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalRoot: {
    flex: 1,
    padding: 16,
    paddingTop: 80,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalHint: {
    opacity: 0.7,
    lineHeight: 20,
    marginTop: -6,
  },
  modalLabel: {
    fontWeight: '800',
  },
  muted: {
    opacity: 0.7,
    lineHeight: 20,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  pickRowSelected: {
    borderColor: 'rgba(47,125,50,0.55)',
    backgroundColor: 'rgba(47,125,50,0.12)',
  },
  pickRowDisabled: {
    opacity: 0.45,
  },
  pickEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  pickTitle: { fontWeight: '900' },
  pickSub: { opacity: 0.6, fontSize: 12, marginTop: 2 },
});

