/**
 * Offline Knowledge Base
 * Pre-built trilingual FAQ for offline AI fallback.
 * Covers: Crop Advice, Pest Control, Soil Health, Irrigation, Gov Schemes
 */

interface KBEntry {
    keywords: string[];
    en: { q: string; a: string };
    hi: { q: string; a: string };
    pa: { q: string; a: string };
}

const KNOWLEDGE_BASE: KBEntry[] = [
    // ── Crop Advice ──
    {
        keywords: ['wheat', 'गेहूं', 'ਕਣਕ', 'sowing', 'बुवाई', 'ਬਿਜਾਈ'],
        en: { q: 'When to sow wheat?', a: 'Wheat sowing in North India: Oct 25 - Nov 25. Use HD-2967 or PBW-343 varieties. Seed rate: 100kg/hectare. Irrigate 5-6 times. First irrigation 21 days after sowing (Crown Root Initiation stage).' },
        hi: { q: 'गेहूं की बुवाई कब करें?', a: 'उत्तर भारत में गेहूं की बुवाई: 25 अक्टूबर - 25 नवंबर। HD-2967 या PBW-343 किस्में उपयोग करें। बीज दर: 100 किग्रा/हेक्टेयर। 5-6 बार सिंचाई करें। पहली सिंचाई बुवाई के 21 दिन बाद।' },
        pa: { q: 'ਕਣਕ ਦੀ ਬਿਜਾਈ ਕਦੋਂ ਕਰੀਏ?', a: 'ਉੱਤਰੀ ਭਾਰਤ ਵਿੱਚ ਕਣਕ ਦੀ ਬਿਜਾਈ: 25 ਅਕਤੂਬਰ - 25 ਨਵੰਬਰ। HD-2967 ਜਾਂ PBW-343 ਕਿਸਮਾਂ ਵਰਤੋ। ਬੀਜ ਦਰ: 100 ਕਿਲੋ/ਹੈਕਟੇਅਰ। 5-6 ਵਾਰ ਸਿੰਚਾਈ ਕਰੋ।' },
    },
    {
        keywords: ['rice', 'paddy', 'धान', 'चावल', 'ਝੋਨਾ', 'ਚੌਲ'],
        en: { q: 'Rice cultivation tips?', a: 'Transplant paddy in June-July. Use Pusa Basmati 1121 or PR-126. Maintain 5cm standing water for first 2 weeks. Apply DAP at transplanting and Urea in 3 splits. Watch for stem borer and brown planthopper.' },
        hi: { q: 'धान की खेती के सुझाव?', a: 'जून-जुलाई में रोपाई करें। पूसा बासमती 1121 या PR-126 उपयोग करें। पहले 2 हफ्ते 5cm पानी बनाए रखें। रोपाई पर DAP और यूरिया 3 बार में दें। तना छेदक और भूरे फुदके से सावधान रहें।' },
        pa: { q: 'ਝੋਨੇ ਦੀ ਖੇਤੀ ਦੇ ਸੁਝਾਅ?', a: 'ਜੂਨ-ਜੁਲਾਈ ਵਿੱਚ ਲੁਆਈ ਕਰੋ। ਪੂਸਾ ਬਾਸਮਤੀ 1121 ਜਾਂ PR-126 ਵਰਤੋ। ਪਹਿਲੇ 2 ਹਫ਼ਤੇ 5cm ਪਾਣੀ ਰੱਖੋ। DAP ਲੁਆਈ ਵੇਲੇ ਅਤੇ ਯੂਰੀਆ 3 ਵਾਰ ਦਿਓ।' },
    },
    {
        keywords: ['tomato', 'टमाटर', 'ਟਮਾਟਰ'],
        en: { q: 'How to grow tomatoes?', a: 'Transplant seedlings at 25-30 days. Spacing: 60x45cm. Use staking for support. Apply NPK 120:60:60 kg/ha. Irrigate every 7-10 days. Harvest when fruits turn red. Watch for late blight in rainy season.' },
        hi: { q: 'टमाटर कैसे उगाएं?', a: '25-30 दिन की पौध रोपें। दूरी: 60x45cm। सहारा देने के लिए डंडे लगाएं। NPK 120:60:60 किग्रा/हेक्टेयर डालें। हर 7-10 दिन सिंचाई करें। बरसात में लेट ब्लाइट से बचाव करें।' },
        pa: { q: 'ਟਮਾਟਰ ਕਿਵੇਂ ਉਗਾਈਏ?', a: '25-30 ਦਿਨਾਂ ਦੀ ਪਨੀਰੀ ਲਗਾਓ। ਦੂਰੀ: 60x45cm। ਸਹਾਰੇ ਲਈ ਡੰਡੇ ਲਗਾਓ। NPK 120:60:60 ਕਿਲੋ/ਹੈਕਟੇਅਰ ਪਾਓ। ਹਰ 7-10 ਦਿਨ ਸਿੰਚਾਈ ਕਰੋ।' },
    },
    {
        keywords: ['potato', 'आलू', 'ਆਲੂ'],
        en: { q: 'Potato farming guidance?', a: 'Plant in Oct-Nov. Use certified seed tubers (Kufri Jyoti, Kufri Bahar). Seed rate: 25-30 quintals/hectare. Ridge planting at 60cm spacing. Apply 180:80:100 NPK. Irrigate every 10-12 days. Harvest at 90-110 days.' },
        hi: { q: 'आलू की खेती कैसे करें?', a: 'अक्टूबर-नवंबर में रोपें। प्रमाणित बीज कंद (कुफरी ज्योति, कुफरी बहार) उपयोग करें। बीज दर: 25-30 क्विंटल/हेक्टेयर। 60cm दूरी पर मेड़ बनाकर लगाएं। 180:80:100 NPK डालें।' },
        pa: { q: 'ਆਲੂ ਦੀ ਖੇਤੀ ਕਿਵੇਂ ਕਰੀਏ?', a: 'ਅਕਤੂਬਰ-ਨਵੰਬਰ ਵਿੱਚ ਲਗਾਓ। ਪ੍ਰਮਾਣਿਤ ਬੀਜ ਕੰਦ (ਕੁਫਰੀ ਜੋਤੀ, ਕੁਫਰੀ ਬਹਾਰ) ਵਰਤੋ। ਬੀਜ ਦਰ: 25-30 ਕੁਇੰਟਲ/ਹੈਕਟੇਅਰ। 60cm ਦੂਰੀ ਤੇ ਮੇਡ਼ ਬਣਾ ਕੇ ਲਗਾਓ।' },
    },
    {
        keywords: ['mustard', 'सरसों', 'ਸਰ੍ਹੋਂ', 'sarson'],
        en: { q: 'Mustard cultivation tips?', a: 'Sow in Oct-Nov. Varieties: Pusa Bold, RH-749. Seed rate: 4-5 kg/hectare. Spacing: 30x10cm. Apply Sulphur 40kg/ha for better oil content. First irrigation at 25-30 days. Harvest when pods turn yellow.' },
        hi: { q: 'सरसों की खेती कैसे करें?', a: 'अक्टूबर-नवंबर में बुवाई करें। किस्में: पूसा बोल्ड, RH-749। बीज दर: 4-5 किग्रा/हेक्टेयर। 30x10cm दूरी। अच्छे तेल के लिए 40 किग्रा/हेक्टेयर सल्फर डालें। पहली सिंचाई 25-30 दिन पर।' },
        pa: { q: 'ਸਰ੍ਹੋਂ ਦੀ ਖੇਤੀ ਕਿਵੇਂ ਕਰੀਏ?', a: 'ਅਕਤੂਬਰ-ਨਵੰਬਰ ਵਿੱਚ ਬਿਜਾਈ ਕਰੋ। ਕਿਸਮਾਂ: ਪੂਸਾ ਬੋਲਡ, RH-749। ਬੀਜ ਦਰ: 4-5 ਕਿਲੋ/ਹੈਕਟੇਅਰ। 30x10cm ਦੂਰੀ। ਵਧੀਆ ਤੇਲ ਲਈ 40 ਕਿਲੋ/ਹੈਕਟੇਅਰ ਗੰਧਕ ਪਾਓ।' },
    },
    // ── Pest Control ──
    {
        keywords: ['pest', 'कीट', 'ਕੀੜੇ', 'insect', 'bug'],
        en: { q: 'General pest control?', a: 'Use Integrated Pest Management (IPM). Install yellow sticky traps. Spray Neem oil (5ml/L) as first line. Use pheromone traps for bollworm. Avoid overuse of chemical pesticides. Rotate pesticides to prevent resistance.' },
        hi: { q: 'कीट नियंत्रण कैसे करें?', a: 'एकीकृत कीट प्रबंधन (IPM) अपनाएं। पीले चिपचिपे जाल लगाएं। पहले नीम तेल (5ml/L) का छिड़काव करें। बॉलवर्म के लिए फेरोमोन ट्रैप लगाएं। रासायनिक कीटनाशकों का अधिक उपयोग न करें।' },
        pa: { q: 'ਕੀੜਿਆਂ ਦਾ ਕੰਟਰੋਲ ਕਿਵੇਂ ਕਰੀਏ?', a: 'ਏਕੀਕ੍ਰਿਤ ਕੀਟ ਪ੍ਰਬੰਧਨ (IPM) ਅਪਣਾਓ। ਪੀਲੇ ਚਿਪਚਿਪੇ ਜਾਲ ਲਗਾਓ। ਪਹਿਲਾਂ ਨੀਮ ਦਾ ਤੇਲ (5ml/L) ਛਿੜਕੋ। ਰਸਾਇਣਕ ਕੀਟਨਾਸ਼ਕਾਂ ਦੀ ਜ਼ਿਆਦਾ ਵਰਤੋਂ ਨਾ ਕਰੋ।' },
    },
    {
        keywords: ['aphid', 'मोयला', 'ਮਾਹੂ', 'तेला', 'jassid'],
        en: { q: 'How to control aphids?', a: 'Spray Imidacloprid 17.8 SL (0.5ml/L) or Thiamethoxam 25WG (0.3g/L). Organic option: Neem oil 5ml/L or soap solution. Encourage ladybugs — they eat aphids. Spray in evening for best results.' },
        hi: { q: 'मोयला (एफिड) कैसे रोकें?', a: 'इमिडाक्लोप्रिड 17.8 SL (0.5ml/L) या थायमेथोक्सम 25WG (0.3g/L) का छिड़काव करें। जैविक: नीम तेल 5ml/L। लेडीबग कीटों को बढ़ावा दें। शाम को छिड़काव करें।' },
        pa: { q: 'ਮਾਹੂ (ਤੇਲਾ) ਕਿਵੇਂ ਰੋਕੀਏ?', a: 'ਇਮਿਡਾਕਲੋਪ੍ਰਿਡ 17.8 SL (0.5ml/L) ਜਾਂ ਥਾਇਮੇਥੋਕਸਾਮ 25WG (0.3g/L) ਦਾ ਛਿੜਕਾਅ ਕਰੋ। ਜੈਵਿਕ: ਨੀਮ ਦਾ ਤੇਲ 5ml/L। ਸ਼ਾਮ ਨੂੰ ਛਿੜਕਾਅ ਕਰੋ।' },
    },
    {
        keywords: ['whitefly', 'सफेद मक्खी', 'ਚਿੱਟੀ ਮੱਖੀ'],
        en: { q: 'How to control whiteflies?', a: 'Install yellow sticky traps. Spray Neem oil (5ml/L) weekly. For severe infestation: Spiromesifen 22.9 SC (1ml/L). Remove and destroy affected leaves. Avoid excessive nitrogen fertilizer.' },
        hi: { q: 'सफेद मक्खी कैसे रोकें?', a: 'पीले चिपचिपे जाल लगाएं। नीम तेल (5ml/L) हर हफ्ते छिड़कें। गंभीर स्थिति में: स्पाइरोमेसिफेन 22.9 SC (1ml/L)। प्रभावित पत्तियां हटाकर नष्ट करें।' },
        pa: { q: 'ਚਿੱਟੀ ਮੱਖੀ ਕਿਵੇਂ ਰੋਕੀਏ?', a: 'ਪੀਲੇ ਚਿਪਚਿਪੇ ਜਾਲ ਲਗਾਓ। ਨੀਮ ਦਾ ਤੇਲ (5ml/L) ਹਰ ਹਫ਼ਤੇ ਛਿੜਕੋ। ਗੰਭੀਰ ਹਾਲਤ ਵਿੱਚ: ਸਪਾਇਰੋਮੇਸੀਫੇਨ 22.9 SC (1ml/L)। ਪ੍ਰਭਾਵਿਤ ਪੱਤੇ ਹਟਾ ਕੇ ਨਸ਼ਟ ਕਰੋ।' },
    },
    // ── Soil Health ──
    {
        keywords: ['soil', 'मिट्टी', 'ਮਿੱਟੀ', 'health', 'test', 'testing'],
        en: { q: 'How to test soil health?', a: 'Get soil tested at your nearest Soil Testing Lab or KVK. Collect samples from 6-8 spots at 15cm depth. Mix well, take 500g sample. Test before each season. Soil Health Card scheme provides free testing. Call 1800-180-1551.' },
        hi: { q: 'मिट्टी की जांच कैसे करें?', a: 'नजदीकी मृदा परीक्षण प्रयोगशाला या KVK में जांच कराएं। 6-8 जगहों से 15cm गहराई पर मिट्टी लें। अच्छे से मिलाकर 500g नमूना बनाएं। हर सीजन से पहले जांच करें। मृदा स्वास्थ्य कार्ड योजना में मुफ्त जांच।' },
        pa: { q: 'ਮਿੱਟੀ ਦੀ ਜਾਂਚ ਕਿਵੇਂ ਕਰੀਏ?', a: 'ਨਜ਼ਦੀਕੀ ਮਿੱਟੀ ਪਰਖ ਲੈਬ ਜਾਂ KVK ਵਿੱਚ ਜਾਂਚ ਕਰਵਾਓ। 6-8 ਥਾਵਾਂ ਤੋਂ 15cm ਡੂੰਘਾਈ ਤੋਂ ਮਿੱਟੀ ਲਓ। ਚੰਗੀ ਤਰ੍ਹਾਂ ਮਿਲਾ ਕੇ 500g ਨਮੂਨਾ ਬਣਾਓ। ਮਿੱਟੀ ਸਿਹਤ ਕਾਰਡ ਸਕੀਮ ਵਿੱਚ ਮੁਫ਼ਤ ਜਾਂਚ।' },
    },
    {
        keywords: ['fertilizer', 'खाद', 'ਖਾਦ', 'urea', 'यूरिया', 'dap'],
        en: { q: 'Which fertilizer to use?', a: 'Always follow soil test recommendations. General guide: DAP (18-46-0) at sowing, Urea for nitrogen top-dress in splits. MOP for potassium. Use Vermicompost 5 tonnes/ha for organic matter. Avoid excess Urea — causes lodging and pest attraction.' },
        hi: { q: 'कौन सी खाद डालें?', a: 'मिट्टी जांच अनुसार खाद डालें। सामान्य: बुवाई पर DAP (18-46-0), यूरिया नाइट्रोजन के लिए 2-3 बार में। पोटाश के लिए MOP। जैविक: वर्मीकम्पोस्ट 5 टन/हेक्टेयर। ज़्यादा यूरिया न डालें।' },
        pa: { q: 'ਕਿਹੜੀ ਖਾਦ ਪਾਈਏ?', a: 'ਮਿੱਟੀ ਜਾਂਚ ਅਨੁਸਾਰ ਖਾਦ ਪਾਓ। ਆਮ: ਬਿਜਾਈ ਤੇ DAP (18-46-0), ਯੂਰੀਆ ਨਾਈਟ੍ਰੋਜਨ ਲਈ 2-3 ਵਾਰ। ਪੋਟਾਸ਼ ਲਈ MOP। ਜੈਵਿਕ: ਵਰਮੀਕੰਪੋਸਟ 5 ਟਨ/ਹੈਕਟੇਅਰ।' },
    },
    {
        keywords: ['organic', 'जैविक', 'ਜੈਵਿਕ', 'natural', 'compost'],
        en: { q: 'How to do organic farming?', a: 'Start with Vermicompost and Jeevamrut. Use Neem cake (250 kg/ha) for pest control. Apply Trichoderma for soil-borne diseases. Green manure with Dhaincha before sowing. Get organic certification through PGS-India or NPOP for premium pricing.' },
        hi: { q: 'जैविक खेती कैसे करें?', a: 'वर्मीकम्पोस्ट और जीवामृत से शुरू करें। कीट नियंत्रण: नीम खली (250 किग्रा/हेक्टेयर)। मिट्टी रोगों के लिए ट्राइकोडर्मा लगाएं। बुवाई से पहले ढैंचा से हरी खाद बनाएं। PGS-India से जैविक प्रमाणन लें।' },
        pa: { q: 'ਜੈਵਿਕ ਖੇਤੀ ਕਿਵੇਂ ਕਰੀਏ?', a: 'ਵਰਮੀਕੰਪੋਸਟ ਅਤੇ ਜੀਵਾਮ੍ਰਿਤ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ। ਕੀੜਿਆਂ ਲਈ ਨੀਮ ਖਲ਼ (250 ਕਿਲੋ/ਹੈਕਟੇਅਰ)। ਮਿੱਟੀ ਰੋਗਾਂ ਲਈ ਟ੍ਰਾਈਕੋਡਰਮਾ। ਬਿਜਾਈ ਤੋਂ ਪਹਿਲਾਂ ਢੈਂਚਾ ਨਾਲ ਹਰੀ ਖਾਦ ਬਣਾਓ।' },
    },
    // ── Irrigation ──
    {
        keywords: ['water', 'irrigation', 'सिंचाई', 'ਸਿੰਚਾਈ', 'पानी', 'ਪਾਣੀ', 'drip'],
        en: { q: 'Best irrigation methods?', a: 'Drip irrigation saves 40-60% water. Sprinkler for wheat/vegetables. Furrow for sugarcane. Mulching reduces water evaporation by 25%. Irrigate in morning/evening, not afternoon. PM Krishi Sinchayee Yojana gives 55-90% subsidy on micro-irrigation.' },
        hi: { q: 'सबसे अच्छी सिंचाई विधि?', a: 'ड्रिप सिंचाई से 40-60% पानी बचत। स्प्रिंकलर गेहूं/सब्जियों के लिए। नाली सिंचाई गन्ने के लिए। मल्चिंग से 25% वाष्पीकरण कम। सुबह/शाम सिंचाई करें। PM कृषि सिंचाई योजना में 55-90% सब्सिडी।' },
        pa: { q: 'ਸਭ ਤੋਂ ਵਧੀਆ ਸਿੰਚਾਈ ਤਰੀਕਾ?', a: 'ਤੁਪਕਾ ਸਿੰਚਾਈ ਨਾਲ 40-60% ਪਾਣੀ ਬਚਤ। ਸਪ੍ਰਿੰਕਲਰ ਕਣਕ/ਸਬਜ਼ੀਆਂ ਲਈ। ਨਾਲੀ ਸਿੰਚਾਈ ਗੰਨੇ ਲਈ। ਮਲਚਿੰਗ ਨਾਲ 25% ਭਾਫ਼ ਘੱਟ। PM ਕ੍ਰਿਸ਼ੀ ਸਿੰਚਾਈ ਯੋਜਨਾ ਵਿੱਚ 55-90% ਸਬਸਿਡੀ।' },
    },
    // ── Government Schemes ──
    {
        keywords: ['pm kisan', 'किसान', 'ਕਿਸਾਨ', 'scheme', 'योजना', 'ਸਕੀਮ', 'सरकारी'],
        en: { q: 'What is PM-KISAN scheme?', a: 'PM-KISAN gives Rs 6,000/year in 3 installments of Rs 2,000 each to all farmer families. Register at pmkisan.gov.in with Aadhaar. Required: land records and bank account. Check status at pmkisan.gov.in or call 155261.' },
        hi: { q: 'PM-KISAN योजना क्या है?', a: 'PM-KISAN में सभी किसान परिवारों को हर साल ₹6,000 तीन किस्तों (₹2,000) में मिलते हैं। pmkisan.gov.in पर आधार के साथ पंजीकरण करें। जरूरी: भूमि रिकॉर्ड और बैंक खाता। स्टेटस: pmkisan.gov.in या 155261।' },
        pa: { q: 'PM-KISAN ਸਕੀਮ ਕੀ ਹੈ?', a: 'PM-KISAN ਵਿੱਚ ਸਾਰੇ ਕਿਸਾਨ ਪਰਿਵਾਰਾਂ ਨੂੰ ਹਰ ਸਾਲ ₹6,000 ਤਿੰਨ ਕਿਸ਼ਤਾਂ (₹2,000) ਵਿੱਚ ਮਿਲਦੇ ਹਨ। pmkisan.gov.in ਤੇ ਆਧਾਰ ਨਾਲ ਰਜਿਸਟਰ ਕਰੋ। ਲੋੜੀਂਦਾ: ਜ਼ਮੀਨ ਦੇ ਰਿਕਾਰਡ ਅਤੇ ਬੈਂਕ ਖਾਤਾ।' },
    },
    {
        keywords: ['kcc', 'credit', 'loan', 'कर्ज', 'ऋण', 'ਕਰਜ਼ਾ', 'kisan credit'],
        en: { q: 'What is Kisan Credit Card?', a: 'KCC provides crop loans at 4% interest (with timely repayment). Credit limit based on land and crops. Apply at any bank with land documents and ID. Also covers livestock, fisheries. Insurance included. Repay within crop season for lowest interest.' },
        hi: { q: 'किसान क्रेडिट कार्ड क्या है?', a: 'KCC में 4% ब्याज पर फसल ऋण मिलता है (समय पर भुगतान पर)। क्रेडिट सीमा भूमि और फसल अनुसार। किसी भी बैंक में भूमि दस्तावेज और ID के साथ आवेदन करें। पशुपालन, मत्स्यपालन भी शामिल। बीमा शामिल।' },
        pa: { q: 'ਕਿਸਾਨ ਕ੍ਰੈਡਿਟ ਕਾਰਡ ਕੀ ਹੈ?', a: 'KCC ਵਿੱਚ 4% ਵਿਆਜ ਤੇ ਫਸਲੀ ਕਰਜ਼ਾ ਮਿਲਦਾ ਹੈ (ਸਮੇਂ ਸਿਰ ਭੁਗਤਾਨ ਤੇ)। ਕ੍ਰੈਡਿਟ ਸੀਮਾ ਜ਼ਮੀਨ ਅਤੇ ਫਸਲ ਅਨੁਸਾਰ। ਕਿਸੇ ਵੀ ਬੈਂਕ ਵਿੱਚ ਜ਼ਮੀਨ ਦੇ ਕਾਗਜ਼ ਅਤੇ ID ਨਾਲ ਅਰਜ਼ੀ ਦਿਓ।' },
    },
    {
        keywords: ['crop insurance', 'fasal bima', 'फसल बीमा', 'ਫਸਲ ਬੀਮਾ', 'pmfby'],
        en: { q: 'How to get crop insurance?', a: 'PM Fasal Bima Yojana (PMFBY): Premium is only 2% for Kharif, 1.5% for Rabi. Register through CSC, bank, or pmfby.gov.in before sowing deadline. Coverage includes drought, flood, hailstorm, pest attack. Claim within 72 hours of crop loss.' },
        hi: { q: 'फसल बीमा कैसे करवाएं?', a: 'PM फसल बीमा योजना (PMFBY): प्रीमियम खरीफ 2%, रबी 1.5%। CSC, बैंक, या pmfby.gov.in से बुवाई की आखिरी तारीख से पहले रजिस्टर करें। बाढ़, सूखा, ओलावृष्टि, कीट हमला शामिल। 72 घंटे में क्लेम करें।' },
        pa: { q: 'ਫਸਲ ਬੀਮਾ ਕਿਵੇਂ ਕਰਵਾਈਏ?', a: 'PM ਫਸਲ ਬੀਮਾ ਯੋਜਨਾ (PMFBY): ਪ੍ਰੀਮੀਅਮ ਖ਼ਰੀਫ਼ 2%, ਰਬੀ 1.5%। CSC, ਬੈਂਕ, ਜਾਂ pmfby.gov.in ਤੋਂ ਬਿਜਾਈ ਦੀ ਆਖ਼ਰੀ ਤਾਰੀਖ਼ ਤੋਂ ਪਹਿਲਾਂ ਰਜਿਸਟਰ ਕਰੋ। 72 ਘੰਟਿਆਂ ਵਿੱਚ ਕਲੇਮ ਕਰੋ।' },
    },
    // ── Weather & Season ──
    {
        keywords: ['weather', 'rain', 'बारिश', 'ਬਾਰਿਸ਼', 'monsoon', 'मानसून'],
        en: { q: 'How to prepare for monsoon?', a: 'Clean drainage channels before monsoon. Raise nursery beds. Store seeds in waterproof bags. Prepare bunds for water conservation. Apply pre-emergent herbicide. Sow Kharif crops (rice, maize, soybean) with monsoon onset.' },
        hi: { q: 'मानसून की तैयारी कैसे करें?', a: 'मानसून से पहले नालियां साफ करें। नर्सरी की क्यारियां ऊंची बनाएं। बीज वाटरप्रूफ थैलों में रखें। जल संरक्षण के लिए मेड़ बनाएं। मानसून शुरू होते ही खरीफ फसलें (धान, मक्का, सोयाबीन) बोएं।' },
        pa: { q: 'ਮਾਨਸੂਨ ਦੀ ਤਿਆਰੀ ਕਿਵੇਂ ਕਰੀਏ?', a: 'ਮਾਨਸੂਨ ਤੋਂ ਪਹਿਲਾਂ ਨਾਲੀਆਂ ਸਾਫ਼ ਕਰੋ। ਨਰਸਰੀ ਦੀਆਂ ਕਿਆਰੀਆਂ ਉੱਚੀਆਂ ਬਣਾਓ। ਬੀਜ ਵਾਟਰਪਰੂਫ ਥੈਲਿਆਂ ਵਿੱਚ ਰੱਖੋ। ਮਾਨਸੂਨ ਸ਼ੁਰੂ ਹੁੰਦੇ ਹੀ ਖ਼ਰੀਫ਼ ਫ਼ਸਲਾਂ ਬੀਜੋ।' },
    },
    {
        keywords: ['frost', 'पाला', 'ਪਾਲਾ', 'cold', 'ठंड', 'ਠੰਡ'],
        en: { q: 'How to protect crops from frost?', a: 'Light irrigation in evening before frost night. Create smoke screen using damp straw. Cover nursery with polythene. Spray Thiourea (500ppm) or Sulphuric acid (0.1%). Avoid nitrogen application during frost period.' },
        hi: { q: 'पाले से फसल कैसे बचाएं?', a: 'पाले वाली रात से पहले शाम को हल्की सिंचाई करें। गीली पराली से धुआं बनाएं। नर्सरी पॉलीथीन से ढकें। थायोयूरिया (500ppm) या सल्फ्यूरिक एसिड (0.1%) का छिड़काव करें।' },
        pa: { q: 'ਪਾਲੇ ਤੋਂ ਫ਼ਸਲ ਕਿਵੇਂ ਬਚਾਈਏ?', a: 'ਪਾਲੇ ਵਾਲੀ ਰਾਤ ਤੋਂ ਪਹਿਲਾਂ ਸ਼ਾਮ ਨੂੰ ਹਲਕੀ ਸਿੰਚਾਈ ਕਰੋ। ਗਿੱਲੀ ਪਰਾਲੀ ਨਾਲ ਧੂੰਆਂ ਬਣਾਓ। ਨਰਸਰੀ ਪੋਲੀਥੀਨ ਨਾਲ ਢਕੋ। ਥਾਇਓਯੂਰੀਆ (500ppm) ਦਾ ਛਿੜਕਾਅ ਕਰੋ।' },
    },
    // ── General ──
    {
        keywords: ['hello', 'hi', 'नमस्ते', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'help', 'मदद', 'ਮਦਦ'],
        en: { q: 'What can you help with?', a: 'I am Krishi Mitra, your farming assistant! I can help with: Crop sowing advice, Pest and disease control, Soil health tips, Irrigation guidance, Government schemes info (PM-KISAN, KCC, PMFBY). Note: I am currently in offline mode with limited knowledge. Connect to internet for full AI assistance.' },
        hi: { q: 'आप किसमें मदद कर सकते हैं?', a: 'मैं कृषि मित्र हूँ! मैं इनमें मदद कर सकता हूँ: फसल बुवाई सलाह, कीट-रोग नियंत्रण, मिट्टी की सेहत, सिंचाई मार्गदर्शन, सरकारी योजनाएं (PM-KISAN, KCC, PMFBY)। नोट: मैं अभी ऑफलाइन मोड में हूँ। पूर्ण AI सहायता के लिए इंटरनेट से जुड़ें।' },
        pa: { q: 'ਤੁਸੀਂ ਕਿਸ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦੇ ਹੋ?', a: 'ਮੈਂ ਕ੍ਰਿਸ਼ੀ ਮਿੱਤਰ ਹਾਂ! ਮੈਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ: ਫ਼ਸਲ ਬਿਜਾਈ ਸਲਾਹ, ਕੀੜੇ-ਰੋਗ ਕੰਟਰੋਲ, ਮਿੱਟੀ ਦੀ ਸਿਹਤ, ਸਿੰਚਾਈ ਮਾਰਗਦਰਸ਼ਨ, ਸਰਕਾਰੀ ਸਕੀਮਾਂ (PM-KISAN, KCC, PMFBY)। ਨੋਟ: ਮੈਂ ਹੁਣ ਆਫ਼ਲਾਈਨ ਮੋਡ ਵਿੱਚ ਹਾਂ। ਪੂਰੀ AI ਸਹਾਇਤਾ ਲਈ ਇੰਟਰਨੈੱਟ ਨਾਲ ਜੁੜੋ।' },
    },
    {
        keywords: ['seed', 'बीज', 'ਬੀਜ', 'treatment', 'उपचार'],
        en: { q: 'How to treat seeds before sowing?', a: 'Treat seeds with Thiram/Captan (2-3g/kg seed) for fungal diseases. Use Imidacloprid (5ml/kg) for sucking pest protection. Bio-agents: Trichoderma viride (4g/kg) + Pseudomonas (10g/kg). Dry in shade after treatment. Treat 24 hours before sowing.' },
        hi: { q: 'बुवाई से पहले बीज उपचार कैसे करें?', a: 'फफूंद के लिए थिरम/कैप्टान (2-3g/kg बीज) से उपचार करें। रस चूसक कीटों के लिए इमिडाक्लोप्रिड (5ml/kg)। जैविक: ट्राइकोडर्मा विरिडी (4g/kg) + स्यूडोमोनास (10g/kg)। छाया में सुखाएं। बुवाई से 24 घंटे पहले उपचार करें।' },
        pa: { q: 'ਬਿਜਾਈ ਤੋਂ ਪਹਿਲਾਂ ਬੀਜ ਦਾ ਇਲਾਜ ਕਿਵੇਂ ਕਰੀਏ?', a: 'ਉੱਲੀ ਲਈ ਥਿਰਮ/ਕੈਪਟਨ (2-3g/kg ਬੀਜ) ਨਾਲ ਇਲਾਜ ਕਰੋ। ਰਸ ਚੂਸਣ ਵਾਲੇ ਕੀੜਿਆਂ ਲਈ ਇਮਿਡਾਕਲੋਪ੍ਰਿਡ (5ml/kg)। ਜੈਵਿਕ: ਟ੍ਰਾਈਕੋਡਰਮਾ ਵਿਰਿਡੀ (4g/kg)। ਛਾਂ ਵਿੱਚ ਸੁਕਾਓ।' },
    },
    {
        keywords: ['weed', 'खरपतवार', 'ਨਦੀਨ', 'नदीन'],
        en: { q: 'How to control weeds?', a: 'Pre-emergent herbicide within 3 days of sowing. For wheat: Pendimethalin 30EC (3.3L/ha). For rice: Butachlor 50EC (2.5L/ha). Manual weeding at 25-30 days. Mulching suppresses weeds. Avoid late weeding — damages crop roots.' },
        hi: { q: 'खरपतवार कैसे रोकें?', a: 'बुवाई के 3 दिन के भीतर पूर्व-उद्भव शाकनाशी डालें। गेहूं: पेंडीमेथालिन 30EC (3.3L/हेक्टेयर)। धान: ब्यूटाक्लोर 50EC (2.5L/हेक्टेयर)। 25-30 दिन पर हाथ निराई। मल्चिंग से खरपतवार कम। देर से निराई से बचें।' },
        pa: { q: 'ਨਦੀਨ ਕਿਵੇਂ ਰੋਕੀਏ?', a: 'ਬਿਜਾਈ ਤੋਂ 3 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਪੂਰਵ-ਉਭਰਨ ਨਦੀਨਨਾਸ਼ਕ ਪਾਓ। ਕਣਕ: ਪੈਂਡੀਮੈਥਾਲਿਨ 30EC (3.3L/ਹੈਕਟੇਅਰ)। ਝੋਨਾ: ਬਿਊਟਾਕਲੋਰ 50EC (2.5L/ਹੈਕਟੇਅਰ)। 25-30 ਦਿਨ ਤੇ ਹੱਥ ਨਾਲ ਗੋਡੀ ਕਰੋ।' },
    },
];

/**
 * Search the offline knowledge base for relevant answers.
 * Returns best matching answer in the requested language.
 */
export function searchKnowledgeBase(
    query: string,
    lang: 'en' | 'hi' | 'pa' = 'en'
): { question: string; answer: string; isOffline: boolean } | null {
    const queryLower = query.toLowerCase();

    // Score each entry by keyword matches
    let bestMatch: KBEntry | null = null;
    let bestScore = 0;

    for (const entry of KNOWLEDGE_BASE) {
        let score = 0;
        for (const kw of entry.keywords) {
            if (queryLower.includes(kw.toLowerCase())) {
                score += kw.length; // Longer keyword match = higher relevance
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = entry;
        }
    }

    if (!bestMatch || bestScore === 0) {
        // No match — return default help message
        const helpEntry = KNOWLEDGE_BASE.find(e => e.keywords.includes('help'));
        if (helpEntry) {
            return { question: helpEntry[lang].q, answer: helpEntry[lang].a, isOffline: true };
        }
        return null;
    }

    return {
        question: bestMatch[lang].q,
        answer: bestMatch[lang].a,
        isOffline: true,
    };
}

/**
 * Get all available topics for display in offline mode.
 */
export function getOfflineTopics(lang: 'en' | 'hi' | 'pa' = 'en'): string[] {
    return KNOWLEDGE_BASE.map(entry => entry[lang].q);
}
