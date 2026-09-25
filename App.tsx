import "./global.css";
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-canvas p-6">
      <Text className="text-h2 text-primary">Sonata</Text>
      <Text className="text-body text-secondary">
        Transforming your daily emotional spectrum into personalised melodies.
      </Text>
      <View className="mt-8 min-h-[52px] justify-center rounded-pill bg-violet-700 px-8">
        <Text className="text-body font-bold text-white">Save check-in</Text>
      </View>
      <StatusBar style="light" />
    </View>
  );
}