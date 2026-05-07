import { Text } from 'react-native';
export function ScreenReaderHints({ children }: { children: string }) { return <Text accessibilityLiveRegion="polite" style={{ marginVertical: 8 }}>{children}</Text>; }
