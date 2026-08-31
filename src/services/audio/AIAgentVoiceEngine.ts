import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { AgoraVoiceEngine } from "./AgoraVoiceEngine";
import { AgoraAIAgentService } from "./AgoraAIAgentService";
import { ApiService } from "../../api/client";
import { usePairingStore } from "../../state/pairingStore";

export type AIConversationState =
  | "INITIALIZING"
  | "CONNECTING"
  | "AI_SPEAKING"
  | "LISTENING"
  | "MUTED"
  | "ERROR"
  | "DISCONNECTED";

export interface AIEngineCallbacks {
  onStateChange: (state: AIConversationState) => void;
  onVolumeChange: (localVolume: number, remoteVolume: number) => void;
  onSubtitleChange: (text: string) => void;
}

export class AIAgentVoiceEngine {
  private static instance: AIAgentVoiceEngine | null = null;
  private currentChannel: string | null = null;
  private activeAgentId: string | undefined = undefined;
  private isMuted = false;
  private isSpeakerOn = true;
  private callbacks: AIEngineCallbacks | null = null;
  private currentState: AIConversationState = "INITIALIZING";

  static getInstance(): AIAgentVoiceEngine {
    if (!this.instance) {
      this.instance = new AIAgentVoiceEngine();
    }
    return this.instance;
  }

  setCallbacks(callbacks: AIEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  clearCallbacks(): void {
    this.callbacks = null;
  }

  private updateState(newState: AIConversationState): void {
    console.log(`🤖 [AI Voice Engine] State transition: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    this.callbacks?.onStateChange(newState);
  }

  async configureLoudspeaker(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.warn("AudioMode config warning:", e);
    }
  }

  async startConversation(userId?: string): Promise<void> {
    let channelName = `talky_ai_${userId || "guest"}_${Date.now()}`;
    let userAccount = userId || `user_${Math.floor(Math.random() * 10000)}`;
    let token = "";
    const initialGreeting = "Hello there! How may I help you today?";

    // Acquire valid signed token from backend if paired to prevent Agora Error 110
    const activePairing = usePairingStore.getState().pairing;
    if (activePairing) {
      try {
        const credentials = await ApiService.getAgoraToken(activePairing.id);
        channelName = credentials.channelName;
        userAccount = credentials.userAccount;
        token = credentials.token;
        console.log(`🔑 [AI Voice Engine] Using valid RTC token for channel: ${channelName}`);
      } catch (tokenErr) {
        console.warn("Could not get pairing token for AI channel:", tokenErr);
      }
    }

    this.currentChannel = channelName;
    this.isMuted = false;
    this.isSpeakerOn = true;

    // 1. Configure audio routing
    await this.configureLoudspeaker();

    // 2. Set callbacks on shared AgoraVoiceEngine
    const rtc = AgoraVoiceEngine.getInstance();
    rtc.setAICallbacks(
      (localVol, remoteVol) => {
        this.callbacks?.onVolumeChange(localVol, remoteVol);
        if (remoteVol > 15 && this.currentState !== "AI_SPEAKING") {
          this.updateState("AI_SPEAKING");
        } else if (remoteVol <= 5 && localVol > 10 && !this.isMuted && this.currentState !== "LISTENING") {
          this.updateState("LISTENING");
        }
      },
      (isSpeaking) => {
        if (isSpeaking) {
          this.updateState("AI_SPEAKING");
        } else if (!this.isMuted) {
          this.updateState("LISTENING");
        }
      }
    );

    // 3. Display greeting on screen & set state
    this.callbacks?.onSubtitleChange(initialGreeting);
    this.updateState("AI_SPEAKING");

    // 4. Play connection chime sound
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: "https://actions.google.com/sounds/v1/tools/positive_notification.ogg" },
        { shouldPlay: true, volume: 1.0 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch {}

    // 5. Join the Agora RTC channel in full-duplex mode with valid token
    try {
      const joinCode = await rtc.joinAIChannel(channelName, userAccount, token);
      console.log(`🚀 [AI Voice Engine] joinAIChannel result: ${joinCode}`);

      // 6. Spawn the Agora Cloud Conversational AI Agent into the channel
      const agentRes = await AgoraAIAgentService.startAgent(channelName, token);
      if (agentRes.agentId) {
        this.activeAgentId = agentRes.agentId;
      }
    } catch (err) {
      console.warn("Error starting AI conversation session:", err);
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    AgoraVoiceEngine.getInstance().setMuteAI(this.isMuted);
    if (this.isMuted) {
      this.updateState("MUTED");
    } else {
      this.updateState("LISTENING");
    }
    return this.isMuted;
  }

  toggleSpeakerphone(): boolean {
    this.isSpeakerOn = !this.isSpeakerOn;
    AgoraVoiceEngine.getInstance().setSpeakerphoneAI(this.isSpeakerOn);
    Audio.setAudioModeAsync({
      playThroughEarpieceAndroid: !this.isSpeakerOn,
    }).catch(() => {});
    return this.isSpeakerOn;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  getIsSpeakerOn(): boolean {
    return this.isSpeakerOn;
  }

  async stopConversation(): Promise<void> {
    try {
      Speech.stop();
      if (this.currentChannel) {
        AgoraAIAgentService.stopAgent(this.currentChannel, this.activeAgentId);
        this.currentChannel = null;
        this.activeAgentId = undefined;
      }
      const rtc = AgoraVoiceEngine.getInstance();
      rtc.clearAICallbacks();
      await rtc.leaveChannel();
      this.updateState("DISCONNECTED");
    } catch (err) {
      console.warn("Error stopping AI conversation:", err);
    }
  }

  destroy(): void {
    this.stopConversation();
  }
}
