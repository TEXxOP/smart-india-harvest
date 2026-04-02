import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../context/TranslationContext';
import { BACKEND_URL } from '../config';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WhyCard } from '../components/ExplainabilityComponents';

const screenWidth = Dimensions.get('window').width;

const CROPS = ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Potato', 'Soyabean', 'Groundnut', 'Mustard', 'Bajra', 'Jowar'];

interface ScheduleItem {
    day: string;
    et0_mm: number;
    crop_need_mm: number;
    rain_mm: number;
    irrigate_liters: number;
    rain_probability: number;
}

interface DashboardData {
    moisture_level: number;
    weather_condition: string;
    recommendation: string;
    water_needed_liters: number;
    best_time: string;
    savings_percentage: number;
    historical_usage: number[];
    ai_optimized_usage: number[];
    crop_health_impact: string;
    et0_today_mm: number;
    crop_et_today_mm: number;
    schedule: ScheduleItem[];
}

export default function IrrigationDashboardScreen({ navigation }: any) {
    const { t, language } = useTranslation();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState('Wheat');
    const [showCropPicker, setShowCropPicker] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, [selectedCrop]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(false);

            // Get location
            let lat = 28.6, lon = 77.2;
            let soilType = 'Alluvial';
            let landArea = 1.0;

            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getLastKnownPositionAsync();
                    if (loc) { lat = loc.coords.latitude; lon = loc.coords.longitude; }
                }
            } catch (e) { /* defaults */ }

            // Get farm profile for soil type and land area
            try {
                const profileData = await AsyncStorage.getItem('farm_profile');
                if (profileData) {
                    const profile = JSON.parse(profileData);
                    soilType = profile.soil_type || 'Alluvial';
                    // Convert to hectares roughly
                    const size = profile.land_size || 1;
                    if (profile.land_unit === 'Acre') landArea = size * 0.4047;
                    else if (profile.land_unit === 'Beegha') landArea = size * 0.2529;
                    else landArea = size; // already hectares
                }
            } catch (e) { /* defaults */ }

            const url = `${BACKEND_URL}/api/irrigation/dashboard?` +
                `crop=${encodeURIComponent(selectedCrop)}` +
                `&lang_code=${language}` +
                `&latitude=${lat}&longitude=${lon}` +
                `&land_area_hectares=${landArea}` +
                `&soil_type=${encodeURIComponent(soilType)}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const result = await response.json();
            setData(result);
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#0369a1" />
                <Text style={{ marginTop: 12, color: '#475569' }}>{t('loading')}</Text>
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Ionicons name="warning-outline" size={48} color="#ef4444" />
                <Text style={{ marginTop: 12, color: '#475569' }}>{t('error')}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchDashboardData}>
                    <Text style={styles.retryText}>{t('retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const maxUsage = Math.max(...data.historical_usage, ...data.ai_optimized_usage, 1);
    const chartHeight = 160;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('smart_irrigation')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Crop Selector */}
                <TouchableOpacity
                    style={styles.cropSelector}
                    onPress={() => setShowCropPicker(!showCropPicker)}
                >
                    <MaterialCommunityIcons name="sprout" size={20} color="#0ea5e9" />
                    <Text style={styles.cropSelectorText}>{selectedCrop}</Text>
                    <Ionicons name={showCropPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                </TouchableOpacity>

                {showCropPicker && (
                    <View style={styles.cropDropdown}>
                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                            {CROPS.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.cropOption, selectedCrop === c && styles.cropOptionActive]}
                                    onPress={() => { setSelectedCrop(c); setShowCropPicker(false); }}
                                >
                                    <Text style={[styles.cropOptionText, selectedCrop === c && { color: '#0ea5e9', fontWeight: '700' }]}>
                                        {c}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* AI Recommendation Card */}
                <View style={styles.cardPrimary}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="robot-outline" size={24} color="#0c4a6e" />
                        <Text style={styles.cardTitle}>AI {t('recommendations')}</Text>
                    </View>
                    <WhyCard 
                        explanation={data.recommendation} 
                        sources={['et0', 'weather', 'soil']} 
                        confidence="high" 
                        score={95} 
                        lang={language} 
                    />
                    <View style={[styles.actionRow, { marginTop: 12 }]}>
                        <View style={styles.actionItem}>
                            <Text style={styles.actionLabel}>{t('water_needed')}</Text>
                            <Text style={styles.actionValue}>{data.water_needed_liters} {t('liters')}</Text>
                        </View>
                        <View style={styles.actionItem}>
                            <Text style={styles.actionLabel}>{t('best_time')}</Text>
                            <Text style={styles.actionValue}>{data.best_time}</Text>
                        </View>
                    </View>
                </View>

                {/* ET₀ Info Card */}
                <View style={styles.etCard}>
                    <View style={styles.etRow}>
                        <View style={styles.etItem}>
                            <Text style={styles.etLabel}>ET₀ Today</Text>
                            <Text style={styles.etValue}>{data.et0_today_mm} mm</Text>
                        </View>
                        <View style={styles.etItem}>
                            <Text style={styles.etLabel}>Crop ET</Text>
                            <Text style={styles.etValue}>{data.crop_et_today_mm} mm</Text>
                        </View>
                        <View style={styles.etItem}>
                            <Text style={styles.etLabel}>Method</Text>
                            <Text style={[styles.etValue, { fontSize: 11 }]}>Hargreaves</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.row}>
                    {/* Soil Moisture */}
                    <View style={[styles.card, { flex: 1, marginRight: 8, alignItems: 'center' }]}>
                         <Text style={styles.cardTitle}>{t('soil_moisture')}</Text>
                         
                         <View style={styles.moistureCircle}>
                             <View style={[styles.moistureFill, { height: `${data.moisture_level}%` as any }]} />
                             <Text style={styles.moistureText}>{data.moisture_level}%</Text>
                         </View>
                    </View>

                    {/* Additional Info */}
                    <View style={[styles.card, { flex: 1, marginLeft: 8, justifyContent: 'center' }]}>
                        <Text style={styles.cardTitle}>{t('weather_title')}</Text>
                        <Text style={styles.infoText}>{data.weather_condition}</Text>
                        <View style={{ marginVertical: 8 }} />
                        <Text style={styles.cardTitle}>{t('savings')}</Text>
                        <Text style={[styles.infoText, { color: '#0ea5e9', fontWeight: 'bold' }]}>
                            {data.savings_percentage}%
                        </Text>
                    </View>
                </View>

                {/* 7-Day Irrigation Schedule */}
                {data.schedule && data.schedule.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar-outline" size={20} color="#0f172a" />
                            <Text style={[styles.cardTitle, { marginLeft: 6 }]}>7-Day Schedule</Text>
                        </View>
                        {data.schedule.map((item, i) => (
                            <View key={i} style={styles.scheduleRow}>
                                <Text style={styles.scheduleDay}>{item.day}</Text>
                                <View style={styles.scheduleDetail}>
                                    <View style={styles.scheduleTag}>
                                        <Ionicons name="water" size={12} color="#0ea5e9" />
                                        <Text style={styles.scheduleTagText}>{item.irrigate_liters}L</Text>
                                    </View>
                                    {item.rain_probability > 30 && (
                                        <View style={[styles.scheduleTag, { backgroundColor: '#EFF6FF' }]}>
                                            <Ionicons name="rainy" size={12} color="#3B82F6" />
                                            <Text style={[styles.scheduleTagText, { color: '#3B82F6' }]}>
                                                {item.rain_probability}%
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.scheduleET}>ET₀ {item.et0_mm}mm</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Bar Chart */}
                <View style={styles.card}>
                    <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Usage Analytics ({t('liters')})</Text>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: '#94a3b8' }]} />
                        <Text style={styles.legendText}>Traditional</Text>
                        <View style={{ width: 16 }} />
                        <View style={[styles.legendDot, { backgroundColor: '#0ea5e9' }]} />
                        <Text style={styles.legendText}>AI Optimized</Text>
                    </View>
                    
                    <View style={styles.chartContainer}>
                        {data.historical_usage.map((histVal, i) => {
                            const aiVal = data.ai_optimized_usage[i];
                            const histHeight = (histVal / maxUsage) * chartHeight;
                            const aiHeight = (aiVal / maxUsage) * chartHeight;

                            return (
                                <View key={i} style={styles.barGroup}>
                                    <View style={styles.barsWrapper}>
                                        <View style={[styles.bar, { height: histHeight, backgroundColor: '#94a3b8' }]} />
                                        <View style={[styles.bar, { height: aiHeight, backgroundColor: '#0ea5e9' }]} />
                                    </View>
                                    <Text style={styles.barLabel}>{i + 1}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Crop Health Impact */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{t('crop_health')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Ionicons name="leaf" size={20} color="#16a34a" />
                        <Text style={[styles.infoText, { marginLeft: 8, flex: 1 }]}>{data.crop_health_impact}</Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAF9' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    backButton: { padding: 8, marginLeft: -8, width: 44 },
    headerTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
    scrollContent: { padding: 16 },

    // Crop Selector
    cropSelector: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
        borderWidth: 1, borderColor: '#E2E8F0', gap: 8,
    },
    cropSelectorText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0f172a' },
    cropDropdown: {
        backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, marginTop: -8,
        borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
    },
    cropOption: { paddingVertical: 12, paddingHorizontal: 16 },
    cropOptionActive: { backgroundColor: '#F0F9FF' },
    cropOptionText: { fontSize: 15, color: '#334155' },

    // ET Card
    etCard: {
        backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: '#FDE68A',
    },
    etRow: { flexDirection: 'row', justifyContent: 'space-around' },
    etItem: { alignItems: 'center' },
    etLabel: { fontSize: 11, color: '#92400E', fontWeight: '600' },
    etValue: { fontSize: 16, fontWeight: '800', color: '#78350F', marginTop: 2 },

    cardPrimary: {
        backgroundColor: '#e0f2fe', borderRadius: 20, padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: '#bae6fd',
    },
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
        shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginLeft: 6 },
    recText: { fontSize: 16, color: '#0369a1', lineHeight: 24, marginBottom: 16, fontWeight: '500' },
    actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#bae6fd', paddingTop: 16 },
    actionItem: { flex: 1 },
    actionLabel: { fontSize: 12, color: '#0284c7', textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
    actionValue: { fontSize: 18, fontWeight: '800', color: '#0c4a6e' },
    row: { flexDirection: 'row' },

    // Schedule
    scheduleRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    scheduleDay: { width: 60, fontSize: 14, fontWeight: '600', color: '#1E293B' },
    scheduleDetail: { flex: 1, flexDirection: 'row', gap: 8 },
    scheduleTag: {
        flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F9FF',
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    scheduleTagText: { fontSize: 12, fontWeight: '600', color: '#0EA5E9' },
    scheduleET: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
    
    /* Custom Gauge Styles */
    moistureCircle: {
        width: 100, height: 100, borderRadius: 50, borderWidth: 6, borderColor: '#dcfce7',
        alignItems: 'center', justifyContent: 'center', marginTop: 12,
        overflow: 'hidden', backgroundColor: '#f0fdf4'
    },
    moistureFill: {
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#86efac', opacity: 0.5
    },
    moistureText: { fontSize: 24, fontWeight: '900', color: '#16a34a' },
    
    infoText: { fontSize: 15, color: '#334155', marginTop: 4, lineHeight: 22 },
    retryBtn: { marginTop: 16, backgroundColor: '#0369a1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryText: { color: '#fff', fontWeight: 'bold' },
    
    /* Chart Styles */
    legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'center' },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { fontSize: 12, color: '#475569', fontWeight: '500' },
    
    chartContainer: {
        flexDirection: 'row', height: 190, alignItems: 'flex-end', justifyContent: 'space-between',
        paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
    },
    barGroup: { alignItems: 'center', width: 30 },
    barsWrapper: { flexDirection: 'row', alignItems: 'flex-end', height: 160 },
    bar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4, marginHorizontal: 2 },
    barLabel: { fontSize: 11, color: '#64748b', marginTop: 8, fontWeight: '600' }
});
