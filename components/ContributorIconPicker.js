import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CONTRIBUTOR_ICON_IDS, ICONS } from '../constants/icons';

export default function ContributorIconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const emoji = useMemo(() => {
    if (!value) return '🙂';
    return ICONS[value] ?? '🙂';
  }, [value]);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={styles.triggerEmoji}>{emoji}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pick an icon</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {CONTRIBUTOR_ICON_IDS.map((id) => {
              const isSelected = id === value;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                  style={[styles.iconBtn, isSelected && styles.iconBtnSelected]}
                  accessibilityRole="button"
                >
                  <Text style={styles.iconEmoji}>{ICONS[id]}</Text>
                  <Text style={styles.iconLabel}>{id}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  triggerEmoji: {
    fontSize: 22,
  },
  modalRoot: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  done: {
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconBtn: {
    width: '30%',
    minWidth: 110,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
  },
  iconBtnSelected: {
    borderColor: 'rgba(0,0,0,0.45)',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  iconEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  iconLabel: {
    opacity: 0.6,
  },
});

