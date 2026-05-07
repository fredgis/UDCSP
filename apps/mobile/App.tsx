import React from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';
import './src/i18n';
import { HomeScreen } from './src/screens/Home';
export default function App() { return <SafeAreaView><ScrollView accessibilityLabel="UDCSP mobile shell"><Text accessibilityRole="header">UDCSP Citizen</Text><HomeScreen /></ScrollView></SafeAreaView>; }
