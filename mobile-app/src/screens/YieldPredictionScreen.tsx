import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../context/TranslationContext';
import { BACKEND_URL } from '../config';
import * as Location from 'expo-location';
import { WhyCard } from '../components/ExplainabilityComponents';

const { width: screenWidth } = Dimensions.get('window');

const STATES = [
    'Auto-Detect Location',
    'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const CROPS = [
    'Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Potato',
    'Soyabean', 'Groundnut', 'Bajra', 'Jowar', 'Gram', 'Moong',
    'Urad', 'Mustard', 'Barley', 'Banana', 'Onion', 'Turmeric',
];

interface PredictionResult {
    yield_per_hectare: number;
    total_production_tonnes: number;
    advisory: string;
    model_used: string;
    weather_snapshot: {
        temperature: number;
        humidity: number;
        precipitation_mm: number;
        sunshine_hours: number;
    };
    auto_fetched?: {
        state: string;
        soil_ph: number;
        season: string;
    };
}

export default function YieldPredictionScreen({ navigation }: any) {
    const { t, language } = useTranslation();
    const [selectedCrop, setSelectedCrop] = useState('Wheat');
    const [selectedState, setSelectedState] = useState('Auto-Detect Location');
    const [landArea, setLandArea] = useState('1.0');
    const [soilPh, setSoilPh] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [error, setError] = useState(false);
    const [showCropPicker, setShowCropPicker] = useState(false);
    const [showStatePicker, setShowStatePicker] = useState(false);

    const predict = async () => {
        setLoading(true);
        setError(false);
        setResult(null);

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
            } catch (e) { /* defaults */ }

            const body: any = {
                crop: selectedCrop,
                latitude: lat,
                longitude: lon,
                land_area_hectares: parseFloat(landArea) || 1.0,
                lang_code: language,
            };

            if (selectedState !== 'Auto-Detect Location') {
                body.state = selectedState;
            } else if (detectedState) {
                body.state = detectedState;
            }
            if (soilPh) {
                body.soil_ph = parseFloat(soilPh);
            }

            const response = await fetch(`${BACKEND_URL}/api/yield-prediction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setResult(data);
                } else {
                    setError(true);
                }
            } else {
                setError(true);
            }
        } catch (e) {
            console.error('Yield prediction error:', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('yield_prediction')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Crop Selector */}
                <Text style={styles.inputLabel}>Crop / फसल</Text>
                <TouchableOpacity
                    style={styles.selector}
                    onPress={() => { setShowCropPicker(!showCropPicker); setShowStatePicker(false); }}
                >
                    <MaterialCommunityIcons name="sprout" size={20} color="#16A34A" />
                    <Text style={styles.selectorText}>{selectedCrop}</Text>
                    <Ionicons name={showCropPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
                </TouchableOpacity>
                {showCropPicker && (
                    <View style={styles.pickerDropdown}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                            {CROPS.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.pickerItem, selectedCrop === c && styles.pickerItemActive]}
                                    onPress={() => { setSelectedCrop(c); setShowCropPicker(false); }}
                                >
                                    <Text style={[styles.pickerText, selectedCrop === c && styles.pickerTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* State Selector */}
                <Text style={styles.inputLabel}>State / राज्य (Optional)</Text>
                <TouchableOpacity
                    style={styles.selector}
                    onPress={() => { setShowStatePicker(!showStatePicker); setShowCropPicker(false); }}
                >
                    <Ionicons name={selectedState === 'Auto-Detect Location' ? "location-outline" : "location"} size={20} color="#3B82F6" />
                    <Text style={styles.selectorText}>{selectedState}</Text>
                    <Ionicons name={showStatePicker ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
                </TouchableOpacity>
                {showStatePicker && (
                    <View style={styles.pickerDropdown}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                            {STATES.map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.pickerItem, selectedState === s && styles.pickerItemActive]}
                                    onPress={() => { setSelectedState(s); setShowStatePicker(false); }}
                                >
                                    <Text style={[styles.pickerText, selectedState === s && styles.pickerTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Numeric Inputs */}
                <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                        <Text style={styles.inputLabel}>Land (Hectares)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={landArea}
                            onChangeText={setLandArea}
                            keyboardType="decimal-pad"
                            maxLength={6}
                            placeholder="1.0"
                        />
                    </View>
                    <View style={styles.inputHalf}>
                        <Text style={styles.inputLabel}>Soil pH</Text>
                        <TextInput
                            style={styles.textInput}
                            value={soilPh}
                            onChangeText={setSoilPh}
                            keyboardType="decimal-pad"
                            maxLength={4}
                            placeholder="7.0"
                        />
                    </View>
                </View>

                {/* Predict Button */}
                <TouchableOpacity
                    style={[styles.predictButton, loading && { opacity: 0.7 }]}
                    onPress={predict}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#16A34A', '#15803D']}
                        style={styles.predictGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="chart-line" size={22} color="#FFF" />
                                <Text style={styles.predictText}>Predict Yield</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Error State */}
                {error && (
                    <View style={styles.errorCard}>
                        <Ionicons name="warning-outline" size={24} color="#EF4444" />
                        <Text style={styles.errorText}>Prediction failed. Check your connection and try again.</Text>
                    </View>
                )}

                {/* Result */}
                {result && (
                    <View style={styles.resultSection}>
                        {/* Main Result Card */}
                        <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.resultCard}>
                            <View style={styles.resultHeader}>
                                <MaterialCommunityIcons name="chart-areaspline" size={24} color="#16A34A" />
                                <Text style={styles.resultTitle}>Prediction Result</Text>
                            </View>

                            <View style={styles.resultGrid}>
                                <View style={styles.resultItem}>
                                    <Text style={styles.resultLabel}>Yield / Hectare</Text>
                                    <Text style={styles.resultValueBig}>{result.yield_per_hectare}</Text>
                                    <Text style={styles.resultUnit}>tonnes/ha</Text>
                                </View>
                                <View style={styles.resultDivider} />
                                <View style={styles.resultItem}>
                                    <Text style={styles.resultLabel}>Total Production</Text>
                                    <Text style={styles.resultValueBig}>{result.total_production_tonnes}</Text>
                                    <Text style={styles.resultUnit}>tonnes</Text>
                                </View>
                            </View>
                        </LinearGradient>

                        {/* Weather Snapshot */}
                        <View style={styles.weatherCard}>
                            <Text style={styles.weatherTitle}>Weather Data Used</Text>
                            <View style={styles.weatherGrid}>
                                <View style={styles.weatherItem}>
                                    <Ionicons name="thermometer" size={18} color="#F97316" />
                                    <Text style={styles.weatherValue}>{result.weather_snapshot.temperature}°C</Text>
                                </View>
                                <View style={styles.weatherItem}>
                                    <Ionicons name="water" size={18} color="#3B82F6" />
                                    <Text style={styles.weatherValue}>{result.weather_snapshot.humidity}%</Text>
                                </View>
                                <View style={styles.weatherItem}>
                                    <Ionicons name="rainy" size={18} color="#6366F1" />
                                    <Text style={styles.weatherValue}>{result.weather_snapshot.precipitation_mm}mm</Text>
                                </View>
                                <View style={styles.weatherItem}>
                                    <Ionicons name="sunny" size={18} color="#EAB308" />
                                    <Text style={styles.weatherValue}>{result.weather_snapshot.sunshine_hours}h</Text>
                                </View>
                            </View>
                        </View>

                        {/* Auto-Fetched Context */}
                        {result.auto_fetched && (
                            <View style={[styles.weatherCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                                <Text style={[styles.weatherTitle, { color: '#475569' }]}>Auto-Detected Features</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                    <View style={styles.contextChip}>
                                        <Ionicons name="location" size={14} color="#64748B" />
                                        <Text style={styles.contextChipText}>{result.auto_fetched.state}</Text>
                                    </View>
                                    <View style={styles.contextChip}>
                                        <MaterialCommunityIcons name="sprout" size={14} color="#64748B" />
                                        <Text style={styles.contextChipText}>{result.auto_fetched.season}</Text>
                                    </View>
                                    <View style={styles.contextChip}>
                                        <Ionicons name="beaker" size={14} color="#64748B" />
                                        <Text style={styles.contextChipText}>pH {result.auto_fetched.soil_ph}</Text>
                                    </View>
                                    <View style={styles.contextChip}>
                                        <MaterialCommunityIcons name="brain" size={14} color="#64748B" />
                                        <Text style={styles.contextChipText}>{result.model_used}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Advisory */}
                        <View style={{ marginTop: 12 }}>
                            <WhyCard 
                                explanation={result.advisory} 
                                sources={result.model_used.includes('RandomForest') ? ['ml_model', 'weather', 'soil'] : ['agronomic', 'weather', 'soil']} 
                                confidence="high" 
                                score={88} 
                                lang={language} 
                            />
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAF9' },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    backButton: { padding: 8, marginLeft: -8, width: 44 },
    headerTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
    scrollContent: { padding: 16 },

    inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },

    selector: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#E2E8F0',
        gap: 10,
    },
    selectorText: { flex: 1, fontSize: 16, color: '#1E293B', fontWeight: '500' },

    pickerDropdown: {
        backgroundColor: '#FFF', borderRadius: 12, marginTop: 4, borderWidth: 1,
        borderColor: '#E2E8F0', overflow: 'hidden',
    },
    pickerItem: { paddingVertical: 12, paddingHorizontal: 16 },
    pickerItemActive: { backgroundColor: '#F0FDF4' },
    pickerText: { fontSize: 15, color: '#334155' },
    pickerTextActive: { color: '#16A34A', fontWeight: '600' },

    inputRow: { flexDirection: 'row', gap: 12 },
    inputHalf: { flex: 1 },
    textInput: {
        backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
        borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#1E293B',
    },

    predictButton: { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
    predictGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, gap: 8,
    },
    predictText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

    errorCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16,
        backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#FECACA',
    },
    errorText: { flex: 1, color: '#DC2626', fontSize: 14 },

    resultSection: { marginTop: 20 },
    resultCard: {
        borderRadius: 20, padding: 24, marginBottom: 12,
        borderWidth: 1, borderColor: '#BBF7D0',
    },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    resultTitle: { fontSize: 18, fontWeight: '700', color: '#166534' },
    resultGrid: { flexDirection: 'row', alignItems: 'center' },
    resultItem: { flex: 1, alignItems: 'center' },
    resultLabel: { fontSize: 12, color: '#16A34A', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    resultValueBig: { fontSize: 36, fontWeight: '900', color: '#15803D' },
    resultUnit: { fontSize: 13, color: '#4ADE80', fontWeight: '600', marginTop: 2 },
    resultDivider: { width: 1, height: 60, backgroundColor: '#BBF7D0' },

    weatherCard: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    weatherTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
    weatherGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    weatherItem: { alignItems: 'center', gap: 4 },
    weatherValue: { fontSize: 14, fontWeight: '600', color: '#475569' },

    contextChip: {
        backgroundColor: '#FFFFFF', paddingVertical: 6, paddingHorizontal: 12,
        borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
        flexDirection: 'row', alignItems: 'center', gap: 6
    },
    contextChipText: { fontSize: 13, color: '#334155', fontWeight: '600' },

    advisoryCard: {
        backgroundColor: '#F5F3FF', borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#E9D5FF',
    },
    advisoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    advisoryTitle: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },
    advisoryText: { fontSize: 15, color: '#4C1D95', lineHeight: 22 },
});
