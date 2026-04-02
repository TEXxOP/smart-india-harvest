import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { fetchWeather, getCurrentLocation, CurrentWeather } from '../services/weatherService';
import { useTranslation } from '../context/TranslationContext';
import { Translations } from '../services/translationService';
import { WeatherIcon, CropIcon, ChatIcon, DiseaseIcon, StarIcon } from '../components/PremiumIcons';
import OfflineBanner from '../components/OfflineBanner';
import VoiceButton from '../components/VoiceButton';
import VoiceOverlay from '../components/VoiceOverlay';
import { useVoice } from '../context/VoiceContext';
import { SafetyAlert, getWeatherSafetyAlerts } from '../components/ExplainabilityComponents';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;

type RootStackParamList = {
    Home: undefined;
    Weather: undefined;
    AIChat: undefined;
    DiseaseDetection: undefined;
    Fasalein: undefined;
    Onboarding: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
    navigation: HomeScreenNavigationProp;
}

function getGreetingKey(): keyof Translations {
    const hour = new Date().getHours();
    if (hour < 12) return 'good_morning';
    if (hour < 17) return 'good_afternoon';
    return 'good_evening';
}

export default function HomeScreen({ navigation }: Props) {
    const { t, language } = useTranslation();
    const { setNavigationHandler } = useVoice();
    const greetingKey = getGreetingKey();
    const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
    const [locationName, setLocationName] = useState<string>('');
    const [weatherLoading, setWeatherLoading] = useState(true);
    const [safetyAlerts, setSafetyAlerts] = useState<any[]>([]);

    useEffect(() => {
        loadWeather();
    }, []);

    // Wire up voice navigation
    useEffect(() => {
        setNavigationHandler((screen: string) => {
            const validScreens = [
                'Home', 'Weather', 'AIChat', 'DiseaseDetection',
                'Fasalein', 'Onboarding', 'SuccessStories', 'Profile',
                'AgriKnowledge', 'GovSchemes', 'IrrigationDashboard', 'ActionPlan'
            ];
            if (validScreens.includes(screen)) {
                navigation.navigate(screen as any);
            }
        });
    }, [navigation, setNavigationHandler]);

    const loadWeather = async () => {
        try {
            setWeatherLoading(true);
            const location = await getCurrentLocation();
            if (location) {
                const data = await fetchWeather(location.latitude, location.longitude);
                if (data) {
                    setCurrentWeather(data.current);
                    setLocationName(data.locationName);
                    
                    // Generate safety alerts based on weather
                    const weatherConditions = {
                        temperature: data.current.temperature,
                        humidity: data.current.humidity,
                        windSpeed: data.current.windSpeed,
                        rainProbability: data.daily[0]?.precipitationProbability || 0
                    };
                    const alerts = getWeatherSafetyAlerts(weatherConditions, language as string);
                    setSafetyAlerts(alerts);
                }
            }
        } catch (err) {
            console.error('Weather error:', err);
        } finally {
            setWeatherLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="transparent" translucent />
            <OfflineBanner lang={language as any} />
            <ImageBackground 
                source={require('../../assets/farm_bg.png')} 
                style={styles.imageBackground}
                imageStyle={{ opacity: 0.8 }} // Subtle fade
            >
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                    {/* ===== Semi-Transparent Header ===== */}
                    <LinearGradient
                        colors={['rgba(46, 125, 50, 0.85)', 'rgba(67, 160, 71, 0.75)', 'rgba(102, 187, 106, 0.0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.header}
                    >
                    <View style={styles.headerTop}>
                        <View style={styles.greetingContainer}>
                            <Text style={styles.greetingText}>{t(greetingKey)}</Text>
                            <Text style={styles.greetingSubtext}>
                                {locationName
                                    ? t('farming_status_query').replace('{location}', locationName)
                                    : t('farming_status_query_default')}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.profileButton}>
                            <Ionicons name="person" size={24} color="#2E7D32" />
                        </TouchableOpacity>
                    </View>

                    {/* Stats Bar */}
                    <View style={styles.statsBar}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>3</Text>
                            <Text style={styles.statLabel}>{t('active_crops')}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            {weatherLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.statValue}>
                                    {currentWeather ? `${currentWeather.temperature}°C` : '--°C'}
                                </Text>
                            )}
                            <Text style={styles.statLabel}>{t('todays_temp')}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>85%</Text>
                            <Text style={styles.statLabel}>{t('crop_health')}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* ===== Safety Alerts Banner ===== */}
                {safetyAlerts.length > 0 && (
                    <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
                        {safetyAlerts.map((alert, index) => (
                            <SafetyAlert 
                                key={index} 
                                level={alert.level} 
                                title={alert.title} 
                                message={alert.message} 
                            />
                        ))}
                    </View>
                )}

                {/* ===== Feature Cards Grid ===== */}
                <View style={styles.cardsSection}>
                    <View style={styles.cardRow}>
                        {/* मौसम (Weather) — navigates to WeatherScreen */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cardTouchable}
                            onPress={() => navigation.navigate('Weather')}
                        >
                            <LinearGradient
                                colors={['#F97316', '#FB923C']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.featureCard}
                            >
                                <View style={styles.cardIconCircle}>
                                    <WeatherIcon size={34} />
                                </View>
                                <Text style={styles.cardTitle}>{t('weather_title')}</Text>
                                <Text style={styles.cardSubtitle}>
                                    {currentWeather ? `${currentWeather.temperature}°C · ${currentWeather.description}` : t('check_weather')}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* फसलें (Crops) */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cardTouchable}
                            onPress={() => navigation.navigate('Fasalein')}
                        >
                            <LinearGradient
                                colors={['#4CAF50', '#66BB6A']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.featureCard}
                            >
                                <View style={styles.cardIconCircle}>
                                    <CropIcon size={34} />
                                </View>
                                <Text style={styles.cardTitle}>{t('crop_recommendation')}</Text>
                                <Text style={styles.cardSubtitle}>{t('crop_management')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardRow}>
                        {/* AI सहायक (AI Assistant) */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cardTouchable}
                            onPress={() => navigation.navigate('AIChat')}
                        >
                            <LinearGradient
                                colors={['#3B82F6', '#60A5FA']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.featureCard}
                            >
                                <View style={styles.cardIconCircle}>
                                    <ChatIcon size={32} />
                                </View>
                                <Text style={styles.cardTitle}>{t('ai_chat')}</Text>
                                <Text style={styles.cardSubtitle}>{t('agri_advice')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* रोग पहचान (Disease Detection) */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cardTouchable}
                            onPress={() => navigation.navigate('DiseaseDetection')}
                        >
                            <LinearGradient
                                colors={['#9333EA', '#A855F7']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.featureCard}
                            >
                                <View style={styles.cardIconCircle}>
                                    <DiseaseIcon size={38} />
                                </View>
                                <Text style={styles.cardTitle}>{t('disease_detection')}</Text>
                                <Text style={styles.cardSubtitle}>{t('check_from_photo')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Row 3 */}
                    <View style={styles.cardRow}>
                        {/* Smart Irrigation */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cardTouchable}
                            onPress={() => navigation.navigate('IrrigationDashboard' as never)}
                        >
                            <LinearGradient
                                colors={['#0EA5E9', '#38BDF8']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.featureCard}
                            >
                                <View style={styles.cardIconCircle}>
                                    <Ionicons name="water-outline" size={34} color="#0c4a6e" />
                                </View>
                                <Text style={styles.cardTitle}>{t('smart_irrigation')}</Text>
                                <Text style={styles.cardSubtitle}>{t('irrigation_desc')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        {/* Mandi Prices */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cardTouchable}
                            onPress={() => navigation.navigate('MandiPrices' as never)}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#FCD34D']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.featureCard}
                            >
                                <View style={styles.cardIconCircle}>
                                    <Ionicons name="pricetags" size={32} color="#92400E" />
                                </View>
                                <Text style={styles.cardTitle}>
                                    {t('mandi_prices') === 'mandi_prices' 
                                        ? (language === 'hi' ? 'मंडी भाव' : language === 'pa' ? 'ਮੰਡੀ ਦੇ ਭਾਅ' : 'Market Rates') 
                                        : t('mandi_prices')}
                                </Text>
                                <Text style={styles.cardSubtitle}>Live APMC Prices</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ===== List Items ===== */}
                <View style={styles.listSection}>
                    {/* 📋 Action Plan — Hero Feature */}
                    <TouchableOpacity 
                        style={[styles.listItem, { borderWidth: 1.5, borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]} 
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('ActionPlan' as never)}
                    >
                        <View style={[styles.listIconCircle, { backgroundColor: '#DCFCE7' }]}>
                            <MaterialCommunityIcons name="calendar-check" size={24} color="#16A34A" />
                        </View>
                        <View style={styles.listTextContainer}>
                            <Text style={styles.listTitle}>
                                {language === 'hi' ? '📋 साप्ताहिक कार्य योजना' :
                                 language === 'pa' ? '📋 ਹਫ਼ਤਾਵਾਰੀ ਕਾਰਜ ਯੋਜਨਾ' :
                                 '📋 Weekly Action Plan'}
                            </Text>
                            <Text style={styles.listSubtitle}>
                                {language === 'hi' ? 'AI-powered दैनिक कृषि कार्य' :
                                 language === 'pa' ? 'AI-powered ਰੋਜ਼ਾਨਾ ਖੇਤੀ ਕੰਮ' :
                                 'AI-powered daily farm tasks'}
                            </Text>
                        </View>
                        <View style={{ backgroundColor: '#16A34A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>NEW</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Success Stories Link */}
                    <TouchableOpacity 
                        style={styles.listItem} 
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('SuccessStories' as never)}
                    >
                        <View style={[styles.listIconCircle, { backgroundColor: '#FFF7ED' }]}>
                            <StarIcon size={26} />
                        </View>
                        <View style={styles.listTextContainer}>
                            <Text style={styles.listTitle}>{t('success_stories')}</Text>
                            <Text style={styles.listSubtitle}>{t('read_more')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={() => navigation.navigate('YieldPrediction' as never)}>
                        <View style={[styles.listIconCircle, { backgroundColor: '#EFF6FF' }]}>
                            <MaterialCommunityIcons name="chart-line" size={24} color="#3B82F6" />
                        </View>
                        <View style={styles.listTextContainer}>
                            <Text style={styles.listTitle}>{t('yield_prediction')}</Text>
                            <Text style={styles.listSubtitle}>{t('view_estimated_production')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={() => navigation.navigate('AgriKnowledge' as never)}>
                        <View style={[styles.listIconCircle, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="book" size={24} color="#F59E0B" />
                        </View>
                        <View style={styles.listTextContainer}>
                            <Text style={styles.listTitle}>{t('agri_knowledge')}</Text>
                            <Text style={styles.listSubtitle}>{t('learn_about_farming')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={() => navigation.navigate('GovSchemes' as never)}>
                        <View style={[styles.listIconCircle, { backgroundColor: '#F0FDF4' }]}>
                            <Ionicons name="document-text" size={24} color="#22C55E" />
                        </View>
                        <View style={styles.listTextContainer}>
                            <Text style={styles.listTitle}>{t('gov_schemes')}</Text>
                            <Text style={styles.listSubtitle}>{t('scheme_info')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 90 }} />
            </ScrollView>

            </ImageBackground>

            {/* ===== Bottom Tab Bar ===== */}
            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} activeOpacity={0.7}>
                    <Ionicons name="home" size={24} color="#4CAF50" />
                    <Text style={[styles.tabLabel, styles.tabLabelActive]}>{t('home_tab')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabItem}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Fasalein')}
                >
                    <MaterialCommunityIcons name="sprout" size={24} color="#94A3B8" />
                    <Text style={styles.tabLabel}>{t('my_crops')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.cameraTab}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('DiseaseDetection')}
                >
                    <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.cameraButton}>
                        <Ionicons name="camera" size={28} color="#FFFFFF" />
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.tabItem} 
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('AIChat')}
                >
                    <Ionicons name="chatbubbles-outline" size={24} color="#94A3B8" />
                    <Text style={styles.tabLabel}>{t('chat_tab')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.tabItem} 
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Profile' as never)}
                >
                    <Ionicons name="person-outline" size={24} color="#94A3B8" />
                    <Text style={styles.tabLabel}>{t('profile_tab')}</Text>
                </TouchableOpacity>
            </View>

            {/* ===== Voice Assistant ===== */}
            <VoiceButton bottom={80} />
            <VoiceOverlay />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F0',
    },
    scrollView: {
        flex: 1,
    },
    imageBackground: {
        flex: 1,
        width: '100%',
        backgroundColor: '#F0F9FF', // Base color that blends with the sky
    },
    header: {
        paddingTop: 54, // Increased for translucent status bar
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    greetingContainer: {
        flex: 1,
    },
    greetingText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    greetingSubtext: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
    },
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    statsBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    cardsSection: {
        paddingHorizontal: 18,
        paddingTop: 20,
        gap: CARD_GAP,
    },
    cardRow: {
        flexDirection: 'row',
        gap: CARD_GAP,
    },
    cardTouchable: {
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
    },
    featureCard: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderRadius: 18,
        minHeight: 130,
        justifyContent: 'center',
    },
    cardIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    cardSubtitle: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 2,
        textAlign: 'center',
    },
    listSection: {
        paddingHorizontal: 18,
        paddingTop: 20,
        gap: 10,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    listIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    listTextContainer: {
        flex: 1,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    listSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    tabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: '#FFFFFF',
        paddingBottom: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    tabLabel: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 2,
        fontWeight: '500',
    },
    tabLabelActive: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    cameraTab: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -28,
    },
    cameraButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});
