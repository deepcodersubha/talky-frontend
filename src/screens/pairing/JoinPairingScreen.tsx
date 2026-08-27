import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "../../config/constants";
import { Header } from "../../components/common/Header";
import { Button } from "../../components/common/Button";
import { usePairingStore } from "../../state/pairingStore";
import { Link2 } from "lucide-react-native";

interface Props {
  navigation: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export const JoinPairingScreen: React.FC<Props> = ({ navigation }) => {
  const [code, setCode] = useState("");
  const { joinPairing, isLoading, error } = usePairingStore();

  const handleJoin = async () => {
    if (code.trim().length < 6) {
      Alert.alert("Invalid Code", "Please enter the complete 6-character pairing code.");
      return;
    }

    try {
      await joinPairing(code.trim());
      navigation.navigate("PairingSuccess");
    } catch {
      // Handled by store
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Enter Code" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Link2 size={32} color={THEME.colors.accent} />
            </View>
            <Text style={styles.cardTitle}>Pair with a Friend</Text>
            <Text style={styles.cardSubtitle}>
              Enter the 6-character code shown on your friend's screen.
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.codeInput}
                placeholder="ABC123"
                placeholderTextColor={THEME.colors.textSubtle}
                value={code}
                onChangeText={(val) => setCode(val.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus={true}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              title="Pair Devices"
              onPress={handleJoin}
              loading={isLoading}
              disabled={code.trim().length < 4}
              style={styles.joinBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
    flex: 1,
    padding: THEME.spacing.lg,
    justifyContent: "center",
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(124, 77, 255, 0.15)",
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
  inputContainer: {
    width: "100%",
    marginBottom: THEME.spacing.lg,
  },
  codeInput: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.accent,
    borderWidth: 2,
    borderRadius: THEME.borderRadius.md,
    height: 64,
    fontSize: 28,
    fontWeight: "800",
    color: THEME.colors.text,
    textAlign: "center",
    letterSpacing: 8,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 13,
    marginBottom: THEME.spacing.md,
    textAlign: "center",
  },
  joinBtn: {
    width: "100%",
    backgroundColor: THEME.colors.accent,
  },
});
