import { create } from "zustand";
import { ApiService } from "../api/client";
import { StorageService } from "../storage/secureStorage";
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

      const { user, tokens } = await ApiService.register({
        authIdentifier,
        displayName,
        password,
        deviceId,
        platform,
      });

      await StorageService.saveTokens(tokens.accessToken, tokens.refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || "Registration failed"
          : "Registration failed";
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  login: async (authIdentifier: string, password?: string) => {
    try {
      set({ isLoading: true, error: null });
      const deviceId = await StorageService.getOrCreateDeviceId();
      const platform = Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB";

      const { user, tokens } = await ApiService.login({
        authIdentifier,
        password,
        deviceId,
        platform,
      });

      await StorageService.saveTokens(tokens.accessToken, tokens.refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || "Login failed"
          : "Login failed";
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  logout: async () => {
    await StorageService.clearTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },
}));
