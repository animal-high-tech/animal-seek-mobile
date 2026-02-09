import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SeekGroupSettingsModal({ open, groupName, disabled, onClose, onSaveName }) {
  const scheme = useColorScheme() ?? 'light';
  const placeholderTextColor = scheme === 'dark' ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.32)';
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(groupName ?? '');
  }, [groupName, open]);

  const canSave = useMemo(() => Boolean(name.trim()) && !disabled && !saving, [disabled, name, saving]);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSaveName(name.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={[styles.modalRoot, { paddingTop: 16 + insets.top, paddingBottom: 16 + insets.bottom }]}>
        <Text style={styles.modalTitle}>Settings</Text>

        <Text style={styles.modalLabel}>Event title</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Backcountry Buddy"
          placeholderTextColor={placeholderTextColor}
          style={styles.input}
          editable={!disabled && !saving}
        />

        <View style={styles.modalActions}>
          <Pressable style={styles.secondaryBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.secondaryBtnText}>Close</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, !canSave && styles.btnDisabled]}
            onPress={handleSave}
            accessibilityRole="button"
            disabled={!canSave}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flexGrow: 1,
    paddingHorizontal: 16,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalLabel: {
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  modalActions: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7d32',
  },
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
  btnDisabled: { opacity: 0.5 },
});

