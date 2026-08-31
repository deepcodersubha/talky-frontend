import axios from "axios";
import { AGORA_APP_ID } from "../../config/constants";

// The Agora REST Basic Auth token (base64 of customer_id:customer_secret)
export let AGORA_BASIC_AUTH = "Y2NiODNhZDg1NjE4NGU0YTg3MWMzZmM3NGUxNzRhNzA6MzA2YzQ1ODNhMjU5NGU2MmFkZjZlYThiY2RlZTYxZDY=";

export const setAgoraBasicAuth = (auth: string) => {
  AGORA_BASIC_AUTH = auth;
};

export const AgoraAIAgentService = {
  /**
   * Spawns the Agora Conversational AI Agent into the specified RTC channel.
   */
  async startAgent(channelName: string, token?: string): Promise<{ success: boolean; agentId?: string }> {
    const url = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${AGORA_APP_ID}/join`;

    const propertiesPayload: Record<string, any> = {
      channel: channelName,
      agent_rtc_uid: "999999",
      remote_rtc_uids: ["*"],
      idle_timeout: 120,
      asr: {
        vendor: "deepgram",
        params: {
          resource_id: "2ca6dcf4ded340b6b67f0ccf4972a00d",
          model: "nova-3",
          keyterm: "",
          language: "en",
        },
      },
      llm: {
        vendor: "openai",
        params: {
          model: "gpt-4.1-mini",
          resource_id: "24731f4ef93e4d33a85a4c4088633bcb",
        },
        system_messages: [
          {
            role: "system",
            content:
              "You are Talky AI, a natural, witty, and helpful conversational voice assistant.\nKeep your responses concise, natural, and conversational.\nSpeak directly like a phone companion and answer questions helpfully.\n",
          },
        ],
        greeting_message: "Hello there! How may I help you today?",
        failure_message: "Please hold on a second.",
      },
      tts: {
        vendor: "minimax",
        params: {
          model: "speech-2.8-turbo",
          resource_id: "155b2afcadce4c93a85231c74e2e71d6",
          voice_setting: {
            voice_id: "English_radiant_girl",
          },
        },
      },
    };

    if (token) {
      propertiesPayload["token"] = token;
    }

    const payload = {
      name: channelName,
      pipeline_id: "c3c6c22757b8402693063d477a9d3490",
      agent_rtc_uid: "999999",
      properties: propertiesPayload,
    };

    try {
      console.log(`🤖 [Agora AI Service] Requesting Cloud Agent to join channel: ${channelName}`);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": AGORA_BASIC_AUTH.startsWith("Basic ")
          ? AGORA_BASIC_AUTH
          : `Basic ${AGORA_BASIC_AUTH}`,
      };

      const res = await axios.post(url, payload, { headers, timeout: 15000 });
      console.log("✅ [Agora AI Service] Cloud Agent successfully joined:", res.data);
      return { success: true, agentId: res.data?.agent_id };
    } catch (err: any) {
      console.warn("⚠️ [Agora AI Service] Start Agent response error:", err.response?.status, err.response?.data || err.message);
      return { success: false };
    }
  },

  /**
   * Tells the Agora Conversational AI Agent to leave the channel when the call ends.
   */
  async stopAgent(channelName: string, agentId?: string): Promise<void> {
    if (!agentId) return;
    const url = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${AGORA_APP_ID}/agents/${agentId}/leave`;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": AGORA_BASIC_AUTH.startsWith("Basic ")
          ? AGORA_BASIC_AUTH
          : `Basic ${AGORA_BASIC_AUTH}`,
      };

      await axios.post(url, {}, { headers, timeout: 5000 });
      console.log("👋 [Agora AI Service] Cloud Agent leave requested");
    } catch (err: any) {
      console.warn("Agora AI Agent stop warning:", err.response?.data || err.message);
    }
  },
};
