/**
 * Offline Storage Service
 * Unified AsyncStorage wrapper with TTL-based expiration.
 * Foundation for all offline-first features.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Cache Keys ──
export const CACHE_KEYS = {
    WEATHER_DATA: 'cache_weather_data',
    DISEASE_RESULTS: 'cache_disease_results',
    FARM_PROFILE: 'cache_farm_profile',
    AI_CHAT_HISTORY: 'cache_ai_chat_history',
    TRANSLATIONS: 'cache_translations',
    OFFLINE_QUEUE: 'cache_offline_queue',
    KNOWLEDGE_BASE_VERSION: 'cache_kb_version',
} as const;

interface CachedItem<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

/**
 * Save data to cache with TTL expiration.
 * @param key - Storage key
 * @param data - Data to cache (must be JSON-serializable)
 * @param ttlMinutes - Time-to-live in minutes (default: 360 = 6 hours)
 */
export async function saveToCache<T>(
    key: string,
    data: T,
    ttlMinutes: number = 360
): Promise<void> {
    try {
        const now = Date.now();
        const item: CachedItem<T> = {
            data,
            timestamp: now,
            expiresAt: now + ttlMinutes * 60 * 1000,
        };
        await AsyncStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
        console.error(`[OfflineStorage] Error saving ${key}:`, error);
    }
}

/**
 * Retrieve cached data. Returns null if expired or missing.
 * @param key - Storage key
 * @param ignoreExpiry - If true, return data even if expired (useful for offline fallback)
 */
export async function getFromCache<T>(
    key: string,
    ignoreExpiry: boolean = false
): Promise<{ data: T; timestamp: number; isExpired: boolean } | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;

        const item: CachedItem<T> = JSON.parse(raw);
        const isExpired = Date.now() > item.expiresAt;

        if (isExpired && !ignoreExpiry) return null;

        return {
            data: item.data,
            timestamp: item.timestamp,
            isExpired,
        };
    } catch (error) {
        console.error(`[OfflineStorage] Error reading ${key}:`, error);
        return null;
    }
}

/**
 * Clear specific cache key or all cached data.
 * @param key - Optional specific key to clear. If omitted, clears all cache keys.
 */
export async function clearCache(key?: string): Promise<void> {
    try {
        if (key) {
            await AsyncStorage.removeItem(key);
        } else {
            const allKeys = Object.values(CACHE_KEYS);
            await AsyncStorage.multiRemove(allKeys);
        }
    } catch (error) {
        console.error('[OfflineStorage] Error clearing cache:', error);
    }
}

/**
 * Append an item to a cached array (e.g., disease results history).
 * Keeps only the latest `maxItems` entries.
 */
export async function appendToCache<T>(
    key: string,
    newItem: T,
    maxItems: number = 20,
    ttlMinutes: number = 43200 // 30 days default for history
): Promise<void> {
    try {
        const existing = await getFromCache<T[]>(key, true);
        const items = existing?.data || [];
        items.unshift(newItem); // Add to front
        const trimmed = items.slice(0, maxItems);
        await saveToCache(key, trimmed, ttlMinutes);
    } catch (error) {
        console.error(`[OfflineStorage] Error appending to ${key}:`, error);
    }
}

/**
 * Get human-readable "time ago" string for cache timestamp.
 */
export function getTimeAgo(timestamp: number, lang: 'en' | 'hi' | 'pa' = 'en'): string {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
        return { en: 'Just now', hi: 'अभी', pa: 'ਹੁਣੇ' }[lang];
    }
    if (diffMins < 60) {
        return {
            en: `${diffMins} min ago`,
            hi: `${diffMins} मिनट पहले`,
            pa: `${diffMins} ਮਿੰਟ ਪਹਿਲਾਂ`,
        }[lang];
    }
    if (diffHours < 24) {
        return {
            en: `${diffHours} hr ago`,
            hi: `${diffHours} घंटे पहले`,
            pa: `${diffHours} ਘੰਟੇ ਪਹਿਲਾਂ`,
        }[lang];
    }
    return {
        en: `${diffDays} day${diffDays > 1 ? 's' : ''} ago`,
        hi: `${diffDays} दिन पहले`,
        pa: `${diffDays} ਦਿਨ ਪਹਿਲਾਂ`,
    }[lang];
}
