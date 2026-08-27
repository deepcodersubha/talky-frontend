import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import * as Haptics from "expo-haptics";
import { THEME, MAX_TRANSMISSION_DURATION_SECONDS } from "../../config/constants";
import { Mic, X } from "lucide-react-native";
import { WaveformVisualizer } from "./WaveformVisualizer";

interface PTTButtonProps {
  isTransmitting: boolean;
  isRemoteSpeaking: boolean;
  disabled?: boolean;
  duration: number;
  onStartTransmit: () => void;
  onStopTransmit: () => void;
  onCancelTransmit: () => void;
}

export const PTTButton: React.FC<PTTButtonProps> = ({
  isTransmitting,
  isRemoteSpeaking,
  disabled = false,
  duration,
  onStartTransmit,
  onStopTransmit,
  onCancelTransmit,
}) => {
  // isCanceling as both state (for re-renders) and ref (for PanResponder closures)
  const [isCanceling, setIsCanceling] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim1 = useRef(new Animated.Value(0)).current;
  const ringAnim2 = useRef(new Animated.Value(0)).current;

  // Mutable refs so the PanResponder (created once) always reads the latest values
  const isCancelingRef = useRef(false);
  const disabledRef = useRef(disabled);
  const isRemoteSpeakingRef = useRef(isRemoteSpeaking);
  const onStartTransmitRef = useRef(onStartTransmit);
  const onStopTransmitRef = useRef(onStopTransmit);
  const onCancelTransmitRef = useRef(onCancelTransmit);

  // Keep refs in sync with latest props/state on every render
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { isRemoteSpeakingRef.current = isRemoteSpeaking; }, [isRemoteSpeaking]);
  useEffect(() => { onStartTransmitRef.current = onStartTransmit; }, [onStartTransmit]);
  useEffect(() => { onStopTransmitRef.current = onStopTransmit; }, [onStopTransmit]);
  useEffect(() => { onCancelTransmitRef.current = onCancelTransmit; }, [onCancelTransmit]);

  // Helper to update both ref and state together
  const setCanceling = (val: boolean) => {
    isCancelingRef.current = val;
    setIsCanceling(val);
  };

  // Pulsing animation when transmitting
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    let ringLoop1: Animated.CompositeAnimation | null = null;
    let ringLoop2: Animated.CompositeAnimation | null = null;

    if (isTransmitting && !isCanceling) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );

      ringLoop1 = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim1, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim1, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      ringLoop2 = Animated.loop(
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(ringAnim2, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      pulseLoop.start();
      ringLoop1.start();
      ringLoop2.start();
    } else {
      pulseAnim.setValue(1);
      ringAnim1.setValue(0);
      ringAnim2.setValue(0);
    }

    return () => {
      pulseLoop?.stop();
      ringLoop1?.stop();
      ringLoop2?.stop();
    };
  }, [isTransmitting, isCanceling, pulseAnim, ringAnim1, ringAnim2]);

  // PanResponder to handle press, hold, and swipe-up to cancel.
  // All handlers read from mutable refs to avoid stale closure bugs —
  // the PanResponder is created once but always sees the latest values.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current && !isRemoteSpeakingRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current && !isRemoteSpeakingRef.current,

      onPanResponderGrant: () => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch {
          // ignore web haptics error
        }
        setCanceling(false);
        onStartTransmitRef.current();
      },

      onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (gestureState.dy < -60) {
          if (!isCancelingRef.current) {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {
              // ignore
            }
            setCanceling(true);
          }
        } else {
          if (isCancelingRef.current) {
            setCanceling(false);
          }
        }
      },

      onPanResponderRelease: () => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {
          // ignore
        }
        if (isCancelingRef.current) {
          onCancelTransmitRef.current();
        } else {
          onStopTransmitRef.current();
        }
        setCanceling(false);
      },

      onPanResponderTerminate: () => {
        onCancelTransmitRef.current();
        setCanceling(false);
      },
    })
  ).current;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getButtonColor = () => {
    if (disabled || isRemoteSpeaking) return THEME.colors.surfaceElevated;
    if (isCanceling) return THEME.colors.danger;
    if (isTransmitting) return THEME.colors.primary;
    return THEME.colors.surfaceElevated;
  };

  const getBorderColor = () => {
    if (disabled || isRemoteSpeaking) return THEME.colors.border;
    if (isCanceling) return THEME.colors.danger;
    if (isTransmitting) return THEME.colors.primary;
    return THEME.colors.primaryDark;
  };

  return (
    <View style={styles.wrapper}>
      {/* Outer Pulse Rings */}
      {isTransmitting && !isCanceling && (
        <>
          <Animated.View
            style={[
              styles.ring,
              {
                borderColor: THEME.colors.primary,
                opacity: ringAnim1.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [0.6, 0.2, 0],
                }),
                transform: [
                  {
                    scale: ringAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.6],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                borderColor: THEME.colors.primary,
                opacity: ringAnim2.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [0.6, 0.2, 0],
                }),
                transform: [
                  {
                    scale: ringAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.6],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      )}

      {/* Main Interactive Button */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.button,
          {
            backgroundColor: getButtonColor(),
            borderColor: getBorderColor(),
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {isCanceling ? (
          <X size={56} color="#FFFFFF" />
        ) : isTransmitting ? (
          <View style={styles.transmittingContainer}>
            <Mic size={48} color="#080B11" />
            <Text style={styles.durationText}>{formatTime(duration)}</Text>
            <WaveformVisualizer isActive={true} color="#080B11" barCount={5} />
          </View>
        ) : (
          <View style={styles.idleContainer}>
            <Mic
              size={48}
              color={disabled || isRemoteSpeaking ? THEME.colors.textSubtle : THEME.colors.primary}
            />
            <Text
              style={[
                styles.idleLabel,
                { color: disabled || isRemoteSpeaking ? THEME.colors.textSubtle : THEME.colors.text },
              ]}
            >
              {isRemoteSpeaking
                ? "PEER TALKING"
                : disabled
                ? "UNAVAILABLE"
                : "HOLD TO TALK"}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Cancel Instruction Hint */}
      {isTransmitting && (
        <Text style={[styles.cancelHint, isCanceling && styles.cancelHintActive]}>
          {isCanceling ? "Release to Cancel" : "↑ Swipe up to cancel"}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: THEME.spacing.xl,
  },
  ring: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
  },
  button: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  transmittingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  idleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  durationText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#080B11",
    marginTop: 4,
  },
  idleLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 8,
  },
  cancelHint: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.lg,
  },
  cancelHintActive: {
    color: THEME.colors.danger,
    fontWeight: "700",
  },
});
