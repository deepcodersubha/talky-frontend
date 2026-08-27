import { AppState, AppStateStatus } from "react-native";
import { WebSocketClient } from "../websocket/WebSocketClient";
import { AgoraVoiceEngine } from "../audio/AgoraVoiceEngine";
import { usePairingStore } from "../../state/pairingStore";
import { useAuthStore } from "../../state/authStore";

export class NetworkLifecycleManager {
  private static instance: NetworkLifecycleManager | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private currentAppState: AppStateStatus = AppState.currentState;

  private constructor() {}

  static getInstance(): NetworkLifecycleManager {
    if (!this.instance) {
      this.instance = new NetworkLifecycleManager();
    }
    return this.instance;
  }

  initialize(): void {
    if (this.appStateSubscription) return;

    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange.bind(this)
    );
  }

  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    const wasBackground = this.currentAppState.match(/inactive|background/);
    const isNowActive = nextAppState === "active";

    this.currentAppState = nextAppState;

    if (wasBackground && isNowActive) {
      console.log("[Lifecycle] App transitioned to foreground. Checking network and sessions...");
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) return;

      // 1. Reconnect WebSocket if disconnected
      const ws = WebSocketClient.getInstance();
      if (!ws.isConnected()) {
        ws.connect();
      }

      // 2. Refresh active pairing state
      const { pairing } = usePairingStore.getState();
      await usePairingStore.getState().fetchCurrentPairing();

      // 3. Verify Agora channel presence
      if (pairing?.id) {
        AgoraVoiceEngine.getInstance().joinPairingChannel(pairing.id);
      }
    }
  }

  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}
