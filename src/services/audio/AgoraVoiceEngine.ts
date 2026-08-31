import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  AudioProfileType,
  AudioScenarioType,
} from "react-native-agora";
import { Platform } from "react-native";
import { ApiService } from "../../api/client";
import { usePairingStore } from "../../state/pairingStore";
import { usePTTStore } from "../../state/pttStore";
import { PermissionService } from "../native/PermissionService";
import { AGORA_APP_ID } from "../../config/constants";

export class AgoraVoiceEngine {
  private static instance: AgoraVoiceEngine | null = null;
  private engine: IRtcEngine | null = null;
  private currentChannel: string | null = null;
  private isJoined = false;
  private isJoining = false;
  private isAIMode = false;

  // Callbacks for AI Assistant mode
  private aiVolumeCallback: ((localVol: number, remoteVol: number) => void) | null = null;
  private aiRemoteSpeakingCallback: ((speaking: boolean) => void) | null = null;

  static getInstance(): AgoraVoiceEngine {
    if (!this.instance) {
      this.instance = new AgoraVoiceEngine();
    }
    return this.instance;
  }

  getEngine(): IRtcEngine | null {
    return this.engine;
  }

  setAICallbacks(
    onVolume: (localVol: number, remoteVol: number) => void,
    onSpeaking: (speaking: boolean) => void
  ) {
    this.aiVolumeCallback = onVolume;
    this.aiRemoteSpeakingCallback = onSpeaking;
  }

  clearAICallbacks() {
    this.aiVolumeCallback = null;
    this.aiRemoteSpeakingCallback = null;
  }

  async requestAudioPermissions(): Promise<boolean> {
    return await PermissionService.requestAllPermissions();
  }

  async initialize(appId: string): Promise<void> {
    if (this.engine) return;

    if (Platform.OS === "web") {
      return;
    }

    try {
      await this.requestAudioPermissions();

      this.engine = createAgoraRtcEngine();
      this.engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        audioScenario: AudioScenarioType.AudioScenarioDefault,
      });

      this.engine.setAudioProfile(
        AudioProfileType.AudioProfileSpeechStandard,
        AudioScenarioType.AudioScenarioDefault
      );

      try {
        this.engine.setParameters("{\"che.audio.fec\": true}");
        this.engine.setParameters("{\"che.audio.red\": true}");
        this.engine.setParameters("{\"che.audio.custom_bitrate\": 24000}");
        this.engine.setParameters("{\"che.audio.frame_per_packet\": 2}");
        this.engine.setParameters("{\"che.audio.enable.ns\": true}");
        this.engine.setParameters("{\"che.audio.enable.aec\": true}");
      } catch (paramErr) {
        console.warn("Agora private parameters error:", paramErr);
      }

      this.engine.adjustPlaybackSignalVolume(400);
      this.engine.adjustRecordingSignalVolume(400);

      this.engine.registerEventHandler({
        onJoinChannelSuccess: (connection) => {
          console.log(`✅ [Agora RTC] Successfully joined channel: ${connection.channelId} (AI mode: ${this.isAIMode})`);
          this.isJoined = true;
          this.isJoining = false;
          this.currentChannel = connection.channelId || null;

          if (this.isAIMode) {
            this.engine?.setDefaultAudioRouteToSpeakerphone(true);
            this.engine?.setEnableSpeakerphone(true);
            this.engine?.muteLocalAudioStream(false);
            this.engine?.updateChannelMediaOptions({ publishMicrophoneTrack: true, autoSubscribeAudio: true });
          } else {
            usePTTStore.getState().setNetworkQuality("EXCELLENT");
          }
        },

        onNetworkQuality: (connection, remoteUid, txQuality, rxQuality) => {
          const worstQuality = Math.max(txQuality, rxQuality);
          if (worstQuality <= 2) {
            usePTTStore.getState().setNetworkQuality("EXCELLENT");
          } else if (worstQuality <= 4) {
            usePTTStore.getState().setNetworkQuality("POOR_ADAPTIVE");
          } else {
            usePTTStore.getState().setNetworkQuality("CRITICAL_OFFLINE");
          }
        },

        onAudioRoutingChanged: (routing) => {
          console.log(`🎧 [Agora RTC] Audio route active: ${routing}`);
        },

        onUserJoined: (connection, remoteUid, elapsed) => {
          console.log(`👤 [Agora RTC] Remote user/agent joined channel (uid: ${remoteUid}, in ${elapsed}ms)`);
          if (this.isAIMode) {
            this.aiRemoteSpeakingCallback?.(true);
          }
        },

        onUserOffline: (connection, remoteUid, reason) => {
          console.log(`👋 [Agora RTC] Remote user/agent left channel (uid: ${remoteUid}, reason: ${reason})`);
          if (this.isAIMode) {
            this.aiRemoteSpeakingCallback?.(false);
          }
        },

        onRemoteAudioStateChanged: (connection, remoteUid, state, reason) => {
          console.log(`🔊 [Agora RTC] Remote audio state: uid=${remoteUid}, state=${state}, reason=${reason}`);
          if (this.isAIMode) {
            this.aiRemoteSpeakingCallback?.(state === 2);
          }
        },

        onUserMuteAudio: (connection, remoteUid, muted) => {
          console.log(`🎙️ [Agora RTC] Remote user audio mute state: uid=${remoteUid}, muted=${muted}`);
          if (!this.isAIMode) {
            const isSilenced = usePairingStore.getState().pairing?.isSilenced;
            if (!muted && !isSilenced) {
              usePTTStore.getState().setRemoteSpeaking("Friend", true);
            } else {
              usePTTStore.getState().setRemoteSpeaking(null, false);
            }
          }
        },

        onAudioVolumeIndication: (connection, speakers, totalVolume) => {
          if (this.isAIMode) {
            let localVol = 0;
            let remoteVol = 0;
            speakers.forEach((spk) => {
              if (spk.uid === 0) {
                localVol = spk.volume || 0;
              } else {
                remoteVol = spk.volume || 0;
              }
            });
            this.aiVolumeCallback?.(localVol, remoteVol);
          } else if (totalVolume > 5) {
            console.log(`📊 [Agora RTC] Live audio volume: ${totalVolume}`);
          }
        },

        onLeaveChannel: () => {
          console.log("🚪 [Agora RTC] Left channel successfully");
          this.isJoined = false;
          this.isJoining = false;
          this.currentChannel = null;
        },

        onError: (errCode, msg) => {
          console.warn(`❌ [Agora RTC Error] Code: ${errCode}, Message: ${msg}`);
          this.isJoining = false;
        },
      });

      this.engine.enableAudio();
      this.engine.enableLocalAudio(true);
      this.engine.enableAudioVolumeIndication(150, 3, true);
    } catch (err) {
      console.warn("Failed to initialize Agora RTC engine:", err);
      this.isJoining = false;
    }
  }

  async leaveChannel(): Promise<void> {
    if (this.engine && (this.isJoined || this.currentChannel || this.isJoining)) {
      console.log(`🚪 [Agora RTC] Requesting leave from channel: ${this.currentChannel}`);
      try {
        this.engine.leaveChannel();
      } catch {}
      this.isJoined = false;
      this.isJoining = false;
      this.currentChannel = null;
      // Allow Agora C++ engine to cleanly tear down
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  async joinPairingChannel(pairingId: string): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      this.isAIMode = false;
      await this.requestAudioPermissions();

      const credentials = await ApiService.getAgoraToken(pairingId);
      console.log(`🔑 [Agora RTC] Acquired token for PTT channel: ${credentials.channelName}`);

      if (!this.engine) {
        await this.initialize(credentials.appId || AGORA_APP_ID);
      }

      if (this.currentChannel === credentials.channelName && this.isJoined) {
        console.log("✅ [Agora RTC] Already in PTT target channel");
        return;
      }

      if (this.currentChannel && this.currentChannel !== credentials.channelName) {
        await this.leaveChannel();
      }

      this.isJoining = true;
      this.engine?.setEnableSpeakerphone(false);
      this.engine?.muteLocalAudioStream(true);
      this.engine?.updateChannelMediaOptions({ publishMicrophoneTrack: false, autoSubscribeAudio: true });

      const res = this.engine?.joinChannelWithUserAccount(
        credentials.token,
        credentials.channelName,
        credentials.userAccount,
        {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: false,
          autoSubscribeAudio: true,
        }
      );
      console.log(`🚀 [Agora RTC] joinPairingChannel dispatched (code: ${res})`);
    } catch (err) {
      console.warn("Failed to join Agora pairing channel:", err);
      this.isJoining = false;
    }
  }

  async joinAIChannel(channelName: string, userAccount: string, token: string = ""): Promise<number | undefined> {
    if (Platform.OS === "web") return;

    try {
      this.isAIMode = true;
      await this.requestAudioPermissions();

      if (!this.engine) {
        await this.initialize(AGORA_APP_ID);
      }

      if (this.currentChannel) {
        await this.leaveChannel();
      }

      this.isJoining = true;
      this.engine?.setDefaultAudioRouteToSpeakerphone(true);
      this.engine?.setEnableSpeakerphone(true);
      this.engine?.muteLocalAudioStream(false);
      this.engine?.updateChannelMediaOptions({ publishMicrophoneTrack: true, autoSubscribeAudio: true });

      const res = this.engine?.joinChannelWithUserAccount(
        token,
        channelName,
        userAccount,
        {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
        }
      );
      console.log(`🚀 [Agora RTC] joinAIChannel dispatched (code: ${res})`);
      return res;
    } catch (err) {
      console.warn("Failed to join Agora AI channel:", err);
      this.isJoining = false;
      return -1;
    }
  }


  startTransmitting(): void {
    if (this.engine && !this.isAIMode) {
      console.log("🎙️ [Agora RTC] Live PTT start: un-muting and publishing microphone");
      this.engine.muteLocalAudioStream(false);
      this.engine.updateChannelMediaOptions({ publishMicrophoneTrack: true });
      this.engine.enableLocalAudio(true);
    }
  }

  stopTransmitting(): void {
    if (this.engine && !this.isAIMode) {
      console.log("🔇 [Agora RTC] Live PTT stop: muting and un-publishing microphone");
      this.engine.muteLocalAudioStream(true);
      this.engine.updateChannelMediaOptions({ publishMicrophoneTrack: false });
    }
  }

  setMuteAI(muted: boolean): void {
    if (this.engine && this.isAIMode) {
      this.engine.muteLocalAudioStream(muted);
      this.engine.updateChannelMediaOptions({ publishMicrophoneTrack: !muted });
    }
  }

  setSpeakerphoneAI(speaker: boolean): void {
    if (this.engine) {
      this.engine.setEnableSpeakerphone(speaker);
      this.engine.setDefaultAudioRouteToSpeakerphone(speaker);
    }
  }

  setSilence(isSilenced: boolean): void {
    if (this.engine) {
      this.engine.muteAllRemoteAudioStreams(isSilenced);
    }
  }

  destroy(): void {
    if (this.engine) {
      this.leaveChannel();
      this.engine.release();
      this.engine = null;
    }
  }
}
