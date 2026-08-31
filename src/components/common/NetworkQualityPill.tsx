import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { usePTTStore } from "../../state/pttStore";
import { Wifi, WifiOff, Activity, HardDrive } from "lucide-react-native";

export const NetworkQualityPill: React.FC = () => {
  const networkQuality = usePTTStore((state) => state.networkQuality);
  const queuedCount = usePTTStore((state) => state.queuedCount);

  let label = "LIVE HD";
  let badgeColor = "#10B981"; // Emerald
  let bgColor = "rgba(16, 185, 129, 0.12)";
  let borderColor = "rgba(16, 185, 129, 0.3)";
  let Icon = Wifi;

  if (networkQuality === "POOR_ADAPTIVE") {
    label = "ADAPTIVE (FEC)";
    badgeColor = "#F59E0B"; // Amber
    bgColor = "rgba(245, 158, 11, 0.12)";
    borderColor = "rgba(245, 158, 11, 0.3)";
    Icon = Activity;
  } else if (networkQuality === "CRITICAL_OFFLINE" || queuedCount > 0) {
    label = queuedCount > 0 ? `OFFLINE QUEUE (${queuedCount})` : "STORE & FORWARD";
    badgeColor = "#EF4444"; // Rose
    bgColor = "rgba(239, 68, 68, 0.12)";
    borderColor = "rgba(239, 68, 68, 0.3)";
    Icon = queuedCount > 0 ? HardDrive : WifiOff;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      <Icon size={12} color={badgeColor} strokeWidth={2.5} style={styles.icon} />
      <Text style={[styles.text, { color: badgeColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "center",
    marginTop: 4,
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
