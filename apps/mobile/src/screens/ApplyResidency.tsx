import { Text, View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { ScreenReaderHints } from '../components/ScreenReaderHints';
export function ApplyResidencyScreen() { return <View style={{ padding: 16 }}><Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700' }}>Apply residency</Text><ScreenReaderHints>Use swipe navigation or external keyboard tab order to move through controls.</ScreenReaderHints></View>; }
