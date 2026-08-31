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
      const res = await ApiService.getCurrentPairing();
      set({
        hasActivePairing: res.hasActivePairing,
        pairing: res.pairing,
        error: null,
      });
    } catch {
      set({ hasActivePairing: false, pairing: null });
    }
  },

  createPairingCode: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await ApiService.generatePairingCode();
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to generate code";
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
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to join pairing";
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
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to unpair";
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
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to toggle silence";
      set({ error: errorMsg });
    }
  },

  setPairing: (pairing: ActivePairing | null) => {
    set({ pairing, hasActivePairing: !!pairing });
  },
}));
