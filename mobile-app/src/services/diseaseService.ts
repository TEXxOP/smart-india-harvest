// Backend URL loaded from centralized config
import { BACKEND_URL } from '../config';
import { isOnline } from './networkService';
import { appendToCache, CACHE_KEYS } from './offlineStorage';
import { enqueue } from './offlineQueue';


export interface DiseaseResult {
    label: string;
    confidence: number;
    allPredictions: { label: string; score: number }[];
}

// Map disease labels to multilingual descriptions
const DISEASE_INFO: Record<string, { en: any; hi: any; pa: any }> = {
    'Tomato___Late_blight': {
        en: { name: 'Tomato — Late Blight', description: 'Dark brown spots on leaves, spreads in cool/damp weather.', remedy: 'Spray Mancozeb or Copper Oxychloride. Remove infected plants.' },
        hi: { name: 'टमाटर — लेट ब्लाइट', description: 'पत्तियों पर गहरे भूरे धब्बे, ठंडे और नम मौसम में फैलता है।', remedy: 'मैन्कोज़ेब या कॉपर ऑक्सीक्लोराइड का छिड़काव करें। संक्रमित पौधों को हटाएं।' },
        pa: { name: 'ਟਮਾਟਰ — ਲੇਟ ਬਲਾਈਟ', description: 'ਪੱਤਿਆਂ ਤੇ ਗੂੜ੍ਹੇ ਭੂਰੇ ਧੱਬੇ, ਠੰਡੇ ਅਤੇ ਸਿੱਲ੍ਹੇ ਮੌਸਮ ਵਿੱਚ ਫੈਲਦਾ ਹੈ।', remedy: 'ਮੈਨਕੋਜ਼ੇਬ ਜਾਂ ਕਾਪਰ ਆਕਸੀਕਲੋਰਾਈਡ ਦਾ ਛਿੜਕਾਅ ਕਰੋ। ਸੰਕ੍ਰਮਿਤ ਪੌਦਿਆਂ ਨੂੰ ਹਟਾਓ।' }
    },
    'Tomato___Early_blight': {
        en: { name: 'Tomato — Early Blight', description: 'Circular brown spots with rings on older leaves.', remedy: 'Spray Chlorothalonil or Mancozeb. Rotate crops.' },
        hi: { name: 'टमाटर — अर्ली ब्लाइट', description: 'पुरानी पत्तियों पर गोल भूरे धब्बे जिनमें छल्ले दिखते हैं।', remedy: 'क्लोरोथैलोनिल या मैन्कोज़ेब स्प्रे करें। फसल चक्र अपनाएं।' },
        pa: { name: 'ਟਮਾਟਰ — ਅਰਲੀ ਬਲਾਈਟ', description: 'ਪੁਰਾਣੇ ਪੱਤਿਆਂ ਤੇ ਗੋਲ ਭੂਰੇ ਧੱਬੇ ਜਿਨ੍ਹਾਂ ਵਿੱਚ ਛੱਲੇ ਦਿਖਾਈ ਦਿੰਦੇ ਹਨ।', remedy: 'ਕਲੋਰੋਥੈਲੋਨਿਲ ਜਾਂ ਮੈਨਕੋਜ਼ੇਬ ਦਾ ਛਿੜਕਾਅ ਕਰੋ। ਫਸਲੀ ਚੱਕਰ ਅਪਣਾਓ।' }
    },
    'Tomato___healthy': {
        en: { name: 'Tomato — Healthy ✅', description: 'Your crop is healthy!', remedy: 'Continue regular care and balanced nutrition.' },
        hi: { name: 'टमाटर — स्वस्थ ✅', description: 'आपकी फसल स्वस्थ है! कोई रोग नहीं पाया गया।', remedy: 'नियमित निरीक्षण जारी रखें और संतुलित पोषण दें।' },
        pa: { name: 'ਟਮਾਟਰ — ਤੰਦਰੁਸਤ ✅', description: 'ਤੁਹਾਡੀ ਫਸਲ ਤੰਦਰੁਸਤ ਹੈ!', remedy: 'ਨਿਯਮਤ ਦੇਖਭਾਲ ਜਾਰੀ ਰੱਖੋ।' }
    },
    'Tomato___Bacterial_spot': {
        en: { name: 'Tomato — Bacterial Spot', description: 'Small dark brown-black spots on leaves.', remedy: 'Use copper-based fungicide. Remove infected leaves.' },
        hi: { name: 'टमाटर — बैक्टीरियल स्पॉट', description: 'पत्तियों पर छोटे गहरे भूरे-काले धब्बे।', remedy: 'कॉपर-आधारित फफूंदनाशक का प्रयोग करें। संक्रमित पत्तियां हटाएं।' },
        pa: { name: 'ਟਮਾਟਰ — ਬੈਕਟੀਰੀਅਲ ਸਪਾਟ', description: 'ਪੱਤਿਆਂ ਤੇ ਛੋਟੇ ਗੂੜ੍ਹੇ ਭੂਰੇ-ਕਾਲੇ ਧੱਬੇ।', remedy: 'ਕਾਪਰ-ਅਧਾਰਤ ਉੱਲੀਨਾਸ਼ਕ ਵਰਤੋ। ਸੰਕ੍ਰਮਿਤ ਪੱਤੇ ਹਟਾਓ।' }
    },
    'Tomato___Septoria_leaf_spot': {
        en: { name: 'Tomato — Septoria Leaf Spot', description: 'Small circular spots with brown center and black margins.', remedy: 'Spray Chlorothalonil or Mancozeb.' },
        hi: { name: 'टमाटर — सेप्टोरिया लीफ स्पॉट', description: 'छोटे गोल धब्बे जिनके बीच में भूरा और किनारे काले।', remedy: 'क्लोरोथैलोनिल या मैन्कोज़ेब का छिड़काव करें।', },
        pa: { name: 'ਟਮਾਟਰ — ਸੈਪਟੋਰੀਆ ਲੀਫ ਸਪਾਟ', description: 'ਛੋਟੇ ਗੋਲ ਧੱਬੇ ਜਿਨ੍ਹਾਂ ਦਾ ਕੇਂਦਰ ਭੂਰਾ ਅਤੇ ਕਿਨਾਰੇ ਕਾਲੇ ਹੁੰਦੇ ਹਨ।', remedy: 'ਕਲੋਰੋਥੈਲੋਨਿਲ ਜਾਂ ਮੈਨਕੋਜ਼ੇਬ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।' }
    },
    'Tomato___Leaf_Mold': {
        en: { name: 'Tomato — Leaf Mold', description: 'Yellow spots on upper side, olive mold on underside.', remedy: 'Improve air circulation. Apply fungicide.' },
        hi: { name: 'टमाटर — लीफ मोल्ड', description: 'पीले धब्बे ऊपर और जैतूनी फफूंद नीचे।', remedy: 'हवा का आवागमन बढ़ाएं। फफूंदनाशक लगाएं।', },
        pa: { name: 'ਟਮਾਟਰ — ਲੀਫ ਮੋਲਡ', description: 'ਉੱਪਰ ਪੀਲੇ ਧੱਬੇ ਅਤੇ ਹੇਠਾਂ ਜੈਤੂਨੀ ਉੱਲੀ।', remedy: 'ਹਵਾ ਦਾ ਸੰਚਾਰ ਵਧਾਓ। ਉੱਲੀਨਾਸ਼ਕ ਲਗਾਓ।' }
    },
    'Tomato___Target_Spot': {
        en: { name: 'Tomato — Target Spot', description: 'Circular target-like spots on older leaves.', remedy: 'Spray Mancozeb or Copper fungicide.' },
        hi: { name: 'टमाटर — टार्गेट स्पॉट', description: 'गोल छल्लेदार धब्बे पुरानी पत्तियों पर।', remedy: 'मैन्कोज़ेब या कॉपर स्प्रे करें।', },
        pa: { name: 'ਟਮਾਟਰ — ਟਾਰਗੇਟ ਸਪਾਟ', description: 'ਪੁਰਾਣੇ ਪੱਤਿਆਂ ਤੇ ਗੋਲ ਨਿਸ਼ਾਨ ਵਰਗੇ ਧੱਬੇ।', remedy: 'ਮੈਨਕੋਜ਼ੇਬ ਜਾਂ ਕਾਪਰ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।' }
    },
    'Tomato___Spider_mites Two-spotted_spider_mite': {
        en: { name: 'Tomato — Spider Mites', description: 'Tiny yellow dots on leaves, webbing visible.', remedy: 'Spray Neem oil or Miticide.' },
        hi: { name: 'टमाटर — मकड़ी माइट', description: 'पत्तियों पर पीले छोटे बिंदु, जाला दिखना।', remedy: 'नीम तेल या माइटिसाइड का छिड़काव करें।', },
        pa: { name: 'ਟਮਾਟਰ — ਮਕੜੀ ਦੇ ਕੀੜੇ', description: 'ਪੱਤਿਆਂ ਤੇ ਛੋਟੇ ਪੀਲੇ ਬਿੰਦੂ, ਜਾਲਾ ਦਿਖਾਈ ਦਿੰਦਾ ਹੈ।', remedy: 'ਨੀਮ ਦਾ ਤੇਲ ਜਾਂ ਕੀਟਨਾਸ਼ਕ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।' }
    },
    'Tomato___Yellow_Leaf_Curl_Virus': {
        en: { name: 'Tomato — Yellow Leaf Curl', description: 'Leaves curl and turn yellow, plants stunted.', remedy: 'Control whiteflies. Plant resistant varieties.' },
        hi: { name: 'टमाटर — पीला पत्ती मरोड़ वायरस', description: 'पत्तियां पीली और मुड़ जाती हैं, पौधे बौने रहते हैं।', remedy: 'सफेद मक्खी नियंत्रण करें। प्रतिरोधी किस्में लगाएं।', },
        pa: { name: 'ਟਮਾਟਰ — ਪੀਲਾ ਪੱਤਾ ਮਰੋੜ ਵਾਇਰਸ', description: 'ਪੱਤੇ ਪੀਲੇ ਅਤੇ ਮੁੜ ਜਾਂਦੇ ਹਨ, ਪੌਦੇ ਛੋਟੇ ਰਹਿ ਜਾਂਦੇ ਹਨ।', remedy: 'ਚਿੱਟੀ ਮੱਖੀ ਨੂੰ ਰੋਕੋ। ਰੋਧਕ ਕਿਸਮਾਂ ਲਗਾਓ।' }
    },
    'Tomato___Tomato_mosaic_virus': {
        en: { name: 'Tomato — Mosaic Virus', description: 'Mottled green-yellow pattern on leaves.', remedy: 'Remove infected plants. Disinfect tools.' },
        hi: { name: 'टमाटर — मोज़ेक वायरस', description: 'पत्तियों पर हरे-पीले धब्बे का पैटर्न।', remedy: 'संक्रमित पौधे हटाएं। औजार कीटाणुरहित करें।', },
        pa: { name: 'ਟਮਾਟਰ — ਮੋਜ਼ੇਕ ਵਾਇਰਸ', description: 'ਪੱਤਿਆਂ ਤੇ ਹਰੇ-ਪੀਲੇ ਧੱਬਿਆਂ ਦਾ ਪੈਟਰਨ।', remedy: 'ਸੰਕ੍ਰਮਿਤ ਪੌਦੇ ਹਟਾਓ। ਸੰਦਾਂ ਨੂੰ ਕੀਟਾਣੂਰਹਿਤ ਕਰੋ।' }
    },
    'Potato___Late_blight': {
        en: { name: 'Potato — Late Blight', description: 'Water-soaked spots turning brown/black.', remedy: 'Spray Metalaxyl + Mancozeb. Treat seeds.' },
        hi: { name: 'आलू — लेट ब्लाइट', description: 'पत्तियों पर पानी भरे धब्बे जो भूरे-काले हो जाते हैं।', remedy: 'मेटालैक्सिल + मैन्कोज़ेब का छिड़काव करें। बीज उपचार करें।', },
        pa: { name: 'ਆਲੂ — ਲੇਟ ਬਲਾਈਟ', description: 'ਪੱਤਿਆਂ ਤੇ ਪਾਣੀ ਭਰੇ ਧੱਬੇ ਜੋ ਭੂਰੇ-ਕਾਲੇ ਹੋ ਜਾਂਦੇ ਹਨ।', remedy: 'ਮੈਟਾਲੈਕਸੀਲ + ਮੈਨਕੋਜ਼ੇਬ ਦਾ ਛਿੜਕਾਅ ਕਰੋ। ਬੀਜ ਦਾ ਇਲਾਜ ਕਰੋ।' }
    },
    'Potato___Early_blight': {
        en: { name: 'Potato — Early Blight', description: 'Brown concentric rings on older leaves.', remedy: 'Use Mancozeb or Copper-based fungicides.' },
        hi: { name: 'आलू — अर्ली ब्लाइट', description: 'पत्तियों पर भूरे छल्लेदार धब्बे, पुरानी पत्तियों से शुरू होता है।', remedy: 'मैन्कोज़ेब या कॉपर-आधारित फफूंदनाशक का प्रयोग करें।', },
        pa: { name: 'ਆਲੂ — ਅਰਲੀ ਬਲਾਈਟ', description: 'ਪੁਰਾਣੇ ਪੱਤਿਆਂ ਤੇ ਭੂਰੇ ਛੱਲੇਦਾਰ ਧੱਬੇ।', remedy: 'ਮੈਨਕੋਜ਼ੇਬ ਜਾਂ ਕਾਪਰ-ਅਧਾਰਤ ਉੱਲੀਨਾਸ਼ਕ ਵਰਤੋ।' }
    },
    'Potato___healthy': {
        en: { name: 'Potato — Healthy ✅', description: 'Your crop is healthy!', remedy: 'Continue regular care.' },
        hi: { name: 'आलू — स्वस्थ ✅', description: 'आपकी फसल स्वस्थ है!', remedy: 'नियमित देखभाल जारी रखें।', },
        pa: { name: 'ਆਲੂ — ਤੰਦਰੁਸਤ ✅', description: 'ਤੁਹਾਡੀ ਫਸਲ ਤੰਦਰੁਸਤ ਹੈ!', remedy: 'ਨਿਯਮਤ ਦੇਖਭਾਲ ਜਾਰੀ ਰੱਖੋ।' }
    },
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': {
        en: { name: 'Corn — Gray Leaf Spot', description: 'Long gray-brown rectangular spots.', remedy: 'Plant resistant varieties. Use fungicide.' },
        hi: { name: 'मक्का — ग्रे लीफ स्पॉट', description: 'पत्तियों पर लंबे भूरे-स्लेटी धब्बे।', remedy: 'प्रतिरोधी किस्में लगाएं। स्ट्रोबिलुरिन फफूंदनाशक का उपयोग करें।', },
        pa: { name: 'ਮੱਕੀ — ਗ੍ਰੇ ਲੀਫ ਸਪਾਟ', description: 'ਪੱਤਿਆਂ ਤੇ ਲੰਬੇ ਭੂਰੇ-ਸਲੇਟੀ ਧੱਬੇ।', remedy: 'ਰੋਧਕ ਕਿਸਮਾਂ ਲਗਾਓ। ਉੱਲੀਨਾਸ਼ਕ ਵਰਤੋ।' }
    },
    'Corn_(maize)___Common_rust_': {
        en: { name: 'Corn — Common Rust', description: 'Small cinnamon-brown pustules on leaves.', remedy: 'Spray Mancozeb or Propiconazole.' },
        hi: { name: 'मक्का — कॉमन रस्ट', description: 'पत्तियों पर लालिमा लिए भूरे-नारंगी छोटे दाने।', remedy: 'मैन्कोज़ेब या प्रोपिकोनाज़ोल का छिड़काव करें।', },
        pa: { name: 'ਮੱਕੀ — ਆਮ ਜੰਗਾਲ', description: 'ਪੱਤਿਆਂ ਤੇ ਲਾਲ-ਭੂਰੇ ਛੋਟੇ ਦਾਣੇ।', remedy: 'ਮੈਨਕੋਜ਼ੇਬ ਜਾਂ ਪ੍ਰੋਪੀਕੋਨਾਜ਼ੋਲ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।' }
    },
    'Corn_(maize)___Northern_Leaf_Blight': {
        en: { name: 'Corn — Northern Leaf Blight', description: 'Long cigar-shaped gray-green lesions.', remedy: 'Use resistant varieties and fungicides.' },
        hi: { name: 'मक्का — नॉर्दन लीफ ब्लाइट', description: 'लंबे सिगार आकार के भूरे-स्लेटी धब्बे।', remedy: 'प्रतिरोधी किस्में और फफूंदनाशक का प्रयोग।', },
        pa: { name: 'ਮੱਕੀ — ਉੱਤਰੀ ਪੱਤਾ ਬਲਾਈਟ', description: 'ਲੰਬੇ ਸਿਗਾਰ ਵਰਗੇ ਭੂਰੇ-ਸਲੇਟੀ ਧੱਬੇ।', remedy: 'ਰੋਧਕ ਕਿਸਮਾਂ ਅਤੇ ਉੱਲੀਨਾਸ਼ਕ ਵਰਤੋ।' }
    },
    'Corn_(maize)___healthy': {
        en: { name: 'Corn — Healthy ✅', description: 'Your maize crop is healthy!', remedy: 'Continue regular care.' },
        hi: { name: 'मक्का — स्वस्थ ✅', description: 'आपकी मक्का फसल स्वस्थ है!', remedy: 'नियमित देखभाल जारी रखें।', },
        pa: { name: 'ਮੱਕੀ — ਤੰਦਰੁਸਤ ✅', description: 'ਤੁਹਾਡੀ ਮੱਕੀ ਦੀ ਫਸਲ ਤੰਦਰੁਸਤ ਹੈ!', remedy: 'ਨਿਯਮਤ ਦੇਖਭਾਲ ਜਾਰੀ ਰੱਖੋ।' }
    },
    'Apple___Apple_scab': {
        en: { name: 'Apple — Scab', description: 'Olive-green spots on leaves and fruit.', remedy: 'Spray Captan or Mancozeb.' },
        hi: { name: 'सेब — स्कैब', description: 'पत्तियों और फलों पर जैतूनी-भूरे धब्बे।', remedy: 'कैप्टान या मैन्कोज़ेब का छिड़काव करें।', },
        pa: { name: 'ਸੇਬ — ਸਕੈਬ', description: 'ਪੱਤਿਆਂ ਅਤੇ ਫਲਾਂ ਤੇ ਜੈਤੂਨੀ-ਭੂਰੇ ਧੱਬੇ।', remedy: 'ਕੈਪਟਨ ਜਾਂ ਮੈਨਕੋਜ਼ੇਬ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।' }
    },
    'Apple___healthy': {
        en: { name: 'Apple — Healthy ✅', description: 'Your apple crop is healthy!', remedy: 'Continue regular care.' },
        hi: { name: 'सेब — स्वस्थ ✅', description: 'आपकी सेब की फसल स्वस्थ है!', remedy: 'नियमित देखभाल जारी रखें।', },
        pa: { name: 'ਸੇਬ — ਤੰਦਰੁਸਤ ✅', description: 'ਤੁਹਾਡੀ ਸੇਬ ਦੀ ਫਸਲ ਤੰਦਰੁਸਤ ਹੈ!', remedy: 'ਨਿਯਮਤ ਦੇਖਭਾਲ ਜਾਰੀ ਰੱਖੋ।' }
    },
    'Grape___Black_rot': {
        en: { name: 'Grape — Black Rot', description: 'Brown spots on leaves, rotting fruit.', remedy: 'Spray Mancozeb or Myclobutanil.' },
        hi: { name: 'अंगूर — ब्लैक रॉट', description: 'पत्तियों पर भूरे धब्बे और फलों का सड़ना।', remedy: 'मैन्कोज़ेब या माइक्लोब्यूटानिल का छिड़काव करें।', },
        pa: { name: 'ਅੰਗੂਰ — ਬਲੈਕ ਰੋਟ', description: 'ਪੱਤਿਆਂ ਤੇ ਭੂਰੇ ਧੱਬੇ ਅਤੇ ਫਲਾਂ ਦਾ ਸੜਨਾ।', remedy: 'ਮੈਨਕੋਜ਼ੇਬ ਜਾਂ ਮਾਈਕਲੋਬਿਊਟਾਨਿਲ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।' }
    },
    'Grape___healthy': {
        en: { name: 'Grape — Healthy ✅', description: 'Grapes are healthy!', remedy: 'Continue regular care.' },
        hi: { name: 'अंगूर — स्वस्थ ✅', description: 'अंगूर स्वस्थ है!', remedy: 'नियमित देखभाल जारी रखें।', },
        pa: { name: 'ਅੰਗੂਰ — ਤੰਦਰੁਸਤ ✅', description: 'ਅੰਗੂਰ ਤੰਦਰੁਸਤ ਹਨ!', remedy: 'ਨਿਯਮਤ ਦੇਖਭਾਲ ਜਾਰੀ ਰੱਖੋ।' }
    },
};

function getDiseaseInfo(label: string, lang: 'en' | 'hi' | 'pa' = 'en'): { name: string; description: string; remedy: string } {
    const data = DISEASE_INFO[label] || Object.values(DISEASE_INFO).find(d => d.en.name === label);

    // Fuzzy search for key
    const key = Object.keys(DISEASE_INFO).find(k =>
        label.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(label.toLowerCase())
    );

    if (key) {
        return DISEASE_INFO[key][lang];
    }

    if (label.toLowerCase().includes('healthy')) {
        return {
            en: { name: 'Healthy Leaf ✅', description: 'No disease detected!', remedy: 'Continue regular care.' },
            hi: { name: 'स्वस्थ पत्ती ✅', description: 'कोई रोग नहीं पाया गया!', remedy: 'नियमित देखभाल जारी रखें।' },
            pa: { name: 'ਤੰਦਰੁਸਤ ਪੱਤਾ ✅', description: 'ਕੋਈ ਰੋਗ ਨਹੀਂ ਮਿਲਿਆ!', remedy: 'ਨਿਯਮਤ ਦੇਖਭਾਲ ਜਾਰੀ ਰੱਖੋ।' }
        }[lang];
    }

    return {
        name: label.replace(/_/g, ' '),
        description: {
            en: 'Disease analyzed.',
            hi: 'इस रोग का विश्लेषण किया गया है।',
            pa: 'ਇਸ ਰੋਗ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕੀਤਾ ਗਿਆ ਹੈ।'
        }[lang],
        remedy: {
            en: 'Contact your local agriculture center.',
            hi: 'अपने क्षेत्र के कृषि विज्ञान केंद्र (KVK) से संपर्क करें।',
            pa: 'ਆਪਣੇ ਖੇਤਰ ਦੇ ਖੇਤੀਬਾੜੀ ਕੇਂਦਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।'
        }[lang],
    };
}

export { getDiseaseInfo };

export async function detectDisease(imageUri: string): Promise<DiseaseResult> {
    // ── Offline: queue image for later processing ──
    if (!isOnline()) {
        await enqueue(imageUri);
        throw new Error('OFFLINE_QUEUED');
    }

    try {
        // Create form data
        const formData = new FormData();
        formData.append('file', {
            uri: imageUri,
            name: 'leaf.jpg',
            type: 'image/jpeg',
        } as any);

        const response = await fetch(`${BACKEND_URL}/api/detect-disease`, {
            method: 'POST',
            body: formData,
            // Do NOT set Content-Type header — React Native auto-generates it with correct boundary
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Detection failed');
        }

        const result: DiseaseResult = {
            label: data.top_prediction.label,
            confidence: data.top_prediction.score,
            allPredictions: data.predictions,
        };

        // Save to offline history
        await appendToCache(CACHE_KEYS.DISEASE_RESULTS, {
            ...result,
            imageUri,
            timestamp: Date.now(),
        }, 20, 43200);

        return result;
    } catch (error: any) {
        console.error('Disease detection error:', error);
        if (error.message === 'OFFLINE_QUEUED') throw error;
        // Don't mask the error so the queue processor can read it
        throw new Error(error.message || 'DETECTION_FAILED');
    }

}
