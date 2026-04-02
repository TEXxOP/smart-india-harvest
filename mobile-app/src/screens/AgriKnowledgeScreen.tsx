import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '../context/TranslationContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = StackNavigationProp<RootStackParamList, 'AgriKnowledge'>;
interface Props { navigation: NavProp; }

interface KnowledgeItem { id: string; icon: string; title: string; description: string; }

const KNOWLEDGE_EN: KnowledgeItem[] = [
    { id: '1', icon: '🌱', title: 'Soil Preparation', description: 'Before sowing, plough the field 2-3 times to break soil clods. Add farmyard manure (FYM) at 5-10 tonnes per hectare. Test soil pH and nutrient levels at your nearest KVK for best results.' },
    { id: '2', icon: '🌾', title: 'Crop Rotation', description: 'Rotate cereal crops (wheat, rice) with legumes (moong, chana) every season. Legumes fix nitrogen in soil naturally, reducing the need for urea by up to 25%. This also breaks pest cycles.' },
    { id: '3', icon: '💧', title: 'Water Management', description: 'Use drip or sprinkler irrigation to save 30-50% water compared to flood irrigation. Water crops early morning or late evening to minimise evaporation. Mulching with straw reduces water loss by 20%.' },
    { id: '4', icon: '🐛', title: 'Integrated Pest Management', description: 'Use neem oil spray (5ml/litre) as a natural pesticide. Install pheromone traps for bollworm in cotton. Encourage natural predators like ladybugs. Only use chemical pesticides as a last resort.' },
    { id: '5', icon: '🧪', title: 'Soil Health Card', description: 'Get your Soil Health Card from the government. It tells exact NPK (Nitrogen, Phosphorus, Potassium) levels in your soil. Apply fertilizers based on card recommendations to save money and boost yield.' },
    { id: '6', icon: '🌿', title: 'Organic Farming', description: 'Use vermicompost (2-3 tonnes/hectare) as organic manure. Prepare jeevamrut (cow dung + jaggery + gram flour fermented) for natural soil enrichment. Organic produce fetches 20-30% higher market price.' },
];

const KNOWLEDGE_HI: KnowledgeItem[] = [
    { id: '1', icon: '🌱', title: 'मिट्टी की तैयारी', description: 'बुवाई से पहले खेत की 2-3 बार जुताई करें ताकि मिट्टी के ढेले टूट जाएं। खेत में 5-10 टन प्रति हेक्टेयर गोबर की खाद डालें। अपने नजदीकी KVK से मिट्टी की जांच करवाएं।' },
    { id: '2', icon: '🌾', title: 'फसल चक्र', description: 'हर मौसम में अनाज की फसल (गेहूं, चावल) के बाद दलहन (मूंग, चना) लगाएं। दलहन मिट्टी में नाइट्रोजन बढ़ाते हैं जिससे यूरिया की जरूरत 25% तक कम होती है।' },
    { id: '3', icon: '💧', title: 'जल प्रबंधन', description: 'बाढ़ सिंचाई की जगह ड्रिप या स्प्रिंकलर सिंचाई से 30-50% पानी बचाएं। सुबह जल्दी या शाम को सिंचाई करें। पुआल की मल्चिंग से 20% पानी कम खर्च होता है।' },
    { id: '4', icon: '🐛', title: 'समन्वित कीट प्रबंधन', description: 'नीम तेल का छिड़काव (5 मिली/लीटर) प्राकृतिक कीटनाशक के रूप में करें। कपास में बॉलवर्म के लिए फेरोमोन ट्रैप लगाएं। रासायनिक कीटनाशक अंतिम उपाय के रूप में ही उपयोग करें।' },
    { id: '5', icon: '🧪', title: 'सॉइल हेल्थ कार्ड', description: 'सरकार से अपना सॉइल हेल्थ कार्ड बनवाएं। इसमें मिट्टी में NPK का सही स्तर बताया जाता है। कार्ड की सिफारिश के अनुसार खाद डालें — पैसे बचेंगे और पैदावार बढ़ेगी।' },
    { id: '6', icon: '🌿', title: 'जैविक खेती', description: 'वर्मीकम्पोस्ट (2-3 टन/हेक्टेयर) जैविक खाद के रूप में उपयोग करें। जीवामृत (गोबर + गुड़ + बेसन) से मिट्टी की उर्वरता बढ़ाएं। जैविक उत्पाद बाजार में 20-30% अधिक दाम पर बिकते हैं।' },
];

const KNOWLEDGE_PA: KnowledgeItem[] = [
    { id: '1', icon: '🌱', title: 'ਮਿੱਟੀ ਦੀ ਤਿਆਰੀ', description: 'ਬਿਜਾਈ ਤੋਂ ਪਹਿਲਾਂ ਖੇਤ ਦੀ 2-3 ਵਾਰ ਵਾਹੀ ਕਰੋ ਤਾਂ ਜੋ ਮਿੱਟੀ ਦੇ ਡਲੇ ਟੁੱਟ ਜਾਣ। 5-10 ਟਨ ਪ੍ਰਤੀ ਹੈਕਟੇਅਰ ਰੂੜੀ ਦੀ ਖਾਦ ਪਾਓ। ਆਪਣੇ ਨੇੜੇ ਦੇ KVK ਤੋਂ ਮਿੱਟੀ ਦੀ ਜਾਂਚ ਕਰਵਾਓ।' },
    { id: '2', icon: '🌾', title: 'ਫਸਲ ਚੱਕਰ', description: 'ਹਰ ਸੀਜ਼ਨ ਅਨਾਜ (ਕਣਕ, ਝੋਨਾ) ਤੋਂ ਬਾਅਦ ਦਾਲਾਂ (ਮੂੰਗੀ, ਛੋਲੇ) ਬੀਜੋ। ਦਾਲਾਂ ਮਿੱਟੀ ਵਿੱਚ ਨਾਈਟ੍ਰੋਜਨ ਵਧਾਉਂਦੀਆਂ ਹਨ ਜਿਸ ਨਾਲ ਯੂਰੀਆ ਦੀ ਲੋੜ 25% ਘੱਟ ਹੁੰਦੀ ਹੈ।' },
    { id: '3', icon: '💧', title: 'ਪਾਣੀ ਦਾ ਪ੍ਰਬੰਧ', description: 'ਡ੍ਰਿੱਪ ਜਾਂ ਸਪ੍ਰਿੰਕਲਰ ਸਿੰਚਾਈ ਨਾਲ 30-50% ਪਾਣੀ ਬਚਾਓ। ਸਵੇਰੇ ਜਾਂ ਸ਼ਾਮ ਨੂੰ ਸਿੰਚਾਈ ਕਰੋ। ਪਰਾਲੀ ਦੀ ਮਲਚਿੰਗ ਨਾਲ 20% ਪਾਣੀ ਘੱਟ ਲੱਗਦਾ ਹੈ।' },
    { id: '4', icon: '🐛', title: 'ਕੀੜੇ-ਮਕੌੜਿਆਂ ਦਾ ਪ੍ਰਬੰਧ', description: 'ਨਿੰਮ ਦੇ ਤੇਲ ਦਾ ਛਿੜਕਾਅ (5 ਮਿਲੀ/ਲੀਟਰ) ਕੁਦਰਤੀ ਕੀਟਨਾਸ਼ਕ ਵਜੋਂ ਕਰੋ। ਨਰਮੇ ਵਿੱਚ ਸੁੰਡੀ ਲਈ ਫੇਰੋਮੋਨ ਟ੍ਰੈਪ ਲਗਾਓ। ਰਸਾਇਣਕ ਕੀਟਨਾਸ਼ਕਾਂ ਸਿਰਫ਼ ਆਖ਼ਰੀ ਉਪਾਅ ਵਜੋਂ ਵਰਤੋ।' },
    { id: '5', icon: '🧪', title: 'ਮਿੱਟੀ ਸਿਹਤ ਕਾਰਡ', description: 'ਸਰਕਾਰ ਤੋਂ ਆਪਣਾ ਮਿੱਟੀ ਸਿਹਤ ਕਾਰਡ ਬਣਵਾਓ। ਇਸ ਵਿੱਚ NPK ਦਾ ਸਹੀ ਪੱਧਰ ਦੱਸਿਆ ਜਾਂਦਾ ਹੈ। ਕਾਰਡ ਦੀ ਸਿਫ਼ਾਰਿਸ਼ ਮੁਤਾਬਿਕ ਖਾਦ ਪਾਓ।' },
    { id: '6', icon: '🌿', title: 'ਜੈਵਿਕ ਖੇਤੀ', description: 'ਵਰਮੀਕੰਪੋਸਟ (2-3 ਟਨ/ਹੈਕਟੇਅਰ) ਪਾਓ। ਜੀਵਾਮ੍ਰਿਤ (ਗੋਹੇ + ਗੁੜ + ਬੇਸਣ) ਮਿੱਟੀ ਦੀ ਤਾਕਤ ਵਧਾਉਂਦਾ ਹੈ। ਜੈਵਿਕ ਉਤਪਾਦ ਬਾਜ਼ਾਰ ਵਿੱਚ 20-30% ਵੱਧ ਕੀਮਤ ਤੇ ਵਿਕਦੇ ਹਨ।' },
];

export default function AgriKnowledgeScreen({ navigation }: Props) {
    const { t, language } = useTranslation();

    const data = language === 'hi' ? KNOWLEDGE_HI : language === 'pa' ? KNOWLEDGE_PA : KNOWLEDGE_EN;

    const renderItem = ({ item }: { item: KnowledgeItem }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            <Text style={styles.cardDescription}>{item.description}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('agri_knowledge')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <FlatList
                data={data}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FAFAF9' },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    },
    backButton: { padding: 8, marginLeft: -8, width: 44 },
    headerTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
    listContainer: { padding: 16, paddingBottom: 40 },
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: '#F1F5F9',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardIcon: { fontSize: 28, marginRight: 12 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', flex: 1 },
    cardDescription: { fontSize: 15, lineHeight: 24, color: '#334155' },
});
