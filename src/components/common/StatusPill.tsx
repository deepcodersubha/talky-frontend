import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../config/constants";

interface StatusPillProps {
  isOnline: boolean;
  label?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ isOnline, label }) => {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isOnline
            ? "rgba(0, 230, 118, 0.12)"
            : "rgba(148, 163, 184, 0.12)",
          borderColor: isOnline
            ? "rgba(0, 230, 118, 0.3)"
            : "rgba(148, 163, 184, 0.2)",
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: isOnline ? THEME.colors.success : THEME.colors.textSubtle },
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: isOnline ? THEME.colors.success : THEME.colors.textMuted },
        ]}
      >
        {label || (isOnline ? "Online" : "Offline")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
