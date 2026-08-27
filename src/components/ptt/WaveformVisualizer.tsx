import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { THEME } from "../../config/constants";

interface WaveformVisualizerProps {
  isActive: boolean;
  color?: string;
  barCount?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  color = THEME.colors.primary,
  barCount = 7,
}) => {
  const animations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (!isActive) {
      animations.forEach((anim) => anim.setValue(0.2));
      return;
    }

    const loops = animations.map((anim, index) => {
      const minHeight = 0.2 + (index % 3) * 0.1;
      const maxHeight = 0.7 + (index % 4) * 0.1;
      const duration = 250 + (index % 5) * 60;

      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxHeight,
            duration,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: minHeight,
            duration,
            useNativeDriver: false,
          }),
        ])
      );
    });

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [isActive, animations]);

  return (
    <View style={styles.container}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 40],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    marginHorizontal: 3,
  },
});
