import { Text } from "react-native";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";

/** Thought record: built later in stage 9. */
export default function ThoughtRecord() {
  return (
    <Screen header={<BackHeader title="Thought record" />}>
      <Text className="font-sans text-body text-secondary">Coming soon.</Text>
    </Screen>
  );
}