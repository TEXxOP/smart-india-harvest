import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { BACKEND_URL } from '../config';

// ── Language locale mapping ──
const LOCALE_MAP: Record<string, string> = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'pa': 'pa-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'bn': 'bn-IN',
    'mr': 'mr-IN',
};

// ── Audio Recording ──

let currentRecording: Audio.Recording | null = null;

export async function startRecording(): Promise<void> {
    try {
        // Request permissions
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Microphone permission not granted');
        }

        // Set audio mode for recording
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        // Start recording with high quality preset
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        await recording.startAsync();
        currentRecording = recording;
    } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
    }
}

export async function stopRecording(): Promise<string | null> {
    if (!currentRecording) return null;

    try {
        await currentRecording.stopAndUnloadAsync();
        const uri = currentRecording.getURI();
        currentRecording = null;

        // Reset audio mode
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
        });

        return uri;
    } catch (error) {
        console.error('Failed to stop recording:', error);
        currentRecording = null;
        return null;
    }
}

export function isRecording(): boolean {
    return currentRecording !== null;
}

// ── Voice Command: Send audio to backend ──

export interface VoiceResponse {
    success: boolean;
    transcript: string;
    intent: string | null;
    navigate_to: string | null;
    response_text: string;
    error?: string;
}

export async function sendVoiceCommand(
    audioUri: string,
    langCode: string = 'hi'
): Promise<VoiceResponse> {
    try {
        // Create FormData with the audio file
        const formData = new FormData();
        formData.append('file', {
            uri: audioUri,
            name: 'recording.m4a',
            type: 'audio/m4a',
        } as any);
        formData.append('lang_code', langCode);

        // Send to backend
        const response = await fetch(`${BACKEND_URL}/api/voice`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Voice API error:', errorText);
            throw new Error(`Server error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('sendVoiceCommand error:', error);
        return {
            success: false,
            transcript: '',
            intent: null,
            navigate_to: null,
            response_text: '',
            error: String(error),
        };
    }
}

// ── Text-to-Speech ──

export async function speakText(
    text: string,
    langCode: string = 'hi'
): Promise<void> {
    const locale = LOCALE_MAP[langCode] || 'hi-IN';

    return new Promise((resolve, reject) => {
        Speech.speak(text, {
            language: locale,
            pitch: 1.0,
            rate: 0.9, // Slightly slower for clarity
            onDone: () => resolve(),
            onError: (error) => {
                console.error('TTS error:', error);
                reject(error);
            },
        });
    });
}

export function stopSpeaking(): void {
    Speech.stop();
}

export async function isSpeakingNow(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
}

// ── Check TTS availability ──

export async function checkVoiceAvailability(langCode: string): Promise<boolean> {
    try {
        const voices = await Speech.getAvailableVoicesAsync();
        const locale = LOCALE_MAP[langCode] || 'hi-IN';
        return voices.some(v => v.language.startsWith(locale.split('-')[0]));
    } catch {
        return false;
    }
}
