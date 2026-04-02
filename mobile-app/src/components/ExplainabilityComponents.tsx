import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// ═══════════════════════════════════════════════════════
// Confidence Badge — Shows AI confidence level
// ═══════════════════════════════════════════════════════

type ConfidenceLevel = 'high' | 'medium' | 'low';

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { color: string; bg: string; border: string; icon: string; label: Record<string, string> }> = {
    high: {
        color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0',
        icon: 'shield-checkmark',
        label: { en: 'High Confidence', hi: 'उच्च विश्वास', pa: 'ਉੱਚ ਭਰੋਸਾ' },
    },
    medium: {
        color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
        icon: 'shield-half',
        label: { en: 'Moderate Confidence', hi: 'मध्यम विश्वास', pa: 'ਦਰਮਿਆਨਾ ਭਰੋਸਾ' },
    },
    low: {
        color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
        icon: 'alert-circle',
        label: { en: 'Low Confidence — Verify with Expert', hi: 'कम विश्वास — विशेषज्ञ से जांचें', pa: 'ਘੱਟ ਭਰੋਸਾ — ਮਾਹਿਰ ਤੋਂ ਪੁਸ਼ਟੀ ਕਰੋ' },
    },
};

interface ConfidenceBadgeProps {
    level: ConfidenceLevel;
    score?: number; // 0-100
    lang?: string;
    compact?: boolean;
}

export function ConfidenceBadge({ level, score, lang = 'en', compact = false }: ConfidenceBadgeProps) {
    const config = CONFIDENCE_CONFIG[level] || CONFIDENCE_CONFIG.medium;
    const labelText = config.label[lang] || config.label.en;

    if (compact) {
        return (
            <View style={[styles.badgeCompact, { backgroundColor: config.bg, borderColor: config.border }]}>
                <Ionicons name={config.icon as any} size={12} color={config.color} />
                {score !== undefined && (
                    <Text style={[styles.badgeScore, { color: config.color }]}>{score}%</Text>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
            <Ionicons name={config.icon as any} size={14} color={config.color} />
            <Text style={[styles.badgeText, { color: config.color }]}>{labelText}</Text>
            {score !== undefined && (
                <Text style={[styles.badgeScore, { color: config.color }]}>{score}%</Text>
            )}
        </View>
    );
}

// ═══════════════════════════════════════════════════════
// Source Tags — Shows data sources used for advice
// ═══════════════════════════════════════════════════════

const SOURCE_ICONS: Record<string, { icon: string; color: string; label: Record<string, string> }> = {
    weather: { icon: 'cloud-outline', color: '#0EA5E9', label: { en: 'Weather Data', hi: 'मौसम डेटा', pa: 'ਮੌਸਮ ਡਾਟਾ' } },
    soil: { icon: 'earth-outline', color: '#78716C', label: { en: 'Soil Model', hi: 'मिट्टी मॉडल', pa: 'ਮਿੱਟੀ ਮਾਡਲ' } },
    market: { icon: 'trending-up', color: '#D946EF', label: { en: 'Market Data', hi: 'बाज़ार डेटा', pa: 'ਬਜ਼ਾਰ ਡਾਟਾ' } },
    ml_model: { icon: 'hardware-chip-outline', color: '#6366F1', label: { en: 'ML Model', hi: 'ML मॉडल', pa: 'ML ਮਾਡਲ' } },
    agronomic: { icon: 'leaf-outline', color: '#16A34A', label: { en: 'Agronomic Rules', hi: 'कृषि नियम', pa: 'ਖੇਤੀ ਨਿਯਮ' } },
    government: { icon: 'document-text-outline', color: '#EA580C', label: { en: 'Govt. Data', hi: 'सरकारी डेटा', pa: 'ਸਰਕਾਰੀ ਡਾਟਾ' } },
    et0: { icon: 'water-outline', color: '#0284C7', label: { en: 'ET₀ Computation', hi: 'ET₀ गणना', pa: 'ET₀ ਗਣਨਾ' } },
};

interface SourceTagsProps {
    sources: string[];
    lang?: string;
}

export function SourceTags({ sources, lang = 'en' }: SourceTagsProps) {
    if (!sources || sources.length === 0) return null;
    return (
        <View style={styles.sourceTags}>
            {sources.map((src, i) => {
                const info = SOURCE_ICONS[src] || { icon: 'information-circle-outline', color: '#64748B', label: { en: src, hi: src, pa: src } };
                return (
                    <View key={i} style={[styles.sourceChip, { borderColor: info.color + '40' }]}>
                        <Ionicons name={info.icon as any} size={11} color={info.color} />
                        <Text style={[styles.sourceText, { color: info.color }]}>
                            {info.label[lang] || info.label.en}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

// ═══════════════════════════════════════════════════════
// Safety Alert — Hard safety constraint warnings
// ═══════════════════════════════════════════════════════

type SafetyLevel = 'danger' | 'warning' | 'info';

const SAFETY_CONFIG: Record<SafetyLevel, { colors: [string, string]; icon: string; textColor: string }> = {
    danger: { colors: ['#DC2626', '#B91C1C'], icon: 'warning', textColor: '#FFF' },
    warning: { colors: ['#F59E0B', '#D97706'], icon: 'alert-circle', textColor: '#FFF' },
    info: { colors: ['#3B82F6', '#2563EB'], icon: 'information-circle', textColor: '#FFF' },
};

interface SafetyAlertProps {
    level: SafetyLevel;
    title: string;
    message: string;
    dismissable?: boolean;
}

export function SafetyAlert({ level, title, message, dismissable = true }: SafetyAlertProps) {
    const [visible, setVisible] = useState(true);
    if (!visible) return null;

    const config = SAFETY_CONFIG[level];
    return (
        <LinearGradient colors={config.colors} style={styles.safetyAlert}>
            <View style={styles.safetyIconCircle}>
                <Ionicons name={config.icon as any} size={20} color="#FFF" />
            </View>
            <View style={styles.safetyContent}>
                <Text style={styles.safetyTitle}>{title}</Text>
                <Text style={styles.safetyMessage}>{message}</Text>
            </View>
            {dismissable && (
                <TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            )}
        </LinearGradient>
    );
}

// ═══════════════════════════════════════════════════════
// Why Card — Expandable "Why this advice?" section
// ═══════════════════════════════════════════════════════

interface WhyCardProps {
    explanation: string;
    sources?: string[];
    confidence?: ConfidenceLevel;
    score?: number;
    lang?: string;
}

export function WhyCard({ explanation, sources, confidence, score, lang = 'en' }: WhyCardProps) {
    const [expanded, setExpanded] = useState(false);

    const whyLabel = lang === 'hi' ? '💡 यह सलाह क्यों?' :
                     lang === 'pa' ? '💡 ਇਹ ਸਲਾਹ ਕਿਉਂ?' :
                     '💡 Why this advice?';

    return (
        <View style={styles.whyCard}>
            <TouchableOpacity
                style={styles.whyHeader}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <Text style={styles.whyHeaderText}>{whyLabel}</Text>
                <View style={styles.whyHeaderRight}>
                    {confidence && <ConfidenceBadge level={confidence} score={score} lang={lang} compact />}
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#64748B" />
                </View>
            </TouchableOpacity>
            {expanded && (
                <View style={styles.whyBody}>
                    <Text style={styles.whyExplanation}>{explanation}</Text>
                    {sources && sources.length > 0 && (
                        <View style={styles.whySourcesRow}>
                            <Text style={styles.whySourcesLabel}>
                                {lang === 'hi' ? 'आधार:' : lang === 'pa' ? 'ਆਧਾਰ:' : 'Based on:'}
                            </Text>
                            <SourceTags sources={sources} lang={lang} />
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

// ═══════════════════════════════════════════════════════
// Weather Safety Banner — Auto-generated alerts
// ═══════════════════════════════════════════════════════

interface WeatherConditions {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    rainProbability?: number;
}

export function getWeatherSafetyAlerts(
    weather: WeatherConditions,
    lang: string = 'en'
): Array<{ level: SafetyLevel; title: string; message: string }> {
    const alerts: Array<{ level: SafetyLevel; title: string; message: string }> = [];

    // High rain probability — don't spray
    if (weather.rainProbability && weather.rainProbability > 60) {
        alerts.push({
            level: 'danger',
            title: lang === 'hi' ? '🚫 छिड़काव न करें' : lang === 'pa' ? '🚫 ਛਿੜਕਾਅ ਨਾ ਕਰੋ' : '🚫 Do Not Spray Today',
            message: lang === 'hi'
                ? `बारिश की ${weather.rainProbability}% संभावना — दवाई बह जाएगी। अगले सूखे दिन का इंतज़ार करें।`
                : lang === 'pa'
                ? `ਮੀਂਹ ਦੀ ${weather.rainProbability}% ਸੰਭਾਵਨਾ — ਦਵਾਈ ਵਹਿ ਜਾਵੇਗੀ। ਅਗਲੇ ਸੁੱਕੇ ਦਿਨ ਦੀ ਉਡੀਕ ਕਰੋ।`
                : `${weather.rainProbability}% rain chance — chemicals will wash off. Wait for the next dry day.`,
        });
    }

    // Extreme heat
    if (weather.temperature && weather.temperature > 40) {
        alerts.push({
            level: 'danger',
            title: lang === 'hi' ? '🌡️ अत्यधिक गर्मी' : lang === 'pa' ? '🌡️ ਬਹੁਤ ਗਰਮੀ' : '🌡️ Extreme Heat Alert',
            message: lang === 'hi'
                ? `तापमान ${weather.temperature}°C — दोपहर 11-4 बजे खेत में काम न करें। सिंचाई सुबह/शाम करें।`
                : lang === 'pa'
                ? `ਤਾਪਮਾਨ ${weather.temperature}°C — ਦੁਪਹਿਰ 11-4 ਵਜੇ ਖੇਤ ਵਿੱਚ ਕੰਮ ਨਾ ਕਰੋ। ਸਿੰਚਾਈ ਸਵੇਰੇ/ਸ਼ਾਮ ਕਰੋ।`
                : `Temperature ${weather.temperature}°C — avoid field work 11AM-4PM. Irrigate in morning/evening only.`,
        });
    }

    // High wind — don't spray
    if (weather.windSpeed && weather.windSpeed > 15) {
        alerts.push({
            level: 'warning',
            title: lang === 'hi' ? '💨 तेज़ हवा' : lang === 'pa' ? '💨 ਤੇਜ਼ ਹਵਾ' : '💨 High Wind Warning',
            message: lang === 'hi'
                ? `हवा ${weather.windSpeed} km/h — छिड़काव से बचें, दवाई उड़ जाएगी।`
                : lang === 'pa'
                ? `ਹਵਾ ${weather.windSpeed} km/h — ਛਿੜਕਾਅ ਤੋਂ ਬਚੋ, ਦਵਾਈ ਉੱਡ ਜਾਵੇਗੀ।`
                : `Wind ${weather.windSpeed} km/h — avoid spraying, chemicals will drift.`,
        });
    }

    // High humidity + warm = disease risk
    if (weather.humidity && weather.humidity > 85 && weather.temperature && weather.temperature > 25) {
        alerts.push({
            level: 'warning',
            title: lang === 'hi' ? '🦠 रोग का खतरा' : lang === 'pa' ? '🦠 ਰੋਗ ਦਾ ਖ਼ਤਰਾ' : '🦠 Disease Risk Alert',
            message: lang === 'hi'
                ? `नमी ${weather.humidity}% + तापमान ${weather.temperature}°C — फफूंद रोग का खतरा। फसल की जांच करें।`
                : lang === 'pa'
                ? `ਨਮੀ ${weather.humidity}% + ਤਾਪਮਾਨ ${weather.temperature}°C — ਉੱਲੀ ਰੋਗ ਦਾ ਖ਼ਤਰਾ। ਫ਼ਸਲ ਦੀ ਜਾਂਚ ਕਰੋ।`
                : `Humidity ${weather.humidity}% + temp ${weather.temperature}°C — fungal disease risk. Inspect crops.`,
        });
    }

    // Frost risk
    if (weather.temperature && weather.temperature < 4) {
        alerts.push({
            level: 'danger',
            title: lang === 'hi' ? '❄️ पाला चेतावनी' : lang === 'pa' ? '❄️ ਪਾਲਾ ਚੇਤਾਵਨੀ' : '❄️ Frost Warning',
            message: lang === 'hi'
                ? `तापमान ${weather.temperature}°C — शाम को हल्की सिंचाई करें और नर्सरी ढकें।`
                : lang === 'pa'
                ? `ਤਾਪਮਾਨ ${weather.temperature}°C — ਸ਼ਾਮ ਨੂੰ ਹਲਕੀ ਸਿੰਚਾਈ ਕਰੋ ਅਤੇ ਨਰਸਰੀ ਢਕੋ।`
                : `Temp ${weather.temperature}°C — light irrigation in evening, cover nursery beds.`,
        });
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════
// Confidence Level Calculator
// ═══════════════════════════════════════════════════════

export function computeConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 75) return 'high';
    if (score >= 45) return 'medium';
    return 'low';
}

// ─── Styles ───
const styles = StyleSheet.create({
    // Badge
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 10, borderWidth: 1,
        alignSelf: 'flex-start',
    },
    badgeCompact: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 6, paddingVertical: 3,
        borderRadius: 8, borderWidth: 1,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    badgeScore: { fontSize: 11, fontWeight: '800' },

    // Source Tags
    sourceTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    sourceChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 7, paddingVertical: 3,
        borderRadius: 6, borderWidth: 1,
        backgroundColor: '#FAFAFA',
    },
    sourceText: { fontSize: 10, fontWeight: '600' },

    // Safety Alert
    safetyAlert: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 14, marginBottom: 10,
    },
    safetyIconCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    safetyContent: { flex: 1 },
    safetyTitle: { fontSize: 14, fontWeight: '800', color: '#FFF' },
    safetyMessage: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2, lineHeight: 17 },

    // Why Card
    whyCard: {
        backgroundColor: '#FEFCE8', borderRadius: 12,
        borderWidth: 1, borderColor: '#FEF08A',
        overflow: 'hidden', marginTop: 8,
    },
    whyHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 10,
    },
    whyHeaderText: { fontSize: 12, fontWeight: '700', color: '#854D0E' },
    whyHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    whyBody: { paddingHorizontal: 10, paddingBottom: 10 },
    whyExplanation: { fontSize: 13, color: '#713F12', lineHeight: 19 },
    whySourcesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    whySourcesLabel: { fontSize: 11, fontWeight: '700', color: '#92400E' },
});
