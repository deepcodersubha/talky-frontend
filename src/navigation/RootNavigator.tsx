import React, { useEffect } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { THEME } from "../config/constants";
import { useAuthStore } from "../state/authStore";
import { usePairingStore } from "../state/pairingStore";
import { AuthScreen } from "../screens/auth/AuthScreen";
import { CreatePairingScreen } from "../screens/pairing/CreatePairingScreen";
import { JoinPairingScreen } from "../screens/pairing/JoinPairingScreen";
import { PairingSuccessScreen } from "../screens/pairing/PairingSuccessScreen";
import { MainPTTScreen } from "../screens/ptt/MainPTTScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { AudioSettingsScreen } from "../screens/settings/AudioSettingsScreen";
import { AIAssistantScreen } from "../screens/ai/AIAssistantScreen";

const Stack = createNativeStackNavigator();


export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, initAuth } = useAuthStore();
  const { fetchCurrentPairing } = usePairingStore();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentPairing();
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const customTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: THEME.colors.primary,
      background: THEME.colors.background,
      card: THEME.colors.surface,
      text: THEME.colors.text,
      border: THEME.colors.border,
      notification: THEME.colors.accent,
    },
  };

  return (
    <NavigationContainer theme={customTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: THEME.colors.background },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="MainPTT" component={MainPTTScreen} />
            <Stack.Screen name="CreatePairing" component={CreatePairingScreen} />
            <Stack.Screen name="JoinPairing" component={JoinPairingScreen} />
            <Stack.Screen name="PairingSuccess" component={PairingSuccessScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AudioSettings" component={AudioSettingsScreen} />
            <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
