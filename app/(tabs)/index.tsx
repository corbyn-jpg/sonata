import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Music, Settings } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import type { Letter } from '@/data/notes';
import { OrbCarousel } from '@/features/home/OrbCarousel';
import colours from '@/theme/colours';

const START_INDEX = 3; // F — middle of the scale, so there's a neighbour on each side

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const position = useSharedValue(START_INDEX);
  const [focused, setFocused] = useState(START_INDEX);
  const [selected, setSelected] = useState<Letter | null>(null);

  const onFocusChange = (index: number) => {
    setFocused(index);
    setSelected(null); // the selected orb is always the centred one
  };

  return (
    <Screen
      header={
        <View className="flex-row items-center justify-between">
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
    >
      {/* Full-bleed and flex-1: the orb sits centred in the space, and you can swipe anywhere in it */}
      <View className="-mx-6 flex-1">
        <OrbCarousel
          mode="major"
          position={position}
          focused={focused}
          onFocusChange={onFocusChange}
          selected={selected}
          onSelect={setSelected}
        />
      </View>
    </Screen>
  );
}