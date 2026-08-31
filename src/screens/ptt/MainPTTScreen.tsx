import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME, MAX_TRANSMISSION_DURATION_SECONDS } from "../../config/constants";
import { StatusPill } from "../../components/common/StatusPill";
import { PTTButton } from "../../components/ptt/PTTButton";
import { RemoteSpeakerIndicator } from "../../components/ptt/RemoteSpeakerIndicator";
import { SilenceSheetModal } from "../../components/ptt/SilenceSheetModal";
import { Button } from "../../components/common/Button";
import { usePairingStore } from "../../state/pairingStore";
import { usePTTStore } from "../../state/pttStore";
import { WebSocketClient } from "../../services/websocket/WebSocketClient";
import { AgoraVoiceEngine } from "../../services/audio/AgoraVoiceEngine";
import { AndroidBridge } from "../../services/native/AndroidBridge";
import { IOSBridge } from "../../services/native/IOSBridge";
import { ApiService } from "../../api/client";
import { NetworkQualityPill } from "../../components/common/NetworkQualityPill";
import { AudioCueService } from "../../services/audio/AudioCueService";
import { OfflineVoiceQueue } from "../../services/audio/OfflineVoiceQueue";
import { PermissionService } from "../../services/native/PermissionService";
import { Settings, VolumeX, Volume2, UserPlus, LogOut, Sparkles } from "lucide-react-native";

interface Props {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export const MainPTTScreen: React.FC<Props> = ({ navigation }) => {
  const { pairing, hasActivePairing, unpair, toggleSilence, fetchCurrentPairing } =
    usePairingStore();
  const {
    isTransmitting,
    isRemoteSpeaking,
    remoteSpeakerName,
    transmissionDuration,
    peerIsOnline,
    activeSessionId,
    networkQuality,
    startTransmitting,
    stopTransmitting,
    cancelTransmitting,
    incrementDuration,
  } = usePTTStore();

  const [showUnpairModal, setShowUnpairModal] = useState(false);
  const [showSilenceModal, setShowSilenceModal] = useState(false);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize WebSockets, Agora audio channel, and offline queue sync on mount
  useEffect(() => {
    fetchCurrentPairing();
    const ws = WebSocketClient.getInstance();
    ws.connect();

    if (pairing) {
      const initVoice = async () => {
        try {
          await PermissionService.requestAllPermissions();
          ws.subscribePairing(pairing.id);
          await AgoraVoiceEngine.getInstance().joinPairingChannel(pairing.id);
          AgoraVoiceEngine.getInstance().setSilence(pairing.isSilenced);
          await AndroidBridge.startForegroundService();
          await AndroidBridge.requestIgnoreBatteryOptimizations();
          IOSBridge.joinPTTChannel(pairing.id, pairing.agoraChannelName, pairing.peer.displayName);
          OfflineVoiceQueue.startQueueSync();
        } catch (err) {
          console.warn("MainPTTScreen voice init error:", err);
        }
      };
      initVoice();
    }

    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current);
      OfflineVoiceQueue.stopQueueSync();
    };
  }, [pairing?.id]);

  // Transmission duration timer
  useEffect(() => {
    if (isTransmitting) {
      durationTimer.current = setInterval(() => {
        incrementDuration();
      }, 1000);
    } else {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }
    }

    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current);
    };
  }, [isTransmitting]);

  // Automatic cutoff at max transmission limit (60s)
  useEffect(() => {
    if (isTransmitting && transmissionDuration >= MAX_TRANSMISSION_DURATION_SECONDS) {
      handleStopTransmit();
    }
  }, [isTransmitting, transmissionDuration]);

  // PTT Handlers
  const handleStartTransmit = async () => {
    if (!pairing || isRemoteSpeaking) return;

    // 1. Play walkie talkie radio key-up chirp
    AudioCueService.playPTTStart();

    // 2. Start offline recording backup simultaneously
    OfflineVoiceQueue.startRecording();

    // 3. Unmute microphone immediately for instant live voice transmission
    AgoraVoiceEngine.getInstance().startTransmitting();
    startTransmitting();

    try {
      // 4. Notify remote peer over WebSocket
      WebSocketClient.getInstance().sendPTTStarted(pairing.id);

      // 5. Register session in background
      ApiService.startVoiceSession(pairing.id)
        .then((res) => {
          if (res?.session?.id) {
            startTransmitting(res.session.id);
          }
        })
        .catch((err) => {
          console.warn("Failed to create voice session record:", err);
        });
    } catch (err) {
      console.warn("Failed to start voice transmission:", err);
    }
  };

  const handleStopTransmit = async () => {
    if (!isTransmitting || !pairing) return;

    // 1. Play walkie talkie Roger Beep
    AudioCueService.playRogerBeep();

    // 2. Stop offline recording backup — if network degraded/offline, auto-queue for store-and-forward
    const shouldQueue = networkQuality === "CRITICAL_OFFLINE" || !peerIsOnline;
    OfflineVoiceQueue.stopRecording(pairing.id, shouldQueue);

    // 3. Mute microphone immediately
    AgoraVoiceEngine.getInstance().stopTransmitting();
    const sessionId = activeSessionId;
    stopTransmitting();

    if (pairing) {
      // 4. Send stopped event over WebSocket & HTTP
      WebSocketClient.getInstance().sendPTTStopped(pairing.id, sessionId || "session_ended");
      if (sessionId) {
        ApiService.stopVoiceSession(sessionId).catch((err) => {
          console.warn("Failed to stop voice session on backend:", err);
        });
      }
    }
  };

  const handleCancelTransmit = async () => {
    if (!isTransmitting || !pairing) return;

    AgoraVoiceEngine.getInstance().stopTransmitting();
    const sessionId = activeSessionId;
    cancelTransmitting();

    if (sessionId) {
      ApiService.cancelVoiceSession(sessionId).catch(() => {});
    }
  };

  const handleSelectSilenceOption = async (silenced: boolean, durationMinutes?: number) => {
    if (!pairing) return;
    await toggleSilence(silenced, durationMinutes);
    AgoraVoiceEngine.getInstance().setSilence(silenced);
    WebSocketClient.getInstance().sendSilenceChanged(pairing.id, silenced);
  };

  const handleConfirmUnpair = async () => {
    setShowUnpairModal(false);
    await unpair();
    AgoraVoiceEngine.getInstance().leaveChannel();
    AndroidBridge.stopForegroundService();
  };

  // If unpaired, show prompt to pair
  if (!hasActivePairing || !pairing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <UserPlus size={48} color={THEME.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Device Paired</Text>
          <Text style={styles.emptySubtitle}>
            Pair your device with a friend to start talking in real time.
          </Text>
          <Button
            title="Pair Now"
            onPress={() => navigation.navigate("CreatePairing")}
            style={styles.pairNowBtn}
          />

          {/* AI Voice Assistant Quick Access */}
          <View style={styles.aiPromoCard}>
            <View style={styles.aiPromoHeader}>
              <Sparkles size={18} color={THEME.colors.primary} />
              <Text style={styles.aiPromoTitle}>Talky AI Assistant</Text>
            </View>
            <Text style={styles.aiPromoSubtitle}>
              Experience real-time interactive voice chat with the AI assistant.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("AIAssistant")}
              style={styles.aiPromoBtn}
              activeOpacity={0.8}
            >
              <Sparkles size={16} color="#080B11" />
              <Text style={styles.aiPromoBtnText}>Talk to AI Assistant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.peerLabel}>CONNECTED TO</Text>
            <Text style={styles.peerName}>{pairing.peer.displayName}</Text>
            <NetworkQualityPill />
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate("AIAssistant")}
              style={styles.aiHeaderBtn}
              activeOpacity={0.8}
            >
              <Sparkles size={15} color={THEME.colors.primary} />
              <Text style={styles.aiHeaderBtnText}>Talk to AI</Text>
            </TouchableOpacity>
            <StatusPill isOnline={peerIsOnline} />
            <TouchableOpacity
              onPress={() => navigation.navigate("Settings")}
              style={styles.settingsBtn}
            >
              <Settings size={22} color={THEME.colors.text} />
            </TouchableOpacity>
          </View>
        </View>


        {/* Remote Speaker Alert */}
        <View style={styles.middleContainer}>
          <RemoteSpeakerIndicator
            speakerName={remoteSpeakerName}
            isVisible={isRemoteSpeaking}
          />

          {/* Large Center PTT Button */}
          <PTTButton
            isTransmitting={isTransmitting}
            isRemoteSpeaking={isRemoteSpeaking}
            duration={transmissionDuration}
            onStartTransmit={handleStartTransmit}
            onStopTransmit={handleStopTransmit}
            onCancelTransmit={handleCancelTransmit}
          />
        </View>

        {/* Bottom Actions Bar */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => setShowSilenceModal(true)}
            style={[
              styles.silenceToggleBtn,
              pairing.isSilenced && styles.silenceToggleBtnActive,
            ]}
          >
            {pairing.isSilenced ? (
              <VolumeX size={20} color={THEME.colors.warning} />
            ) : (
              <Volume2 size={20} color={THEME.colors.textMuted} />
            )}
            <Text
              style={[
                styles.silenceToggleText,
                pairing.isSilenced && styles.silenceToggleTextActive,
              ]}
            >
              {pairing.isSilenced ? "Audio Silenced" : "Audio Active"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowUnpairModal(true)}
            style={styles.unpairBtn}
          >
            <LogOut size={18} color={THEME.colors.danger} />
            <Text style={styles.unpairText}>Unpair</Text>
          </TouchableOpacity>
        </View>

        {/* Silence Selection Sheet Modal */}
        <SilenceSheetModal
          visible={showSilenceModal}
          isCurrentlySilenced={pairing.isSilenced}
          onClose={() => setShowSilenceModal(false)}
          onSelectSilence={handleSelectSilenceOption}
        />

        {/* Unpair Confirmation Modal */}
        <Modal
          visible={showUnpairModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowUnpairModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Unpair from {pairing.peer.displayName}?</Text>
              <Text style={styles.modalSubtitle}>
                Both devices will be disconnected and will need to enter a new pairing code to talk again.
              </Text>
              <View style={styles.modalBtnRow}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setShowUnpairModal(false)}
                  style={styles.modalBtn}
                />
                <Button
                  title="Unpair"
                  variant="danger"
                  onPress={handleConfirmUnpair}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: THEME.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  peerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  peerName: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.text,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsBtn: {
    marginLeft: THEME.spacing.md,
    padding: THEME.spacing.xs,
  },
  middleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.sm + 4,
  },
  silenceToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  silenceToggleBtnActive: {
    backgroundColor: "rgba(255, 214, 0, 0.12)",
  },
  silenceToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    marginLeft: 8,
  },
  silenceToggleTextActive: {
    color: THEME.colors.warning,
  },
  unpairBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
  },
  unpairText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.danger,
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: THEME.spacing.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.lg,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: THEME.colors.text,
  },
  emptySubtitle: {
    fontSize: 15,
    color: THEME.colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: THEME.spacing.xl,
  },
  pairNowBtn: {
    width: "100%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.lg,
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    lineHeight: 20,
    marginBottom: THEME.spacing.xl,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    marginHorizontal: 4,
  },
  aiHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    borderColor: "rgba(0, 229, 255, 0.35)",
    borderWidth: 1,
    borderRadius: THEME.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: THEME.spacing.sm,
    gap: 4,
  },
  aiHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  aiPromoCard: {
    width: "100%",
    backgroundColor: THEME.colors.surface,
    borderColor: "rgba(0, 229, 255, 0.25)",
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginTop: THEME.spacing.xl,
  },
  aiPromoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  aiPromoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.text,
  },
  aiPromoSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 17,
    marginBottom: THEME.spacing.md,
  },
  aiPromoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    gap: 6,
  },
  aiPromoBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#080B11",
  },
});

