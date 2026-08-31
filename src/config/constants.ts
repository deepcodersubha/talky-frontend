import { Platform } from "react-native";

// Backend URL:
// Using local machine LAN IP so physical devices on Wi-Fi and Android emulator can connect.
const BACKEND_URL = "https://talky-backend-f36p.onrender.com";

export const API_BASE_URL = `${BACKEND_URL}/api/v1`;
export const WS_BASE_URL = `${BACKEND_URL.replace(/^http/, "ws")}/ws`;
export const AGORA_APP_ID = "56b8a62c5cc14ce0b8067561d12233a7";


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
