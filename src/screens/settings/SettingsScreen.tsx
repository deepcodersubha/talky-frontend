import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "../../config/constants";
import { Header } from "../../components/common/Header";
import { useAuthStore } from "../../state/authStore";
import { usePairingStore } from "../../state/pairingStore";
import { AgoraVoiceEngine } from "../../services/audio/AgoraVoiceEngine";
import { WebSocketClient } from "../../services/websocket/WebSocketClient";
import {
  User,
  Volume2,
  Mic,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Info,
} from "lucide-react-native";

interface Props {
  navigation: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const { pairing, toggleSilence } = usePairingStore();

  const handleSilenceToggle = async (val: boolean) => {
    if (pairing) {
      await toggleSilence(val);
      AgoraVoiceEngine.getInstance().setSilence(val);
      WebSocketClient.getInstance().sendSilenceChanged(pairing.id, val);
    }
  };

  const handleLogout = async () => {
    AgoraVoiceEngine.getInstance().leaveChannel();
    WebSocketClient.getInstance().disconnect();
    await logout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <User size={28} color={THEME.colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || "User"}</Text>
            <Text style={styles.userEmail}>{user?.authIdentifier || ""}</Text>
          </View>
        </View>

        {/* Section: Audio & Privacy */}
        <Text style={styles.sectionHeader}>AUDIO & PRIVACY</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Volume2 size={20} color={THEME.colors.primary} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowTitle}>Silence Voice Audio</Text>
                <Text style={styles.rowSubtitle}>Mute incoming audio without unpairing</Text>
              </View>
            </View>
            <Switch
              value={pairing?.isSilenced || false}
              onValueChange={handleSilenceToggle}
              trackColor={{ false: THEME.colors.surfaceElevated, true: THEME.colors.primaryDark }}
              thumbColor={pairing?.isSilenced ? THEME.colors.primary : THEME.colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("AudioSettings")}
          >
            <View style={styles.rowLeft}>
              <Mic size={20} color={THEME.colors.accent} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowTitle}>Audio Routing & Permissions</Text>
                <Text style={styles.rowSubtitle}>Loudspeaker, Bluetooth & Mic status</Text>
              </View>
            </View>
            <ChevronRight size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section: Connection Info */}
        <Text style={styles.sectionHeader}>ABOUT TALKY</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <ShieldCheck size={20} color={THEME.colors.success} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowTitle}>End-to-End PTT Channel</Text>
                <Text style={styles.rowSubtitle}>Direct 1-to-1 low-latency encrypted audio</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Info size={20} color={THEME.colors.textMuted} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowTitle}>Version</Text>
                <Text style={styles.rowSubtitle}>1.0.0 (Production Build)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color={THEME.colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
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
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: THEME.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 2,
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
    marginBottom: THEME.spacing.lg,
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
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 51, 102, 0.12)",
    borderColor: "rgba(255, 51, 102, 0.3)",
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xxl,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.danger,
    marginLeft: 8,
  },
});
