import { Audio } from "expo-av";
import { Platform } from "react-native";

class AudioCueServiceClass {
  private static instance: AudioCueServiceClass | null = null;
  private soundObjects: Map<string, Audio.Sound> = new Map();
  private isConfigured = false;

  static getInstance(): AudioCueServiceClass {
    if (!this.instance) {
      this.instance = new AudioCueServiceClass();
    }
    return this.instance;
  }

  async configureAudioMode(): Promise<void> {
    if (this.isConfigured || Platform.OS === "web") return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isConfigured = true;
    } catch (err) {
      console.warn("Failed to configure AudioMode:", err);
    }
  }

  /**
   * Plays a synthesized radio key-up chirp when starting PTT transmission.
   */
  async playPTTStart(): Promise<void> {
    try {
      await this.configureAudioMode();
      // High-pitch short chirp for radio key-up
      const { sound } = await Audio.Sound.createAsync(
        { uri: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg" },
        { shouldPlay: true, volume: 0.6 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch {
      // Audio cue non-fatal
    }
  }

  /**
   * Plays a distinct Roger Beep when releasing PTT transmission.
   */
  async playRogerBeep(): Promise<void> {
    try {
      await this.configureAudioMode();
      const { sound } = await Audio.Sound.createAsync(
        { uri: "https://actions.google.com/sounds/v1/tools/click_on.ogg" },
        { shouldPlay: true, volume: 0.7 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch {
      // Audio cue non-fatal
    }
  }

  /**
   * Plays a walkie-talkie burst chime when an incoming offline voice note arrives.
   */
  async playOfflineVoiceChirp(): Promise<void> {
    try {
      await this.configureAudioMode();
      const { sound } = await Audio.Sound.createAsync(
        { uri: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg" },
        { shouldPlay: true, volume: 0.8 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch {
      // Audio cue non-fatal
    }
  }
}

export const AudioCueService = AudioCueServiceClass.getInstance();
