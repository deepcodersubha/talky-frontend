import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  AudioProfileType,
  AudioScenarioType,
} from "react-native-agora";
import { Platform, PermissionsAndroid } from "react-native";
import { ApiService } from "../../api/client";
import { usePairingStore } from "../../state/pairingStore";
import { usePTTStore } from "../../state/pttStore";

export class AgoraVoiceEngine {
  private static instance: AgoraVoiceEngine | null = null;
  private engine: IRtcEngine | null = null;
  private currentChannel: string | null = null;
  private isJoined = false;
  private isJoining = false;

  static getInstance(): AgoraVoiceEngine {
    if (!this.instance) {
      this.instance = new AgoraVoiceEngine();
    }
    return this.instance;
  }

  async requestAudioPermissions(): Promise<boolean> {
    if (Platform.OS === "android") {
      try {
        const permissions: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS][] = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];

        if (typeof Platform.Version === "number" && Platform.Version >= 31) {
          permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        }

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        return (
          granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
          PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn("Failed to request audio permissions:", err);
        return false;
      }
    }
    return true;
  }

  async initialize(appId: string): Promise<void> {
    if (this.engine) return;

    if (Platform.OS === "web") {
      // Mock engine for web preview
      return;
    }

    try {
      await this.requestAudioPermissions();

      this.engine = createAgoraRtcEngine();
      this.engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        // GameStreaming keeps A2DP active and avoids forcing BT SCO handoff,
        // which was causing Bluetooth earphones to suspend the music stream
        audioScenario: AudioScenarioType.AudioScenarioGameStreaming,
      });

      // Speech standard audio profile for voice
      this.engine.setAudioProfile(
        AudioProfileType.AudioProfileSpeechStandard,
        AudioScenarioType.AudioScenarioGameStreaming
      );

      // Do NOT call setEnableSpeakerphone(true) — it forces Android to switch
      // to BT SCO (hands-free voice call profile) and suspend A2DP.
      // Instead, let Android's AudioManager auto-route based on connected device.
      this.engine.setEnableSpeakerphone(false);
      this.engine.adjustPlaybackSignalVolume(400);
      this.engine.adjustRecordingSignalVolume(400);

      // Register comprehensive event listeners
      this.engine.registerEventHandler({
        onJoinChannelSuccess: (connection) => {
          console.log(`✅ [Agora RTC] Successfully joined channel: ${connection.channelId}`);
          this.isJoined = true;
          this.isJoining = false;
          this.currentChannel = connection.channelId || null;
          // Half-duplex PTT: default to muted until PTT button is pressed
          this.engine?.muteLocalAudioStream(true);
          this.engine?.updateChannelMediaOptions({ publishMicrophoneTrack: false });
        },

        onAudioRoutingChanged: (routing) => {
          const routeMap: Record<number, string> = {
            [-1]: "Default",
            0: "Wired Headset with Mic",
            1: "Earpiece",
            2: "Headphones without Mic",
            3: "Phone Speakerphone / Loudspeaker",
            4: "Loudspeaker",
            5: "Bluetooth Earphones / Headset",
          };
          console.log(`🎧 [Agora RTC] Audio route active: ${routeMap[routing] || routing}`);
        },

        onUserJoined: (connection, remoteUid, elapsed) => {
          console.log(`👤 [Agora RTC] Remote user joined channel (uid: ${remoteUid}, in ${elapsed}ms)`);
        },

        onUserOffline: (connection, remoteUid, reason) => {
          console.log(`👋 [Agora RTC] Remote user left channel (uid: ${remoteUid}, reason: ${reason})`);
        },

        onRemoteAudioStateChanged: (connection, remoteUid, state, reason) => {
          console.log(`🔊 [Agora RTC] Remote audio state: uid=${remoteUid}, state=${state}, reason=${reason}`);
        },

        onUserMuteAudio: (connection, remoteUid, muted) => {
          console.log(`🎙️ [Agora RTC] Remote user audio mute state: uid=${remoteUid}, muted=${muted}`);
          const isSilenced = usePairingStore.getState().pairing?.isSilenced;
          if (!muted && !isSilenced) {
            usePTTStore.getState().setRemoteSpeaking("Friend", true);
          } else {
            usePTTStore.getState().setRemoteSpeaking(null, false);
          }
        },

        onAudioVolumeIndication: (connection, speakers, totalVolume) => {
          if (totalVolume > 5) {
            console.log(`📊 [Agora RTC] Live audio volume: ${totalVolume}`);
          }
        },

        onLeaveChannel: () => {
          console.log("🚪 [Agora RTC] Left channel");
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
      this.engine.enableAudioVolumeIndication(200, 3, true);
    } catch (err) {
      console.warn("Failed to initialize Agora RTC engine:", err);
      this.isJoining = false;
    }
  }

  async joinPairingChannel(pairingId: string): Promise<void> {
    if (Platform.OS === "web") return;

    if (this.isJoining) {
      console.log("⏳ [Agora RTC] Join already in progress, skipping duplicate call...");
      return;
    }

    try {
      this.isJoining = true;
      await this.requestAudioPermissions();

      const credentials = await ApiService.getAgoraToken(pairingId);
      console.log(`🔑 [Agora RTC] Acquired token for channel: ${credentials.channelName}`);

      if (!this.engine) {
        await this.initialize(credentials.appId);
      }

      if (this.currentChannel === credentials.channelName && this.isJoined) {
        console.log("✅ [Agora RTC] Already joined target channel");
        this.isJoining = false;
        return;
      }

      if (this.isJoined && this.currentChannel && this.currentChannel !== credentials.channelName) {
        this.engine?.leaveChannel();
        this.isJoined = false;
      }

      const res = this.engine?.joinChannelWithUserAccount(
        credentials.token,
        credentials.channelName,
        credentials.userAccount,
        {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
        }
      );
      console.log(`🚀 [Agora RTC] joinChannelWithUserAccount dispatched (code: ${res})`);
    } catch (err) {
      console.warn("Failed to join Agora channel:", err);
      this.isJoining = false;
    }
  }

  startTransmitting(): void {
    if (this.engine) {
      console.log("🎙️ [Agora RTC] Live PTT start: un-muting and publishing microphone");
      this.engine.muteLocalAudioStream(false);
      this.engine.updateChannelMediaOptions({ publishMicrophoneTrack: true });
      this.engine.enableLocalAudio(true);
    }
  }

  stopTransmitting(): void {
    if (this.engine) {
      console.log("🔇 [Agora RTC] Live PTT stop: muting and un-publishing microphone");
      this.engine.muteLocalAudioStream(true);
      this.engine.updateChannelMediaOptions({ publishMicrophoneTrack: false });
    }
  }

  setSilence(isSilenced: boolean): void {
    if (this.engine) {
      this.engine.muteAllRemoteAudioStreams(isSilenced);
    }
  }

  async leaveChannel(): Promise<void> {
    if (this.engine && this.isJoined) {
      this.engine.leaveChannel();
      this.isJoined = false;
      this.isJoining = false;
      this.currentChannel = null;
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
