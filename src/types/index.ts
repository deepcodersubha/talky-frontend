export interface User {
  id: string;
  authIdentifier: string;
  displayName: string;
  createdAt?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface PeerUser {
  id: string;
  displayName: string;
  authIdentifier: string;
  platform: "ANDROID" | "IOS" | "WEB" | "UNKNOWN";
  lastSeenAt: string | null;
}

export interface ActivePairing {
  id: string;
  status: "ACTIVE" | "UNPAIRED";
  agoraChannelName: string;
  pairedAt: string;
  isSilenced: boolean;
  peer: PeerUser;
}

export type PTTState =
  | "IDLE"
  | "CONNECTING"
  | "TRANSMITTING"
  | "RECEIVING"
  | "DISABLED"
  | "CANCELING";

export interface AgoraCredentials {
  appId: string;
  channelName: string;
  userAccount: string;
  token: string;
  expiresInSeconds: number;
}
