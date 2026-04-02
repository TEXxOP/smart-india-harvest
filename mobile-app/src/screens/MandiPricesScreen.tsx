import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../context/TranslationContext';
import { BACKEND_URL } from '../config';
import * as Location from 'expo-location';

interface MandiPrice {
    crop: string;
    msp: number | null;
    market_price: number;
    price_trend: 'up' | 'down' | 'stable';
    trend_pct: number;
    mandi: string;
}

interface PriceData {
    state: string;
    date: string;
    season: string;
    prices: MandiPrice[];
}

export default function MandiPricesScreen({ navigation }: any) {
    const { t, language } = useTranslation();
    const [data, setData] = useState<PriceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetchPrices();
    }, []);

    const fetchPrices = async () => {
        setLoading(true);
        setError(false);
        try {
            let lat = 28.6, lon = 77.2;
            let detectedState = '';
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getLastKnownPositionAsync();
                    if (loc) {
                        lat = loc.coords.latitude;
                        lon = loc.coords.longitude;
                        
                        const reverseArr = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
                        if (reverseArr.length > 0) {
                            detectedState = reverseArr[0].region || '';
                        }
                    }
                }
            } catch (e) { /* use defaults */ }

            let url = `${BACKEND_URL}/api/mandi-prices?latitude=${lat}&longitude=${lon}&lang_code=${language}`;
            if (detectedState) {
                url += `&state=${encodeURIComponent(detectedState)}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.prices) {
                    setData(result);
                } else {
                    setError(true);
                }
            } else {
                setError(true);
            }
        } catch (e) {
            console.error('Mandi prices fetch error:', e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPrices();
    };

    const renderTrendIcon = (trend: string) => {
        if (trend === 'up') return <Ionicons name="trending-up" size={16} color="#16A34A" />;
        if (trend === 'down') return <Ionicons name="trending-down" size={16} color="#DC2626" />;
        return <Ionicons name="remove" size={16} color="#64748B" />;
    };

    const getTrendColor = (trend: string) => {
        if (trend === 'up') return '#16A34A';
        if (trend === 'down') return '#DC2626';
        return '#64748B';
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {t('mandi_prices') === 'mandi_prices' 
                        ? (language === 'hi' ? 'मंडी भाव' : language === 'pa' ? 'ਮੰਡੀ ਦੇ ਭਾਅ' : 'Market Rates') 
                        : t('mandi_prices')}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#16A34A" />
                    <Text style={styles.loadingText}>Fetching live market prices...</Text>
                </View>
            ) : error || !data ? (
                <View style={styles.centerContainer}>
                    <MaterialCommunityIcons name="cloud-off-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.errorText}>Unable to load prices right now.</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchPrices}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                >
                    {/* Context Card */}
                    <LinearGradient colors={['#16A34A', '#15803D']} style={styles.contextCard}>
                        <View style={styles.contextHeader}>
                            <MaterialCommunityIcons name="map-marker-radius" size={24} color="#FFF" />
                            <Text style={styles.contextTitle}>{data.state} APMC Markets</Text>
                        </View>
                        <View style={styles.contextInfoRow}>
                            <View style={styles.contextInfoItem}>
                                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.contextInfoText}>{data.date}</Text>
                            </View>
                            <View style={styles.contextInfoItem}>
                                <Ionicons name="leaf-outline" size={16} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.contextInfoText}>{data.season}</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    <Text style={styles.sectionTitle}>Real-time Crop Prices (₹ / Quintal)</Text>

                    {data.prices.map((item, index) => (
                        <View key={index} style={styles.priceCard}>
                            <View style={styles.priceHeader}>
                                <Text style={styles.cropName}>{item.crop}</Text>
                                <View style={[styles.trendBadge, { backgroundColor: getTrendColor(item.price_trend) + '15' }]}>
                                    {renderTrendIcon(item.price_trend)}
                                    <Text style={[styles.trendText, { color: getTrendColor(item.price_trend) }]}>
                                        {Math.abs(item.trend_pct)}%
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.priceGrid}>
                                <View style={styles.priceCol}>
                                    <Text style={styles.priceLabel}>Current Market Price</Text>
                                    <Text style={styles.marketPrice}>₹{item.market_price}</Text>
                                </View>
                                {item.msp !== null && (
                                    <View style={styles.priceColRight}>
                                        <Text style={styles.priceLabel}>Govt. MSP Rates</Text>
                                        <Text style={styles.mspPrice}>₹{item.msp}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.mandiFooter}>
                                <Ionicons name="location" size={12} color="#64748B" />
                                <Text style={styles.mandiLocation}>Nearest Mandi in {item.mandi}</Text>
                            </View>
                        </View>
                    ))}
                    
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    backButton: { padding: 8, marginLeft: -8, width: 44 },
    headerTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
    
    loadingText: { marginTop: 16, color: '#64748B', fontSize: 15 },
    errorText: { marginTop: 16, color: '#64748B', fontSize: 15 },
    retryBtn: { marginTop: 20, backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20 },
    retryBtnText: { color: '#FFF', fontWeight: 'bold' },

    scrollContent: { padding: 16 },

    contextCard: {
        borderRadius: 16, padding: 20, marginBottom: 20, elevation: 3,
        shadowColor: '#16A34A', shadowOpacity: 0.3, shadowRadius: 8,
    },
    contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    contextTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
    contextInfoRow: { flexDirection: 'row', gap: 16 },
    contextInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    contextInfoText: { color: '#FFF', fontSize: 13, fontWeight: '500' },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 12, marginLeft: 4 },

    priceCard: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#E2E8F0', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    },
    priceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cropName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    trendText: { fontSize: 13, fontWeight: 'bold' },

    priceGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    priceCol: { flex: 1 },
    priceColRight: { flex: 1, alignItems: 'flex-end' },
    priceLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    marketPrice: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
    mspPrice: { fontSize: 20, fontWeight: '700', color: '#44403C' },

    mandiFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, marginTop: 4 },
    mandiLocation: { fontSize: 12, color: '#64748B' },
});
