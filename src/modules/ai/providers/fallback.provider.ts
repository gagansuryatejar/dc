/**
 * Non-AI Intelligent Fallback Provider for NEXUS AI.
 * Ensures the bot remains interactive, conversational, and helpful even when
 * cloud AI APIs are unconfigured, offline, or rate-limited.
 * Supports both English and Telugu queries.
 */

import type {
  AIProvider,
  AIMessage,
  GenerateOptions,
  AIResponse,
} from "./ai-provider.interface.js";

export class FallbackProvider implements AIProvider {
  public readonly name = "fallback-rules";

  isAvailable(): boolean {
    return true; // Always operational
  }

  async generateResponse(
    messages: AIMessage[],
    options: GenerateOptions = {},
  ): Promise<AIResponse> {
    const lastUserMsg = messages
      .filter((m) => m.role === "user")
      .pop()
      ?.content.toLowerCase() || "";

    const isTelugu =
      options.language === "te" ||
      /[\u0C00-\u0C7F]/.test(lastUserMsg) ||
      lastUserMsg.includes("telugu");

    let responseText = "";

    if (isTelugu) {
      // Telugu Responses (తెలుగు స్పందనలు)
      if (lastUserMsg.includes("హలో") || lastUserMsg.includes("నమస్కారం") || /\b(hi|hello)\b/i.test(lastUserMsg)) {
        responseText =
          "నమస్కారం! 🙏 నేను NEXUS AI ని, మీ డిస్కార్డ్ కమ్యూనిటీ ఆపరేటింగ్ సిస్టమ్. నేను మీకు ఎలా సహాయపడగలను? `/help` లేదా `/profile` ను చూడండి.";
      } else if (lastUserMsg.includes("ఎవరు") || lastUserMsg.includes("who") || lastUserMsg.includes("పేరు")) {
        responseText =
          "నేను NEXUS AI ని — మీ సర్వర్ యొక్క ఇంటెలిజెంట్ కమ్యూనిటీ మేనేజ్‌మెంట్ మరియు వాయిస్ అసిస్టెంట్. నేను లెవల్స్, వాయిస్ రూమ్‌లు, మరియు సహాయాన్ని అందిస్తాను!";
      } else if (lastUserMsg.includes("నిబంధనలు") || lastUserMsg.includes("రూల్స్") || lastUserMsg.includes("rules") || lastUserMsg.includes("rule")) {
        responseText =
          "కమ్యూనిటీ నిబంధనలు: 1. సభ్యులందరినీ గౌరవించండి. 2. స్పామ్ లేదా అవాంఛిత లింక్‌లను పంపవద్దు. 3. సరైన ఛానెల్‌లను ఉపయోగించండి. 4. ఆనందంగా సమయాన్ని గడపండి!";
      } else if (lastUserMsg.includes("సహాయం") || lastUserMsg.includes("help")) {
        responseText =
          "నేను మీకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాను! అన్ని కమాండ్‌ల జాబితా కోసం `/help` ను ఉపయోగించండి లేదా ప్రశ్నలను అడగడానికి నన్ను ట్యాగ్ చేయండి.";
      } else if (lastUserMsg.includes("xp") || lastUserMsg.includes("లెవల్") || lastUserMsg.includes("level")) {
        responseText =
          "మీరు టెక్స్ట్ ఛానెల్‌లలో మాట్లాడటం ద్వారా మరియు వాయిస్ ఛానెల్‌లలో సమయం గడపడం ద్వారా XP పొందవచ్చు! మీ స్థాయిని చూడటానికి `/profile` ని ఉపయోగించండి.";
      } else {
        responseText =
          "మీ ప్రశ్నకు ధన్యవాదాలు! క్లౌడ్ AI తాత్కాలికంగా ఆఫ్‌లైన్‌లో ఉంది. మీరు కమ్యూనిటీ కమాండ్‌ల కోసం `/help` లేదా మీ ప్రొఫైల్ కోసం `/profile` ని చూడవచ్చు. నన్ను ఏమైనా నిర్దిష్టంగా అడగాలనుకుంటున్నారా?";
      }
    } else {
      // English Responses
      if (/\b(hello|hi|hey|greetings)\b/i.test(lastUserMsg)) {
        responseText =
          "Hello! 👋 I'm **NEXUS AI**, your community operating system. How can I assist you today? You can check your standing with `/profile` or view all capabilities with `/help`.";
      } else if (lastUserMsg.includes("who are you") || lastUserMsg.includes("what are you") || lastUserMsg.includes("what can you do") || lastUserMsg.includes("what is nexus")) {
        responseText =
          "I am **NEXUS AI** — an advanced, intelligent community companion designed to elevate your server! I manage dynamic voice rooms, activity tracking, leveling, community suggestions, and server assistance.";
      } else if (lastUserMsg.includes("rule") || lastUserMsg.includes("guideline") || lastUserMsg.includes("respect")) {
        responseText =
          "Community Rules & Guidelines: 1. Treat everyone with respect and kindness. 2. Post in relevant channels. 3. No spam, phishing links, or unauthorized advertising. 4. Enjoy and have fun!";
      } else if (lastUserMsg.includes("xp") || lastUserMsg.includes("level") || lastUserMsg.includes("rank")) {
        responseText =
          "You earn XP automatically by chatting in text channels (+15–25 XP per qualifying message) and spending time in voice channels (+1 XP/min). Run `/profile` to check your rank and `/leaderboard` to see the top members!";
      } else if (lastUserMsg.includes("daily") || lastUserMsg.includes("streak") || lastUserMsg.includes("reward")) {
        responseText =
          "You can claim daily XP and coin rewards every 24 hours using `/daily`! Maintain your streak to earn progressive multipliers up to 30 days.";
      } else if (lastUserMsg.includes("voice") || lastUserMsg.includes("room")) {
        responseText =
          "I track voice activity and automatically celebrate voice milestones (30m, 1h, 3h, 5h). You can also spin up private voice lounges anytime using `/voice create`!";
      } else {
        responseText =
          "Thank you for reaching out! I am running in community fallback mode. You can interact with me using `/ai ask`, check your stats with `/profile`, claim rewards with `/daily`, or browse all features with `/help`.";
      }
    }

    return {
      text: responseText,
      provider: this.name,
      model: "rule-based-engine",
      tokensUsed: 0,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

export const fallbackProvider = new FallbackProvider();
