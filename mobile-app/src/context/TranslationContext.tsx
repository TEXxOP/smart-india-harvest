import React, { createContext, useState, useEffect, useContext } from 'react';
import { Translations, fetchTranslations, getSavedLanguage } from '../services/translationService';

interface TranslationContextType {
    translations: Translations | null;
    language: string;
    setLanguage: (lang: string) => Promise<void>;
    loading: boolean;
    t: (key: keyof Translations) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [translations, setTranslations] = useState<Translations | null>(null);
    const [language, setLanguageState] = useState('en');
    const [loading, setLoading] = useState(true);

    // Initial load
    useEffect(() => {
        loadInitialLanguage();
    }, []);

    const loadInitialLanguage = async () => {
        const savedLang = await getSavedLanguage();
        setLanguageState(savedLang);
        const data = await fetchTranslations(savedLang);
        setTranslations(data);
        setLoading(false);
    };

    const setLanguage = async (lang: string) => {
        setLoading(true);
        setLanguageState(lang);
        const data = await fetchTranslations(lang);
        setTranslations(data);
        setLoading(false);
    };

    const t = (key: keyof Translations): string => {
        if (!translations) return key;
        return translations[key] || key;
    };

    return (
        <TranslationContext.Provider value={{ translations, language, setLanguage, loading, t }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error('useTranslation must be used within a TranslationProvider');
    }
    return context;
};
