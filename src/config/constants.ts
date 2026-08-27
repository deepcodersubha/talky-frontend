import { Platform } from "react-native";

// Ngrok public tunnel — allows any remote device to reach the local backend.
// Replace this URL with a new ngrok URL if the tunnel is restarted.
const NGROK_URL = "https://greedless-polygon-cattail.ngrok-free.dev";

export const API_BASE_URL = `${NGROK_URL}/api/v1`;
export const WS_BASE_URL = `${NGROK_URL.replace("https://", "wss://")}/ws`;

export const MAX_TRANSMISSION_DURATION_SECONDS = 60;
export const HEARTBEAT_INTERVAL_MS = 25000;
export const RECONNECT_DELAY_BASE_MS = 2000;

export const THEME = {
  colors: {
    background: "#080B11",
    surface: "#111722",
    surfaceElevated: "#182030",
    border: "#1E293B",
    primary: "#00E5FF", // Neon cyan
    primaryGlow: "rgba(0, 229, 255, 0.35)",
    primaryDark: "#0099B8",
    accent: "#7C4DFF", // Electric purple
    danger: "#FF3366", // Vivid coral red
    dangerGlow: "rgba(255, 51, 102, 0.4)",
    success: "#00E676",
    warning: "#FFD600",
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    textSubtle: "#64748B",
  },
  typography: {
    title: { fontSize: 28, fontWeight: "700" as const, color: "#F8FAFC" },
    subtitle: { fontSize: 16, fontWeight: "400" as const, color: "#94A3B8" },
    body: { fontSize: 14, fontWeight: "400" as const, color: "#F8FAFC" },
    button: { fontSize: 16, fontWeight: "600" as const, color: "#080B11" },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 20,
    full: 9999,
  },
};
