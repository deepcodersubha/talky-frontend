import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { THEME } from "../../config/constants";
import { Volume2 } from "lucide-react-native";
import { WaveformVisualizer } from "./WaveformVisualizer";

interface RemoteSpeakerIndicatorProps {
  speakerName: string | null;
  isVisible: boolean;
}

export const RemoteSpeakerIndicator: React.FC<RemoteSpeakerIndicatorProps> = ({
  speakerName,
  isVisible,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, opacityAnim, scaleAnim]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.iconCircle}>
        <Volume2 size={24} color={THEME.colors.accent} />
      </View>
      <View style={styles.content}>
        <Text style={styles.speakerLabel}>TALKING NOW</Text>
        <Text style={styles.speakerName}>{speakerName || "Friend"}</Text>
      </View>
      <WaveformVisualizer isActive={true} color={THEME.colors.accent} barCount={5} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 77, 255, 0.12)",
    borderColor: "rgba(124, 77, 255, 0.35)",
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm + 4,
    marginHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(124, 77, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: THEME.spacing.md,
  },
  content: {
    flex: 1,
  },
  speakerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.colors.accent,
    letterSpacing: 0.5,
  },
  speakerName: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.colors.text,
    marginTop: 2,
  },
});
