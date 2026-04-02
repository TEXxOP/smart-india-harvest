import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '../context/TranslationContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = StackNavigationProp<RootStackParamList, 'GovSchemes'>;
interface Props { navigation: NavProp; }

interface Scheme { id: string; name: string; benefit: string; eligibility: string; description: string; color: string; url?: string; }

const SCHEMES_EN: Scheme[] = [
    {
        id: '1', name: 'PM-KISAN', color: '#16A34A',
        benefit: '₹6,000 per year (3 instalments of ₹2,000)',
        eligibility: 'All landholding farmer families',
        description: 'Pradhan Mantri Kisan Samman Nidhi provides direct income support of ₹6,000 per year to all farmer families across India, paid in three equal instalments every four months.',
        url: 'https://pmkisan.gov.in',
    },
    {
        id: '2', name: 'Kisan Credit Card (KCC)', color: '#2563EB',
        benefit: 'Loan up to ₹3 lakh at 4% interest',
        eligibility: 'All farmers, fishermen, animal husbandry farmers',
        description: 'KCC provides affordable short-term credit for crop production, post-harvest expenses, and maintenance of farm assets. Interest rate is just 4% per annum with timely repayment.',
        url: 'https://www.pmkisan.gov.in/kcc',
    },
    {
        id: '3', name: 'PMFBY', color: '#9333EA',
        benefit: 'Crop insurance at just 1.5-5% premium',
        eligibility: 'All farmers growing notified crops',
        description: 'Pradhan Mantri Fasal Bima Yojana provides crop insurance against natural calamities, pests, and diseases. Farmer pays only 1.5% premium for Rabi, 2% for Kharif, and 5% for horticulture crops.',
        url: 'https://pmfby.gov.in',
    },
    {
        id: '4', name: 'PMKSY', color: '#EA580C',
        benefit: '55-75% subsidy on micro-irrigation',
        eligibility: 'All farmers',
        description: 'Pradhan Mantri Krishi Sinchayee Yojana promotes efficient water use. Get 55% subsidy (75% for SC/ST/small farmers) on drip and sprinkler irrigation systems under the Har Khet Ko Pani scheme.',
    },
    {
        id: '5', name: 'Paramparagat Krishi Vikas Yojana (PKVY)', color: '#0891B2',
        benefit: '₹50,000 per hectare over 3 years',
        eligibility: 'Farmer groups (minimum 50 farmers, 50 acres)',
        description: 'PKVY promotes organic farming by providing ₹50,000 per hectare for 3 years. Covers organic inputs, seeds, certification, and marketing. Groups of 50+ farmers in a cluster can apply.',
    },
    {
        id: '6', name: 'eNAM (National Agriculture Market)', color: '#DC2626',
        benefit: 'Sell produce at best price online',
        eligibility: 'All farmers with produce to sell',
        description: 'eNAM is an online trading platform for agricultural commodities. It connects APMC mandis across India, allowing farmers to sell their produce at the best available price nationwide.',
        url: 'https://enam.gov.in',
    },
];

const SCHEMES_HI: Scheme[] = [
    {
        id: '1', name: 'पीएम-किसान', color: '#16A34A',
        benefit: '₹6,000 प्रति वर्ष (₹2,000 की 3 किश्तें)',
        eligibility: 'सभी भूमिधारक किसान परिवार',
        description: 'प्रधानमंत्री किसान सम्मान निधि योजना के तहत सभी किसान परिवारों को प्रति वर्ष ₹6,000 सीधे बैंक खाते में दिए जाते हैं। यह राशि हर चार महीने में ₹2,000 की किश्त में आती है।',
        url: 'https://pmkisan.gov.in',
    },
    {
        id: '2', name: 'किसान क्रेडिट कार्ड (KCC)', color: '#2563EB',
        benefit: '₹3 लाख तक का लोन 4% ब्याज पर',
        eligibility: 'सभी किसान, मछुआरे, पशुपालक',
        description: 'KCC से फसल उत्पादन, कटाई के बाद के खर्च और खेती के सामान के लिए सस्ता कर्ज मिलता है। समय पर भुगतान करने पर सिर्फ 4% ब्याज लगता है।',
    },
    {
        id: '3', name: 'पीएमएफबीवाई', color: '#9333EA',
        benefit: 'सिर्फ 1.5-5% प्रीमियम पर फसल बीमा',
        eligibility: 'अधिसूचित फसलें उगाने वाले सभी किसान',
        description: 'प्रधानमंत्री फसल बीमा योजना प्राकृतिक आपदाओं, कीटों और बीमारियों से फसल की सुरक्षा करती है। रबी में 1.5%, खरीफ में 2% और बागवानी में 5% प्रीमियम।',
        url: 'https://pmfby.gov.in',
    },
    {
        id: '4', name: 'पीएमकेएसवाई', color: '#EA580C',
        benefit: 'सूक्ष्म सिंचाई पर 55-75% सब्सिडी',
        eligibility: 'सभी किसान',
        description: 'प्रधानमंत्री कृषि सिंचाई योजना ड्रिप और स्प्रिंकलर सिंचाई पर 55% सब्सिडी देती है (SC/ST/छोटे किसानों को 75%)। हर खेत को पानी योजना के तहत।',
    },
    {
        id: '5', name: 'परम्परागत कृषि विकास योजना (PKVY)', color: '#0891B2',
        benefit: '3 साल में ₹50,000 प्रति हेक्टेयर',
        eligibility: 'किसान समूह (कम से कम 50 किसान, 50 एकड़)',
        description: 'PKVY जैविक खेती को बढ़ावा देती है। ₹50,000/हेक्टेयर जैविक खाद, बीज, प्रमाणन और मार्केटिंग के लिए मिलते हैं। 50+ किसानों का समूह आवेदन कर सकता है।',
    },
    {
        id: '6', name: 'ई-नाम (राष्ट्रीय कृषि बाजार)', color: '#DC2626',
        benefit: 'ऑनलाइन सबसे अच्छी कीमत पर बेचें',
        eligibility: 'सभी किसान',
        description: 'ई-नाम एक ऑनलाइन कृषि मंडी है। यह पूरे भारत की APMC मंडियों को जोड़ती है जिससे किसान अपनी उपज सबसे अच्छी कीमत पर बेच सकते हैं।',
        url: 'https://enam.gov.in',
    },
];

const SCHEMES_PA: Scheme[] = [
    {
        id: '1', name: 'ਪੀਐਮ-ਕਿਸਾਨ', color: '#16A34A',
        benefit: '₹6,000 ਪ੍ਰਤੀ ਸਾਲ (₹2,000 ਦੀਆਂ 3 ਕਿਸ਼ਤਾਂ)',
        eligibility: 'ਸਾਰੇ ਜ਼ਮੀਨ ਮਾਲਕ ਕਿਸਾਨ ਪਰਿਵਾਰ',
        description: 'ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਕਿਸਾਨ ਸਨਮਾਨ ਨਿਧੀ ਯੋਜਨਾ ਤਹਿਤ ਸਾਰੇ ਕਿਸਾਨ ਪਰਿਵਾਰਾਂ ਨੂੰ ₹6,000 ਸਾਲਾਨਾ ਸਿੱਧੇ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ ਮਿਲਦੇ ਹਨ।',
        url: 'https://pmkisan.gov.in',
    },
    {
        id: '2', name: 'ਕਿਸਾਨ ਕ੍ਰੈਡਿਟ ਕਾਰਡ (KCC)', color: '#2563EB',
        benefit: '₹3 ਲੱਖ ਤੱਕ ਕਰਜ਼ਾ 4% ਵਿਆਜ ਤੇ',
        eligibility: 'ਸਾਰੇ ਕਿਸਾਨ, ਮਛੇਰੇ, ਪਸ਼ੂ ਪਾਲਕ',
        description: 'KCC ਫਸਲ ਉਤਪਾਦਨ, ਵਾਢੀ ਤੋਂ ਬਾਅਦ ਦੇ ਖਰਚੇ ਅਤੇ ਖੇਤੀ ਸਾਮਾਨ ਲਈ ਸਸਤਾ ਕਰਜ਼ਾ ਦਿੰਦਾ ਹੈ। ਸਮੇਂ ਸਿਰ ਭੁਗਤਾਨ ਤੇ ਸਿਰਫ਼ 4% ਵਿਆਜ।',
    },
    {
        id: '3', name: 'ਪੀਐਮਐਫਬੀਵਾਈ', color: '#9333EA',
        benefit: 'ਸਿਰਫ਼ 1.5-5% ਪ੍ਰੀਮੀਅਮ ਤੇ ਫਸਲ ਬੀਮਾ',
        eligibility: 'ਅਧਿਸੂਚਿਤ ਫਸਲਾਂ ਉਗਾਉਣ ਵਾਲੇ ਸਾਰੇ ਕਿਸਾਨ',
        description: 'ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਫਸਲ ਬੀਮਾ ਯੋਜਨਾ ਕੁਦਰਤੀ ਆਫ਼ਤਾਂ, ਕੀੜਿਆਂ ਅਤੇ ਬਿਮਾਰੀਆਂ ਤੋਂ ਫਸਲ ਦੀ ਰੱਖਿਆ ਕਰਦੀ ਹੈ।',
        url: 'https://pmfby.gov.in',
    },
    {
        id: '4', name: 'ਪੀਐਮਕੇਐਸਵਾਈ', color: '#EA580C',
        benefit: 'ਸੂਖਮ ਸਿੰਚਾਈ ਤੇ 55-75% ਸਬਸਿਡੀ',
        eligibility: 'ਸਾਰੇ ਕਿਸਾਨ',
        description: 'ਡ੍ਰਿੱਪ ਅਤੇ ਸਪ੍ਰਿੰਕਲਰ ਸਿੰਚਾਈ ਤੇ 55% ਸਬਸਿਡੀ (SC/ST/ਛੋਟੇ ਕਿਸਾਨਾਂ ਲਈ 75%)। ਹਰ ਖੇਤ ਕੋ ਪਾਣੀ ਯੋਜਨਾ ਤਹਿਤ।',
    },
    {
        id: '5', name: 'ਪਰੰਪਰਾਗਤ ਕ੍ਰਿਸ਼ੀ ਵਿਕਾਸ ਯੋਜਨਾ (PKVY)', color: '#0891B2',
        benefit: '3 ਸਾਲਾਂ ਵਿੱਚ ₹50,000 ਪ੍ਰਤੀ ਹੈਕਟੇਅਰ',
        eligibility: 'ਕਿਸਾਨ ਸਮੂਹ (ਘੱਟੋ-ਘੱਟ 50 ਕਿਸਾਨ)',
        description: 'PKVY ਜੈਵਿਕ ਖੇਤੀ ਨੂੰ ਉਤਸ਼ਾਹਿਤ ਕਰਦੀ ਹੈ। ₹50,000/ਹੈਕਟੇਅਰ ਜੈਵਿਕ ਖਾਦ, ਬੀਜ ਅਤੇ ਮਾਰਕੀਟਿੰਗ ਲਈ ਮਿਲਦੇ ਹਨ।',
    },
    {
        id: '6', name: 'ਈ-ਨਾਮ (ਰਾਸ਼ਟਰੀ ਖੇਤੀ ਬਾਜ਼ਾਰ)', color: '#DC2626',
        benefit: 'ਔਨਲਾਈਨ ਸਭ ਤੋਂ ਵਧੀਆ ਕੀਮਤ ਤੇ ਵੇਚੋ',
        eligibility: 'ਸਾਰੇ ਕਿਸਾਨ',
        description: 'ਈ-ਨਾਮ ਇੱਕ ਔਨਲਾਈਨ ਖੇਤੀ ਮੰਡੀ ਹੈ। ਇਹ ਪੂਰੇ ਭਾਰਤ ਦੀਆਂ APMC ਮੰਡੀਆਂ ਨੂੰ ਜੋੜਦੀ ਹੈ।',
        url: 'https://enam.gov.in',
    },
];

export default function GovSchemesScreen({ navigation }: Props) {
    const { t, language } = useTranslation();

    const data = language === 'hi' ? SCHEMES_HI : language === 'pa' ? SCHEMES_PA : SCHEMES_EN;

    const renderItem = ({ item }: { item: Scheme }) => (
        <View style={styles.card}>
            <View style={[styles.colorStrip, { backgroundColor: item.color }]} />
            <View style={styles.cardContent}>
                <Text style={[styles.schemeName, { color: item.color }]}>{item.name}</Text>
                
                <View style={styles.benefitRow}>
                    <Ionicons name="gift-outline" size={16} color="#16A34A" />
                    <Text style={styles.benefitText}>{item.benefit}</Text>
                </View>

                <View style={styles.benefitRow}>
                    <Ionicons name="people-outline" size={16} color="#2563EB" />
                    <Text style={styles.eligibilityText}>{item.eligibility}</Text>
                </View>

                <Text style={styles.descriptionText}>{item.description}</Text>

                {item.url && (
                    <TouchableOpacity
                        style={[styles.linkButton, { backgroundColor: item.color + '15' }]}
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL(item.url!)}
                    >
                        <Text style={[styles.linkButtonText, { color: item.color }]}>
                            {t('learn_more')} →
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('gov_schemes')}</Text>
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
        backgroundColor: '#FFFFFF', borderRadius: 18, marginBottom: 16, overflow: 'hidden',
        flexDirection: 'row', borderWidth: 1, borderColor: '#F1F5F9',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    colorStrip: { width: 5 },
    cardContent: { flex: 1, padding: 18 },
    schemeName: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    benefitText: { fontSize: 14, fontWeight: '600', color: '#16A34A', flex: 1 },
    eligibilityText: { fontSize: 14, color: '#475569', flex: 1 },
    descriptionText: { fontSize: 14, lineHeight: 22, color: '#334155', marginTop: 8, marginBottom: 12 },
    linkButton: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    linkButtonText: { fontSize: 14, fontWeight: '700' },
});
