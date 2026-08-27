import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "../../config/constants";
import { Button } from "../../components/common/Button";
import { useAuthStore } from "../../state/authStore";
import { Radio, Lock, User as UserIcon } from "lucide-react-native";

export const AuthScreen: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [authIdentifier, setAuthIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, isLoading, error } = useAuthStore();

  const handleSubmit = async () => {
    if (!authIdentifier.trim()) {
      Alert.alert("Required", "Please enter your email or username.");
      return;
    }

    try {
      if (isRegister) {
        if (!displayName.trim()) {
          Alert.alert("Required", "Please enter your display name.");
          return;
        }
        await register(authIdentifier.trim(), displayName.trim(), password || undefined);
      } else {
        await login(authIdentifier.trim(), password || undefined);
      }
    } catch {
      // Error handled by store
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Logo / Header */}
          <View style={styles.brandContainer}>
            <View style={styles.iconCircle}>
              <Radio size={40} color={THEME.colors.primary} />
            </View>
            <Text style={styles.title}>Talky</Text>
            <Text style={styles.subtitle}>
              Live Two-Device Walkie-Talkie Push-to-Talk
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {isRegister && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Name</Text>
                <View style={styles.inputWrapper}>
                  <UserIcon size={20} color={THEME.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Alice"
                    placeholderTextColor={THEME.colors.textSubtle}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email or Username</Text>
              <View style={styles.inputWrapper}>
                <Radio size={20} color={THEME.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="alice@talky.app"
                  placeholderTextColor={THEME.colors.textSubtle}
                  value={authIdentifier}
                  onChangeText={setAuthIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color={THEME.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={THEME.colors.textSubtle}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              title={isRegister ? "Create Account" : "Sign In"}
              onPress={handleSubmit}
              loading={isLoading}
              style={styles.submitBtn}
            />

            <TouchableOpacity
              onPress={() => setIsRegister(!isRegister)}
              style={styles.toggleRow}
            >
              <Text style={styles.toggleText}>
                {isRegister
                  ? "Already have an account? Sign in"
                  : "Need a new account? Create one"}
              </Text>
            </TouchableOpacity>
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
    justifyContent: "center",
    paddingHorizontal: THEME.spacing.lg,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: THEME.spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
  },
  inputGroup: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
  },
  inputIcon: {
    marginRight: THEME.spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: THEME.colors.text,
    fontSize: 15,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 13,
    marginBottom: THEME.spacing.sm,
  },
  submitBtn: {
    marginTop: THEME.spacing.sm,
  },
  toggleRow: {
    alignItems: "center",
    marginTop: THEME.spacing.md,
  },
  toggleText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
});
