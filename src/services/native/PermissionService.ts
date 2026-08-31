import { PermissionsAndroid, Platform } from "react-native";

export class PermissionService {
  private static isRequesting = false;
  private static hasGrantedAudio = false;

  static async requestAllPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    if (this.hasGrantedAudio) return true;
    if (this.isRequesting) return false;

    this.isRequesting = true;
    try {
      const permissions: any[] = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];

      // Android 12+ (API 31+) for Bluetooth earphones / SCO
      if (typeof Platform.Version === "number" && Platform.Version >= 31) {
        permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      }

      // Android 13+ (API 33+) for Foreground Service notifications
      if (typeof Platform.Version === "number" && Platform.Version >= 33) {
        permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);

      this.hasGrantedAudio =
        results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return this.hasGrantedAudio;
    } catch (err) {
      console.warn("Failed to request app permissions:", err);
      return false;
    } finally {
      this.isRequesting = false;
    }
  }

  static async checkAudioPermission(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    try {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
    } catch {
      return false;
    }
  }
}
