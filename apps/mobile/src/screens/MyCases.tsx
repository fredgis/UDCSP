import { Text, View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { ScreenReaderHints } from '../components/ScreenReaderHints';
export function MyCasesScreen() { return <View style={{ padding: 16 }}><Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700' }}>My cases</Text><ScreenReaderHints>Use swipe navigation or external keyboard tab order to move through controls.</ScreenReaderHints></View>; }
