/**
 * Heart Personality & Sweet Appreciation Engine for NEXUS AI.
 * Generates natural, affectionate, and cheerful voice greetings and milestone celebrations.
 * Supports 5 distinct personalities and multilingual communications (English, Telugu, Tenglish).
 */
import https from "node:https";
import { createAudioResource } from "@discordjs/voice";
import { aiOrchestratorService } from "../../ai/services/ai-orchestrator.service.js";
import { createModuleLogger } from "../../../utils/logger.js";
const logger = createModuleLogger("voice:heart-personality");
export class HeartPersonalityService {
    /**
     * Built-in template pools for instant zero-latency responses or offline fallback.
     */
    greetingTemplates = {
        sweet: {
            en: [
                "Heyyy everyone! ❤️ How's your day going?",
                "Welcome back! We missed you so much! ❤️",
                "Hellooo lovely people! Looks like the squad is here!",
                "Aww, look who just joined! Welcome in, take a seat and relax! 🌸",
                "Hey there! You're making our voice room feel so much warmer! ❤️",
            ],
            te: [
                "హాయ్ అందరికీ! ❤️ మీ రోజు ఎలా గడుస్తోంది?",
                "వెల్కమ్ బ్యాక్! నిన్ను చాలా మిస్ అయ్యాము! ❤️",
                "హలో ప్రియమైన మిత్రులారా! మన గ్రూప్ వచ్చేసింది!",
                "అందరికీ నమస్కారం! మీ రాకతో గది చాలా ఉత్సాహంగా మారింది! 🌸",
            ],
            mixed: [
                "Heyyy everyone! Bagunnara? How's your day going? ❤️",
                "LOOK WHO'S BACKKK! Chala miss ayyam! Welcome home! ❤️",
                "Hellooo! Squad antha ikkade undi kada! Super vibes!",
                "Welcome in friend! Kasepu relax avvandi, chill avvandi! 🌸",
            ],
        },
        funny: {
            en: [
                "Hellooo! Squad assembled! Time to pretend we know what we're doing! 😂",
                "Well well well, look who decided to grace us with their presence! 😂",
                "Hold up, did someone call for backup? Because the legend just arrived!",
                "Ayyy! Welcome to the voice channel! Warning: high levels of chaos ahead! 🤪",
            ],
            te: [
                "హలో బాస్! గ్రూప్ మొత్తం వచ్చింది, ఇక రచ్చ రంబోలానే! 😂",
                "చూడండి ఎవరు వచ్చారో! ఈ రోజు మన ప్లాన్ ఏంటి మిత్రమా?",
                "అబ్బో! పెద్ద మనుషులు వచ్చారు! స్వాగతం సుస్వాగతం! 🤪",
            ],
            mixed: [
                "Areyyy look who's here! Ready aa full comedy cheyadaniki? 😂",
                "Squad assembled boss! Inka racha lepadame!",
                "Hello my friend! Welcome to the most chaotic room on Discord! 🤪",
            ],
        },
        gaming: {
            en: [
                "Hey gamers! Ready for some epic fun? Let's get these W's! 🎮",
                "Player joined the lobby! Who's carrying the squad today? 🕹️",
                "Lock and load team! The gaming champion has entered the voice channel! 🚀",
                "Ayy gamers! What are we conquering today? GG in advance! 🎮",
            ],
            te: [
                "హే గేమర్స్! ఈ రోజు ఏ గేమ్ ఆడుతున్నాం? విక్టరీ మనదే! 🎮",
                "ప్లేయర్ లాబీలోకి వచ్చారు! ఈ రోజు మ్యాచ్ గెలవాల్సిందే! 🕹️",
                "స్వాగతం ప్రో గేమర్! గేమ్ మొదలుపెడదామా! 🚀",
            ],
            mixed: [
                "Hey gamers! Match start cheddama? Let's grab that Victory Royale! 🎮",
                "Player lobby lo join ayyaru! Who's carrying today? 🕹️",
                "Ready for some epic gaming action? Let's GO! 🚀",
            ],
        },
        royal: {
            en: [
                "Greetings, esteemed members. It is an absolute honor to accompany you today. 👑",
                "A warm and distinguished welcome to our court. May your time here be delightful. 👑",
                "Salutations! The presence of our noble friend graces this gathering with elegance.",
            ],
            te: [
                "నమస్కారములు. మీ రాకతో మా సభ శోభాయమానమైనది. 👑",
                "గౌరవనీయులైన మిత్రులకు రాజసం తో కూడిన స్వాగతం! 👑",
            ],
            mixed: [
                "Greetings to our noble friend! Meetho spend cheyadam chala gouravam. 👑",
                "A distinguished welcome to our court! Have a pleasant evening. 👑",
            ],
        },
        cute: {
            en: [
                "Yayyy! Hello hello! Sending virtual cookies and hugs to everyone! 🌸🍪",
                "Bloop bloop! A wild cutie has appeared in voice chat! ✨💖",
                "Teehee! You're here! Let's have the best and sweetest time ever! 🌸",
                "Hiiiii! So so happy to hear your voices! Big smiles today! 🎀",
            ],
            te: [
                "హాయ్ హాయ్! అందరికీ తీపి కుకీలు మరియు కౌగిలింతలు! 🌸🍪",
                "అందరికీ నమస్కారం! చాలా సంతోషంగా ఉంది మిమ్మల్ని కలవడం! 🎀",
            ],
            mixed: [
                "Yayyy hello hello! Andariki virtual hugs and cookies! 🌸🍪",
                "Bloop bloop! Welcome to the cutest voice chat ever! ✨💖",
                "Chala happy ga undi mee presence chusi! Let's have fun! 🎀",
            ],
        },
    };
    /**
     * Built-in milestone appreciation templates.
     */
    appreciationTemplates = {
        "15m": {
            en: [
                "You're making our community brighter! Thanks for spending your first 15 minutes with us! ❤️",
                "15 minutes already! You bring such a lovely energy to this room! 🌸",
            ],
            te: [
                "మీరు మా కమ్యూనిటీని మరింత అందంగా మారుస్తున్నారు! 15 నిమిషాల సమయం కేటాయించినందుకు ధన్యవాదాలు! ❤️",
            ],
            mixed: [
                "15 minutes complete! You're making this community so much brighter! Chala thanks! ❤️",
            ],
        },
        "30m": {
            en: [
                "Heyyy! Just wanted to say thanks for spending 30 minutes with us. You're making this server more fun! ❤️",
                "Voice Buddy unlocked! Half an hour flew by because you're so great to hang out with! 🎙️",
            ],
            te: [
                "30 నిమిషాలు గడిచాయి! మీరు వాయిస్ బడ్డీ మైలురాయిని చేరుకున్నారు! చాలా ధన్యవాదాలు! ❤️",
            ],
            mixed: [
                "Heyyy! 30 minutes completed already! You unlocked Voice Buddy! Server chala fun ga undi meetho! ❤️",
            ],
        },
        "1h": {
            en: [
                "ONE HOUR ALREADY?! You're such a lovely part of this community. Keep spreading those good vibes! 🥹",
                "Golden Friend achievement unlocked! One full hour of awesome memories! ⭐",
            ],
            te: [
                "వన్ అవర్ అయిపోయింది! మీరు నిజంగా మా కమ్యూనిటీకి గొప్ప బలం! గోల్డెన్ ఫ్రెండ్ సాధించారు! 🥹",
            ],
            mixed: [
                "ONE HOUR ALREADY?! You're such an awesome part of this family. Keep spreading good vibes! 🥹⭐",
            ],
        },
        "2h": {
            en: [
                "Two hours together! You're an irreplaceable part of this community! Thank you for being here! 🌟",
                "Super Companion unlocked! Your dedication and friendly presence mean the world to us! ❤️",
            ],
            te: [
                "రెండు గంటలు పూర్తి చేసుకున్నారు! సూపర్ కంపానియన్ అవార్డు మీకు లభించింది! 🌟",
            ],
            mixed: [
                "Two hours complete! Super Companion unlocked! Thanks for making our server so lively! 🌟",
            ],
        },
        "3h": {
            en: [
                "Three hours! Sending you the biggest appreciation possible! You are truly a Community Star! ⭐",
                "Community Star unlocked! Thank you for lighting up our server today! 💖",
            ],
            te: [
                "మూడు గంటలు! కమ్యూనిటీ స్టార్ అవార్డు మీరు గెలుచుకున్నారు! హృదయపూర్వక అభినందనలు! ⭐",
            ],
            mixed: [
                "THREE HOURS! You unlocked Community Star! Meetho unte time theliyatam ledu! Big appreciation! ⭐",
            ],
        },
        "5h": {
            en: [
                "FIVE HOURS?! You are officially a NEXUS LEGEND! Legendary Friend unlocked! 👑❤️",
                "An absolute legend in the house! 5 hours of voice dedication! We love having you here! 👑",
            ],
            te: [
                "ఐదు గంటలు పూర్తి! మీరు అధికారికంగా నెక్సస్ లెజెండ్ అయ్యారు! లెజెండరీ ఫ్రెండ్ అచీవ్‌మెంట్ మీ సొంతం! 👑",
            ],
            mixed: [
                "FIVE HOURS?! You are officially a NEXUS LEGEND! Legendary Friend badge is yours! Chala thanks! 👑❤️",
            ],
        },
    };
    /**
     * Generates a sweet, personalized greeting for a member entering a voice room.
     */
    async generateGreeting(context) {
        const { username, personality, language, isFirstTime, daysAbsent } = context;
        // If absent for more than 3 days, special welcome back message
        if (daysAbsent && daysAbsent >= 3) {
            if (language === "te") {
                return `చూడండి ఎవరు తిరిగి వచ్చారో! స్వాగతం ${username}! నిన్ను చాలా రోజులుగా మిస్ అయ్యాము! ❤️`;
            }
            else if (language === "mixed") {
                return `LOOK WHO'S BACKKK! Welcome home ${username}! We missed having you around so much! ❤️`;
            }
            return `LOOK WHO'S BACKKK! Welcome home ${username}! We missed having you around! ❤️`;
        }
        // Try cloud AI with integrated Gemini API key if available
        try {
            if (aiOrchestratorService.getActiveProviders().includes("gemini")) {
                const prompt = `You are NEXUS AI, a sweet, friendly voice companion in a Discord voice channel.
Generate a short, sweet 1-2 sentence spoken greeting welcoming "${username}" to the voice channel.
Personality style: ${personality} (caring, natural, cheerful).
Language: ${language === "te" ? "Telugu (తెలుగు లిపి)" : language === "mixed" ? "Telugu-English mixed (Tenglish)" : "English"}.
${isFirstTime ? "Note: This is their very first time joining our voice channels!" : ""}
Rules:
- Keep it under 25 words.
- Warm, cheerful, and welcoming.
- No markdown headers, just plain spoken text with emojis.`;
                const response = await aiOrchestratorService.generateResponse([
                    { role: "user", content: prompt },
                ], { maxTokens: 60, temperature: 0.8 });
                if (response.provider === "gemini" && response.text && response.text.trim().length > 0) {
                    return response.text.trim();
                }
            }
        }
        catch (err) {
            logger.debug({ err }, "AI greeting generation fallback to template pool");
        }
        // Fallback to high-quality template pool
        const pool = this.greetingTemplates[personality]?.[language] || this.greetingTemplates.sweet.en;
        const template = pool[Math.floor(Math.random() * pool.length)];
        return template;
    }
    /**
     * Generates an intelligent appreciation celebration message when a member hits a voice duration milestone.
     */
    async generateAppreciation(context) {
        const { username, milestoneName, durationMinutes, personality, language } = context;
        let key = "15m";
        if (durationMinutes >= 300)
            key = "5h";
        else if (durationMinutes >= 180)
            key = "3h";
        else if (durationMinutes >= 120)
            key = "2h";
        else if (durationMinutes >= 60)
            key = "1h";
        else if (durationMinutes >= 30)
            key = "30m";
        // Attempt Gemini cloud generation for milestone celebration
        try {
            if (aiOrchestratorService.getActiveProviders().includes("gemini")) {
                const prompt = `You are NEXUS AI celebrating user "${username}" who has spent ${durationMinutes} minutes in a Discord voice channel!
They just unlocked the "${milestoneName}" achievement!
Personality: ${personality}.
Language: ${language === "te" ? "Telugu (తెలుగు లిపి)" : language === "mixed" ? "Telugu-English mixed (Tenglish)" : "English"}.
Craft an affectionate, celebratory 1-2 sentence message congratulating them.
Keep it under 30 words with emojis.`;
                const response = await aiOrchestratorService.generateResponse([
                    { role: "user", content: prompt },
                ], { maxTokens: 75, temperature: 0.8 });
                if (response.provider === "gemini" && response.text && response.text.trim().length > 0) {
                    return response.text.trim();
                }
            }
        }
        catch (err) {
            logger.debug({ err }, "AI appreciation generation fallback to template pool");
        }
        const pool = this.appreciationTemplates[key]?.[language] || this.appreciationTemplates[key]?.en || this.appreciationTemplates["15m"].en;
        const template = pool[Math.floor(Math.random() * pool.length)];
        return template;
    }
    /**
     * Synthesize natural speech audio stream from text via Google TTS (zero local bloat).
     * Compatible with @discordjs/voice createAudioResource.
     */
    async synthesizeSpeechAudio(text, language = "en") {
        const langCode = language === "te" ? "te" : "en";
        const cleanedText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
        const query = encodeURIComponent(cleanedText || text);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${query}&tl=${langCode}&client=tw-ob`;
        return new Promise((resolve, reject) => {
            https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }, (res) => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`TTS request failed with status: ${res.statusCode}`));
                }
                const resource = createAudioResource(res);
                resolve(resource);
            }).on("error", reject);
        });
    }
}
export const heartPersonalityService = new HeartPersonalityService();
//# sourceMappingURL=heart-personality.service.js.map