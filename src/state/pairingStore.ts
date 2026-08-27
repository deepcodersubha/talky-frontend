import { create } from "zustand";
import { ApiService } from "../api/client";
import { ActivePairing } from "../types";

interface PairingState {
  pairing: ActivePairing | null;
  hasActivePairing: boolean;
  isLoading: boolean;
  error: string | null;

  fetchCurrentPairing: () => Promise<void>;
  createPairingCode: () => Promise<{ code: string; expiresInSeconds: number }>;
  joinPairing: (code: string) => Promise<void>;
  unpair: () => Promise<void>;
  toggleSilence: (silenced: boolean, durationMinutes?: number) => Promise<void>;
  setPairing: (pairing: ActivePairing | null) => void;
}

export const usePairingStore = create<PairingState>((set, get) => ({
  pairing: null,
  hasActivePairing: false,
  isLoading: false,
  error: null,

  fetchCurrentPairing: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await ApiService.getCurrentPairing();
      set({
        hasActivePairing: res.hasActivePairing,
        pairing: res.pairing,
        isLoading: false,
      });
    } catch {
      set({ hasActivePairing: false, pairing: null, isLoading: false });
    }
  },

  createPairingCode: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await ApiService.generatePairingCode();
      set({ isLoading: false });
      return res;
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || "Failed to generate code"
          : "Failed to generate code";
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  joinPairing: async (code: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await ApiService.joinPairing(code);
      set({
        pairing: res.pairing,
        hasActivePairing: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || "Failed to join pairing"
          : "Failed to join pairing";
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  unpair: async () => {
    const { pairing } = get();
    if (!pairing) return;

    try {
      set({ isLoading: true, error: null });
      await ApiService.unpair(pairing.id);
      set({ pairing: null, hasActivePairing: false, isLoading: false });
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || "Failed to unpair"
          : "Failed to unpair";
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  toggleSilence: async (silenced: boolean, durationMinutes?: number) => {
    const { pairing } = get();
    if (!pairing) return;

    try {
      await ApiService.toggleSilence(pairing.id, silenced, durationMinutes);
      set({
        pairing: {
          ...pairing,
          isSilenced: silenced,
        },
      });
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || "Failed to toggle silence"
          : "Failed to toggle silence";
      set({ error: errorMsg });
    }
  },

  setPairing: (pairing: ActivePairing | null) => {
    set({ pairing, hasActivePairing: !!pairing });
  },
}));
