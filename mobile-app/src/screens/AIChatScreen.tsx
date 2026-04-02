import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { sendMessage, ChatMessage } from '../services/aiService';
import { useTranslation } from '../context/TranslationContext';
import { startRecording, stopRecording, sendVoiceCommand, speakText, stopSpeaking } from '../services/voiceService';
import { ConfidenceBadge, SourceTags } from '../components/ExplainabilityComponents';

type RootStackParamList = { Home: undefined; AIChat: undefined };
type AIChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AIChat'>;
interface Props { navigation: AIChatScreenNavigationProp; }

export default function AIChatScreen({ navigation }: Props) {
    const { t, language } = useTranslation();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isContextLoading, setIsContextLoading] = useState(true);
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Simulate context loading (weather + location)
        const timer = setTimeout(() => {
            setIsContextLoading(false);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }, 800);
        return () => {
            clearTimeout(timer);
            stopSpeaking();
        };
    }, []);

    const QUICK_PROMPTS = [
        { label: `🌾 ${t('prompt_crop')}`, prompt: t('prompt_crop') },
        { label: `🐛 ${t('prompt_pest')}`, prompt: t('prompt_pest') },
        { label: `💧 ${t('prompt_water')}`, prompt: t('prompt_water') },
        { label: `🌱 ${t('prompt_soil')}`, prompt: t('prompt_soil') },
    ];

    const handleSpeak = (text: string, index: number) => {
        if (speakingIndex === index) {
            stopSpeaking();
            setSpeakingIndex(null);
        } else {
            stopSpeaking();
            setSpeakingIndex(index);
            speakText(text, language).finally(() => {
                setSpeakingIndex(curr => curr === index ? null : curr);
            });
        }
    };

    const handleSend = async (text?: string) => {
        const messageText = text || inputText.trim();
        if (!messageText || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', text: messageText, timestamp: new Date() };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInputText('');
        setIsLoading(true);

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const reply = await sendMessage(messageText, updatedMessages, language); // pass prev context
            const botMsg: ChatMessage = { role: 'model', text: reply, timestamp: new Date() };
            setMessages([...updatedMessages, botMsg]);
            // Automatically read out response
            setTimeout(() => handleSpeak(reply, updatedMessages.length), 500);
        } catch {
            const errMsg: ChatMessage = { role: 'model', text: t('error_msg'), timestamp: new Date() };
            setMessages([...updatedMessages, errMsg]);
        } finally {
            setIsLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
        }
    };

    // Voice input handler for chat
    const handleVoiceInput = async () => {
        if (isVoiceRecording) {
            // Stop recording and process
            setIsVoiceRecording(false);
            setIsVoiceProcessing(true);
            try {
                const audioUri = await stopRecording();
                if (!audioUri) return;

                const result = await sendVoiceCommand(audioUri, language);
                if (result.success && result.transcript) {
                    // Use the transcript as the user's message
                    await handleSend(result.transcript);
                }
            } catch (error) {
                console.error('Voice input error:', error);
            } finally {
                setIsVoiceProcessing(false);
            }
        } else {
            // Start recording
            try {
                await startRecording();
                setIsVoiceRecording(true);
                stopSpeaking(); // stop any current speech
                setSpeakingIndex(null);
            } catch (error) {
                console.error('Failed to start recording:', error);
            }
        }
    };

    const renderMessage = ({ item, index }: { item: ChatMessage, index: number }) => {
        const isUser = item.role === 'user';
        const isSpeaking = speakingIndex === index;

        return (
            <View style={[styles.messageBubbleRow, isUser && styles.userRow]}>
                {!isUser && (
                    <View style={styles.botAvatar}>
                        <MaterialCommunityIcons name="robot-happy" size={20} color="#4CAF50" />
                    </View>
                )}
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                    <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
                        {item.text}
                    </Text>
                    <View style={styles.bubbleFooter}>
                        {!isUser && (
                            <TouchableOpacity onPress={() => handleSpeak(item.text, index)} hitSlop={10}>
                                <Ionicons 
                                    name={isSpeaking ? "volume-high" : "volume-medium-outline"} 
                                    size={16} 
                                    color={isSpeaking ? "#16A34A" : "#64748B"} 
                                    style={{ marginRight: 8 }}
                                />
                            </TouchableOpacity>
                        )}
                        <Text style={[styles.timeText, isUser && styles.userTimeText]}>
                            {item.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    {!isUser && (
                        <View style={{ marginTop: 8, gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                            <ConfidenceBadge level="high" score={92} lang={language} compact />
                            <SourceTags sources={['agronomic', 'ml_model']} lang={language} />
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <LinearGradient colors={['#1B5E20', '#2E7D32', '#43A047']} style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.headerAvatar}>
                        <MaterialCommunityIcons name="robot-happy" size={24} color="#4CAF50" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>{t('chat_title')}</Text>
                        <Text style={styles.headerSub}>
                            {isLoading ? t('typing') : t('chat_subtitle')}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setMessages([])}
                >
                    <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
            </LinearGradient>

            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {/* Messages list */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(_, i) => i.toString()}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        messages.length === 0 ? (
                            <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim }]}>
                                {isContextLoading ? (
                                    <View style={styles.contextLoading}>
                                        <ActivityIndicator size="small" color="#4CAF50" />
                                        <Text style={styles.contextText}>{t('loading')}</Text>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.welcomeIcon}>
                                            <MaterialCommunityIcons name="robot-happy-outline" size={48} color="#4CAF50" />
                                        </View>
                                        <Text style={styles.welcomeTitle}>{t('welcome_chat_title')}</Text>
                                        <Text style={styles.welcomeSubtitle}>
                                            {t('welcome_chat_desc')}
                                        </Text>

                                        <Text style={styles.promptsLabel}>{t('quick_ask')}</Text>
                                        <View style={styles.quickPrompts}>
                                            {QUICK_PROMPTS.map((qp, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={styles.quickChip}
                                                    onPress={() => handleSend(qp.prompt)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.quickChipText}>{qp.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}
                            </Animated.View>
                        ) : null
                    }
                    ListFooterComponent={
                        isLoading ? (
                            <View style={styles.typingRow}>
                                <View style={styles.botAvatar}>
                                    <MaterialCommunityIcons name="robot-happy" size={20} color="#4CAF50" />
                                </View>
                                <View style={styles.typingBubble}>
                                    <ActivityIndicator size="small" color="#4CAF50" />
                                    <Text style={styles.typingText}>{t('thinking')}</Text>
                                </View>
                            </View>
                        ) : null
                    }
                />

                {/* Input bar */}
                <View style={styles.inputBar}>
                    {/* Mic button */}
                    <TouchableOpacity
                        style={[
                            styles.micBtn,
                            isVoiceRecording && styles.micBtnRecording,
                            isVoiceProcessing && styles.micBtnProcessing,
                        ]}
                        onPress={handleVoiceInput}
                        disabled={isLoading || isVoiceProcessing}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={isVoiceRecording ? 'stop' : isVoiceProcessing ? 'hourglass-outline' : 'mic'}
                            size={20}
                            color={isVoiceRecording ? '#FFF' : '#2E7D32'}
                        />
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.textInput}
                            placeholder={isVoiceRecording ? (t('listening') || 'Listening...') : t('ask_placeholder')}
                            placeholderTextColor={isVoiceRecording ? '#EF4444' : '#94A3B8'}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                            editable={!isLoading && !isVoiceRecording}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
                        onPress={() => handleSend()}
                        disabled={!inputText.trim() || isLoading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="send" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    flex1: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 44,
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12, gap: 10 },
    headerAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
    clearBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },

    // Messages
    messagesList: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 12 },
    messageBubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    userRow: { justifyContent: 'flex-end' },
    botAvatar: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
        marginRight: 8,
    },
    bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    userBubble: {
        backgroundColor: '#2E7D32',
        borderBottomRightRadius: 4,
    },
    botBubble: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    },
    bubbleText: { fontSize: 15, lineHeight: 22, color: '#1E293B' },
    userBubbleText: { color: '#FFFFFF' },
    bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    timeText: { fontSize: 10, color: '#94A3B8', textAlign: 'right' },
    userTimeText: { color: 'rgba(255,255,255,0.6)' },

    // Typing indicator
    typingRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
    typingBubble: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    },
    typingText: { fontSize: 14, color: '#64748B' },

    // Welcome
    welcomeContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    contextLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
    contextText: { fontSize: 14, color: '#64748B' },
    welcomeIcon: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(76,175,80,0.1)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
    welcomeSubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    promptsLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 12 },
    quickPrompts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    quickChip: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1, borderColor: '#E2E8F0',
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    },
    quickChipText: { fontSize: 13, color: '#334155', fontWeight: '500' },

    // Input bar
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1, borderTopColor: '#F1F5F9',
    },
    inputWrapper: {
        flex: 1, backgroundColor: '#F1F5F9',
        borderRadius: 24, paddingHorizontal: 16,
        maxHeight: 100, marginRight: 8,
    },
    textInput: {
        fontSize: 15, color: '#1E293B',
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        maxHeight: 80,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#2E7D32',
        alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: '#A5D6A7' },

    // Mic button
    micBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#F0FDF4',
        borderWidth: 1.5, borderColor: '#2E7D32',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 8,
    },
    micBtnRecording: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    micBtnProcessing: {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
    },
});
