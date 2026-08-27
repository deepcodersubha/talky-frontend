import { WS_BASE_URL, HEARTBEAT_INTERVAL_MS, RECONNECT_DELAY_BASE_MS } from "../../config/constants";
import { StorageService } from "../../storage/secureStorage";
import { usePTTStore } from "../../state/pttStore";
import { usePairingStore } from "../../state/pairingStore";

export class WebSocketClient {
  private static instance: WebSocketClient | null = null;
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnJSInterval | null = null;
  private reconnectAttempts = 0;
  private isExplicitlyClosed = false;

  static getInstance(): WebSocketClient {
    if (!this.instance) {
      this.instance = new WebSocketClient();
    }
    return this.instance;
  }

  isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = await StorageService.getAccessToken();
    if (!token) return;

    this.isExplicitlyClosed = false;

    try {
      this.ws = new WebSocket(WS_BASE_URL);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.send("authenticate", { token });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch {
          // ignore malformed payloads
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleServerMessage(message: { event: string; payload: Record<string, unknown> }) {
    const { event, payload } = message;

    switch (event) {
      case "peer_presence_changed": {
        const isOnline = Boolean(payload.isOnline);
        const lastSeenAt = typeof payload.lastSeenAt === "string" ? payload.lastSeenAt : undefined;
        usePTTStore.getState().setPeerPresence(isOnline, lastSeenAt);
        break;
      }

      case "speaker_started": {
        const speakerName = (payload.speakerDisplayName as string) || "Friend";
        usePTTStore.getState().setRemoteSpeaking(speakerName, true);
        break;
      }

      case "speaker_stopped": {
        usePTTStore.getState().setRemoteSpeaking(null, false);
        break;
      }

      case "unpaired": {
        usePairingStore.getState().setPairing(null);
        break;
      }

      case "silence_updated": {
        const pairing = usePairingStore.getState().pairing;
        if (pairing && pairing.id === payload.pairingId) {
          usePairingStore.getState().setPairing({
            ...pairing,
            isSilenced: Boolean(payload.silenced),
          });
        }
        break;
      }
    }
  }

  send(event: string, payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          event,
          payload,
          timestamp: Date.now(),
        })
      );
    }
  }

  sendPTTStarted(pairingId: string): void {
    this.send("ptt_started", { pairingId });
  }

  sendPTTStopped(pairingId: string, sessionId: string): void {
    this.send("ptt_stopped", { pairingId, sessionId });
  }

  sendSilenceChanged(pairingId: string, silenced: boolean): void {
    this.send("silence_changed", { pairingId, silenced });
  }

  subscribePairing(pairingId: string): void {
    this.send("subscribe_pairing", { pairingId });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send("heartbeat", { timestamp: Date.now() });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(30000, RECONNECT_DELAY_BASE_MS * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.connect();
      }
    }, delay);
  }

  disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

type ReturnJSInterval = ReturnType<typeof setInterval>;
