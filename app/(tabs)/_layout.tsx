import { Tabs } from 'expo-router';
import { CalendarDays, Disc3, House, Leaf, type LucideIcon } from 'lucide-react-native';
import colours from '../../src/themes/colours';

const icon = (Icon: LucideIcon) => ({ colour }: { colour: string }) => (
  <Icon color={colour} size={24} strokeWidth={1.5} />
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colours.canvas },
        tabBarActiveTintColor: colours.violet[200],
        tabBarInactiveTintColor: colours.textMuted,
        tabBarStyle: { backgroundColor: colours.surface, borderTopColor: colours.border },
        tabBarLabelStyle: { fontFamily: 'Roboto_500Medium', fontSize: 13 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon(House) }} />
      <Tabs.Screen name="weekly" options={{ title: 'Weekly', tabBarIcon: icon(Disc3) }} />
      <Tabs.Screen name="monthly" options={{ title: 'Monthly', tabBarIcon: icon(CalendarDays) }} />
      <Tabs.Screen name="oasis" options={{ title: 'Oasis', tabBarIcon: icon(Leaf) }} />
    </Tabs>
  );
}