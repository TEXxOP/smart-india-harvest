import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface IconProps {
    size?: number;
}

// Premium icon wrapper — gradient bg + white icon
function PremiumIconBase({
    colors,
    children,
    size = 48,
}: {
    colors: [string, string];
    children: React.ReactNode;
    size?: number;
}) {
    return (
        <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.iconBase, { width: size, height: size, borderRadius: size / 2 }]}
        >
            {children}
        </LinearGradient>
    );
}

export const WeatherIcon = ({ size = 32 }: IconProps) => (
    <PremiumIconBase colors={['#FBBF24', '#F97316']} size={size}>
        <Ionicons name="sunny" size={size * 0.55} color="#FFFFFF" />
    </PremiumIconBase>
);

export const CropIcon = ({ size = 32 }: IconProps) => (
    <PremiumIconBase colors={['#4ADE80', '#16A34A']} size={size}>
        <MaterialCommunityIcons name="sprout" size={size * 0.55} color="#FFFFFF" />
    </PremiumIconBase>
);

export const ChatIcon = ({ size = 32 }: IconProps) => (
    <PremiumIconBase colors={['#60A5FA', '#2563EB']} size={size}>
        <Ionicons name="chatbubble-ellipses" size={size * 0.52} color="#FFFFFF" />
    </PremiumIconBase>
);

export const DiseaseIcon = ({ size = 32 }: IconProps) => (
    <PremiumIconBase colors={['#C084FC', '#7C3AED']} size={size}>
        <Ionicons name="search" size={size * 0.52} color="#FFFFFF" />
    </PremiumIconBase>
);

export const StarIcon = ({ size = 28 }: { size?: number }) => (
    <PremiumIconBase colors={['#FB923C', '#EA580C']} size={size}>
        <Ionicons name="star" size={size * 0.55} color="#FFFFFF" />
    </PremiumIconBase>
);

const styles = StyleSheet.create({
    iconBase: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
