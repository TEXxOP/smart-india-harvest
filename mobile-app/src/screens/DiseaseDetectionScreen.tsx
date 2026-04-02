import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';

import { detectDisease, getDiseaseInfo, DiseaseResult } from '../services/diseaseService';
import { useTranslation } from '../context/TranslationContext';
import { speakText, stopSpeaking } from '../services/voiceService';
import OfflineBanner from '../components/OfflineBanner';

type RootStackParamList = { Home: undefined; DiseaseDetection: undefined };
type NavProp = StackNavigationProp<RootStackParamList, 'DiseaseDetection'>;
interface Props { navigation: NavProp; }

export default function DiseaseDetectionScreen({ navigation }: Props) {
    const { t, language: langCode } = useTranslation();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [result, setResult] = useState<DiseaseResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [modelLoading, setModelLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        return () => stopSpeaking();
    }, []);

    const toggleSpeak = () => {
        if (!result) return;
        const diseaseInfoLocal = getDiseaseInfo(result.label, langCode as any);

        if (isSpeaking) {
            stopSpeaking();
            setIsSpeaking(false);
        } else {
            stopSpeaking();
            setIsSpeaking(true);
            const textToSpeak = `${diseaseInfoLocal.name}. ${t('description')}: ${diseaseInfoLocal.description}. ${t('remedy')}: ${diseaseInfoLocal.remedy}`;
            speakText(textToSpeak, langCode as string).finally(() => setIsSpeaking(false));
        }
    };

    const pickImage = async (useCamera: boolean) => {
        try {
            let pickerResult;
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('अनुमति आवश्यक', 'कैमरा उपयोग करने के लिए अनुमति दें।');
                    return;
                }
                pickerResult = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    quality: 0.8,
                    allowsEditing: true,
                    aspect: [1, 1],
                });
            } else {
                pickerResult = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.8,
                    allowsEditing: true,
                    aspect: [1, 1],
                });
            }

            if (!pickerResult.canceled && pickerResult.assets[0]) {
                const uri = pickerResult.assets[0].uri;
                setImageUri(uri);
                setResult(null);
                analyzeImage(uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
        }
    };

    const analyzeImage = async (uri: string) => {
        setLoading(true);
        setModelLoading(false);

        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const detection = await detectDisease(uri);
                setResult(detection);
                setLoading(false);
                return;
            } catch (error: any) {
                if (error.message === 'OFFLINE_QUEUED') {
                    setLoading(false);
                    const msgs = {
                        en: { title: 'Saved for Later', body: 'Image saved! Analysis will run automatically when internet is available.' },
                        hi: { title: 'बाद के लिए सहेजा गया', body: 'फोटो सहेजी गई! इंटरनेट उपलब्ध होने पर विश्लेषण स्वचालित रूप से चलेगा।' },
                        pa: { title: 'ਬਾਅਦ ਲਈ ਸੰਭਾਲਿਆ', body: 'ਫੋਟੋ ਸੰਭਾਲੀ ਗਈ! ਇੰਟਰਨੈੱਟ ਉਪਲਬਧ ਹੋਣ ਤੇ ਵਿਸ਼ਲੇਸ਼ਣ ਆਪਣੇ ਆਪ ਚੱਲੇਗਾ।' },
                    };
                    const msg = msgs[langCode as 'en' | 'hi' | 'pa'] || msgs.en;
                    Alert.alert(msg.title, msg.body);
                    return;
                }
                if (error.message === 'MODEL_LOADING' && attempt < maxRetries - 1) {
                    setModelLoading(true);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    continue;
                }
                setLoading(false);
                setModelLoading(false);
                Alert.alert('त्रुटि', 'रोग पहचान में विफल। कृपया पुनः प्रयास करें।');
                return;
            }
        }
        setLoading(false);
    };

    const diseaseInfo = result ? getDiseaseInfo(result.label, langCode as any) : null;
    const isHealthy = result?.label.toLowerCase().includes('healthy');

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <OfflineBanner lang={langCode as any} />

            {/* Header */}
            <LinearGradient colors={['#7B1FA2', '#9C27B0', '#BA68C8']} style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <MaterialCommunityIcons name="leaf-circle" size={28} color="#FFF" />
                    <Text style={styles.headerTitle}>{t('disease_detection')}</Text>
                </View>
                <View style={{ width: 38 }} />
            </LinearGradient>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Image preview or placeholder */}
                {!imageUri ? (
                    <View style={styles.placeholder}>
                        <View style={styles.placeholderIcon}>
                            <MaterialCommunityIcons name="leaf-circle-outline" size={64} color="#BA68C8" />
                        </View>
                        <Text style={styles.placeholderTitle}>फसल की पत्ती की फोटो लें</Text>
                        <Text style={styles.placeholderSubtitle}>
                            AI आपकी फसल में रोग की पहचान करेगा{'\n'}और उपचार बताएगा
                        </Text>
                    </View>
                ) : (
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                        {loading && (
                            <View style={styles.imageOverlay}>
                                <ActivityIndicator size="large" color="#FFF" />
                                <Text style={styles.overlayText}>
                                    {modelLoading ? t('loading') : t('analyze')}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Result card */}
                {result && diseaseInfo && (
                    <View style={[styles.resultCard, isHealthy ? styles.healthyCard : styles.diseaseCard]}>
                        <View style={styles.resultHeader}>
                            <View style={[styles.resultIconCircle, { backgroundColor: isHealthy ? '#E8F5E9' : '#FCE4EC' }]}>
                                <MaterialCommunityIcons
                                    name={isHealthy ? 'check-circle' : 'alert-circle'}
                                    size={28}
                                    color={isHealthy ? '#4CAF50' : '#E53935'}
                                />
                            </View>
                            <View style={styles.resultHeaderText}>
                                <Text style={styles.resultTitle}>{diseaseInfo.name}</Text>
                                <View style={styles.confidenceBadge}>
                                    <Text style={styles.confidenceText}>
                                        {Math.round(result.confidence * 100)}% {t('confidence')}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={toggleSpeak} style={{ padding: 8, marginLeft: 8 }} hitSlop={15}>
                                <Ionicons 
                                    name={isSpeaking ? "volume-high" : "volume-medium-outline"} 
                                    size={28} 
                                    color={isSpeaking ? "#16A34A" : "#64748B"} 
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.resultSection}>
                            <View style={styles.sectionIcon}>
                                <Ionicons name="information-circle" size={18} color="#7B1FA2" />
                            </View>
                            <View style={styles.sectionContent}>
                                <Text style={styles.sectionLabel}>{t('description')}</Text>
                                <Text style={styles.sectionText}>{diseaseInfo.description}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.resultSection}>
                            <View style={styles.sectionIcon}>
                                <MaterialCommunityIcons name="medical-bag" size={18} color="#2E7D32" />
                            </View>
                            <View style={styles.sectionContent}>
                                <Text style={styles.sectionLabel}>{t('remedy')}</Text>
                                <Text style={styles.sectionText}>{diseaseInfo.remedy}</Text>
                            </View>
                        </View>

                        {/* Top predictions */}
                        {result.allPredictions.length > 1 && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.otherLabel}>अन्य संभावित रोग:</Text>
                                {result.allPredictions.slice(1, 4).map((pred, i) => {
                                    const info = getDiseaseInfo(pred.label, langCode as any);
                                    return (
                                        <View key={i} style={styles.otherPred}>
                                            <Text style={styles.otherName}>{info.name}</Text>
                                            <View style={styles.otherBar}>
                                                <View style={[styles.otherBarFill, { width: `${Math.round(pred.score * 100)}%` }]} />
                                            </View>
                                            <Text style={styles.otherScore}>{Math.round(pred.score * 100)}%</Text>
                                        </View>
                                    );
                                })}
                            </>
                        )}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom action buttons */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => pickImage(true)}
                    activeOpacity={0.85}
                >
                    <LinearGradient colors={['#7B1FA2', '#9C27B0']} style={styles.actionGradient}>
                        <Ionicons name="camera" size={24} color="#FFF" />
                        <Text style={styles.actionText}>{t('camera')}</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => pickImage(false)}
                    activeOpacity={0.85}
                >
                    <View style={styles.actionOutline}>
                        <Ionicons name="images" size={24} color="#7B1FA2" />
                        <Text style={[styles.actionText, { color: '#7B1FA2' }]}>{t('gallery')}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F3F7' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 44, paddingBottom: 14, paddingHorizontal: 16,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },

    // Placeholder
    placeholder: { alignItems: 'center', paddingVertical: 48 },
    placeholderIcon: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(186,104,200,0.1)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    placeholderTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
    placeholderSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },

    // Image preview
    imageContainer: {
        borderRadius: 20, overflow: 'hidden',
        backgroundColor: '#000', marginBottom: 16,
    },
    previewImage: { width: '100%', aspectRatio: 1, borderRadius: 20 },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 20,
    },
    overlayText: { color: '#FFF', fontSize: 15, marginTop: 12, textAlign: 'center' },

    // Result card
    resultCard: {
        backgroundColor: '#FFF', borderRadius: 20, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        borderWidth: 1,
    },
    healthyCard: { borderColor: '#C8E6C9' },
    diseaseCard: { borderColor: '#FFCDD2' },

    resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    resultIconCircle: {
        width: 48, height: 48, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    resultHeaderText: { flex: 1 },
    resultTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    confidenceBadge: {
        backgroundColor: '#EDE7F6', paddingHorizontal: 10, paddingVertical: 3,
        borderRadius: 10, alignSelf: 'flex-start',
    },
    confidenceText: { fontSize: 12, color: '#7B1FA2', fontWeight: '600' },

    resultSection: { flexDirection: 'row', gap: 10 },
    sectionIcon: { paddingTop: 2 },
    sectionContent: { flex: 1 },
    sectionLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 2 },
    sectionText: { fontSize: 14, color: '#334155', lineHeight: 20 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },

    // Other predictions
    otherLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 10 },
    otherPred: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    otherName: { fontSize: 12, color: '#475569', width: 130 },
    otherBar: {
        flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden',
    },
    otherBarFill: { height: 6, backgroundColor: '#CE93D8', borderRadius: 3 },
    otherScore: { fontSize: 12, color: '#7B1FA2', fontWeight: '600', width: 32, textAlign: 'right' },

    // Action bar
    actionBar: {
        flexDirection: 'row', gap: 12,
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#FFF',
        borderTopWidth: 1, borderTopColor: '#F1F5F9',
    },
    actionBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
    actionGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 16, borderRadius: 16,
    },
    actionOutline: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14, borderRadius: 16,
        borderWidth: 2, borderColor: '#E1BEE7',
    },
    actionText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
