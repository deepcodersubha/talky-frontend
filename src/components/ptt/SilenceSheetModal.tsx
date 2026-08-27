import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { THEME } from "../../config/constants";
import { VolumeX, Volume2, Clock, X } from "lucide-react-native";

interface SilenceSheetModalProps {
  visible: boolean;
  isCurrentlySilenced: boolean;
  onClose: () => void;
  onSelectSilence: (silenced: boolean, durationMinutes?: number) => void;
}

export const SilenceSheetModal: React.FC<SilenceSheetModalProps> = ({
  visible,
  isCurrentlySilenced,
  onClose,
  onSelectSilence,
}) => {
  const options = [
    { label: "Mute for 15 minutes", minutes: 15 },
    { label: "Mute for 1 hour", minutes: 60 },
    { label: "Mute for 8 hours", minutes: 480 },
    { label: "Mute indefinitely", minutes: undefined },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <VolumeX size={22} color={THEME.colors.warning} />
              <Text style={styles.title}>Silence Audio Options</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            When silenced, your device will not play incoming audio aloud. Your pairing remains active.
          </Text>

          {isCurrentlySilenced && (
            <TouchableOpacity
              style={styles.unmuteOption}
              onPress={() => {
                onSelectSilence(false);
                onClose();
              }}
            >
              <Volume2 size={20} color={THEME.colors.success} style={styles.optionIcon} />
              <Text style={styles.unmuteText}>Unmute Audio Now</Text>
            </TouchableOpacity>
          )}

          {options.map((opt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.option}
              onPress={() => {
                onSelectSilence(true, opt.minutes);
                onClose();
              }}
            >
              <Clock size={18} color={THEME.colors.textMuted} style={styles.optionIcon} />
              <Text style={styles.optionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.borderRadius.lg,
    borderTopRightRadius: THEME.borderRadius.lg,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    padding: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: THEME.spacing.sm,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.colors.text,
    marginLeft: 8,
  },
  closeBtn: {
    padding: 4,
  },
  description: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: THEME.spacing.md,
  },
  unmuteOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    borderColor: "rgba(0, 230, 118, 0.3)",
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  unmuteText: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.success,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  optionIcon: {
    marginRight: THEME.spacing.md,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
    color: THEME.colors.text,
  },
});
