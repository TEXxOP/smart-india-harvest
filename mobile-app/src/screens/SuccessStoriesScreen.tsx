import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    Modal, 
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../context/TranslationContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type SuccessStoriesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SuccessStories'>;

interface Props {
    navigation: SuccessStoriesScreenNavigationProp;
}

interface Story {
    id: string;
    name: string;
    location: string;
    crop: string;
    title: string;
    story: string;
    image: string;
}

// -----------------------------------------------------
// Dynamic Story Feeds Depending on Language
// -----------------------------------------------------

const STORIES_EN: Story[] = [
    {
        id: 'en_1',
        name: 'Ramesh Singh',
        location: 'Punjab',
        crop: 'Wheat',
        title: 'Doubled My Wheat Yield',
        story: "Using AgriDSS's irrigation advisory, I was able to optimize my water usage and prevent waterlogging. Combined with precise NPK recommendations, my wheat yield doubled this season compared to last year.",
        image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400',
    },
    {
        id: 'en_2',
        name: 'Sunita Devi',
        location: 'Haryana',
        crop: 'Mustard',
        title: 'Saved Crop from Blight',
        story: "The disease detection feature helped me identify early blight on my mustard leaves. The suggested remedy worked perfectly, and I saved my entire field from what could have been a disaster.",
        image: 'https://images.unsplash.com/photo-1592982537447-6f2a6a0c5c10?auto=format&fit=crop&q=80&w=400',
    }
];

const STORIES_HI: Story[] = [
    {
        id: 'hi_1',
        name: 'राम निवास शर्मा',
        location: 'उत्तर प्रदेश',
        crop: 'गन्ना',
        title: 'सिंचाई का सही समय',
        story: "कृषि मित्र ऐप के मौसम अलर्ट और सिंचाई सलाह से मैंने अपने गन्ने की खेती में पानी का सही प्रबंधन किया। मेरी पैदावार में 30% की वृद्धि हुई और लागत भी कम आई।",
        image: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=400',
    },
    {
        id: 'hi_2',
        name: 'अनिता देवी',
        location: 'मध्य प्रदेश',
        crop: 'सोयाबीन',
        title: 'कीटों से बचाव',
        story: "मैंने फोटो खींचकर सोयाबीन के पत्तों की बीमारी का पता लगाया। ऐप ने सही दवा बताई और मेरी पूरी फसल बर्बाद होने से बच गई। यह ऐप सच में बहुत मददगार है।",
        image: 'https://images.unsplash.com/photo-1625244565612-4091ebd7f9bc?auto=format&fit=crop&q=80&w=400',
    }
];

const STORIES_PA: Story[] = [
    {
        id: 'pa_1',
        name: 'ਹਰਪ੍ਰੀਤ ਸਿੰਘ',
        location: 'ਪੰਜਾਬ',
        crop: 'ਕਣਕ',
        title: 'ਸਮੇਂ ਸਿਰ ਮੌਸਮ ਦੀ ਜਾਣਕਾਰੀ',
        story: "ਐਪ ਨੇ ਮੈਨੂੰ ਪਹਿਲਾਂ ਹੀ ਮੀਂਹ ਬਾਰੇ ਦੱਸ ਦਿੱਤਾ ਸੀ। ਮੈਂ ਕਣਕ ਦੀ ਵਾਢੀ ਸਮੇਂ ਸਿਰ ਕਰ ਲਈ ਅਤੇ ਮੇਰੀ ਫਸਲ ਖਰਾਬ ਹੋਣ ਤੋਂ ਬਚ ਗਈ। ਇਹ ਐਪ ਹਰ ਕਿਸਾਨ ਕੋਲ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।",
        image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400',
    },
    {
        id: 'pa_2',
        name: 'ਗੁਰਮੀਤ ਕੌਰ',
        location: 'ਪੰਜਾਬ',
        crop: 'ਝੋਨਾ',
        title: 'ਖਾਦ ਦੀ ਸਹੀ ਵਰਤੋਂ',
        story: "ਮਿੱਟੀ ਦੀ ਜਾਂਚ ਮੁਤਾਬਕ ਐਪ ਨੇ ਮੈਨੂੰ ਸਹੀ ਖਾਦ ਪਾਉਣ ਦੀ ਸਲਾਹ ਦਿੱਤੀ। ਇਸ ਵਾਰ ਮੇਰਾ ਝਾੜ ਬਹੁਤ ਵਧੀਆ ਰਿਹਾ ਅਤੇ ਜ਼ਮੀਨ ਦੀ ਸਿਹਤ ਵੀ ਠੀਕ ਰਹੀ।",
        image: 'https://images.unsplash.com/photo-1592982537447-6f2a6a0c5c10?auto=format&fit=crop&q=80&w=400',
    }
];

const STORAGE_KEY = '@user_success_stories';

export default function SuccessStoriesScreen({ navigation }: Props) {
    const { t, language } = useTranslation();
    const [feed, setFeed] = useState<Story[]>([]);
    
    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [formName, setFormName] = useState('');
    const [formCrop, setFormCrop] = useState('');
    const [formStory, setFormStory] = useState('');
    const [formImage, setFormImage] = useState('');

    useEffect(() => {
        loadStories();
    }, [language]);

    const loadStories = async () => {
        let baseFeed = STORIES_EN;
        if (language === 'hi') baseFeed = STORIES_HI;
        if (language === 'pa') baseFeed = STORIES_PA;

        try {
            const savedData = await AsyncStorage.getItem(STORAGE_KEY);
            if (savedData) {
                const userStories: Story[] = JSON.parse(savedData);
                // Prepend user stories to the base feed
                setFeed([...userStories.reverse(), ...baseFeed]);
            } else {
                setFeed(baseFeed);
            }
        } catch (error) {
            console.error('Failed to load user stories', error);
            setFeed(baseFeed);
        }
    };

    const handleSubmitStory = async () => {
        if (!formName.trim() || !formStory.trim() || !formCrop.trim()) return;

        const newStory: Story = {
            id: Date.now().toString(),
            name: formName,
            location: 'Local Farmer', // Default
            crop: formCrop,
            title: 'My Experience', // Default title for user stories
            story: formStory,
            image: formImage || 'https://images.unsplash.com/photo-1595295413110-33db1ca375ba?auto=format&fit=crop&q=80&w=400', // Default generic farm image
        };

        try {
            const existingData = await AsyncStorage.getItem(STORAGE_KEY);
            const currentStories = existingData ? JSON.parse(existingData) : [];
            currentStories.push(newStory);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentStories));
            
            // Reload feed & close modal
            loadStories();
            setModalVisible(false);
            setFormName('');
            setFormCrop('');
            setFormStory('');
            setFormImage('');
        } catch (error) {
            console.error('Failed to save story', error);
        }
    };

    const renderItem = ({ item }: { item: Story }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                    <Text style={styles.cropBadge}>{item.crop}</Text>
                    <Text style={styles.locationText}>
                        <Ionicons name="location" size={13} color="#16A34A" /> {item.location}
                    </Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.storyText} numberOfLines={4}>{item.story}</Text>
                
                <View style={styles.footerRow}>
                    <Text style={styles.author}>{t('story_by')}: {item.name}</Text>
                    <TouchableOpacity style={styles.readMoreBtn} activeOpacity={0.6}>
                        <Text style={styles.readMoreText}>{t('read_more')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('success_stories')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* List */}
            <FlatList
                data={feed}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />

            {/* Share Story FAB */}
            <TouchableOpacity 
                style={styles.fab} 
                activeOpacity={0.9}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="pencil" size={22} color="#FFFFFF" />
                <Text style={styles.fabText}>{t('share_story')}</Text>
            </TouchableOpacity>

            {/* Share Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                        style={styles.modalContainer}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('share_story')}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={28} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('name_placeholder')}
                                    placeholderTextColor="#94A3B8"
                                    value={formName}
                                    onChangeText={setFormName}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('crop_placeholder')}
                                    placeholderTextColor="#94A3B8"
                                    value={formCrop}
                                    onChangeText={setFormCrop}
                                />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder={t('story_placeholder')}
                                    placeholderTextColor="#94A3B8"
                                    multiline
                                    numberOfLines={4}
                                    value={formStory}
                                    onChangeText={setFormStory}
                                    textAlignVertical="top"
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('image_url_placeholder')}
                                    placeholderTextColor="#94A3B8"
                                    value={formImage}
                                    onChangeText={setFormImage}
                                    autoCapitalize="none"
                                />

                                <TouchableOpacity 
                                    style={styles.submitButton} 
                                    activeOpacity={0.8}
                                    onPress={handleSubmitStory}
                                >
                                    <Text style={styles.submitButtonText}>{t('submit')}</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.cancelButton} 
                                    activeOpacity={0.8}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FAFAF9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        width: 44,
    },
    headerTitle: {
        flex: 1,
        fontSize: 19,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 110,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardImage: {
        width: '100%',
        height: 180,
        backgroundColor: '#E2E8F0',
    },
    cardContent: {
        padding: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cropBadge: {
        backgroundColor: '#DCFCE7',
        color: '#16A34A',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 13,
        fontWeight: '700',
        overflow: 'hidden',
    },
    locationText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
        alignItems: 'center'
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 10,
        lineHeight: 26,
    },
    storyText: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 24,
        marginBottom: 20,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 16,
    },
    author: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    readMoreBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
    },
    readMoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2563EB',
    },
    fab: {
        position: 'absolute',
        bottom: 28,
        right: 20,
        backgroundColor: '#16A34A',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: 30,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    fabText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 10,
        letterSpacing: 0.3,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        maxHeight: '90%',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        minHeight: 500,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#0F172A',
        marginBottom: 16,
    },
    textArea: {
        minHeight: 120,
        paddingTop: 16,
    },
    submitButton: {
        backgroundColor: '#16A34A',
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    cancelButton: {
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    cancelButtonText: {
        color: '#64748B',
        fontSize: 17,
        fontWeight: '600',
    },
});
