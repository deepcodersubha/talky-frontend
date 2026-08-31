import { create } from "zustand";
import { PTTState } from "../types";

interface PTTStoreState {
  pttState: PTTState;
  isTransmitting: boolean;
  isRemoteSpeaking: boolean;
  remoteSpeakerName: string | null;
  transmissionDuration: number;
  peerIsOnline: boolean;
  peerLastSeenAt: string | null;
  activeSessionId: string | null;
  networkQuality: "EXCELLENT" | "POOR_ADAPTIVE" | "CRITICAL_OFFLINE";
  queuedCount: number;

  setPTTState: (state: PTTState) => void;
  startTransmitting: (sessionId?: string) => void;
  stopTransmitting: () => void;
  cancelTransmitting: () => void;
  setRemoteSpeaking: (speakerName: string | null, isSpeaking: boolean) => void;
  setPeerPresence: (isOnline: boolean, lastSeenAt?: string) => void;
  setNetworkQuality: (quality: "EXCELLENT" | "POOR_ADAPTIVE" | "CRITICAL_OFFLINE") => void;
  setQueuedCount: (count: number) => void;
  incrementDuration: () => void;
  resetDuration: () => void;
}

export const usePTTStore = create<PTTStoreState>((set) => ({
  pttState: "IDLE",
  isTransmitting: false,
  isRemoteSpeaking: false,
  remoteSpeakerName: null,
  transmissionDuration: 0,
  peerIsOnline: false,
  peerLastSeenAt: null,
  activeSessionId: null,
  networkQuality: "EXCELLENT",
  queuedCount: 0,

  setPTTState: (state: PTTState) => set({ pttState: state }),

  startTransmitting: (sessionId?: string) =>
    set({
      pttState: "TRANSMITTING",
      isTransmitting: true,
      activeSessionId: sessionId || null,
      transmissionDuration: 0,
    }),

  stopTransmitting: () =>
    set({
      pttState: "IDLE",
      isTransmitting: false,
      activeSessionId: null,
      transmissionDuration: 0,
    }),

  cancelTransmitting: () =>
    set({
      pttState: "IDLE",
      isTransmitting: false,
      activeSessionId: null,
      transmissionDuration: 0,
    }),

  setRemoteSpeaking: (speakerName: string | null, isSpeaking: boolean) =>
    set((state) => ({
      isRemoteSpeaking: isSpeaking,
      remoteSpeakerName: speakerName,
      pttState: isSpeaking ? "RECEIVING" : state.isTransmitting ? "TRANSMITTING" : "IDLE",
    })),

  setPeerPresence: (isOnline: boolean, lastSeenAt?: string) =>
    set({
      peerIsOnline: isOnline,
      peerLastSeenAt: lastSeenAt || null,
    }),

  setNetworkQuality: (quality: "EXCELLENT" | "POOR_ADAPTIVE" | "CRITICAL_OFFLINE") =>
    set({ networkQuality: quality }),

  setQueuedCount: (count: number) => set({ queuedCount: count }),

  incrementDuration: () =>
    set((state) => ({
      transmissionDuration: state.transmissionDuration + 1,
    })),

  resetDuration: () => set({ transmissionDuration: 0 }),
}));
