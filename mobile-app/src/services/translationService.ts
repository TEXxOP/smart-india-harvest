import { BACKEND_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Translations {
    app_title: string;
    greeting: string;
    good_morning: string;
    good_afternoon: string;
    good_evening: string;
    weather_title: string;
    disease_detection: string;
    crop_recommendation: string;
    ai_chat: string;
    profile: string;
    select_language: string;
    camera: string;
    gallery: string;
    analyze: string;
    healthy: string;
    disease_found: string;
    confidence: string;
    remedy: string;
    description: string;
    loading: string;
    error: string;
    retry: string;
    continue: string;
    login_title: string;
    login_subtitle: string;
    signup_title: string;
    signup_subtitle: string;
    mobile_number: string;
    password: string;
    full_name: string;
    login_button: string;
    signup_button: string;
    no_account: string;
    have_account: string;
    create_account: string;
    login_link: string;
    my_crops: string;
    add_crop: string;
    farming_status_query: string;
    farming_status_query_default: string;
    crop_management: string;
    agri_advice: string;
    check_from_photo: string;
    yield_prediction: string;
    view_estimated_production: string;
    agri_knowledge: string;
    learn_about_farming: string;
    gov_schemes: string;
    scheme_info: string;
    home_tab: string;
    chat_tab: string;
    profile_tab: string;
    active_crops: string;
    todays_temp: string;
    crop_health: string;
    check_weather: string;
    humidity: string;
    wind: string;
    feels_like: string;
    next_24_hours: string;
    "7_day_forecast": string;
    today: string;
    sunrise: string;
    sunset: string;
    my_farm: string;
    soil_type: string;
    current_crop: string;
    maturity_stage: string;
    recommendations: string;
    based_on_soil: string;
    learn_more: string;
    farm_setup: string;
    no_farm_details: string;
    setup_farm: string;
    growing: string;
    empty_field: string;
    chat_title: string;
    chat_subtitle: string;
    typing: string;
    thinking: string;
    welcome_chat_title: string;
    welcome_chat_desc: string;
    quick_ask: string;
    ask_placeholder: string;
    error_msg: string;
    prompt_crop: string;
    prompt_pest: string;
    prompt_water: string;
    prompt_soil: string;
    success_stories: string;
    share_story: string;
    read_more: string;
    story_by: string;
    name_placeholder: string;
    crop_placeholder: string;
    story_placeholder: string;
    submit: string;
    cancel: string;
    image_url_placeholder: string;
    tap_to_speak: string;
    listening: string;
    processing_voice: string;
    voice_error: string;
    voice_ready: string;
    speak_now: string;
    // Irrigation
    smart_irrigation: string;
    irrigation_desc: string;
    soil_moisture: string;
    water_needed: string;
    liters: string;
    savings: string;
    best_time: string;
    mandi_prices: string;
}

const STORAGE_KEY = 'APP_TRANSLATIONS';
const LANG_KEY = 'APP_LANGUAGE';

// Default fallback (English)
const DEFAULT_TRANSLATIONS: Translations = {
    active_crops: "Active Crops",
    todays_temp: "Today's Temp",
    crop_health: "Crop Health",
    check_weather: "Check today's weather",
    app_title: "Smart India Harvest",
    greeting: "Welcome, Farmer!",
    good_morning: "Good Morning",
    good_afternoon: "Good Afternoon",
    good_evening: "Good Evening",
    weather_title: "Weather",
    disease_detection: "Disease Detection",
    crop_recommendation: "Crop Recommendation",
    ai_chat: "AI Assistant",
    profile: "Farm Profile",
    select_language: "Select Language",
    camera: "Camera",
    gallery: "Gallery",
    analyze: "Analyze",
    healthy: "Healthy",
    disease_found: "Disease Detected",
    confidence: "Confidence",
    remedy: "Remedy",
    description: "Description",
    loading: "Loading...",
    error: "Error",
    retry: "Retry",
    continue: "Continue",
    login_title: "Welcome Back!",
    login_subtitle: "Login to your account.",
    signup_title: "Welcome to Kisan App!",
    signup_subtitle: "Create an account to get started.",
    mobile_number: "Mobile Number",
    password: "Password",
    full_name: "Full Name",
    login_button: "Login",
    signup_button: "Create Account",
    no_account: "Don't have an account?",
    have_account: "Already a member?",
    create_account: "Create Account",
    login_link: "Login",
    my_crops: "My Crops",
    add_crop: "Add Crop",
    farming_status_query: "How is your farming going in {location}?",
    farming_status_query_default: "How is your farming going?",
    crop_management: "Crop Management",
    agri_advice: "Agricultural Advice",
    check_from_photo: "Check from Photo",
    yield_prediction: "Yield Prediction",
    view_estimated_production: "View estimated production",
    agri_knowledge: "Agricultural Knowledge",
    learn_about_farming: "Learn about farming",
    gov_schemes: "Government Schemes",
    scheme_info: "Information on farmer schemes",
    home_tab: "Home",
    chat_tab: "Chat",
    profile_tab: "Profile",
    humidity: "Humidity",
    wind: "Wind",
    feels_like: "Feels Like",
    next_24_hours: "Next 24 Hours",
    "7_day_forecast": "7-Day Forecast",
    today: "Today",
    sunrise: "Sunrise",
    sunset: "Sunset",
    my_farm: "My Farm",
    soil_type: "Soil Type",
    current_crop: "Current Crop",
    maturity_stage: "Maturity Stage",
    recommendations: "Recommendations",
    based_on_soil: "Based on your soil and previous crop",
    learn_more: "Learn More",
    farm_setup: "Farm Setup",
    no_farm_details: "You haven't added farm details yet.",
    setup_farm: "Setup Farm",
    growing: "Growing",
    empty_field: "Empty Field",
    chat_title: "Krishi Mitra",
    chat_subtitle: "AI Agri Assistant",
    typing: "typing...",
    thinking: "Thinking...",
    welcome_chat_title: "Namaste, Farmer! 🙏",
    welcome_chat_desc: "I am Krishi Mitra — your AI farming assistant.\nAsk me anything about crops, soil, weather, pests, or\ngovernment schemes!",
    quick_ask: "Quick Ask:",
    ask_placeholder: "Ask your question...",
    error_msg: "Sorry, something went wrong. Please try again.",
    prompt_crop: "Crop Advice",
    prompt_pest: "Pest Control",
    prompt_water: "Irrigation",
    prompt_soil: "Soil Health",
    success_stories: "Success Stories",
    share_story: "Share Your Story",
    read_more: "Read More",
    story_by: "Story by",
    name_placeholder: "Your Name",
    crop_placeholder: "Crop Name",
    story_placeholder: "Write your success story here...",
    submit: "Submit",
    cancel: "Cancel",
    image_url_placeholder: "Image Link (Optional)",
    tap_to_speak: "Tap to Speak",
    listening: "Listening...",
    processing_voice: "Processing...",
    voice_error: "Could not understand. Please try again.",
    voice_ready: "Voice assistant ready",
    speak_now: "Speak now...",
    // Irrigation
    smart_irrigation: "Smart Irrigation",
    irrigation_desc: "AI optimized watering schedules",
    soil_moisture: "Soil Moisture",
    water_needed: "Water Needed",
    liters: "Liters",
    savings: "Water Savings",
    best_time: "Best Time to Water",
    mandi_prices: "Mandi Prices",
};

export async function fetchTranslations(langCode: string): Promise<Translations> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/translations/${langCode}`);
        if (!response.ok) throw new Error('Failed to fetch translations');
        const data = await response.json();

        // Cache them
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        await AsyncStorage.setItem(LANG_KEY, langCode);

        return data;
    } catch (error) {
        console.warn('Translation fetch failed, using cached or default:', error);

        // Try cache
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) return JSON.parse(cached);

        return DEFAULT_TRANSLATIONS;
    }
}

export async function getSavedLanguage(): Promise<string> {
    return await AsyncStorage.getItem(LANG_KEY) || 'en';
}
