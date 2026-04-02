/**
 * OfflineBanner Component
 * Animated banner that appears when the device is offline.
 * Shows "You are offline" message with cached data indicator.
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { onConnectivityChange, isOnline } from '../services/networkService';

interface OfflineBannerProps {
    lang?: 'en' | 'hi' | 'pa';
}

const MESSAGES = {
    en: { offline: '📡  You are offline', cached: 'Showing cached data' },
    hi: { offline: '📡  आप ऑफ़लाइन हैं', cached: 'कैश्ड डेटा दिखा रहे हैं' },
    pa: { offline: '📡  ਤੁਸੀਂ ਆਫ਼ਲਾਈਨ ਹੋ', cached: 'ਕੈਸ਼ਡ ਡਾਟਾ ਦਿਖਾ ਰਹੇ ਹਾਂ' },
};

export default function OfflineBanner({ lang = 'en' }: OfflineBannerProps) {
    const [offline, setOffline] = useState(!isOnline());
    const slideAnim = useRef(new Animated.Value(offline ? 0 : -60)).current;

    useEffect(() => {
        const unsubscribe = onConnectivityChange((connected) => {
            setOffline(!connected);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: offline ? 0 : -60,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, [offline]);

    if (!offline) return null;

    const msg = MESSAGES[lang] || MESSAGES.en;

    return (
        <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.offlineText}>{msg.offline}</Text>
            <Text style={styles.cachedText}>{msg.cached}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#FF6B35',
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 999,
    },
    offlineText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
        letterSpacing: 0.3,
    },
    cachedText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 11,
        fontStyle: 'italic',
    },
});
