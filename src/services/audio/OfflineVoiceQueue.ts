import { Audio } from "expo-av";
import { Platform } from "react-native";
import { ApiService } from "../../api/client";
import { StorageService } from "../../storage/secureStorage";
import { AudioCueService } from "./AudioCueService";
import { usePTTStore } from "../../state/pttStore";
import { usePairingStore } from "../../state/pairingStore";
import { API_BASE_URL } from "../../config/constants";

export interface QueuedVoiceNote {
  id: string;
  pairingId: string;
  localUri: string;
  durationMs: number;
  createdAt: number;
  retryCount: number;
}

const QUEUE_STORAGE_KEY = "talky_offline_voice_queue";

class OfflineVoiceQueueClass {
  private static instance: OfflineVoiceQueueClass | null = null;
  private recording: Audio.Recording | null = null;
  private recordingStartTime = 0;
  private isProcessingQueue = false;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isPlayingPending = false;

  static getInstance(): OfflineVoiceQueueClass {
    if (!this.instance) {
      this.instance = new OfflineVoiceQueueClass();
    }
    return this.instance;
  }

  /**
   * Initializes background sync interval to flush offline queued voice notes.
   */
  startQueueSync(): void {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => {
      this.flushQueue();
      this.checkAndPlayPendingVoiceNotes();
    }, 5000);
  }

  stopQueueSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Starts local recording as an offline backup only when network is degraded or offline.
   */
  async startRecording(): Promise<void> {
    if (Platform.OS === "web") return;

    const networkQuality = usePTTStore.getState().networkQuality;
    const peerIsOnline = usePTTStore.getState().peerIsOnline;

    // Only initiate local file recording if live Agora stream is degraded or offline
    if (networkQuality === "EXCELLENT" && peerIsOnline) {
      return;
    }

    try {
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch {}
        this.recording = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY // Highly compressed AAC for low bandwidth
      );

      this.recording = recording;
      this.recordingStartTime = Date.now();
    } catch (err) {
      console.warn("Offline voice recording fallback skipped:", err);
    }
  }

  /**
   * Stops local recording upon PTT release.
   * If live streaming failed or if network is offline, queues the file for store-and-forward.
   */
  async stopRecording(pairingId: string, forceQueue = false): Promise<string | null> {
    if (!this.recording) return null;

    try {
      const recording = this.recording;
      this.recording = null;
      const durationMs = Date.now() - this.recordingStartTime;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) return null;

      // If transmission was too short (< 400ms), discard
      if (durationMs < 400) {
        return null;
      }

      if (forceQueue) {
        await this.enqueueVoiceNote({
          id: `vn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          pairingId,
          localUri: uri,
          durationMs,
          createdAt: Date.now(),
          retryCount: 0,
        });
        // Trigger immediate upload attempt
        this.flushQueue();
      }

      return uri;
    } catch (err) {
      console.warn("Failed to stop offline voice recording:", err);
      return null;
    }
  }

  /**
   * Enqueues an audio file in persistent storage.
   */
  async enqueueVoiceNote(item: QueuedVoiceNote): Promise<void> {
    try {
      const queue = await this.getQueue();
      queue.push(item);
      await StorageService.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      usePTTStore.getState().setQueuedCount(queue.length);
    } catch (err) {
      console.warn("Failed to enqueue voice note:", err);
    }
  }

  async getQueue(): Promise<QueuedVoiceNote[]> {
    try {
      const raw = await StorageService.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Uploads all queued voice notes sequentially to backend.
   */
  async flushQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    const queue = await this.getQueue();
    if (queue.length === 0) {
      usePTTStore.getState().setQueuedCount(0);
      return;
    }

    this.isProcessingQueue = true;
    const remainingQueue: QueuedVoiceNote[] = [];

    for (const item of queue) {
      try {
        await ApiService.uploadVoiceNote(item.pairingId, item.localUri, item.durationMs);
        console.log(`✅ [Store & Forward] Uploaded voice note: ${item.id}`);
      } catch (err) {
        console.warn(`⏳ [Store & Forward] Failed upload for ${item.id}, retaining in queue:`, err);
        item.retryCount++;
        if (item.retryCount < 10) {
          remainingQueue.push(item);
        }
      }
    }

    await StorageService.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
    usePTTStore.getState().setQueuedCount(remainingQueue.length);
    this.isProcessingQueue = false;
  }

  /**
   * Checks for unplayed voice notes from backend and auto-plays them.
   */
  async checkAndPlayPendingVoiceNotes(): Promise<void> {
    if (this.isPlayingPending) return;

    const pairing = usePairingStore.getState().pairing;
    if (!pairing || pairing.isSilenced) return;

    try {
      const notes = await ApiService.getPendingVoiceNotes();
      if (!notes || notes.length === 0) return;

      this.isPlayingPending = true;

      for (const note of notes) {
        try {
          // Play walkie talkie alert sound before voice
          await AudioCueService.playOfflineVoiceChirp();
          await new Promise((r) => setTimeout(r, 400));

          // Full audio URL
          const baseUrl = API_BASE_URL.replace("/api/v1", "");
          const soundUrl = note.audioUrl.startsWith("http")
            ? note.audioUrl
            : `${baseUrl}${note.audioUrl}`;

          usePTTStore.getState().setRemoteSpeaking(note.senderUser?.displayName || "Friend", true);

          const { sound } = await Audio.Sound.createAsync(
            { uri: soundUrl },
            { shouldPlay: true, volume: 1.0 }
          );

          await new Promise<void>((resolve) => {
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
                resolve();
              }
            });
          });

          // Play Roger Beep after finishing offline voice note
          await AudioCueService.playRogerBeep();

          // Mark played on backend
          await ApiService.markVoiceNotePlayed(note.id);
        } catch (playErr) {
          console.warn("Failed to play pending voice note:", playErr);
        }
      }
    } catch {
      // Pending fetch non-fatal
    } finally {
      usePTTStore.getState().setRemoteSpeaking(null, false);
      this.isPlayingPending = false;
    }
  }
}

export const OfflineVoiceQueue = OfflineVoiceQueueClass.getInstance();
