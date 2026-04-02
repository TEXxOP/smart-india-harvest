import React, { createContext, useState, useContext, useRef, useCallback } from 'react';
import {
    startRecording,
    stopRecording,
    sendVoiceCommand,
    speakText,
    stopSpeaking,
    VoiceResponse,
} from '../services/voiceService';
import { useTranslation } from './TranslationContext';

export type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

interface VoiceContextType {
    // State
    voiceState: VoiceState;
    transcript: string;
    responseText: string;
    lastIntent: string | null;
    lastNavigateTo: string | null;
    errorMessage: string;

    // Actions
    startVoice: () => Promise<void>;
    stopVoice: () => Promise<VoiceResponse | null>;
    cancelVoice: () => void;
    speakResponse: (text: string) => Promise<void>;

    // Navigation callback — set by the component that has navigation access
    setNavigationHandler: (handler: (screen: string) => void) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { language } = useTranslation();
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [transcript, setTranscript] = useState('');
    const [responseText, setResponseText] = useState('');
    const [lastIntent, setLastIntent] = useState<string | null>(null);
    const [lastNavigateTo, setLastNavigateTo] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const navigationHandlerRef = useRef<((screen: string) => void) | null>(null);

    const setNavigationHandler = useCallback((handler: (screen: string) => void) => {
        navigationHandlerRef.current = handler;
    }, []);

    const startVoice = useCallback(async () => {
        try {
            setVoiceState('recording');
            setTranscript('');
            setResponseText('');
            setLastIntent(null);
            setLastNavigateTo(null);
            setErrorMessage('');
            await startRecording();
        } catch (error) {
            console.error('startVoice error:', error);
            setVoiceState('error');
            setErrorMessage(String(error));
        }
    }, []);

    const stopVoice = useCallback(async (): Promise<VoiceResponse | null> => {
        try {
            setVoiceState('processing');
            const audioUri = await stopRecording();

            if (!audioUri) {
                setVoiceState('error');
                setErrorMessage('No audio recorded');
                return null;
            }

            // Send to backend for transcription + intent detection
            const result = await sendVoiceCommand(audioUri, language);

            if (!result.success) {
                setVoiceState('error');
                setErrorMessage(result.error || 'Voice command failed');
                return result;
            }

            setTranscript(result.transcript);
            setResponseText(result.response_text);
            setLastIntent(result.intent);
            setLastNavigateTo(result.navigate_to);

            // Speak the response
            if (result.response_text) {
                setVoiceState('speaking');
                await speakText(result.response_text, language);
            }

            // Navigate if needed
            if (result.navigate_to && navigationHandlerRef.current) {
                // Small delay to let the speech start before navigating
                setTimeout(() => {
                    if (navigationHandlerRef.current && result.navigate_to) {
                        navigationHandlerRef.current(result.navigate_to);
                    }
                }, 500);
            }

            setVoiceState('idle');
            return result;
        } catch (error) {
            console.error('stopVoice error:', error);
            setVoiceState('error');
            setErrorMessage(String(error));
            return null;
        }
    }, [language]);

    const cancelVoice = useCallback(() => {
        stopRecording();
        stopSpeaking();
        setVoiceState('idle');
        setTranscript('');
        setResponseText('');
        setErrorMessage('');
    }, []);

    const speakResponse = useCallback(async (text: string) => {
        try {
            setVoiceState('speaking');
            await speakText(text, language);
            setVoiceState('idle');
        } catch (error) {
            console.error('speakResponse error:', error);
            setVoiceState('idle');
        }
    }, [language]);

    return (
        <VoiceContext.Provider
            value={{
                voiceState,
                transcript,
                responseText,
                lastIntent,
                lastNavigateTo,
                errorMessage,
                startVoice,
                stopVoice,
                cancelVoice,
                speakResponse,
                setNavigationHandler,
            }}
        >
            {children}
        </VoiceContext.Provider>
    );
};

export const useVoice = () => {
    const context = useContext(VoiceContext);
    if (!context) {
        throw new Error('useVoice must be used within a VoiceProvider');
    }
    return context;
};
