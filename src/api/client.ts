import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config/constants";
import { StorageService } from "../storage/secureStorage";
import { ActivePairing, AgoraCredentials, Tokens, User } from "../types";

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Request Interceptor: Attach JWT Bearer token
axiosInstance.interceptors.request.use(async (config) => {
  const token = await StorageService.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle Token Refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await StorageService.getRefreshToken();
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newTokens: Tokens = refreshRes.data.data.tokens;
        await StorageService.saveTokens(newTokens.accessToken, newTokens.refreshToken);

        processQueue(null, newTokens.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        }

        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await StorageService.clearTokens();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Typed API Service Methods
export const ApiService = {
  // Auth
  async register(data: {
    authIdentifier: string;
    password?: string;
    displayName: string;
    deviceId: string;
    platform: "ANDROID" | "IOS" | "WEB";
    pushToken?: string;
  }): Promise<{ user: User; tokens: Tokens }> {
    const res = await axiosInstance.post("/auth/register", data);
    return res.data.data;
  },

  async login(data: {
    authIdentifier: string;
    password?: string;
    deviceId: string;
    platform?: "ANDROID" | "IOS" | "WEB";
    pushToken?: string;
  }): Promise<{ user: User; tokens: Tokens }> {
    const res = await axiosInstance.post("/auth/login", data);
    return res.data.data;
  },

  async updatePushToken(pushToken: string): Promise<void> {
    await axiosInstance.post("/devices/token", { pushToken });
  },

  async getMe(): Promise<{ user: User }> {
    const res = await axiosInstance.get("/auth/me");
    return res.data.data;
  },

  // Pairing
  async generatePairingCode(): Promise<{ code: string; expiresInSeconds: number }> {
    const res = await axiosInstance.post("/pairings/code");
    return res.data.data;
  },

  async joinPairing(code: string): Promise<{ pairing: ActivePairing }> {
    const res = await axiosInstance.post("/pairings/join", { code });
    return res.data.data;
  },

  async getCurrentPairing(): Promise<{
    hasActivePairing: boolean;
    pairing: ActivePairing | null;
  }> {
    const res = await axiosInstance.get("/pairings/current");
    return res.data.data;
  },

  async unpair(pairingId: string): Promise<{ success: boolean; unpairedAt: string }> {
    const res = await axiosInstance.post("/pairings/unpair", { pairingId });
    return res.data.data;
  },

  async toggleSilence(
    pairingId: string,
    silenced: boolean,
    durationMinutes?: number
  ): Promise<{ success: boolean; silenced: boolean; durationMinutes?: number }> {
    const res = await axiosInstance.post(`/pairings/${pairingId}/silence`, {
      silenced,
      durationMinutes,
    });
    return res.data.data;
  },

  // Agora Tokens
  async getAgoraToken(pairingId: string): Promise<AgoraCredentials> {
    const res = await axiosInstance.get(`/pairings/${pairingId}/agora-token`);
    return res.data.data;
  },

  // Voice Sessions
  async startVoiceSession(pairingId: string): Promise<{ session: { id: string; status: string } }> {
    const res = await axiosInstance.post("/voice-sessions/start", { pairingId });
    return res.data.data;
  },

  async stopVoiceSession(
    sessionId: string
  ): Promise<{ success: boolean; durationMs: number }> {
    const res = await axiosInstance.post(`/voice-sessions/${sessionId}/stop`);
    return res.data.data;
  },

  async cancelVoiceSession(sessionId: string): Promise<{ success: boolean }> {
    const res = await axiosInstance.post(`/voice-sessions/${sessionId}/cancel`);
    return res.data.data;
  },

  // Voice Notes (Store & Forward)
  async uploadVoiceNote(
    pairingId: string,
    fileUri: string,
    durationMs: number
  ): Promise<{ voiceNote: any }> {
    const formData = new FormData();
    const filename = fileUri.split("/").pop() || `voice_${Date.now()}.m4a`;

    // @ts-ignore React Native FormData format
    formData.append("audio", {
      uri: fileUri,
      type: "audio/m4a",
      name: filename,
    });
    formData.append("pairingId", pairingId);
    formData.append("durationMs", String(durationMs));

    const res = await axiosInstance.post("/voice-notes/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data.data;
  },

  async getPendingVoiceNotes(): Promise<any[]> {
    const res = await axiosInstance.get("/voice-notes/pending");
    return res.data.data?.voiceNotes || [];
  },

  async markVoiceNotePlayed(voiceNoteId: string): Promise<void> {
    await axiosInstance.post(`/voice-notes/${voiceNoteId}/played`);
  },

  // AI Agent (Conversational AI)
  async startAIAgent(channelName: string): Promise<{ success: boolean; agentId?: string }> {
    try {
      const res = await axiosInstance.post("/ai-agent/start", { channelName });
      return res.data?.data || { success: true };
    } catch {
      return { success: true };
    }
  },

  async stopAIAgent(channelName: string, agentId?: string): Promise<{ success: boolean }> {
    try {
      const res = await axiosInstance.post("/ai-agent/stop", { channelName, agentId });
      return res.data?.data || { success: true };
    } catch {
      return { success: true };
    }
  },
};

