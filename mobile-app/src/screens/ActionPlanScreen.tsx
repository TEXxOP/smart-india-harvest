import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../context/TranslationContext';
import { BACKEND_URL } from '../config';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// ─── Types ───
interface Task {
    category: string;
    icon: string;
    color: string;
    title: string;
    time: string;
    details: string;
    quantity: string;
    cost_estimate: string;
    why_now: string;
    urgency: 'high' | 'medium' | 'low' | 'avoid';
}

interface DayPlan {
    day_index: number;
    date: string;
    day_name: string;
    temp_range: string;
    rain_probability: number;
    is_rainy: boolean;
    is_spray_safe: boolean;
    tasks: Task[];
}

interface UrgentAction {
    title: string;
    detail: string;
    category: string;
    urgency: string;
}

interface ActionPlanData {
    weekly_summary: string;
    crop: string;
    crop_stage: string;
    crop_info: {
        stage: string;
        days_since_sowing: number;
        days_to_harvest: number;
        stage_progress_pct: number;
        total_duration: number;
    };
    state: string;
    season: string;
    do_now: UrgentAction[];
    avoid_today: UrgentAction[];
    daily_plan: DayPlan[];
}

// ─── Helpers ───
const URGENCY_CONFIG = {
    high: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: '⚡ Urgent' },
    medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: '📋 Scheduled' },
    low: { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', label: '💡 Optional' },
    avoid: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: '🚫 Avoid' },
};

const STAGE_EMOJI: Record<string, string> = {
    seedling: '🌱',
    vegetative: '🌿',
    flowering: '🌸',
    maturity: '🌾',
};

const STAGE_LABELS: Record<string, Record<string, string>> = {
    en: { seedling: 'Seedling', vegetative: 'Vegetative', flowering: 'Flowering', maturity: 'Maturity' },
    hi: { seedling: 'अंकुरण', vegetative: 'वानस्पतिक', flowering: 'फूल', maturity: 'परिपक्वता' },
    pa: { seedling: 'ਅੰਕੁਰਨ', vegetative: 'ਬਨਸਪਤੀ', flowering: 'ਫੁੱਲ', maturity: 'ਪੱਕਣ' },
};

export default function ActionPlanScreen({ navigation }: any) {
    const { t, language } = useTranslation();
    const [data, setData] = useState<ActionPlanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDay, setSelectedDay] = useState(0);
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        fetchActionPlan();
        loadCheckedTasks();
    }, []);

    useEffect(() => {
        if (data) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start();
        }
    }, [data]);

    const loadCheckedTasks = async () => {
        try {
            const saved = await AsyncStorage.getItem('@action_plan_checked');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Only load if from today
                if (parsed.date === new Date().toISOString().split('T')[0]) {
                    setCheckedTasks(new Set(parsed.tasks));
                }
            }
        } catch (e) { /* ignore */ }
    };

    const toggleCheck = async (taskKey: string) => {
        const next = new Set(checkedTasks);
        if (next.has(taskKey)) next.delete(taskKey);
        else next.add(taskKey);
        setCheckedTasks(next);
        try {
            await AsyncStorage.setItem('@action_plan_checked', JSON.stringify({
                date: new Date().toISOString().split('T')[0],
                tasks: Array.from(next),
            }));
        } catch (e) { /* ignore */ }
    };

    const fetchActionPlan = async () => {
        setLoading(true);
        try {
            let lat = 28.6, lon = 77.2;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getLastKnownPositionAsync();
                    if (loc) { lat = loc.coords.latitude; lon = loc.coords.longitude; }
                }
            } catch (e) { /* use defaults */ }

            // Get farm profile for crop/soil info
            let crop = 'Wheat', soilType = 'Alluvial', landArea = 1.0, sowingDate: string | null = null;
            try {
                const profileStr = await AsyncStorage.getItem('@farm_profile');
                if (profileStr) {
                    const profile = JSON.parse(profileStr);
                    crop = profile.previous_crop || profile.current_crop || 'Wheat';
                    soilType = profile.soil_type || 'Alluvial';
                    landArea = profile.land_size || 1.0;
                    if (profile.land_unit === 'Acre') landArea *= 0.4047;
                    else if (profile.land_unit === 'Beegha') landArea *= 0.25;
                    sowingDate = profile.sowing_date || null;
                }
            } catch (e) { /* use defaults */ }

            const body: any = {
                crop, soil_type: soilType,
                land_area_hectares: landArea,
                latitude: lat, longitude: lon,
                lang_code: language,
            };
            if (sowingDate) body.sowing_date = sowingDate;

            const response = await fetch(`${BACKEND_URL}/api/action-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setData(result);
                }
            }
        } catch (e) {
            console.error('Action plan fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => { setRefreshing(true); fetchActionPlan(); };

    const currentDayPlan = data?.daily_plan?.[selectedDay];
    const completedCount = currentDayPlan?.tasks?.filter((_, i) =>
        checkedTasks.has(`${selectedDay}-${i}`)
    ).length || 0;
    const totalTasks = currentDayPlan?.tasks?.length || 0;

    // ─── Render ───
    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingIcon}>
                        <MaterialCommunityIcons name="calendar-clock" size={48} color="#16A34A" />
                    </View>
                    <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 20 }} />
                    <Text style={styles.loadingTitle}>
                        {language === 'hi' ? 'साप्ताहिक योजना बना रहे हैं...' :
                         language === 'pa' ? 'ਹਫ਼ਤਾਵਾਰੀ ਯੋਜਨਾ ਬਣਾ ਰਹੇ ਹਾਂ...' :
                         'Building your weekly plan...'}
                    </Text>
                    <Text style={styles.loadingSubtitle}>
                        {language === 'hi' ? 'मौसम, मिट्टी और फसल का विश्लेषण' :
                         language === 'pa' ? 'ਮੌਸਮ, ਮਿੱਟੀ ਅਤੇ ਫ਼ਸਲ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ' :
                         'Analyzing weather, soil & crop data'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!data) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.errorText}>Unable to generate plan</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchActionPlan}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const stageLabel = STAGE_LABELS[language]?.[data.crop_stage] || STAGE_LABELS.en[data.crop_stage] || data.crop_stage;

    return (
        <SafeAreaView style={styles.container}>
            {/* ═══ Header ═══ */}
            <LinearGradient colors={['#065F46', '#047857', '#059669']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>
                            {language === 'hi' ? '📋 साप्ताहिक कार्य योजना' :
                             language === 'pa' ? '📋 ਹਫ਼ਤਾਵਾਰੀ ਕਾਰਜ ਯੋਜਨਾ' :
                             '📋 Weekly Action Plan'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
                        <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>

                {/* Crop Info Bar */}
                <View style={styles.cropBar}>
                    <View style={styles.cropChip}>
                        <Text style={styles.cropChipEmoji}>{STAGE_EMOJI[data.crop_stage] || '🌱'}</Text>
                        <View>
                            <Text style={styles.cropChipName}>{data.crop}</Text>
                            <Text style={styles.cropChipStage}>{stageLabel}</Text>
                        </View>
                    </View>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${data.crop_info.stage_progress_pct}%` }]} />
                        </View>
                        <Text style={styles.progressText}>
                            {language === 'hi' ? `${data.crop_info.days_to_harvest} दिन शेष` :
                             language === 'pa' ? `${data.crop_info.days_to_harvest} ਦਿਨ ਬਾਕੀ` :
                             `${data.crop_info.days_to_harvest}d to harvest`}
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* ═══ Urgent Actions ═══ */}
                    {(data.do_now.length > 0 || data.avoid_today.length > 0) && (
                        <View style={styles.urgentSection}>
                            {data.do_now.map((action, i) => (
                                <View key={`do-${i}`} style={styles.doNowCard}>
                                    <LinearGradient colors={['#16A34A', '#15803D']} style={styles.urgentGradient}>
                                        <View style={styles.urgentIconCircle}>
                                            <Ionicons name="flash" size={18} color="#FFF" />
                                        </View>
                                        <View style={styles.urgentTextContainer}>
                                            <Text style={styles.urgentLabel}>
                                                {language === 'hi' ? '⚡ अभी करें' : language === 'pa' ? '⚡ ਹੁਣੇ ਕਰੋ' : '⚡ DO NOW'}
                                            </Text>
                                            <Text style={styles.urgentTitle}>{action.title}</Text>
                                            <Text style={styles.urgentDetail}>{action.detail}</Text>
                                        </View>
                                    </LinearGradient>
                                </View>
                            ))}
                            {data.avoid_today.map((action, i) => (
                                <View key={`avoid-${i}`} style={styles.avoidCard}>
                                    <View style={styles.avoidInner}>
                                        <View style={styles.avoidIconCircle}>
                                            <Ionicons name="close-circle" size={18} color="#DC2626" />
                                        </View>
                                        <View style={styles.urgentTextContainer}>
                                            <Text style={styles.avoidLabel}>
                                                {language === 'hi' ? '🚫 आज न करें' : language === 'pa' ? '🚫 ਅੱਜ ਨਾ ਕਰੋ' : '🚫 AVOID TODAY'}
                                            </Text>
                                            <Text style={styles.avoidTitle}>{action.title}</Text>
                                            <Text style={styles.avoidDetail}>{action.detail}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* ═══ Weekly Summary ═══ */}
                    {data.weekly_summary ? (
                        <View style={styles.summaryCard}>
                            <MaterialCommunityIcons name="text-box-outline" size={18} color="#64748B" />
                            <Text style={styles.summaryText}>{data.weekly_summary}</Text>
                        </View>
                    ) : null}

                    {/* ═══ Day Selector ═══ */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.daySelector}
                    >
                        {data.daily_plan.map((day, i) => {
                            const isSelected = selectedDay === i;
                            const dayChecked = day.tasks.filter((_, ti) => checkedTasks.has(`${i}-${ti}`)).length;
                            const allDone = dayChecked === day.tasks.length && day.tasks.length > 0;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => setSelectedDay(i)}
                                    style={[
                                        styles.dayChip,
                                        isSelected && styles.dayChipSelected,
                                        allDone && styles.dayChipDone,
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.dayChipName, isSelected && styles.dayChipNameSelected]}>
                                        {day.day_name}
                                    </Text>
                                    <Text style={[styles.dayChipTemp, isSelected && styles.dayChipTempSelected]}>
                                        {day.temp_range}
                                    </Text>
                                    {day.is_rainy && (
                                        <Ionicons name="rainy" size={13} color={isSelected ? '#FFF' : '#3B82F6'} />
                                    )}
                                    {allDone && (
                                        <Ionicons name="checkmark-circle" size={14} color={isSelected ? '#FFF' : '#16A34A'} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* ═══ Day Header ═══ */}
                    {currentDayPlan && (
                        <View style={styles.dayHeader}>
                            <View style={styles.dayHeaderLeft}>
                                <Text style={styles.dayHeaderTitle}>{currentDayPlan.day_name}</Text>
                                <Text style={styles.dayHeaderDate}>{currentDayPlan.date}</Text>
                            </View>
                            <View style={styles.dayHeaderRight}>
                                <View style={styles.dayWeatherBadge}>
                                    <Ionicons
                                        name={currentDayPlan.is_rainy ? 'rainy' : 'sunny'}
                                        size={14}
                                        color={currentDayPlan.is_rainy ? '#3B82F6' : '#F59E0B'}
                                    />
                                    <Text style={styles.dayWeatherText}>{currentDayPlan.temp_range}</Text>
                                </View>
                                {currentDayPlan.rain_probability > 0 && (
                                    <Text style={styles.rainProbText}>
                                        💧 {currentDayPlan.rain_probability}%
                                    </Text>
                                )}
                                {currentDayPlan.is_spray_safe && (
                                    <View style={styles.sprayBadge}>
                                        <Text style={styles.sprayBadgeText}>
                                            {language === 'hi' ? '✅ छिड़काव सुरक्षित' :
                                             language === 'pa' ? '✅ ਛਿੜਕਾਅ ਸੁਰੱਖਿਅਤ' :
                                             '✅ Spray Safe'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* ═══ Progress Bar ═══ */}
                    {totalTasks > 0 && (
                        <View style={styles.progressSection}>
                            <View style={styles.taskProgressBar}>
                                <View style={[styles.taskProgressFill, { width: `${(completedCount / totalTasks) * 100}%` }]} />
                            </View>
                            <Text style={styles.taskProgressText}>
                                {completedCount}/{totalTasks}{' '}
                                {language === 'hi' ? 'पूर्ण' : language === 'pa' ? 'ਮੁਕੰਮਲ' : 'done'}
                            </Text>
                        </View>
                    )}

                    {/* ═══ Task Cards ═══ */}
                    <View style={styles.taskList}>
                        {currentDayPlan?.tasks.map((task, i) => {
                            const taskKey = `${selectedDay}-${i}`;
                            const isExpanded = expandedTask === taskKey;
                            const isChecked = checkedTasks.has(taskKey);
                            const urgConf = URGENCY_CONFIG[task.urgency] || URGENCY_CONFIG.medium;

                            return (
                                <View
                                    key={taskKey}
                                    style={[
                                        styles.taskCard,
                                        { borderLeftColor: task.color, borderLeftWidth: 4 },
                                        isChecked && styles.taskCardChecked,
                                    ]}
                                >
                                    {/* Task Main Row */}
                                    <View style={styles.taskMainRow}>
                                        <TouchableOpacity
                                            onPress={() => toggleCheck(taskKey)}
                                            style={[
                                                styles.checkbox,
                                                isChecked && { backgroundColor: '#16A34A', borderColor: '#16A34A' },
                                            ]}
                                        >
                                            {isChecked && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.taskContent}
                                            onPress={() => setExpandedTask(isExpanded ? null : taskKey)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.taskTopRow}>
                                                <View style={[styles.taskIconCircle, { backgroundColor: task.color + '15' }]}>
                                                    <Ionicons
                                                        name={(task.icon || 'checkmark-circle-outline') as any}
                                                        size={18}
                                                        color={task.color}
                                                    />
                                                </View>
                                                <View style={styles.taskTextBlock}>
                                                    <Text style={[styles.taskTitle, isChecked && styles.taskTitleChecked]}>
                                                        {task.title}
                                                    </Text>
                                                    <View style={styles.taskMeta}>
                                                        {task.time ? (
                                                            <View style={styles.taskTimeBadge}>
                                                                <Ionicons name="time-outline" size={11} color="#64748B" />
                                                                <Text style={styles.taskTimeText}>{task.time}</Text>
                                                            </View>
                                                        ) : null}
                                                        <View style={[styles.urgencyBadge, { backgroundColor: urgConf.bg, borderColor: urgConf.border }]}>
                                                            <Text style={[styles.urgencyText, { color: urgConf.text }]}>
                                                                {urgConf.label}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <Ionicons
                                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                    size={18}
                                                    color="#94A3B8"
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <View style={styles.taskExpanded}>
                                            {/* Details */}
                                            <Text style={styles.taskDetails}>{task.details}</Text>

                                            {/* Quantity & Cost Row */}
                                            <View style={styles.taskInfoRow}>
                                                {task.quantity && task.quantity !== '-' && (
                                                    <View style={styles.taskInfoChip}>
                                                        <Ionicons name="cube-outline" size={14} color="#0EA5E9" />
                                                        <Text style={styles.taskInfoText}>{task.quantity}</Text>
                                                    </View>
                                                )}
                                                {task.cost_estimate && task.cost_estimate !== '₹0' && (
                                                    <View style={styles.taskInfoChip}>
                                                        <Ionicons name="cash-outline" size={14} color="#16A34A" />
                                                        <Text style={styles.taskInfoText}>{task.cost_estimate}</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Why Now */}
                                            {task.why_now ? (
                                                <View style={styles.whyNowBox}>
                                                    <Text style={styles.whyNowLabel}>
                                                        {language === 'hi' ? '💡 अभी क्यों?' :
                                                         language === 'pa' ? '💡 ਹੁਣ ਕਿਉਂ?' :
                                                         '💡 Why now?'}
                                                    </Text>
                                                    <Text style={styles.whyNowText}>{task.why_now}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    <View style={{ height: 40 }} />
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    // Loading
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    loadingIcon: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
    },
    loadingTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 16 },
    loadingSubtitle: { fontSize: 14, color: '#64748B', marginTop: 6 },
    errorText: { fontSize: 16, color: '#64748B', marginTop: 16 },
    retryBtn: { marginTop: 20, backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 20 },
    retryBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

    // Header
    header: { paddingTop: 4, paddingBottom: 16, paddingHorizontal: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, marginLeft: 12 },
    headerTitle: { fontSize: 19, fontWeight: '800', color: '#FFF' },
    refreshBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },

    // Crop Bar
    cropBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 14, padding: 12,
    },
    cropChip: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cropChipEmoji: { fontSize: 28 },
    cropChipName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    cropChipStage: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
    progressContainer: { alignItems: 'flex-end', flex: 1, marginLeft: 16 },
    progressBarBg: {
        width: '100%', height: 6, borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    progressBarFill: {
        height: 6, borderRadius: 3, backgroundColor: '#FDE68A',
    },
    progressText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

    scrollView: { flex: 1 },

    // Urgent Section
    urgentSection: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
    doNowCard: { borderRadius: 14, overflow: 'hidden', elevation: 3, shadowColor: '#16A34A', shadowOpacity: 0.2, shadowRadius: 6 },
    urgentGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    urgentIconCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    urgentTextContainer: { flex: 1 },
    urgentLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
    urgentTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 2 },
    urgentDetail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    avoidCard: {
        borderRadius: 14, overflow: 'hidden',
        borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2',
    },
    avoidInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    avoidIconCircle: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
    },
    avoidLabel: { fontSize: 11, fontWeight: '800', color: '#DC2626', letterSpacing: 0.5 },
    avoidTitle: { fontSize: 15, fontWeight: '700', color: '#991B1B', marginTop: 1 },
    avoidDetail: { fontSize: 12, color: '#B91C1C', marginTop: 1 },

    // Summary
    summaryCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        marginHorizontal: 16, marginTop: 16,
        backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14,
    },
    summaryText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 20 },

    // Day Selector
    daySelector: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4, gap: 8 },
    dayChip: {
        alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: 14, backgroundColor: '#FFF',
        borderWidth: 1.5, borderColor: '#E2E8F0',
        minWidth: 72, gap: 3,
    },
    dayChipSelected: {
        backgroundColor: '#065F46', borderColor: '#065F46',
    },
    dayChipDone: { borderColor: '#86EFAC' },
    dayChipName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    dayChipNameSelected: { color: '#FFF' },
    dayChipTemp: { fontSize: 11, color: '#64748B' },
    dayChipTempSelected: { color: 'rgba(255,255,255,0.75)' },

    // Day Header
    dayHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    },
    dayHeaderLeft: {},
    dayHeaderTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    dayHeaderDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    dayHeaderRight: { alignItems: 'flex-end', gap: 4 },
    dayWeatherBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    },
    dayWeatherText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
    rainProbText: { fontSize: 11, color: '#3B82F6', fontWeight: '600' },
    sprayBadge: {
        backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
        borderWidth: 1, borderColor: '#BBF7D0',
    },
    sprayBadgeText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },

    // Progress
    progressSection: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 16, marginTop: 12,
    },
    taskProgressBar: {
        flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0',
    },
    taskProgressFill: {
        height: 6, borderRadius: 3, backgroundColor: '#16A34A',
    },
    taskProgressText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

    // Task List
    taskList: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },

    taskCard: {
        backgroundColor: '#FFF', borderRadius: 14,
        borderWidth: 1, borderColor: '#E2E8F0',
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    taskCardChecked: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },

    taskMainRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },

    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: '#CBD5E1',
        alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },

    taskContent: { flex: 1 },
    taskTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    taskIconCircle: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    taskTextBlock: { flex: 1 },
    taskTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B', lineHeight: 20 },
    taskTitleChecked: { textDecorationLine: 'line-through', color: '#94A3B8' },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    taskTimeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    },
    taskTimeText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
    urgencyBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
    },
    urgencyText: { fontSize: 10, fontWeight: '700' },

    // Expanded
    taskExpanded: {
        paddingHorizontal: 14, paddingBottom: 14, paddingTop: 0,
        marginLeft: 32, // align with content (checkbox + gap)
        borderTopWidth: 1, borderTopColor: '#F1F5F9',
    },
    taskDetails: { fontSize: 14, color: '#475569', lineHeight: 20, marginTop: 10 },
    taskInfoRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
    taskInfoChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    },
    taskInfoText: { fontSize: 13, fontWeight: '600', color: '#334155' },

    whyNowBox: {
        marginTop: 10, backgroundColor: '#FFFBEB',
        borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FDE68A',
    },
    whyNowLabel: { fontSize: 11, fontWeight: '800', color: '#92400E', marginBottom: 3 },
    whyNowText: { fontSize: 13, color: '#78350F', lineHeight: 19 },
});
