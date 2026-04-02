import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../context/TranslationContext';

type RootStackParamList = {
    LanguageSelection: { fromSettings?: boolean } | undefined;
    SignUp: undefined;
    Login: undefined;
    Home: undefined;
};

type LanguageSelectionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LanguageSelection'>;
type LanguageSelectionScreenRouteProp = RouteProp<RootStackParamList, 'LanguageSelection'>;

interface Props {
    navigation: LanguageSelectionScreenNavigationProp;
    route: LanguageSelectionScreenRouteProp;
}

interface Language {
    id: string;
    label: string;
    code: string;
}

const LANGUAGES: Language[] = [
    { id: '1', label: 'हिंदी', code: 'hi' },
    { id: '2', label: 'English', code: 'en' },
    { id: '3', label: 'ਪੰਜਾਬੀ', code: 'pa' },
    { id: '4', label: 'मराठी', code: 'mr' },
    { id: '5', label: 'తెలుగు', code: 'te' },
    { id: '6', label: 'தமிழ்', code: 'ta' },
    { id: '7', label: 'ಕನ್ನಡ', code: 'kn' },
];

export default function LanguageSelectionScreen({ navigation, route }: Props) {
    const { setLanguage, t, language } = useTranslation();
    const [selectedLanguage, setSelectedCode] = useState<string>(language || 'hi');
    const [isLoading, setIsLoading] = useState(false);
    
    const fromSettings = route.params?.fromSettings;

    const handleContinue = async () => {
        if (isLoading) return;
        setIsLoading(true);
        console.log('Attempting to set language:', selectedLanguage);
        try {
            await setLanguage(selectedLanguage);
            console.log('Language set successfully');
            if (fromSettings) {
                navigation.goBack();
            } else {
                navigation.navigate('Login');
            }
        } catch (error) {
            console.error('Error in handleContinue:', error);
            Alert.alert('Error', 'Failed to set language. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAF9" />

            {/* Top Bar with Back Button (if from settings) */}
            {fromSettings && (
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={26} color="#0F172A" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Header Icon */}
            <View style={[styles.iconContainer, fromSettings && { marginTop: 10 }]}>
                <Text style={styles.globeIcon}>🌐</Text>
            </View>

            {/* Header */}
            <View style={styles.headerContainer}>
                <Text style={styles.title}>{t('select_language')}</Text>
                <Text style={styles.subtitle}>
                    {fromSettings ? 'Change your preferred language' : 'Please select your preferred language'}
                </Text>
            </View>

            {/* Language Options */}
            <ScrollView
                style={styles.languageList}
                contentContainerStyle={styles.languageListContent}
                showsVerticalScrollIndicator={false}
            >
                {LANGUAGES.map((language) => {
                    const isSelected = selectedLanguage === language.code;
                    return (
                        <TouchableOpacity
                            key={language.id}
                            style={[
                                styles.languageOption,
                                isSelected && styles.languageOptionSelected,
                            ]}
                            onPress={() => setSelectedCode(language.code)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.languageLabel,
                                    isSelected && styles.languageLabelSelected,
                                ]}
                            >
                                {language.label}
                            </Text>
                            <View
                                style={[
                                    styles.radioOuter,
                                    isSelected && styles.radioOuterSelected,
                                ]}
                            >
                                {isSelected && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Continue Button */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    activeOpacity={0.85}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#0F172A" />
                    ) : (
                        <Text style={styles.continueButtonText}>{t('continue')} →</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAF9',
    },
    topBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        width: 44,
    },
    iconContainer: {
        alignItems: 'center',
        marginTop: 56,
        paddingVertical: 16,
    },
    globeIcon: {
        fontSize: 64,
    },
    headerContainer: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0F172A',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#475569',
        marginTop: 12,
        textAlign: 'center',
    },
    languageList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    languageListContent: {
        gap: 16,
        paddingBottom: 16,
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 20,
        height: 68,
        backgroundColor: '#FFFFFF',
    },
    languageOptionSelected: {
        borderWidth: 2,
        borderColor: '#FACC15',
        backgroundColor: '#FFFDF0',
    },
    languageLabel: {
        fontSize: 20,
        fontWeight: '500',
        color: '#0F172A',
    },
    languageLabelSelected: {
        fontWeight: '600',
        color: '#78350F',
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: {
        borderColor: '#FACC15',
        backgroundColor: '#FACC15',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFFFFF',
    },
    buttonContainer: {
        paddingHorizontal: 16,
        paddingVertical: 24,
    },
    continueButton: {
        backgroundColor: '#FACC15',
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FACC15',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    continueButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
        letterSpacing: 0.5,
    },
    continueButtonDisabled: {
        opacity: 0.7,
    },
});
