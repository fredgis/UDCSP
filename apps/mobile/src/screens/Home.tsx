import { Text, View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { ScreenReaderHints } from '../components/ScreenReaderHints';
export function HomeScreen() { return <View style={{ padding: 16 }}><Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700' }}>Home</Text><AccessibleButton label="Start residency application" hint="Opens the residency form" /></View>; }
