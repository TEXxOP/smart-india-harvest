import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVoice } from '../context/VoiceContext';
import { useTranslation } from '../context/TranslationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VoiceOverlay() {
    const { voiceState, transcript, responseText, lastIntent, cancelVoice, stopVoice } = useVoice();
    const { t } = useTranslation();

    const wave1 = useRef(new Animated.Value(0.3)).current;
    const wave2 = useRef(new Animated.Value(0.3)).current;
    const wave3 = useRef(new Animated.Value(0.3)).current;
    const wave4 = useRef(new Animated.Value(0.3)).current;
    const wave5 = useRef(new Animated.Value(0.3)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const isVisible = voiceState === 'recording' || voiceState === 'processing' || voiceState === 'speaking';

    // Fade in/out
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: isVisible ? 1 : 0,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    // Sound wave animation while recording
    useEffect(() => {
        if (voiceState === 'recording') {
            const waves = [wave1, wave2, wave3, wave4, wave5];
            const animations = waves.map((wave, i) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(i * 100),
                        Animated.timing(wave, {
                            toValue: 0.8 + Math.random() * 0.2,
                            duration: 300 + Math.random() * 200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(wave, {
                            toValue: 0.2 + Math.random() * 0.2,
                            duration: 300 + Math.random() * 200,
                            useNativeDriver: true,
                        }),
                    ])
                )
            );
            animations.forEach(a => a.start());
            return () => animations.forEach(a => a.stop());
        } else {
            [wave1, wave2, wave3, wave4, wave5].forEach(w => w.setValue(0.3));
        }
    }, [voiceState]);

    if (!isVisible) return null;

    const getStatusText = () => {
        switch (voiceState) {
            case 'recording': return t('speak_now' as any) || 'Speak now...';
            case 'processing': return t('processing_voice' as any) || 'Processing...';
            case 'speaking': return responseText ? '' : 'Speaking...';
            default: return '';
        }
    };

    const getIntentIcon = (): string => {
        switch (lastIntent) {
            case 'WEATHER': return 'weather-cloudy';
            case 'DISEASE_SCAN': return 'leaf-circle-outline';
            case 'CROP_ADVICE': return 'sprout';
            case 'GOV_SCHEMES': return 'file-document-outline';
            case 'AGRI_KNOWLEDGE': return 'book-open-variant';
            default: return 'robot-happy';
        }
    };

    return (
        <Modal transparent visible={isVisible} animationType="none">
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={styles.closeArea}
                    onPress={cancelVoice}
                    activeOpacity={1}
                />

                <View style={styles.card}>
                    <LinearGradient
                        colors={
                            voiceState === 'recording'
                                ? ['#1B5E20', '#2E7D32']
                                : voiceState === 'processing'
                                    ? ['#E65100', '#F57C00']
                                    : ['#1565C0', '#1976D2']
                        }
                        style={styles.cardGradient}
                    >
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeBtn} onPress={cancelVoice}>
                            <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>

                        {/* Sound waves while recording */}
                        {voiceState === 'recording' && (
                            <TouchableOpacity 
                                style={styles.recordingAction} 
                                onPress={() => stopVoice()}
                                activeOpacity={0.8}
                            >
                                <View style={styles.waveContainer}>
                                    {[wave1, wave2, wave3, wave4, wave5].map((wave, i) => (
                                        <Animated.View
                                            key={i}
                                            style={[
                                                styles.waveBar,
                                                { transform: [{ scaleY: wave }] },
                                            ]}
                                        />
                                    ))}
                                </View>
                                <View style={styles.stopButton}>
                                    <View style={styles.stopIconCircle}>
                                        <Ionicons name="stop" size={20} color="#EF4444" />
                                    </View>
                                    <Text style={styles.stopText}>{t('tap_to_speak' as any) || 'Tap to Stop'}</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Processing spinner */}
                        {voiceState === 'processing' && (
                            <View style={styles.processingContainer}>
                                <Animated.View style={styles.processingDot}>
                                    <MaterialCommunityIcons name="loading" size={40} color="#FFFFFF" />
                                </Animated.View>
                            </View>
                        )}

                        {/* Intent icon when speaking response */}
                        {voiceState === 'speaking' && lastIntent && (
                            <View style={styles.intentContainer}>
                                <View style={styles.intentCircle}>
                                    <MaterialCommunityIcons
                                        name={getIntentIcon() as any}
                                        size={36}
                                        color="#FFFFFF"
                                    />
                                </View>
                            </View>
                        )}

                        {/* Status text */}
                        <Text style={styles.statusText}>{getStatusText()}</Text>

                        {/* Transcript */}
                        {transcript ? (
                            <View style={styles.transcriptBox}>
                                <Text style={styles.transcriptLabel}>
                                    {voiceState === 'recording' ? '🎤' : '📝'}
                                </Text>
                                <Text style={styles.transcriptText} numberOfLines={3}>
                                    "{transcript}"
                                </Text>
                            </View>
                        ) : null}

                        {/* Response text */}
                        {responseText && voiceState === 'speaking' ? (
                            <View style={styles.responseBox}>
                                <Text style={styles.responseText} numberOfLines={4}>
                                    {responseText}
                                </Text>
                            </View>
                        ) : null}

                        {/* Hint (Only when NOT recording, since the button says it now) */}
                        {voiceState !== 'recording' && voiceState !== 'speaking' && (
                            <Text style={styles.hintText}>
                                {t('tap_to_speak' as any) || '...'}
                            </Text>
                        )}
                    </LinearGradient>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    closeArea: {
        flex: 1,
    },
    card: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    cardGradient: {
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 24,
        alignItems: 'center',
        minHeight: 280,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },

    // Sound waves
    recordingAction: {
        alignItems: 'center',
        marginTop: 20,
    },
    waveContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        gap: 6,
        marginBottom: 16,
    },
    waveBar: {
        width: 6,
        height: 60,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    stopIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    stopText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },

    // Processing
    processingContainer: {
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    processingDot: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Intent
    intentContainer: {
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    intentCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Text
    statusText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginTop: 16,
        textAlign: 'center',
    },
    transcriptBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 16,
        maxWidth: SCREEN_WIDTH - 60,
    },
    transcriptLabel: {
        fontSize: 16,
        marginRight: 8,
    },
    transcriptText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontStyle: 'italic',
        flex: 1,
        lineHeight: 22,
    },
    responseBox: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 12,
        maxWidth: SCREEN_WIDTH - 60,
    },
    responseText: {
        fontSize: 15,
        color: '#FFFFFF',
        lineHeight: 22,
    },
    hintText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 16,
    },
});
