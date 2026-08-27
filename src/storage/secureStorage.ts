import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "talky_access_token";
const REFRESH_TOKEN_KEY = "talky_refresh_token";
const USER_KEY = "talky_user_profile";
const DEVICE_ID_KEY = "talky_device_id";

// Fallback in-memory storage for web environments
const memoryStorage = new Map<string, string>();

export class StorageService {
  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch {
        memoryStorage.set(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  }

  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch {
        return memoryStorage.get(key) || null;
      }
    }
    return SecureStore.getItemAsync(key);
  }

  static async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch {
        memoryStorage.delete(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }

  // Token helpers
  static async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.setItem(ACCESS_TOKEN_KEY, accessToken);
    await this.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  static async getAccessToken(): Promise<string | null> {
    return this.getItem(ACCESS_TOKEN_KEY);
  }

  static async getRefreshToken(): Promise<string | null> {
    return this.getItem(REFRESH_TOKEN_KEY);
  }

  static async clearTokens(): Promise<void> {
    await this.removeItem(ACCESS_TOKEN_KEY);
    await this.removeItem(REFRESH_TOKEN_KEY);
  }

  // Device ID helper
  static async getOrCreateDeviceId(): Promise<string> {
    let deviceId = await this.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await this.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }
}
