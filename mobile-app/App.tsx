import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { TranslationProvider } from './src/context/TranslationContext';
import { VoiceProvider } from './src/context/VoiceContext';
import { initNetworkMonitoring } from './src/services/networkService';
import { initOfflineQueue, QueuedItem } from './src/services/offlineQueue';
import { detectDisease } from './src/services/diseaseService';

export default function App() {
    useEffect(() => {
        // Initialize network connectivity monitoring
        initNetworkMonitoring();

        // Initialize offline queue — auto-processes when back online
        initOfflineQueue(async (item: QueuedItem) => {
            const result = await detectDisease(item.imageUri);
            return result;
        });
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <TranslationProvider>
                <VoiceProvider>
                    <AppNavigator />
                </VoiceProvider>
            </TranslationProvider>
        </GestureHandlerRootView>
    );
}
