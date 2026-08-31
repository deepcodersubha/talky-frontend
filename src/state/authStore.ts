import { create } from "zustand";
import { ApiService } from "../api/client";
import { StorageService } from "../storage/secureStorage";
import { AndroidBridge } from "../services/native/AndroidBridge";
import { User } from "../types";
import { Platform } from "react-native";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  register: (authIdentifier: string, displayName: string, password?: string) => Promise<void>;
  login: (authIdentifier: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const token = await StorageService.getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const { user } = await ApiService.getMe();
      set({ user, isAuthenticated: true, isLoading: false });

      // Sync latest FCM push token in background
      try {
        const pushToken = await AndroidBridge.getFCMToken();
        if (pushToken) {
          await ApiService.updatePushToken(pushToken);
        }
      } catch {
        // Non-critical token sync error
      }
    } catch {
      await StorageService.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  register: async (authIdentifier: string, displayName: string, password?: string) => {
    try {
      set({ isLoading: true, error: null });
      const deviceId = await StorageService.getOrCreateDeviceId();
      const platform = Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB";
      const pushToken = (await AndroidBridge.getFCMToken()) || undefined;

      const { user, tokens } = await ApiService.register({
        authIdentifier,
        displayName,
        password,
        deviceId,
        platform,
        pushToken,
      });

      await StorageService.saveTokens(tokens.accessToken, tokens.refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed";
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  login: async (authIdentifier: string, password?: string) => {
    try {
      set({ isLoading: true, error: null });
      const deviceId = await StorageService.getOrCreateDeviceId();
      const platform = Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB";
      const pushToken = (await AndroidBridge.getFCMToken()) || undefined;

      const { user, tokens } = await ApiService.login({
        authIdentifier,
        password,
        deviceId,
        platform,
        pushToken,
      });

      await StorageService.saveTokens(tokens.accessToken, tokens.refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Login failed";
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  logout: async () => {
    await StorageService.clearTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },
}));
