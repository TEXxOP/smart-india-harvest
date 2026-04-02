import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import {
    fetchWeather,
    getCurrentLocation,
    getCachedWeather,
    WeatherData,
    HourlyForecast,
    DailyForecast,
} from '../services/weatherService';
import { useTranslation } from '../context/TranslationContext';

type RootStackParamList = { Home: undefined; Weather: undefined };
type WeatherScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Weather'>;
interface Props { navigation: WeatherScreenNavigationProp; }

// ── Dynamic theme based on weather code ──
function getWeatherTheme(code: number, temp: number): { gradient: [string, string, string]; statusBar: 'light' | 'dark' } {
    // Thunderstorm
    if (code >= 95) return { gradient: ['#1a1a2e', '#16213e', '#0f3460'], statusBar: 'light' };
    // Rain / drizzle
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
        return { gradient: ['#2C3E50', '#4A6FA5', '#6B8DB2'], statusBar: 'light' };
    // Snow
    if (code >= 71 && code <= 77) return { gradient: ['#667db6', '#0082c8', '#a8c0ff'], statusBar: 'light' };
    // Fog
    if (code === 45 || code === 48) return { gradient: ['#757F9A', '#AEB7C4', '#D7DDE8'], statusBar: 'dark' };
    // Overcast
    if (code === 3) return { gradient: ['#636FA4', '#9098B5', '#BCC3D5'], statusBar: 'light' };
    // Partly cloudy
    if (code === 2) return { gradient: ['#3A7BD5', '#6CB4EE', '#A8D8F8'], statusBar: 'light' };
    // Mainly clear
    if (code === 1) {
        if (temp >= 35) return { gradient: ['#F97316', '#FBBF24', '#FDE68A'], statusBar: 'dark' };
        return { gradient: ['#2980B9', '#6DD5FA', '#B8E2F8'], statusBar: 'light' };
    }
    // Clear sky
    if (temp >= 35) return { gradient: ['#E65100', '#F57C00', '#FFB74D'], statusBar: 'light' };
    if (temp >= 25) return { gradient: ['#1565C0', '#42A5F5', '#90CAF9'], statusBar: 'light' };
    if (temp >= 15) return { gradient: ['#0277BD', '#4FC3F7', '#B3E5FC'], statusBar: 'light' };
    return { gradient: ['#283593', '#5C6BC0', '#9FA8DA'], statusBar: 'light' };
}

// ── Colorful weather icon component ──
function WeatherIcon({ code, size, forCard }: { code: number; size: number; forCard?: boolean }) {
    const baseColor = forCard ? undefined : '#FFFFFF';
    if (code >= 95) return <Ionicons name="thunderstorm" size={size} color={baseColor || '#FFC107'} />;
    if (code >= 80) return <Ionicons name="rainy" size={size} color={baseColor || '#42A5F5'} />;
    if (code >= 71 && code <= 77) return <Ionicons name="snow" size={size} color={baseColor || '#90CAF9'} />;
    if (code >= 51 && code <= 67) return <MaterialCommunityIcons name="weather-pouring" size={size} color={baseColor || '#64B5F6'} />;
    if (code === 45 || code === 48) return <MaterialCommunityIcons name="weather-fog" size={size} color={baseColor || '#B0BEC5'} />;
    if (code === 3) return <Ionicons name="cloudy" size={size} color={baseColor || '#90A4AE'} />;
    if (code === 2) return <Ionicons name="partly-sunny" size={size} color={baseColor || '#FFD54F'} />;
    if (code === 1) return <MaterialCommunityIcons name="weather-partly-cloudy" size={size} color={baseColor || '#FFD54F'} />;
    return <Ionicons name="sunny" size={size} color={baseColor || '#FFD54F'} />;
}

// Colored icon for daily forecast cards
function DailyWeatherIcon({ code, size }: { code: number; size: number }) {
    if (code >= 95) return <Ionicons name="thunderstorm" size={size} color="#FFC107" />;
    if (code >= 80) return <Ionicons name="rainy" size={size} color="#42A5F5" />;
    if (code >= 71 && code <= 77) return <Ionicons name="snow" size={size} color="#7986CB" />;
    if (code >= 51 && code <= 67) return <MaterialCommunityIcons name="weather-pouring" size={size} color="#64B5F6" />;
    if (code === 45 || code === 48) return <MaterialCommunityIcons name="weather-fog" size={size} color="#B0BEC5" />;
    if (code === 3) return <Ionicons name="cloudy" size={size} color="#90A4AE" />;
    if (code === 2) return <Ionicons name="partly-sunny" size={size} color="#FF9800" />;
    if (code === 1) return <MaterialCommunityIcons name="weather-partly-cloudy" size={size} color="#FFB300" />;
    return <Ionicons name="sunny" size={size} color="#FF9800" />;
}

export default function WeatherScreen({ navigation }: Props) {
    const { t } = useTranslation();
    // Use cached data for instant render, fall back to loading
    const cached = getCachedWeather();
    const [weather, setWeather] = useState<WeatherData | null>(cached);
    const [loading, setLoading] = useState(!cached);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If we have cache, do a silent background refresh
        // If no cache, do a visible load
        loadWeather(!cached);
    }, []);

    const loadWeather = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        setError(null);
        try {
            const location = await getCurrentLocation();
            if (!location) { setError('स्थान की अनुमति आवश्यक है।'); setLoading(false); return; }
            const data = await fetchWeather(location.latitude, location.longitude);
            if (data) setWeather(data);
            else if (!weather) setError('मौसम डेटा लोड करने में त्रुटि।');
        } catch { if (!weather) setError('नेटवर्क त्रुटि।'); }
        finally { setLoading(false); }
    };

    // Loading state
    if (loading) {
        return (
            <LinearGradient colors={['#1565C0', '#42A5F5', '#90CAF9']} style={styles.centeredContainer}>
                <StatusBar style="light" />
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>मौसम डेटा लोड हो रहा है...</Text>
            </LinearGradient>
        );
    }

    // Error state
    if (error || !weather) {
        return (
            <LinearGradient colors={['#2C3E50', '#4A6FA5', '#6B8DB2']} style={styles.centeredContainer}>
                <StatusBar style="light" />
                <Ionicons name="cloud-offline" size={64} color="rgba(255,255,255,0.6)" />
                <Text style={styles.errorText}>{error || 'कुछ गलत हो गया'}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => loadWeather(true)}>
                    <Ionicons name="refresh" size={18} color="#FFF" />
                    <Text style={styles.retryText}>पुनः प्रयास करें</Text>
                </TouchableOpacity>
            </LinearGradient>
        );
    }

    const theme = getWeatherTheme(weather.current.weatherCode, weather.current.temperature);

    const renderHourlyItem = ({ item }: { item: HourlyForecast }) => (
        <View style={styles.hourlyCard}>
            <Text style={styles.hourlyTime}>{item.hour}</Text>
            <WeatherIcon code={item.weatherCode} size={26} />
            <Text style={styles.hourlyTemp}>{item.temperature}°</Text>
        </View>
    );

    return (
        <View style={styles.root}>
            <StatusBar style={theme.statusBar} />
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

                {/* ── Main Header ── */}
                <LinearGradient colors={theme.gradient} style={styles.headerGradient}>

                    {/* Back button */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* Location */}
                    <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={16} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.locationText}>{weather.locationName}</Text>
                    </View>

                    {/* Big temperature + icon */}
                    <View style={styles.heroRow}>
                        <View style={styles.heroLeft}>
                            <Text style={styles.heroTemp}>{weather.current.temperature}°</Text>
                            <Text style={styles.heroDesc}>{weather.current.description}</Text>
                            <Text style={styles.heroFeels}>
                                {t('feels_like')} {weather.current.feelsLike}°C
                            </Text>
                        </View>
                        <WeatherIcon code={weather.current.weatherCode} size={80} />
                    </View>

                    {/* Quick stats */}
                    <View style={styles.quickStats}>
                        <View style={styles.quickItem}>
                            <MaterialCommunityIcons name="water-percent" size={20} color="#64B5F6" />
                            <Text style={styles.quickValue}>{weather.current.humidity}%</Text>
                            <Text style={styles.quickLabel}>{t('humidity')}</Text>
                        </View>
                        <View style={styles.quickDivider} />
                        <View style={styles.quickItem}>
                            <MaterialCommunityIcons name="weather-windy" size={20} color="#81C784" />
                            <Text style={styles.quickValue}>{weather.current.windSpeed} km/h</Text>
                            <Text style={styles.quickLabel}>{t('wind')}</Text>
                        </View>
                        <View style={styles.quickDivider} />
                        <View style={styles.quickItem}>
                            <MaterialCommunityIcons name="thermometer" size={20} color="#FFB74D" />
                            <Text style={styles.quickValue}>{weather.current.feelsLike}°C</Text>
                            <Text style={styles.quickLabel}>{t('feels_like')}</Text>
                        </View>
                    </View>

                    {/* Hourly forecast */}
                    <Text style={styles.sectionHeader}>{t('next_24_hours')}</Text>
                    <FlatList
                        data={weather.hourly.slice(0, 24)}
                        renderItem={renderHourlyItem}
                        keyExtractor={(item) => item.time}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.hourlyScroll}
                    />
                </LinearGradient>

                {/* ── 7-day Forecast ── */}
                <View style={styles.dailySection}>
                    <Text style={styles.dailyHeader}>{t('7_day_forecast')}</Text>
                    {weather.daily.map((day: DailyForecast) => (
                        <View key={day.date} style={styles.dailyCard}>
                            <Text style={styles.dailyDay}>{day.dayName}</Text>
                            <View style={styles.dailyCenter}>
                                <DailyWeatherIcon code={day.weatherCode} size={26} />
                                <Text style={styles.dailyDesc}>{day.description}</Text>
                                {day.precipitationProbability > 0 && (
                                    <View style={styles.rainBadge}>
                                        <Ionicons name="water" size={12} color="#42A5F5" />
                                        <Text style={styles.rainText}>{day.precipitationProbability}%</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.dailyTemps}>
                                <Text style={styles.tempHigh}>{day.tempMax}°</Text>
                                <Text style={styles.tempLow}>{day.tempMin}°</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F0F2F5' },
    centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: '#FFF', fontSize: 16, marginTop: 8 },
    errorText: { color: '#FFF', fontSize: 16, textAlign: 'center', paddingHorizontal: 32, marginTop: 8 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
    retryText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

    // ── Header ──
    headerGradient: { paddingTop: 48, paddingBottom: 28, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    locationText: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '500' },

    // ── Hero ──
    heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    heroLeft: { flex: 1 },
    heroTemp: { fontSize: 72, fontWeight: '200', color: '#FFFFFF', lineHeight: 80 },
    heroDesc: { fontSize: 18, color: 'rgba(255,255,255,0.92)', fontWeight: '500', marginTop: 2 },
    heroFeels: { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

    // ── Quick stats ──
    quickStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 4, marginBottom: 28 },
    quickItem: { flex: 1, alignItems: 'center', gap: 4 },
    quickValue: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
    quickLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
    quickDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },

    // ── Hourly ──
    sectionHeader: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: 12 },
    hourlyScroll: { paddingRight: 4 },
    hourlyCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, marginRight: 10, gap: 8, minWidth: 64 },
    hourlyTime: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
    hourlyTemp: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },

    // ── Daily ──
    dailySection: { paddingHorizontal: 20, paddingTop: 24 },
    dailyHeader: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 14 },
    dailyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    dailyDay: { fontSize: 14, fontWeight: '600', color: '#334155', width: 52 },
    dailyCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    dailyDesc: { fontSize: 13, color: '#64748B', flex: 1 },
    rainBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    rainText: { fontSize: 11, color: '#3B82F6', fontWeight: '600' },
    dailyTemps: { flexDirection: 'row', gap: 10 },
    tempHigh: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
    tempLow: { fontSize: 16, color: '#94A3B8' },
});
