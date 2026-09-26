import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Music, Settings } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import colours from '@/theme/colours';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  return (
    <Screen
      header={
        <View className="mb-8 flex-row items-center justify-between">
          <Text className="font-mono-medium text-h3 text-primary">{greeting()}</Text>
          <View className="flex-row">
            <Link href="/composer" asChild>
              <Pressable accessibilityLabel="Open composer" className="h-11 w-11 items-center justify-center">
                <Music color={colours.textSecondary} size={24} strokeWidth={1.5} />
              </Pressable>
            </Link>
            <Link href="/settings" asChild>
              <Pressable accessibilityLabel="Settings" className="h-11 w-11 items-center justify-center">
                <Settings color={colours.textSecondary} size={24} strokeWidth={1.5} />
              </Pressable>
            </Link>
          </View>
        </View>
      }
    />
  );
}