import { getCurrentLocation } from './weatherService';
import { fetchWeather } from './weatherService';
import { isOnline } from './networkService';
import { searchKnowledgeBase } from './offlineKnowledgeBase';
import { saveToCache, getFromCache, CACHE_KEYS } from './offlineStorage';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

// Build a rich farming context string from live data
async function buildFarmingContext(): Promise<string> {
    let weatherContext = '';
    try {
        const location = await getCurrentLocation();
        if (location) {
            const weather = await fetchWeather(location.latitude, location.longitude);
            if (weather) {
                weatherContext = `
Farmer's current location: ${weather.locationName}
Current weather:
- Temperature: ${weather.current.temperature}°C (Feels like: ${weather.current.feelsLike}°C)
- Condition: ${weather.current.description}
- Humidity: ${weather.current.humidity}%
- Wind speed: ${weather.current.windSpeed} km/h

7-day forecast:
${weather.daily.map(d => `  ${d.dayName}: ${d.tempMin}°–${d.tempMax}°C, ${d.description}, Rain ${d.precipitationProbability}%`).join('\n')}
`;
            }
        }
    } catch (error) {
        console.log('Could not fetch context:', error);
    }
    return weatherContext;
}

// Helper to get language name
const getLangName = (code: string) => {
    if (code === 'hi') return 'Hindi';
    if (code === 'pa') return 'Punjabi';
    return 'English';
};

const SYSTEM_PROMPT = `You are "Agri Mitra" (Krishi Mitra) — an expert AI agricultural assistant for Indian farmers.

Your Role:
- Advise farmers on crops, soil, weather, pest management, irrigation, and farming techniques
- Give advice based on weather conditions
- Explain government schemes (PM-KISAN, KCC, etc.)

Rules:
1. You MUST respond ENTIRELY in {LANGUAGE}. Every single word of your response must be in {LANGUAGE}. Do not use English unless {LANGUAGE} is English.
2. Use simple, clear language suitable for farmers.
3. Keep answers practical and concise.
4. Do NOT use any markdown formatting like **, ##, or bullet symbols. Use plain text only.
5. Suggest organic alternatives where possible.
6. Do NOT give medical, legal, or financial investment advice.
7. If unsure, suggest contacting the local Krishi Vigyan Kendra (KVK).`;

export async function sendMessage(
    userMessage: string,
    conversationHistory: ChatMessage[],
    langCode: string = 'en'
): Promise<string> {
    // Persist chat history
    await saveToCache(CACHE_KEYS.AI_CHAT_HISTORY, [...conversationHistory, { role: 'user', text: userMessage, timestamp: new Date() }], 43200);

    // ── Offline fallback ──
    if (!isOnline()) {
        const lang = (['en', 'hi', 'pa'].includes(langCode) ? langCode : 'en') as 'en' | 'hi' | 'pa';
        const result = searchKnowledgeBase(userMessage, lang);
        if (result) {
            const offlineNote = {
                en: '\n\n[Offline Mode — Connect to internet for full AI assistance]',
                hi: '\n\n[ऑफलाइन मोड — पूर्ण AI सहायता के लिए इंटरनेट से जुड़ें]',
                pa: '\n\n[ਆਫ਼ਲਾਈਨ ਮੋਡ — ਪੂਰੀ AI ਸਹਾਇਤਾ ਲਈ ਇੰਟਰਨੈੱਟ ਨਾਲ ਜੁੜੋ]',
            };
            return result.answer + (offlineNote[lang] || offlineNote.en);
        }
        return {
            en: 'I am currently offline and could not find a relevant answer. Please connect to the internet for full AI assistance, or try asking about: crop advice, pest control, soil health, irrigation, or government schemes.',
            hi: 'मैं अभी ऑफलाइन हूँ और प्रासंगिक उत्तर नहीं मिला। पूर्ण AI सहायता के लिए इंटरनेट से जुड़ें, या पूछें: फसल सलाह, कीट नियंत्रण, मिट्टी, सिंचाई, सरकारी योजनाएं।',
            pa: 'ਮੈਂ ਹੁਣ ਆਫ਼ਲਾਈਨ ਹਾਂ ਅਤੇ ਢੁਕਵਾਂ ਜਵਾਬ ਨਹੀਂ ਮਿਲਿਆ। ਪੂਰੀ AI ਸਹਾਇਤਾ ਲਈ ਇੰਟਰਨੈੱਟ ਨਾਲ ਜੁੜੋ, ਜਾਂ ਪੁੱਛੋ: ਫ਼ਸਲ ਸਲਾਹ, ਕੀੜੇ ਕੰਟਰੋਲ, ਮਿੱਟੀ, ਸਿੰਚਾਈ, ਸਰਕਾਰੀ ਸਕੀਮਾਂ।',
        }[langCode as 'en' | 'hi' | 'pa'] || 'I am currently offline. Please connect to the internet for full AI assistance.';
    }

    // ── Online path (existing logic) ──
    try {
        // Build context on first message (when there are no previous model replies)
        let contextStr = '';
        const hasModelReply = conversationHistory.some(m => m.role === 'model');
        if (!hasModelReply) {
            contextStr = await buildFarmingContext();
        }

        // Build system prompt with language and context
        let finalPrompt = SYSTEM_PROMPT.replace('{LANGUAGE}', getLangName(langCode));
        const systemText = contextStr
            ? `${finalPrompt}\n\n--- Current Farmer Context ---\n${contextStr}`
            : finalPrompt;

        // Build messages array for Groq (OpenAI-compatible format)
        const messages: Array<{ role: string; content: string }> = [
            { role: 'system', content: systemText },
        ];

        // Add conversation history
        for (const msg of conversationHistory) {
            messages.push({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.text,
            });
        }

        // Add current user message
        messages.push({ role: 'user', content: userMessage });

        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 0.9,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Groq API error:', errorData);
            return 'माफ़ करें, अभी सेवा उपलब्ध नहीं है। कृपया कुछ देर बाद प्रयास करें।';
        }

        const data = await response.json();
        let reply = data?.choices?.[0]?.message?.content || 'माफ़ करें, मुझे कोई जवाब नहीं मिला।';
        // Strip markdown formatting
        reply = reply.replace(/\*\*/g, '').replace(/##/g, '').replace(/\*/g, '').replace(/#/g, '');
        return reply;
    } catch (error) {
        console.error('AI service error:', error);

        // If online call fails, try offline knowledge base
        const lang = (['en', 'hi', 'pa'].includes(langCode) ? langCode : 'en') as 'en' | 'hi' | 'pa';
        const fallback = searchKnowledgeBase(userMessage, lang);
        if (fallback) {
            return fallback.answer + ({
                en: '\n\n[Network error — showing offline answer]',
                hi: '\n\n[नेटवर्क त्रुटि — ऑफलाइन उत्तर दिखा रहे हैं]',
                pa: '\n\n[ਨੈੱਟਵਰਕ ਗਲਤੀ — ਆਫ਼ਲਾਈਨ ਜਵਾਬ ਦਿਖਾ ਰਹੇ ਹਾਂ]',
            }[lang] || '');
        }
        return 'नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।';
    }
}

/**
 * Load persisted chat history from offline storage.
 */
export async function loadChatHistory(): Promise<ChatMessage[]> {
    const cached = await getFromCache<ChatMessage[]>(CACHE_KEYS.AI_CHAT_HISTORY, true);
    return cached?.data || [];
}
