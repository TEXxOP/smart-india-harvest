import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '../context/TranslationContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;
interface Props { navigation: ProfileScreenNavigationProp; }

const USER_STORAGE_KEY = '@user_data';

export default function ProfileScreen({ navigation }: Props) {
    const { t, language } = useTranslation();
    const [user, setUser] = useState<{ fullName: string; mobile: string; createdAt: string } | null>(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const data = await AsyncStorage.getItem(USER_STORAGE_KEY);
            if (data) setUser(JSON.parse(data));
        } catch (e) {
            console.error('Failed to load user', e);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            language === 'hi' ? 'लॉग आउट' : language === 'pa' ? 'ਲੌਗ ਆਊਟ' : 'Logout',
            language === 'hi' ? 'क्या आप लॉग आउट करना चाहते हैं?' : language === 'pa' ? 'ਕੀ ਤੁਸੀਂ ਲੌਗ ਆਊਟ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?' : 'Are you sure you want to logout?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: language === 'hi' ? 'हाँ' : language === 'pa' ? 'ਹਾਂ' : 'Yes',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('@user_session');
                        navigation.reset({ index: 0, routes: [{ name: 'LanguageSelection' }] });
                    },
                },
            ]
        );
    };

    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN', { year: 'numeric', month: 'long' })
        : '';

    const menuItems = [
        { icon: 'translate' as const, label: t('select_language'), color: '#8B5CF6', screen: 'LanguageSelection' as const, params: { fromSettings: true } },
        { icon: 'leaf' as const, label: t('my_crops'), color: '#16A34A', screen: 'Fasalein' as const },
        { icon: 'book-open-variant' as const, label: t('agri_knowledge'), color: '#F59E0B', screen: 'AgriKnowledge' as const },
        { icon: 'file-document-outline' as const, label: t('gov_schemes'), color: '#3B82F6', screen: 'GovSchemes' as const },
        { icon: 'star-outline' as const, label: t('success_stories'), color: '#EA580C', screen: 'SuccessStories' as const },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile_tab')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Card */}
                <LinearGradient colors={['#166534', '#22C55E']} style={styles.profileCard}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
                        </Text>
                    </View>
                    <Text style={styles.profileName}>{user?.fullName || 'Farmer'}</Text>
                    <Text style={styles.profilePhone}>
                        <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.8)" />
                        {' '}{user?.mobile ? `+91 ${user.mobile}` : '—'}
                    </Text>
                    {memberSince ? (
                        <Text style={styles.memberSince}>
                            {language === 'hi' ? 'सदस्य:' : language === 'pa' ? 'ਮੈਂਬਰ:' : 'Member since'} {memberSince}
                        </Text>
                    ) : null}
                </LinearGradient>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.menuItem}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate(item.screen as any, item.params as any)}
                        >
                            <View style={[styles.menuIconCircle, { backgroundColor: item.color + '15' }]}>
                                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                    <Text style={styles.logoutText}>
                        {language === 'hi' ? 'लॉग आउट' : language === 'pa' ? 'ਲੌਗ ਆਊਟ' : 'Logout'}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FAFAF9' },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    backButton: { padding: 8, marginLeft: -8, width: 44 },
    headerTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
    scrollContent: { padding: 16 },
    profileCard: {
        borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 24,
        shadowColor: '#16A34A', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
    },
    avatarCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
    profileName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
    profilePhone: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
    memberSince: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
    menuSection: {
        backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden',
        borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24,
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
    },
    menuIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B' },
    logoutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16,
        borderWidth: 1, borderColor: '#FECACA',
    },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});
