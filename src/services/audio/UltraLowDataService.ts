import * as Speech from "expo-speech";
import { AudioCueService } from "./AudioCueService";
import { usePTTStore } from "../../state/pttStore";

export class UltraLowDataService {
  /**
   * Synthesizes and speaks out loud an ultra-low data text payload over the loudspeaker.
   */
  static async speakReceivedMessage(senderName: string, text: string): Promise<void> {
    try {
      await AudioCueService.playOfflineVoiceChirp();
      await new Promise((r) => setTimeout(r, 300));

      usePTTStore.getState().setRemoteSpeaking(senderName, true);

      Speech.speak(text, {
        language: "en",
        pitch: 1.0,
        rate: 0.95,
        onDone: () => {
          usePTTStore.getState().setRemoteSpeaking(null, false);
          AudioCueService.playRogerBeep();
        },
        onError: () => {
          usePTTStore.getState().setRemoteSpeaking(null, false);
        },
      });
    } catch (err) {
      console.warn("Failed to speak text message:", err);
      usePTTStore.getState().setRemoteSpeaking(null, false);
    }
  }

  static stopSpeaking(): void {
    try {
      Speech.stop();
      usePTTStore.getState().setRemoteSpeaking(null, false);
    } catch {}
  }
}
