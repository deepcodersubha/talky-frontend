import { NativeModules, Platform } from "react-native";

const { TalkyNativeBridge } = NativeModules;

export class AndroidBridge {
  static isAvailable(): boolean {
    return Platform.OS === "android" && !!TalkyNativeBridge;
  }

  static async startForegroundService(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      return await TalkyNativeBridge.startForegroundService();
    } catch (err) {
      console.warn("Failed to start Android Foreground Service:", err);
      return false;
    }
  }

  static async stopForegroundService(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      return await TalkyNativeBridge.stopForegroundService();
    } catch (err) {
      console.warn("Failed to stop Android Foreground Service:", err);
      return false;
    }
  }

  static async requestIgnoreBatteryOptimizations(): Promise<boolean> {
    if (!this.isAvailable()) return true;
    try {
      return await TalkyNativeBridge.requestIgnoreBatteryOptimizations();
    } catch (err) {
      console.warn("Failed to request battery optimization whitelist:", err);
      return false;
    }
  }

  static async setAudioRouting(route: "speaker" | "earpiece" | "bluetooth"): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      return await TalkyNativeBridge.setAudioRouting(route);
    } catch (err) {
      console.warn("Failed to configure audio routing:", err);
      return false;
    }
  }

  static async getFCMToken(): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      return await TalkyNativeBridge.getFCMToken();
    } catch (err) {
      console.warn("Failed to retrieve FCM push token:", err);
      return null;
    }
  }
}
