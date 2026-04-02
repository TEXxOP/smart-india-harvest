import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import SignUpScreen from '../screens/SignUpScreen';
import LoginScreen from '../screens/LoginScreen';
import BiometricSetupScreen from '../screens/BiometricSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import WeatherScreen from '../screens/WeatherScreen';
import AIChatScreen from '../screens/AIChatScreen';
import DiseaseDetectionScreen from '../screens/DiseaseDetectionScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import FasaleinScreen from '../screens/FasaleinScreen';
import SuccessStoriesScreen from '../screens/SuccessStoriesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AgriKnowledgeScreen from '../screens/AgriKnowledgeScreen';
import GovSchemesScreen from '../screens/GovSchemesScreen';
import IrrigationDashboardScreen from '../screens/IrrigationDashboardScreen';
import YieldPredictionScreen from '../screens/YieldPredictionScreen';
import MandiPricesScreen from '../screens/MandiPricesScreen';
import ActionPlanScreen from '../screens/ActionPlanScreen';

export type RootStackParamList = {
    LanguageSelection: { fromSettings?: boolean } | undefined;
    SignUp: undefined;
    Login: undefined;
    BiometricSetup: undefined;
    Home: undefined;
    Weather: undefined;
    AIChat: undefined;
    DiseaseDetection: undefined;
    Onboarding: undefined;
    Fasalein: undefined;
    SuccessStories: undefined;
    Profile: undefined;
    AgriKnowledge: undefined;
    GovSchemes: undefined;
    IrrigationDashboard: undefined;
    YieldPrediction: undefined;
    MandiPrices: undefined;
    ActionPlan: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('LanguageSelection');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const sessionStr = await AsyncStorage.getItem('@user_session');
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    if (session.loggedIn) {
                        setInitialRoute('Home');
                        // Skip the loading wait and allow return to proceed
                    }
                }
            } catch (e) {
                console.error("Session check failed", e);
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF9' }}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                    headerShown: false,
                    cardStyle: { backgroundColor: '#FAFAF9' },
                }}
            >
                <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Weather" component={WeatherScreen} />
                <Stack.Screen name="AIChat" component={AIChatScreen} />
                <Stack.Screen name="DiseaseDetection" component={DiseaseDetectionScreen} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Fasalein" component={FasaleinScreen} options={{ title: 'मेरी फसलें', headerShown: true }} />
                <Stack.Screen name="SuccessStories" component={SuccessStoriesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AgriKnowledge" component={AgriKnowledgeScreen} options={{ headerShown: false }} />
                <Stack.Screen name="GovSchemes" component={GovSchemesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="IrrigationDashboard" component={IrrigationDashboardScreen} options={{ headerShown: false }} />
                <Stack.Screen name="YieldPrediction" component={YieldPredictionScreen} options={{ headerShown: false }} />
                <Stack.Screen name="MandiPrices" component={MandiPricesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ActionPlan" component={ActionPlanScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
