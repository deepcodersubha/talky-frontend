import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { THEME } from "../../config/constants";
import { useAuthStore } from "../../state/authStore";
import { usePairingStore } from "../../state/pairingStore";
import { AgoraVoiceEngine } from "../../services/audio/AgoraVoiceEngine";
import {
  AIAgentVoiceEngine,
  AIConversationState,
} from "../../services/audio/AIAgentVoiceEngine";

import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Sparkles,
  ArrowLeft,
  Bot,
  Zap,
} from "lucide-react-native";

interface Props {
  navigation: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

export const AIAssistantScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [conversationState, setConversationState] =
    useState<AIConversationState>("INITIALIZING");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [subtitle, setSubtitle] = useState(
    "Hello there! How may I help you today?"
  );
  const [callDuration, setCallDuration] = useState(0);

  // Animated values for the glowing voice orb
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Continuous background idle glow loop
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.85,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, []);

  // Initialize and start AI conversation
  useEffect(() => {
    const aiEngine = AIAgentVoiceEngine.getInstance();

    aiEngine.setCallbacks({
      onStateChange: (state) => {
        setConversationState(state);
      },
      onVolumeChange: (localVol, remoteVol) => {
        // Animate orb scale based on voice audio intensity
        const maxVol = Math.max(localVol, remoteVol);
        const scaleTarget = 1 + Math.min(maxVol / 120, 0.45);
        Animated.spring(pulseAnim, {
          toValue: scaleTarget,
          useNativeDriver: true,
          bounciness: 8,
          speed: 16,
        }).start();

        if (maxVol > 20) {
          Animated.parallel([
            Animated.timing(ring1Anim, {
              toValue: 1.35 + maxVol / 200,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(ring2Anim, {
              toValue: 1.7 + maxVol / 150,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          Animated.parallel([
            Animated.timing(ring1Anim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(ring2Anim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      onSubtitleChange: (text) => {
        setSubtitle(text);
      },
    });

    aiEngine.startConversation(user?.id);

    // Call duration timer
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      aiEngine.stopConversation();
      aiEngine.clearCallbacks();

      // Resume PTT channel if paired
      const currentPairing = usePairingStore.getState().pairing;
      if (currentPairing) {
        AgoraVoiceEngine.getInstance().joinPairingChannel(currentPairing.id);
      }
    };
  }, []);


  const handleToggleMute = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const muted = AIAgentVoiceEngine.getInstance().toggleMute();
    setIsMuted(muted);
  };

  const handleToggleSpeaker = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const speaker = AIAgentVoiceEngine.getInstance().toggleSpeakerphone();
    setIsSpeakerOn(speaker);
  };

  const handleEndCall = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    AIAgentVoiceEngine.getInstance().stopConversation();
    navigation.goBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getStateDetails = () => {
    switch (conversationState) {
      case "CONNECTING":
        return {
          label: "Connecting to Talky AI...",
          color: THEME.colors.warning,
          bg: "rgba(255, 214, 0, 0.15)",
        };
      case "AI_SPEAKING":
        return {
          label: "AI is Speaking",
          color: THEME.colors.accent,
          bg: "rgba(124, 77, 255, 0.18)",
        };
      case "MUTED":
        return {
          label: "Microphone Muted",
          color: THEME.colors.danger,
          bg: "rgba(255, 51, 102, 0.15)",
        };
      case "ERROR":
        return {
          label: "Connection Issue",
          color: THEME.colors.danger,
          bg: "rgba(255, 51, 102, 0.15)",
        };
      case "LISTENING":
      default:
        return {
          label: "Listening to you...",
          color: THEME.colors.primary,
          bg: "rgba(0, 229, 255, 0.15)",
        };
    }
  };

  const stateDetails = getStateDetails();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleEndCall}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={THEME.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.titleRow}>
              <Sparkles size={16} color={THEME.colors.primary} />
              <Text style={styles.headerTitle}>TALKY AI ASSISTANT</Text>
            </View>
            <Text style={styles.timerText}>{formatTime(callDuration)}</Text>
          </View>

          <View style={styles.badgePlaceholder}>
            <Zap size={18} color={THEME.colors.primary} />
          </View>
        </View>

        {/* Central Visualizer / Voice Orb */}
        <View style={styles.visualizerContainer}>
          {/* Outer Pulsing Glow Rings */}
          <Animated.View
            style={[
              styles.glowRing,
              styles.ring2,
              {
                transform: [{ scale: ring2Anim }],
                opacity: glowAnim,
                borderColor:
                  conversationState === "AI_SPEAKING"
                    ? THEME.colors.accent
                    : THEME.colors.primary,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.glowRing,
              styles.ring1,
              {
                transform: [{ scale: ring1Anim }],
                opacity: glowAnim,
                borderColor:
                  conversationState === "AI_SPEAKING"
                    ? THEME.colors.accent
                    : THEME.colors.primary,
              },
            ]}
          />

          {/* Central Glowing Core Orb */}
          <Animated.View
            style={[
              styles.orbCore,
              {
                transform: [{ scale: pulseAnim }],
                shadowColor:
                  conversationState === "AI_SPEAKING"
                    ? THEME.colors.accent
                    : THEME.colors.primary,
                backgroundColor:
                  conversationState === "AI_SPEAKING"
                    ? "rgba(124, 77, 255, 0.3)"
                    : "rgba(0, 229, 255, 0.25)",
              },
            ]}
          >
            <View style={styles.innerOrb}>
              <Bot
                size={52}
                color={
                  conversationState === "AI_SPEAKING"
                    ? THEME.colors.accent
                    : THEME.colors.primary
                }
              />
            </View>
          </Animated.View>

          {/* Live Status Badge */}
          <View
            style={[
              styles.statusPill,
              { backgroundColor: stateDetails.bg, borderColor: stateDetails.color },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: stateDetails.color },
              ]}
            />
            <Text style={[styles.statusText, { color: stateDetails.color }]}>
              {stateDetails.label}
            </Text>
          </View>
        </View>

        {/* Subtitle / AI Speech Banner */}
        <View style={styles.subtitleCard}>
          <Text style={styles.subtitleLabel}>AI SPEECH & GREETING</Text>
          <Text style={styles.subtitleText}>"{subtitle}"</Text>
          <Text style={styles.instructionHint}>
            Speak freely like a real call. The AI automatically listens and responds in real time.
          </Text>
        </View>

        {/* Floating Bottom Control Action Bar */}
        <View style={styles.controlsBar}>
          {/* Speaker Toggle */}
          <TouchableOpacity
            onPress={handleToggleSpeaker}
            style={[
              styles.controlBtn,
              !isSpeakerOn && styles.controlBtnInactive,
            ]}
            activeOpacity={0.8}
          >
            {isSpeakerOn ? (
              <Volume2 size={24} color={THEME.colors.text} />
            ) : (
              <VolumeX size={24} color={THEME.colors.textMuted} />
            )}
            <Text style={styles.controlLabel}>
              {isSpeakerOn ? "Speaker" : "Earpiece"}
            </Text>
          </TouchableOpacity>

          {/* Mute Mic Button */}
          <TouchableOpacity
            onPress={handleToggleMute}
            style={[
              styles.controlBtn,
              styles.micControlBtn,
              isMuted && styles.micMutedBtn,
            ]}
            activeOpacity={0.8}
          >
            {isMuted ? (
              <MicOff size={28} color={THEME.colors.danger} />
            ) : (
              <Mic size={28} color={THEME.colors.primary} />
            )}
            <Text
              style={[
                styles.controlLabel,
                isMuted && { color: THEME.colors.danger },
              ]}
            >
              {isMuted ? "Unmute" : "Mute"}
            </Text>
          </TouchableOpacity>

          {/* End Call / Leave Button */}
          <TouchableOpacity
            onPress={handleEndCall}
            style={[styles.controlBtn, styles.endCallBtn]}
            activeOpacity={0.8}
          >
            <PhoneOff size={24} color="#FFF" />
            <Text style={[styles.controlLabel, { color: "#FFF" }]}>End</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: THEME.spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.colors.text,
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  badgePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 229, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  visualizerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minHeight: 280,
  },
  glowRing: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  ring1: {
    width: 200,
    height: 200,
  },
  ring2: {
    width: 270,
    height: 270,
  },
  orbCore: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  innerOrb: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 36,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subtitleCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  subtitleLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.colors.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.text,
    lineHeight: 22,
    fontStyle: "italic",
  },
  instructionHint: {
    fontSize: 11,
    color: THEME.colors.textSubtle,
    marginTop: 8,
    lineHeight: 16,
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.full,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    paddingVertical: 8,
  },
  controlBtnInactive: {
    opacity: 0.6,
  },
  micControlBtn: {
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    borderRadius: 30,
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  micMutedBtn: {
    backgroundColor: "rgba(255, 51, 102, 0.15)",
    borderColor: THEME.colors.danger,
  },
  endCallBtn: {
    backgroundColor: THEME.colors.danger,
    borderRadius: 30,
    width: 60,
    height: 60,
    shadowColor: THEME.colors.dangerGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
});
