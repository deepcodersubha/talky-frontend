import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "../../config/constants";
import { Header } from "../../components/common/Header";
import { Mic, Volume2, Bluetooth, AlertCircle } from "lucide-react-native";

interface Props {
  navigation: {
    goBack: () => void;
  };
}

export const AudioSettingsScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Audio Configuration" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Notice Card */}
        <View style={styles.noticeCard}>
          <AlertCircle size={20} color={THEME.colors.primary} style={styles.noticeIcon} />
          <Text style={styles.noticeText}>
            Talky is designed as a half-duplex walkie-talkie. Incoming voice streams automatically route to the device loudspeaker or connected Bluetooth headphones.
          </Text>
        </View>

        {/* Audio Route Details */}
        <Text style={styles.sectionHeader}>HARDWARE ROUTING</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Volume2 size={20} color={THEME.colors.primary} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowTitle}>Default Output Route</Text>
                <Text style={styles.rowSubtitle}>Loudspeaker (Hands-Free)</Text>
              </View>
            </View>
            <Text style={styles.statusBadge}>ACTIVE</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Bluetooth size={20} color={THEME.colors.accent} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowTitle}>Bluetooth Headset</Text>
                <Text style={styles.rowSubtitle}>Auto-switches when connected</Text>
              </View>
            </View>
            <Text style={styles.statusBadge}>AUTO</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Mic size={20} color={THEME.colors.success} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowTitle}>Microphone Access</Text>
                <Text style={styles.rowSubtitle}>Granted for PTT transmission</Text>
              </View>
            </View>
            <Text style={[styles.statusBadge, { color: THEME.colors.success }]}>GRANTED</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: THEME.spacing.md,
  },
  noticeCard: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 229, 255, 0.08)",
    borderColor: "rgba(0, 229, 255, 0.25)",
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  noticeIcon: {
    marginRight: THEME.spacing.sm,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: THEME.spacing.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: THEME.spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.md,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowIcon: {
    marginRight: THEME.spacing.md,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
  },
});
