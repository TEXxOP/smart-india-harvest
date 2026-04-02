import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '../context/TranslationContext';

type RootStackParamList = {
    LanguageSelection: undefined;
    SignUp: undefined;
    Login: undefined;
    BiometricSetup: undefined;
    Home: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
    navigation: LoginScreenNavigationProp;
}

const USER_STORAGE_KEY = '@user_data';
const SESSION_KEY = '@user_session';

export default function LoginScreen({ navigation }: Props) {
    const { t } = useTranslation();
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ mobile?: string; password?: string }>({});

    const validate = (): boolean => {
        const newErrors: typeof errors = {};

        if (!mobile.trim()) {
            newErrors.mobile = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(mobile.trim())) {
            newErrors.mobile = 'Enter a valid 10-digit mobile number';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;

        try {
            const savedData = await AsyncStorage.getItem(USER_STORAGE_KEY);
            if (!savedData) {
                Alert.alert('Error', 'No account found. Please sign up first.');
                return;
            }

            const userData = JSON.parse(savedData);
            if (userData.mobile !== mobile.trim() || userData.password !== password) {
                Alert.alert('Error', 'Invalid mobile number or password.');
                return;
            }

            // Save session
            await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, mobile: userData.mobile }));
            navigation.replace('Home');
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
    };

    return (
        <LinearGradient
            colors={['#F0FFF4', '#FAFAF9', '#F0FFF4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <StatusBar style="dark" backgroundColor="transparent" />
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <MaterialCommunityIcons name="sprout" size={40} color="#4CAF50" />
                        </View>
                        <Text style={styles.title}>{t('login_title')}</Text>
                        <Text style={styles.subtitle}>{t('login_subtitle')}</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <View>
                            <View style={[styles.inputWrapper, errors.mobile ? styles.inputError : null]}>
                                <Ionicons name="phone-portrait-outline" size={22} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('mobile_number')}
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={mobile}
                                    onChangeText={(text) => { setMobile(text.replace(/[^0-9]/g, '')); setErrors(e => ({ ...e, mobile: undefined })); }}
                                />
                            </View>
                            {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
                        </View>

                        <View>
                            <View style={[styles.inputWrapper, errors.password ? styles.inputError : null]}>
                                <Ionicons name="lock-closed-outline" size={22} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('password')}
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry
                                    maxLength={50}
                                    value={password}
                                    onChangeText={(text) => { setPassword(text); setErrors(e => ({ ...e, password: undefined })); }}
                                />
                            </View>
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.loginButtonText}>{t('login_button')}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t('no_account')} </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                            <Text style={styles.linkText}>{t('create_account')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
    header: { alignItems: 'center', marginBottom: 40 },
    logoContainer: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(76, 175, 80, 0.08)',
        borderWidth: 2, borderColor: 'rgba(76, 175, 80, 0.2)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    title: { fontSize: 28, fontWeight: 'bold', color: '#181811', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#4B5563', textAlign: 'center' },
    formContainer: { gap: 24, marginBottom: 32 },
    inputWrapper: { position: 'relative', justifyContent: 'center' },
    inputError: { borderColor: '#EF4444', borderWidth: 1.5, borderRadius: 28 },
    inputIcon: { position: 'absolute', left: 20, zIndex: 1 },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 28,
        height: 56, paddingLeft: 56, paddingRight: 16, fontSize: 16, color: '#181811',
    },
    errorText: { color: '#EF4444', fontSize: 13, marginTop: 6, marginLeft: 20, fontWeight: '500' },
    buttonContainer: { marginBottom: 24 },
    loginButton: {
        backgroundColor: '#4CAF50', height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    loginButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 24 },
    footerText: { fontSize: 14, color: '#4B5563' },
    linkText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
});
