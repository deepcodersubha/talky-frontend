import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "../../config/constants";
import { Header } from "../../components/common/Header";
import { Button } from "../../components/common/Button";
import { usePairingStore } from "../../state/pairingStore";
import { KeyRound, RefreshCw, Clock } from "lucide-react-native";

interface Props {
  navigation: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export const CreatePairingScreen: React.FC<Props> = ({ navigation }) => {
  const [code, setCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const { createPairingCode, isLoading, hasActivePairing, fetchCurrentPairing } = usePairingStore();

  const handleGenerate = async () => {
    try {
      const res = await createPairingCode();
      setCode(res.code);
      setTimeLeft(res.expiresInSeconds);
    } catch {
      // Handled
    }
  };

  useEffect(() => {
    handleGenerate();
  }, []);

  // Poll for peer joining
  useEffect(() => {
    if (hasActivePairing) {
      navigation.navigate("MainPTT");
      return;
    }

    const interval = setInterval(() => {
      fetchCurrentPairing();
    }, 2000);

    return () => clearInterval(interval);
  }, [hasActivePairing]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Pair Device" onBack={() => navigation.goBack()} />

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <KeyRound size={32} color={THEME.colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Your One-Time Code</Text>
          <Text style={styles.cardSubtitle}>
            Give this 6-character code to your friend to pair permanently.
          </Text>

          {isLoading && !code ? (
            <ActivityIndicator size="large" color={THEME.colors.primary} style={styles.loader} />
          ) : (
            <>
              {/* Code Display Blocks */}
              <View style={styles.codeContainer}>
                {code?.split("").map((char, index) => (
                  <View key={index} style={styles.charBlock}>
                    <Text style={styles.charText}>{char}</Text>
                  </View>
                ))}
              </View>

              {/* Timer Badge */}
              <View style={styles.timerRow}>
                <Clock size={16} color={timeLeft < 60 ? THEME.colors.danger : THEME.colors.textMuted} />
                <Text
                  style={[
                    styles.timerText,
                    timeLeft < 60 && { color: THEME.colors.danger },
                  ]}
                >
                  Expires in {formatTimer(timeLeft)}
                </Text>
              </View>
            </>
          )}

          <Button
            title="Generate New Code"
            variant="outline"
            onPress={handleGenerate}
            loading={isLoading}
            icon={<RefreshCw size={18} color={THEME.colors.primary} />}
            style={styles.refreshBtn}
          />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("JoinPairing")}
          style={styles.switchRow}
        >
          <Text style={styles.switchText}>
            Entering a friend's code instead? <Text style={styles.linkText}>Enter Code</Text>
          </Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    alignItems: "center",
    marginTop: THEME.spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.md,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: THEME.colors.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    marginBottom: THEME.spacing.xl,
  },
  loader: {
    marginVertical: THEME.spacing.xl,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: THEME.spacing.lg,
  },
  charBlock: {
    width: 44,
    height: 56,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.primaryDark,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  charText: {
    fontSize: 26,
    fontWeight: "800",
    color: THEME.colors.primary,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: THEME.spacing.xl,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    marginLeft: 6,
  },
  refreshBtn: {
    width: "100%",
  },
  switchRow: {
    alignItems: "center",
    paddingVertical: THEME.spacing.md,
  },
  switchText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
  },
  linkText: {
    color: THEME.colors.primary,
    fontWeight: "700",
  },
});
