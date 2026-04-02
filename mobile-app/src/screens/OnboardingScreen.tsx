import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Animated,
    Dimensions,
    Alert,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

type RootStackParamList = { Onboarding: undefined; Home: undefined };
type NavProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;
interface Props { navigation: NavProp; }

const { width } = Dimensions.get('window');
const STEPS = 4;

// ── Data Options ──
const SOIL_TYPES = [
    { id: 'Loamy', name: 'दोमट (Loamy)', icon: 'sprout', color: '#8D6E63' },
    { id: 'Clay', name: 'चिकनी (Clay)', icon: 'water', color: '#795548' },
    { id: 'Sandy', name: 'बलुई (Sandy)', icon: 'grain', color: '#D7CCC8' },
    { id: 'Black', name: 'काली (Black)', icon: 'cloud', color: '#3E2723' },
    { id: 'Red', name: 'लाल (Red)', icon: 'fire', color: '#FF7043' },
    { id: 'Silt', name: 'गाद (Silt)', icon: 'waves', color: '#BCAAA4' },
];

const PREV_CROPS = [
    { id: 'Wheat', name: 'गेहूं (Wheat)', icon: 'barley' },
    { id: 'Rice', name: 'धान (Rice)', icon: 'grass' },
    { id: 'Corn', name: 'मक्का (Corn)', icon: 'corn' },
    { id: 'Potato', name: 'आलू (Potato)', icon: 'food-apple' }, // material icon
    { id: 'Sugarcane', name: 'गन्ना (Sugarcane)', icon: 'candy-cane' },
    { id: 'Cotton', name: 'कपास (Cotton)', icon: 'tshirt-crew' },
    { id: 'Mustard', name: 'सरसों (Mustard)', icon: 'flower' },
    { id: 'Other', name: 'अन्य (Other)', icon: 'leaf' },
];

export default function OnboardingScreen({ navigation }: Props) {
    const [step, setStep] = useState(1);
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Form State
    const [landSize, setLandSize] = useState('');
    const [landUnit, setLandUnit] = useState<'Beegha' | 'Acre' | 'Hectare'>('Beegha');
    const [soilType, setSoilType] = useState<string | null>(null);
    const [prevCrop, setPrevCrop] = useState<string | null>(null);
    const [status, setStatus] = useState<'Empty' | 'Growing' | null>(null);
    const [loading, setLoading] = useState(false);

    // Animation helper
    const nextStep = () => {
        if (step < STEPS) {
            Animated.timing(slideAnim, {
                toValue: -width,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                slideAnim.setValue(0);
                setStep(s => s + 1);
            });
        } else {
            finishOnboarding();
        }
    };

    const prevStep = () => {
        if (step > 1) {
            setStep(s => s - 1);
        }
    };

    const finishOnboarding = async () => {
        setLoading(true);
        try {
            const profile = {
                user_id: 'user_123', // Replace with real ID later
                land_size: parseFloat(landSize),
                land_unit: landUnit,
                soil_type: soilType,
                previous_crop: prevCrop,
                current_status: status,
                completed_at: new Date().toISOString(),
            };

            // Save locally
            await AsyncStorage.setItem('farm_profile', JSON.stringify(profile));
            await AsyncStorage.setItem('has_onboarded', 'true');

            // Sync to backend (fire & forget for now, or await)
            try {
                const { BACKEND_URL } = await import('../config');
                await fetch(`${BACKEND_URL}/api/onboarding`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profile),
                });
            } catch (err) {
                console.log('Backend sync failed silently:', err);
            }

            // Reset nav to Home
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                })
            );
        } catch (error) {
            Alert.alert('त्रुटि', 'डेटा सहेजने में विफल।');
        } finally {
            setLoading(false);
        }
    };

    // Validation
    const canIsProceed = () => {
        if (step === 1) return landSize.length > 0 && !isNaN(parseFloat(landSize));
        if (step === 2) return !!soilType;
        if (step === 3) return !!prevCrop;
        if (step === 4) return !!status;
        return false;
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F0FDF4', '#FFF']} style={StyleSheet.absoluteFill} />

            {/* Header / Progress */}
            <View style={styles.header}>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${(step / STEPS) * 100}%` }]} />
                </View>
                <Text style={styles.stepIndicator}>चरण {step} / {STEPS}</Text>
                <Text style={styles.title}>
                    {step === 1 && "खेत का विवरण"}
                    {step === 2 && "मिट्टी का प्रकार"}
                    {step === 3 && "पिछली फसल"}
                    {step === 4 && "वर्तमान स्थिति"}
                </Text>
            </View>

            {/* Content Area */}
            <View style={styles.content}>

                {/* Step 1: Land Details */}
                {step === 1 && (
                    <Animated.View style={styles.stepContainer}>
                        <MaterialCommunityIcons name="map-marker-radius" size={80} color="#4CAF50" style={styles.iconBig} />
                        <Text style={styles.question}>आपके खेत का आकार क्या है?</Text>

                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                keyboardType="numeric"
                                value={landSize}
                                maxLength={6}
                                onChangeText={setLandSize}
                                placeholderTextColor="#94A3B8"
                            />
                            <View style={styles.unitContainer}>
                                {['Beegha', 'Acre', 'Hectare'].map((u) => (
                                    <TouchableOpacity
                                        key={u}
                                        style={[styles.unitBtn, landUnit === u && styles.unitBtnActive]}
                                        onPress={() => setLandUnit(u as any)}
                                    >
                                        <Text style={[styles.unitText, landUnit === u && styles.unitTextActive]}>
                                            {u === 'Beegha' ? 'बीघा' : u === 'Acre' ? 'एकड़' : 'हेक्टेयर'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Step 2: Soil Type */}
                {step === 2 && (
                    <Animated.View style={styles.stepContainer}>
                        <Text style={styles.question}>आपकी मिट्टी कैसी है?</Text>
                        <View style={styles.grid}>
                            {SOIL_TYPES.map((s) => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[styles.card, soilType === s.id && styles.cardActive]}
                                    onPress={() => setSoilType(s.id)}
                                >
                                    <MaterialCommunityIcons name={s.icon as any} size={32} color={soilType === s.id ? '#FFF' : s.color} />
                                    <Text style={[styles.cardText, soilType === s.id && styles.cardTextActive]}>{s.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Step 3: Previous Crop */}
                {step === 3 && (
                    <Animated.View style={styles.stepContainer}>
                        <Text style={styles.question}>पिछली बार क्या उगाया था?</Text>
                        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.grid}>
                            {PREV_CROPS.map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[styles.card, prevCrop === c.id && styles.cardActive]}
                                    onPress={() => setPrevCrop(c.id)}
                                >
                                    <MaterialCommunityIcons name={c.icon as any} size={32} color={prevCrop === c.id ? '#FFF' : '#FF9800'} />
                                    <Text style={[styles.cardText, prevCrop === c.id && styles.cardTextActive]}>{c.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* Step 4: Current Status */}
                {step === 4 && (
                    <Animated.View style={styles.stepContainer}>
                        <Text style={styles.question}>अभी खेत की स्थिति क्या है?</Text>

                        <TouchableOpacity
                            style={[styles.bigCard, status === 'Empty' && styles.bigCardActive]}
                            onPress={() => setStatus('Empty')}
                        >
                            <MaterialCommunityIcons name="land-fields" size={48} color={status === 'Empty' ? '#FFF' : '#795548'} />
                            <View>
                                <Text style={[styles.bigCardTitle, status === 'Empty' && styles.textWhite]}>खाली खेत</Text>
                                <Text style={[styles.bigCardSub, status === 'Empty' && styles.textWhiteOp]}>नई फसल के लिए तैयार</Text>
                            </View>
                            {status === 'Empty' && <Ionicons name="checkmark-circle" size={24} color="#FFF" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.bigCard, status === 'Growing' && styles.bigCardActive]}
                            onPress={() => setStatus('Growing')}
                        >
                            <MaterialCommunityIcons name="sprout" size={48} color={status === 'Growing' ? '#FFF' : '#4CAF50'} />
                            <View>
                                <Text style={[styles.bigCardTitle, status === 'Growing' && styles.textWhite]}>फसल खड़ी है</Text>
                                <Text style={[styles.bigCardSub, status === 'Growing' && styles.textWhiteOp]}>अभी कटाई बाकी है</Text>
                            </View>
                            {status === 'Growing' && <Ionicons name="checkmark-circle" size={24} color="#FFF" />}
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                {step > 1 && (
                    <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
                        <Ionicons name="arrow-back" size={24} color="#64748B" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.nextBtn, !canIsProceed() && styles.disabledBtn]}
                    onPress={nextStep}
                    disabled={!canIsProceed()}
                >
                    <LinearGradient
                        colors={canIsProceed() ? ['#16A34A', '#15803D'] : ['#E2E8F0', '#CBD5E1']}
                        style={styles.nextGradient}
                    >
                        <Text style={[styles.nextText, !canIsProceed() && { color: '#94A3B8' }]}>
                            {step === STEPS ? (loading ? 'सहेज रहे हैं...' : 'समाप्त करें') : 'आगे बढ़ें'}
                        </Text>
                        {!loading && <Ionicons name="arrow-forward" size={20} color={canIsProceed() ? '#FFF' : '#94A3B8'} />}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50 },
    header: { paddingHorizontal: 24, marginBottom: 20 },
    progressContainer: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginBottom: 12, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#16A34A', borderRadius: 3 },
    stepIndicator: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 4 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },

    content: { flex: 1, paddingHorizontal: 24 },
    stepContainer: { flex: 1, alignItems: 'center' },
    iconBig: { marginBottom: 24 },
    question: { fontSize: 18, color: '#334155', textAlign: 'center', marginBottom: 32, lineHeight: 28 },

    // Inputs
    inputRow: { width: '100%', alignItems: 'center', gap: 16 },
    input: {
        width: '100%', height: 64, borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 16,
        fontSize: 32, textAlign: 'center', color: '#1E293B', fontWeight: 'bold', backgroundColor: '#FFF',
    },
    unitContainer: { flexDirection: 'row', gap: 8 },
    unitBtn: {
        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFF',
    },
    unitBtnActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
    unitText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
    unitTextActive: { color: '#FFF' },

    // Grid (Soil/Crops)
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingBottom: 20 },
    card: {
        width: (width - 60) / 2, padding: 16, borderRadius: 16, backgroundColor: '#FFF',
        alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    cardActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
    cardText: { fontSize: 14, fontWeight: '600', color: '#475569', textAlign: 'center' },
    cardTextActive: { color: '#FFF' },

    // Big Cards (Status)
    bigCard: {
        width: '100%', flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16,
        backgroundColor: '#FFF', borderRadius: 20, marginBottom: 16,
        borderWidth: 1, borderColor: '#E2E8F0',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    bigCardActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
    bigCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    bigCardSub: { fontSize: 14, color: '#64748B' },
    textWhite: { color: '#FFF' },
    textWhiteOp: { color: 'rgba(255,255,255,0.8)' },

    // Footer
    footer: {
        padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16,
        borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FFF',
    },
    backBtn: {
        width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F5F9',
        alignItems: 'center', justifyContent: 'center',
    },
    nextBtn: { flex: 1, height: 56, borderRadius: 28, overflow: 'hidden' },
    disabledBtn: { opacity: 0.7 },
    nextGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    nextText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
});
