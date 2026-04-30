// @ts-nocheck
import api from "./api.js";

export function sendChatMessage(message, history = []) {
  return api.post("/api/ai/chat", {
    message,
    messages: history,
  });
}

export function extractAssistantReply(data) {
  return (
    data?.message ||
    data?.reply ||
    data?.response ||
    data?.content ||
    data?.data?.message ||
    data?.choices?.[0]?.message?.content ||
    "The AI service responded, but no message content was returned."
  );
}
