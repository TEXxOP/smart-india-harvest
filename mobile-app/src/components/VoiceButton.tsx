import React, { useEffect, useRef } from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    Animated,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoice, VoiceState } from '../context/VoiceContext';

interface Props {
    bottom?: number;
}

export default function VoiceButton({ bottom = 80 }: Props) {
    const { voiceState, startVoice, stopVoice, cancelVoice } = useVoice();

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const ringAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    // Pulse animation while recording
    useEffect(() => {
        if (voiceState === 'recording') {
            // Pulsing scale
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Expanding ring
            Animated.loop(
                Animated.sequence([
                    Animated.timing(ringAnim, {
                        toValue: 1,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(ringAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Glow
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.3,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            ringAnim.setValue(0);
            glowAnim.setValue(0);
        }
    }, [voiceState]);

    const handlePress = async () => {
        if (voiceState === 'idle' || voiceState === 'error') {
            await startVoice();
        } else if (voiceState === 'recording') {
            await stopVoice();
        } else if (voiceState === 'speaking' || voiceState === 'processing') {
            cancelVoice();
        }
    };

    const getIconName = (): keyof typeof Ionicons.glyphMap => {
        switch (voiceState) {
            case 'recording': return 'stop';
            case 'processing': return 'hourglass-outline';
            case 'speaking': return 'volume-high';
            default: return 'mic';
        }
    };

    const getButtonColor = (): string => {
        switch (voiceState) {
            case 'recording': return '#EF4444';
            case 'processing': return '#F59E0B';
            case 'speaking': return '#3B82F6';
            case 'error': return '#94A3B8';
            default: return '#2E7D32';
        }
    };

    const ringScale = ringAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2.2],
    });

    const ringOpacity = ringAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 0.2, 0],
    });

    return (
        <View style={[styles.container, { bottom }]}>
            {/* Expanding ring while recording */}
            {voiceState === 'recording' && (
                <Animated.View
                    style={[
                        styles.ring,
                        {
                            backgroundColor: '#EF4444',
                            transform: [{ scale: ringScale }],
                            opacity: ringOpacity,
                        },
                    ]}
                />
            )}

            {/* Glow effect */}
            {voiceState === 'recording' && (
                <Animated.View
                    style={[
                        styles.glow,
                        {
                            backgroundColor: '#EF4444',
                            opacity: glowAnim,
                        },
                    ]}
                />
            )}

            {/* Main button */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: getButtonColor() }]}
                    onPress={handlePress}
                    activeOpacity={0.8}
                    disabled={voiceState === 'processing'}
                >
                    <Ionicons
                        name={getIconName()}
                        size={28}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 16,
        zIndex: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ring: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    glow: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    button: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
