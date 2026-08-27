import { NativeModules, Platform } from "react-native";

const { TalkyPushToTalkBridge } = NativeModules;

export class IOSBridge {
  static isAvailable(): boolean {
    return Platform.OS === "ios" && !!TalkyPushToTalkBridge;
  }

  static async joinPTTChannel(
    pairingId: string,
    channelName: string,
    displayName: string
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      return await TalkyPushToTalkBridge.joinPTTChannel(pairingId, channelName, displayName);
    } catch (err) {
      console.warn("Failed to join iOS PushToTalk channel:", err);
      return false;
    }
  }

  static async leavePTTChannel(pairingId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      return await TalkyPushToTalkBridge.leavePTTChannel(pairingId);
    } catch (err) {
      console.warn("Failed to leave iOS PushToTalk channel:", err);
      return false;
    }
  }

  static async reportSpeakerState(speakerName: string, isSpeaking: boolean): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      return await TalkyPushToTalkBridge.reportSpeakerState(speakerName, isSpeaking);
    } catch (err) {
      console.warn("Failed to report speaker state to iOS PTT framework:", err);
      return false;
    }
  }

  static async configureAudioSession(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      return await TalkyPushToTalkBridge.configureAudioSession();
    } catch (err) {
      console.warn("Failed to configure iOS audio session:", err);
      return false;
    }
  }
}
