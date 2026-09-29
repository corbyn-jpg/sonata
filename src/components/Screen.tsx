import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { title?: string; header?: ReactNode; background?: ReactNode; children?: ReactNode };

export function Screen({ title, header, background, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-canvas px-6" style={{ paddingTop: insets.top + 16 }}>
      {background && <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>{background}</View>}
      {header ?? (title && <Text className="mb-8 font-mono-medium text-h2 text-primary">{title}</Text>)}
      {children}
    </View>
  );
}