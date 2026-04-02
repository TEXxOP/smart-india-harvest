import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
    Home: undefined;
};

type BiometricSetupScreenProps = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
    navigation: BiometricSetupScreenProps;
}

export default function BiometricSetupScreen({ navigation }: Props) {
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);

    useEffect(() => {
        (async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            setIsBiometricSupported(compatible);
        })();
    }, []);

    const handleEnableBiometric = async () => {
        try {
            const savedBiometrics = await LocalAuthentication.isEnrolledAsync();
            if (!savedBiometrics) {
                Alert.alert(
                    'Biometric Record Not Found',
                    'Please ensure you have set up biometric authentication in your device settings.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to enable biometric login',
                fallbackLabel: 'Enter Password',
            });

            if (result.success) {
                Alert.alert(
                    'Success',
                    'Biometric login enabled successfully!',
                    [{ text: 'OK', onPress: () => navigation.replace('Home') }]
                );
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while setting up biometrics.');
        }
    };

    const handleSkip = () => {
        navigation.replace('Home');
    };

    return (
        <LinearGradient
            colors={['#F0FFF4', '#FAFAF9', '#F0FFF4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <StatusBar style="dark" backgroundColor="transparent" />

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="fingerprint" size={72} color="#4CAF50" />
                </View>

                <Text style={styles.title}>बायोमेट्रिक लॉग इन</Text>
                <Text style={styles.subtitle}>
                    सुरक्षित और तेज़ एक्सेस के लिए फिंगरप्रिंट या फेस आईडी सक्षम करें।
                </Text>

                <View style={styles.spacer} />

                {isBiometricSupported ? (
                    <TouchableOpacity
                        style={styles.enableButton}
                        onPress={handleEnableBiometric}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="shield-check-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.enableButtonText}>सक्षम करें (Enable)</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.notSupportedBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                        <Text style={styles.notSupportedText}>
                            Your device does not support biometric authentication.
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                    activeOpacity={0.7}
                >
                    <Text style={styles.skipButtonText}>अभी नहीं (Skip)</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(76, 175, 80, 0.08)',
        borderWidth: 2,
        borderColor: 'rgba(76, 175, 80, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#181811',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#4B5563',
        textAlign: 'center',
        paddingHorizontal: 16,
        lineHeight: 24,
    },
    spacer: {
        height: 48,
    },
    enableButton: {
        backgroundColor: '#4CAF50',
        width: '100%',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 16,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    enableButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    skipButton: {
        padding: 16,
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
    },
    notSupportedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    notSupportedText: {
        color: '#EF4444',
        flex: 1,
    },
});
