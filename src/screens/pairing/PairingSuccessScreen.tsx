import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "../../config/constants";
import { Button } from "../../components/common/Button";
import { usePairingStore } from "../../state/pairingStore";
import { CheckCircle2, Radio } from "lucide-react-native";

interface Props {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export const PairingSuccessScreen: React.FC<Props> = ({ navigation }) => {
  const { pairing } = usePairingStore();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <CheckCircle2 size={56} color={THEME.colors.success} />
          </View>
          <Text style={styles.title}>You're Paired!</Text>
          <Text style={styles.subtitle}>
            Connected with <Text style={styles.peerName}>{pairing?.peer.displayName || "Friend"}</Text>
          </Text>

          <View style={styles.infoCard}>
            <Radio size={20} color={THEME.colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Your devices are now permanently connected. Press and hold the PTT button to talk anytime.
            </Text>
          </View>
        </View>

        <Button
          title="Start Talking"
          onPress={() => navigation.navigate("MainPTT")}
          style={styles.actionBtn}
        />
      </View>
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
    padding: THEME.spacing.lg,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.colors.textMuted,
    marginTop: 6,
    marginBottom: THEME.spacing.xl,
  },
  peerName: {
    color: THEME.colors.primary,
    fontWeight: "700",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginHorizontal: THEME.spacing.md,
  },
  infoIcon: {
    marginRight: THEME.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
  },
  actionBtn: {
    width: "100%",
    marginBottom: THEME.spacing.md,
  },
});
