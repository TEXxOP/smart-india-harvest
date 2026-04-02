import * as Location from 'expo-location';
import { saveToCache, getFromCache, CACHE_KEYS, getTimeAgo } from './offlineStorage';
import { isOnline } from './networkService';


// Multilingual weather descriptions
const WEATHER_DESCRIPTIONS: Record<number, { en: string; hi: string; pa: string; icon: string }> = {
    0: { en: 'Clear sky', hi: 'साफ आसमान', pa: 'ਸਾਫ਼ ਅਸਮਾਨ', icon: 'sunny' },
    1: { en: 'Mainly clear', hi: 'मुख्यतः साफ', pa: 'ਮੁੱਖ ਤੌਰ ਤੇ ਸਾਫ਼', icon: 'sunny' },
    2: { en: 'Partly cloudy', hi: 'आंशिक बादल', pa: 'ਅੰਸ਼ਕ ਬੱਦਲਵਾਈ', icon: 'partly-sunny' },
    3: { en: 'Overcast', hi: 'बादल छाए', pa: 'ਬੱਦਲਵਾਈ', icon: 'cloudy' },
    45: { en: 'Fog', hi: 'कोहरा', pa: 'ਧੁੰਦ', icon: 'cloudy' },
    48: { en: 'Depositing rime fog', hi: 'घना कोहरा', pa: 'ਸੰਘਣੀ ਧੁੰਦ', icon: 'cloudy' },
    51: { en: 'Light drizzle', hi: 'हल्की बूंदाबांदी', pa: 'ਹਲਕੀ बूंदाबांदी', icon: 'rainy' },
    53: { en: 'Moderate drizzle', hi: 'बूंदाबांदी', pa: 'ਦਰਮਿਆਨੀ बूंदाबांदी', icon: 'rainy' },
    55: { en: 'Dense drizzle', hi: 'तेज बूंदाबांदी', pa: 'ਭਾਰੀ बूंदाबांदी', icon: 'rainy' },
    61: { en: 'Slight rain', hi: 'हल्की बारिश', pa: 'ਹਲਕੀ ਬਾਰਿਸ਼', icon: 'rainy' },
    63: { en: 'Moderate rain', hi: 'बारिश', pa: 'ਦਰਮਿਆਨੀ ਬਾਰਿਸ਼', icon: 'rainy' },
    65: { en: 'Heavy rain', hi: 'तेज बारिश', pa: 'ਭਾਰੀ ਬਾਰਿਸ਼', icon: 'rainy' },
    71: { en: 'Slight snow', hi: 'हल्की बर्फबारी', pa: 'ਹਲਕੀ ਬਰਫਬਾਰੀ', icon: 'snow' },
    73: { en: 'Moderate snow', hi: 'बर्फबारी', pa: 'ਬਰਫਬਾਰੀ', icon: 'snow' },
    75: { en: 'Heavy snow', hi: 'भारी बर्फबारी', pa: 'ਭਾਰੀ ਬਰਫਬਾਰੀ', icon: 'snow' },
    80: { en: 'Slight rain showers', hi: 'हल्की बौछारें', pa: 'ਹਲਕੀ ਬਾਰਿਸ਼', icon: 'rainy' },
    81: { en: 'Moderate rain showers', hi: 'बौछारें', pa: 'ਦਰਮਿਆਨੀ ਬਾਰਿਸ਼', icon: 'rainy' },
    82: { en: 'Violent rain showers', hi: 'तेज बौछारें', pa: 'ਭਾਰੀ ਬਾਰਿਸ਼', icon: 'thunderstorm' },
    95: { en: 'Thunderstorm', hi: 'तूफान', pa: 'ਤੂਫਾਨ', icon: 'thunderstorm' },
    96: { en: 'Thunderstorm with hail', hi: 'ओला तूफान', pa: 'ਗੜੇਮਾਰੀ', icon: 'thunderstorm' },
    99: { en: 'Heavy thunderstorm with hail', hi: 'भारी ओला तूफान', pa: 'ਭਾਰੀ ਗੜੇਮਾਰੀ', icon: 'thunderstorm' },
};

export interface CurrentWeather {
    temperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    description: string;
    icon: string;
    feelsLike: number;
}

export interface DailyForecast {
    date: string;
    dayName: string;
    tempMax: number;
    tempMin: number;
    weatherCode: number;
    description: string;
    icon: string;
    precipitationProbability: number;
}

export interface HourlyForecast {
    time: string;
    hour: string;
    temperature: number;
    weatherCode: number;
    icon: string;
}

export interface WeatherData {
    current: CurrentWeather;
    daily: DailyForecast[];
    hourly: HourlyForecast[];
    locationName: string;
    isOffline?: boolean;
    lastUpdated?: string;
}


function getWeatherInfo(code: number, lang: 'en' | 'hi' | 'pa' = 'en'): { description: string; icon: string } {
    const data = WEATHER_DESCRIPTIONS[code];
    if (!data) return { description: 'Unknown', icon: 'cloudy' };
    return { description: data[lang], icon: data.icon };
}

// Helper for day names
const DAYS = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
    pa: ['ਐਤ', 'ਸੋਮ', 'ਮੰਗਲ', 'ਬੁੱਧ', 'ਵੀਰ', 'ਸ਼ੁੱਕਰ', 'ਸ਼ਨੀ']
};

function getDayName(dateStr: string, lang: 'en' | 'hi' | 'pa' = 'en'): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return { en: 'Today', hi: 'आज', pa: 'ਅੱਜ' }[lang];
    if (diff === 1) return { en: 'Tomorrow', hi: 'कल', pa: 'ਕੱਲ' }[lang];

    return DAYS[lang][date.getDay()];
}

// ── Location & Weather Cache ──
let cachedLocation: { latitude: number; longitude: number } | null = null;
let cachedWeather: WeatherData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function getCachedWeather(): WeatherData | null {
    if (cachedWeather && Date.now() - cacheTimestamp < CACHE_TTL) return cachedWeather;
    return null;
}

export async function requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
        const granted = await requestLocationPermission();
        if (!granted) return null;

        // 1. Try instant cached location first
        if (cachedLocation) return cachedLocation;

        // 2. Try last known position (instant, no GPS needed)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
            cachedLocation = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
            return cachedLocation;
        }

        // 3. Fallback: get fresh position with lowest accuracy (fastest)
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest,
        });
        cachedLocation = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        return cachedLocation;
    } catch (error) {
        console.error('Error getting location:', error);
        return null;
    }
}

export async function getLocationName(latitude: number, longitude: number): Promise<string> {
    try {
        const result = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (result.length > 0) {
            const place = result[0];
            const city = place.city || place.subregion || place.region || '';
            const district = place.district || '';
            return district ? `${district}, ${city}` : city || 'आपका स्थान';
        }
    } catch {
        // Fallback silently
    }
    return 'आपका स्थान';
}

export async function fetchWeather(latitude: number, longitude: number, langCode: string = 'en'): Promise<WeatherData | null> {
    try {
        const locationName = await getLocationName(latitude, longitude);

        // Open-Meteo API — completely free, no API key needed
        const url =
            `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${latitude}&longitude=${longitude}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
            `&hourly=temperature_2m,weather_code` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
            `&timezone=auto&forecast_days=7`;

        const response = await fetch(url);
        const data = await response.json();

        // Parse current weather
        // Ensure langCode is valid
        const lang = (['en', 'hi', 'pa'].includes(langCode) ? langCode : 'en') as 'en' | 'hi' | 'pa';

        const currentInfo = getWeatherInfo(data.current.weather_code, lang);
        const current: CurrentWeather = {
            temperature: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            windSpeed: Math.round(data.current.wind_speed_10m),
            weatherCode: data.current.weather_code,
            description: currentInfo.description,
            icon: currentInfo.icon,
            feelsLike: Math.round(data.current.apparent_temperature),
        };

        // Parse 7-day forecast
        const daily: DailyForecast[] = data.daily.time.map((date: string, i: number) => {
            const info = getWeatherInfo(data.daily.weather_code[i], lang);
            return {
                date,
                dayName: getDayName(date, lang),
                tempMax: Math.round(data.daily.temperature_2m_max[i]),
                tempMin: Math.round(data.daily.temperature_2m_min[i]),
                weatherCode: data.daily.weather_code[i],
                description: info.description,
                icon: info.icon,
                precipitationProbability: data.daily.precipitation_probability_max[i],
            };
        });

        // Parse next 24 hours
        const nowHour = new Date().getHours();
        const hourly: HourlyForecast[] = [];
        for (let i = nowHour; i < Math.min(nowHour + 24, data.hourly.time.length); i++) {
            const info = getWeatherInfo(data.hourly.weather_code[i], lang);
            const hour = new Date(data.hourly.time[i]).getHours();
            hourly.push({
                time: data.hourly.time[i],
                hour: i === nowHour ? ({ en: 'Now', hi: 'अभी', pa: 'ਹੁਣ' }[lang]) : `${hour}:00`,
                temperature: Math.round(data.hourly.temperature_2m[i]),
                weatherCode: data.hourly.weather_code[i],
                icon: info.icon,
            });
        }

        cachedWeather = { current, daily, hourly, locationName };
        cacheTimestamp = Date.now();

        // Persist to AsyncStorage for offline access
        await saveToCache(CACHE_KEYS.WEATHER_DATA, cachedWeather, 360); // 6 hours TTL

        return cachedWeather;
    } catch (error) {
        console.error('Error fetching weather:', error);

        // Offline fallback: load from persistent cache
        const offlineData = await getFromCache<WeatherData>(CACHE_KEYS.WEATHER_DATA, true);
        if (offlineData?.data) {
            console.log('[Weather] Serving offline cached data');
            return {
                ...offlineData.data,
                isOffline: true,
                lastUpdated: getTimeAgo(offlineData.timestamp, langCode as 'en' | 'hi' | 'pa'),
            };
        }
        return null;
    }

}
