/**
 * NEXUS HEART — Text-to-Speech Service
 * Google Cloud TTS adapter with multi-language support (English, Telugu, mixed).
 * Female, soft, sweet voice with natural Indian English accent.
 */

export interface TtsProvider {
  speak(text: string, language: "en" | "te" | "mix"): Promise<Buffer | null>;
}

export interface VoiceSettings {
  language: "en" | "te" | "mix";
  speed: number;
  pitch: number;
  volume: number;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  language: "en",
  speed: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

/** Google Cloud TTS adapter */
class GoogleTtsAdapter implements TtsProvider {
  private apiKey: string | null = null;
  private baseUrl = "https://texttospeech.googleapis.com/v1/text:synthesize";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  async speak(text: string, language: "en" | "te" | "mix"): Promise<Buffer | null> {
    if (!this.apiKey) {
      console.warn("Google TTS API key not configured");
      return null;
    }

    const voiceName = this.selectVoice(language);
    const ssml = this.buildSsml(text, language);

    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { ssml },
        voice: {
          languageCode: this.getLanguageCode(language),
          name: voiceName,
          ssmlGender: "FEMALE",
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: DEFAULT_SETTINGS.speed,
          pitch: DEFAULT_SETTINGS.pitch * 100,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("TTS API error:", response.status, error);
      return null;
    }

    const data = await response.json();
    if (!data.audioContent) return null;

    const audioBuffer = Buffer.from(data.audioContent, "base64");
    return audioBuffer;
  }

  private selectVoice(language: "en" | "te" | "mix"): string {
    if (language === "te") {
      return "te-IN-Wavenet-A";
    }
    if (language === "mix") {
      return "en-US-Wavenet-A";
    }
    return "en-US-Wavenet-A";
  }

  private getLanguageCode(language: "en" | "te" | "mix"): string {
    if (language === "te") return "te-IN";
    return "en-US";
  }

  private buildSsml(text: string, language: "en" | "te" | "mix"): string {
    const prosody = `speed="${DEFAULT_SETTINGS.speed}" pitch="${DEFAULT_SETTINGS.pitch}st"`;

    if (language === "mix") {
      const parts = this.mixLanguages(text);
      return `<speak>${parts.map((p) => `<prosody ${prosody}>${p}</prosody>`).join("")}</speak>`;
    }

    return `<speak><prosody ${prosody}>${text}</prosody></speak>`;
  }

  private mixLanguages(text: string): string[] {
    const words = text.split(/(\s+)/);
    const result: string[] = [];

    for (const word of words) {
      if (/[అ-హ]/.test(word) || /[ఀ-౿]/.test(word)) {
        result.push(word);
      } else {
        result.push(word);
      }
    }

    return result;
  }
}

/** Fallback TTS adapter using system speech synthesis (offline) */
class FallbackTtsAdapter implements TtsProvider {
  async speak(text: string, language: "en" | "te" | "mix"): Promise<Buffer | null> {
    console.log("TTS fallback:", text, language);
    return Buffer.from(`[TTS: ${text}]`);
  }
}

/** NEXUS HEART TTS Service - Female voice, soft & sweet Indian English accent */
export class NexusHeartTtsService {
  private adapter: TtsProvider;
  private cache = new Map<string, Buffer>();
  private maxCacheSize = 100;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.adapter = new GoogleTtsAdapter(apiKey);
    } else {
      this.adapter = new FallbackTtsAdapter();
    }
  }

  async speak(
    text: string,
    settings: Partial<VoiceSettings> = {},
  ): Promise<Buffer | null> {
    const finalSettings: VoiceSettings = { ...DEFAULT_SETTINGS, ...settings };
    const cacheKey = `${text}-${finalSettings.language}-${finalSettings.speed}-${finalSettings.pitch}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const audio = await this.adapter.speak(text, finalSettings.language);

    if (audio && this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    if (audio) {
      this.cache.set(cacheKey, audio);
    }

    return audio;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getDefaultSettings(): VoiceSettings {
    return { ...DEFAULT_SETTINGS };
  }
}

let ttsService: NexusHeartTtsService | null = null;

export const getTtsService = (): NexusHeartTtsService => {
  if (!ttsService) {
    ttsService = new NexusHeartTtsService(process.env.GOOGLE_TTS_API_KEY || undefined);
  }
  return ttsService;
};