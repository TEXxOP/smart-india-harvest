import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '../context/TranslationContext';
import { BACKEND_URL } from '../config';
import * as Location from 'expo-location';
import { ConfidenceBadge, WhyCard, computeConfidenceLevel } from '../components/ExplainabilityComponents';

type RootStackParamList = { Onboarding: undefined; Home: undefined };
type NavProp = StackNavigationProp<RootStackParamList, 'Home'>;
interface Props { navigation: NavProp; }

interface FarmProfile {
    land_size: number;
    land_unit: string;
    soil_type: string;
    previous_crop: string;
    current_status: string;
}

interface CropRec {
    crop: string;
    confidence: number;
    reason: string;
    market_demand?: string;
    estimated_price_per_quintal?: number;
    season_match?: string;
}

export default function FasaleinScreen({ navigation }: Props) {
    const { t, language } = useTranslation();
    const [profile, setProfile] = useState<FarmProfile | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [recommendations, setRecommendations] = useState<CropRec[]>([]);
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await AsyncStorage.getItem('farm_profile');
            if (data) {
                const p = JSON.parse(data);
                setProfile(p);
                fetchRecommendations(p);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchRecommendations = async (p: FarmProfile) => {
        setLoading(true);
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

            const body: any = {
                soil_type: p.soil_type || 'Alluvial',
                previous_crop: p.previous_crop || null,
                latitude: lat,
                longitude: lon,
                lang_code: language,
            };

            if (detectedState) {
                body.state = detectedState;
            }

            const response = await fetch(`${BACKEND_URL}/api/crop-recommendation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.recommendations) {
                    setRecommendations(result.recommendations);
                    setContext(result.context || null);
                }
            }
        } catch (e) {
            console.error('Recommendation failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const demandColor = (d?: string) => {
        if (d === 'High') return '#16A34A';
        if (d === 'Medium') return '#F59E0B';
        return '#94A3B8';
    };

    const seasonColor = (s?: string) => {
        if (s === 'Perfect') return '#16A34A';
        if (s === 'Good') return '#3B82F6';
        return '#F59E0B';
    };

    if (!profile) {
        return (
            <View style={styles.centerContainer}>
                <MaterialCommunityIcons name="sprout-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyText}>{t('no_farm_details')}</Text>
                <TouchableOpacity style={styles.setupBtn} onPress={() => navigation.navigate('Onboarding')}>
                    <Text style={styles.setupBtnText}>{t('setup_farm')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
            {/* Header Card */}
            <LinearGradient colors={['#16A34A', '#15803D']} style={styles.headerCard}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>{t('my_farm')}</Text>
                        <Text style={styles.headerSub}>
                            {profile.land_size} {profile.land_unit} • {profile.soil_type} {t('soil_type')}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
                        <MaterialCommunityIcons name="pencil-circle" size={32} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>
                <View style={styles.statusBadge}>
                    <MaterialCommunityIcons
                        name={profile.current_status === 'Growing' ? 'sprout' : 'land-fields'}
                        size={16} color="#166534"
                    />
                    <Text style={styles.statusText}>
                        {profile.current_status === 'Growing' ? t('growing') : t('empty_field')}
                    </Text>
                </View>
            </LinearGradient>

            {/* Context Card — auto-detected info */}
            {context && (
                <View style={styles.contextCard}>
                    <View style={styles.contextHeader}>
                        <Ionicons name="location" size={16} color="#7C3AED" />
                        <Text style={styles.contextTitle}>Auto-Detected Context</Text>
                    </View>
                    <View style={styles.contextGrid}>
                        <View style={styles.contextChip}>
                            <Ionicons name="location" size={14} color="#7C3AED" />
                            <Text style={styles.contextLabel}>{context.state}</Text>
                        </View>
                        <View style={styles.contextChip}>
                            <MaterialCommunityIcons name="sprout" size={14} color="#7C3AED" />
                            <Text style={styles.contextLabel}>{context.season}</Text>
                        </View>
                        <View style={styles.contextChip}>
                            <Ionicons name="thermometer" size={14} color="#7C3AED" />
                            <Text style={styles.contextLabel}>{context.temperature}°C</Text>
                        </View>
                        <View style={styles.contextChip}>
                            <Ionicons name="water" size={14} color="#7C3AED" />
                            <Text style={styles.contextLabel}>{context.rainfall}mm</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Current Crop */}
            {profile.current_status === 'Growing' && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('current_crop')}</Text>
                    <View style={styles.cropCard}>
                        <View style={styles.cropIconBg}>
                            <MaterialCommunityIcons name="barley" size={32} color="#D97706" />
                        </View>
                        <View style={styles.cropInfo}>
                            <Text style={styles.cropName}>{profile.previous_crop || 'Unknown'}</Text>
                            <Text style={styles.cropStage}>{t('maturity_stage')}</Text>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: '80%' }]} />
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* Recommendations */}
            <View style={styles.section}>
                <View style={styles.recSectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>{t('recommendations')}</Text>
                        <Text style={styles.sectionSub}>AI-powered • Region-specific</Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color="#16A34A" />}
                </View>

                {loading && recommendations.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#16A34A" />
                        <Text style={styles.loadingText}>Analyzing your farm context...</Text>
                    </View>
                ) : (
                    recommendations.map((rec, index) => (
                        <View key={index} style={styles.recCard}>
                            <View style={styles.recHeader}>
                                <View style={styles.recNameRow}>
                                    <MaterialCommunityIcons name="leaf" size={18} color="#16A34A" />
                                    <Text style={styles.recName}>{rec.crop}</Text>
                                </View>
                                <ConfidenceBadge 
                                    level={computeConfidenceLevel(rec.confidence)} 
                                    score={rec.confidence} 
                                    lang={language} 
                                    compact 
                                />
                            </View>

                            <WhyCard 
                                explanation={rec.reason} 
                                sources={['soil', 'weather', 'ml_model']} 
                                lang={language} 
                            />

                            {/* Tags row */}
                            <View style={[styles.tagsRow, { marginTop: 12 }]}>
                                {rec.market_demand && (
                                    <View style={[styles.tag, { borderColor: demandColor(rec.market_demand) }]}>
                                        <Ionicons name="trending-up" size={12} color={demandColor(rec.market_demand)} />
                                        <Text style={[styles.tagText, { color: demandColor(rec.market_demand) }]}>
                                            {rec.market_demand}
                                        </Text>
                                    </View>
                                )}
                                {rec.season_match && (
                                    <View style={[styles.tag, { borderColor: seasonColor(rec.season_match) }]}>
                                        <MaterialCommunityIcons name="leaf" size={12} color={seasonColor(rec.season_match)} />
                                        <Text style={[styles.tagText, { color: seasonColor(rec.season_match) }]}>
                                            {rec.season_match}
                                        </Text>
                                    </View>
                                )}
                                {rec.estimated_price_per_quintal && (
                                    <View style={[styles.tag, { borderColor: '#6366F1' }]}>
                                        <Ionicons name="pricetag" size={12} color="#6366F1" />
                                        <Text style={[styles.tagText, { color: '#6366F1' }]}>
                                            ₹{rec.estimated_price_per_quintal}/q
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </View>

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' },
    emptyText: { fontSize: 16, color: '#64748B', marginTop: 16, textAlign: 'center' },
    setupBtn: { marginTop: 24, backgroundColor: '#16A34A', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
    setupBtnText: { color: '#FFF', fontWeight: 'bold' },

    headerCard: { margin: 16, padding: 24, borderRadius: 24, elevation: 4, shadowColor: '#16A34A', shadowOpacity: 0.3, shadowRadius: 8 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
    headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        backgroundColor: '#DCFCE7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, marginTop: 16, gap: 6,
    },
    statusText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },

    // Context card
    contextCard: {
        marginHorizontal: 16, marginBottom: 16, padding: 14, backgroundColor: '#F5F3FF',
        borderRadius: 16, borderWidth: 1, borderColor: '#E9D5FF',
    },
    contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    contextTitle: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
    contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    contextChip: {
        backgroundColor: '#FFF', paddingVertical: 5, paddingHorizontal: 10,
        borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    contextLabel: { fontSize: 13, color: '#4C1D95', fontWeight: '600' },

    section: { paddingHorizontal: 16, marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    sectionSub: { fontSize: 13, color: '#64748B', marginBottom: 16 },
    recSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },

    loadingContainer: { alignItems: 'center', paddingVertical: 40 },
    loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },

    cropCard: {
        flexDirection: 'row', padding: 16, backgroundColor: '#FFF', borderRadius: 16,
        alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1,
    },
    cropIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
    cropInfo: { flex: 1 },
    cropName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    cropStage: { fontSize: 13, color: '#F59E0B', fontWeight: '600', marginBottom: 8 },
    progressBarBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, width: '100%' },
    progressBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },

    recCard: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#E2E8F0', elevation: 1,
    },
    recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    recNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    recName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    matchBadge: { backgroundColor: '#DCFCE7', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
    matchText: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
    confidenceBarBg: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
    confidenceBarFill: { height: '100%', borderRadius: 2 },
    recReason: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 12 },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: {
        borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    tagText: { fontSize: 12, fontWeight: '600' },
});
