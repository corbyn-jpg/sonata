import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { MessageSquare, Phone } from "lucide-react-native";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import { dialable, EMERGENCY, HELPLINES, isFree, spokenNumber, type Helpline } from "@/features/oasis/helplines";
import colours from "@/theme/colours";

/** Opens the phone's own app. If it can't, the number is shown so it can be dialled by hand. */
const open = (url: string, name: string, number: string) =>
  Linking.openURL(url).catch(() => Alert.alert("Couldn't open your phone app", `You can reach ${name} on ${number}.`));

const call = (name: string, number: string) => open(`tel:${dialable(number)}`, name, number);

const text = (name: string, sms: NonNullable<Helpline["sms"]>) => {
  // Android and iOS join the message body to the number differently
  const body = sms.body ? `${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(sms.body)}` : "";
  return open(`sms:${sms.number}${body}`, name, sms.number);
};

function CallButton({ name, number }: { name: string; number: string }) {
  return (
    <Pressable
      onPress={() => call(name, number)}
      accessibilityRole="button"
      accessibilityLabel={`Call ${name}, ${spokenNumber(number)}`}
      className="min-h-[44px] flex-row items-center gap-2 rounded-pill bg-teal-700 px-5 active:opacity-80"
    >
      <Phone color={colours.textPrimary} size={16} strokeWidth={1.5} />
      <Text className="font-sans-bold text-body text-primary">Call</Text>
    </Pressable>
  );
}

/** One line: what it's for, who it's for and when, then the number and how to reach it. */
function Line({ line }: { line: Helpline }) {
  const sms = line.sms;
  return (
    <View className="gap-3 border-t border-border py-5">
      <View className="gap-1">
        <Text className="font-mono-medium text-body text-primary">{line.name}</Text>
        <Text className="font-sans text-caption text-secondary">{line.about}</Text>
        <Text className="font-sans text-caption text-muted">
          {[line.audience, line.hours, isFree(line.number) ? "free to call" : null].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="flex-1 font-mono text-body text-primary" accessibilityLabel={spokenNumber(line.number)}>
          {line.number}
        </Text>
        {sms && (
          <Pressable
            onPress={() => text(line.name, sms)}
            accessibilityRole="button"
            accessibilityLabel={`Send an SMS to ${line.name}, ${spokenNumber(sms.number)}`}
            className="min-h-[44px] flex-row items-center gap-2 rounded-pill border border-border px-4 active:opacity-80"
          >
            <MessageSquare color={colours.textSecondary} size={16} strokeWidth={1.5} />
            <Text className="font-sans-medium text-body text-secondary">SMS</Text>
          </Pressable>
        )}
        <CallButton name={line.name} number={line.number} />
      </View>
      {sms && <Text className="font-sans text-caption text-muted">{sms.note}</Text>}
    </View>
  );
}

/**
 Support & helplines: real South African lines, crisis first. Calling or texting opens the phone's own app;
 Sonata never sees who was called and records nothing.
 */
export default function Helplines() {
  return (
    <Screen header={<BackHeader title="Support & helplines" />}>
      <ScrollView contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        <Text className="font-sans text-body text-secondary">
          Talking to someone can help, whatever is going on. These lines are confidential, and you don&apos;t need
          to be in crisis to call.
        </Text>

        {/* Danger comes before everything else */}
        <View className="mb-3 mt-6 flex-row items-center gap-4 rounded-card border border-border bg-surface-raised p-4">
          <View className="flex-1 gap-1">
            <Text className="font-mono-medium text-body text-primary">In danger right now?</Text>
            <Text className="font-sans text-caption text-secondary">{EMERGENCY.note}</Text>
          </View>
          <CallButton name="emergency services" number={EMERGENCY.number} />
        </View>

        {HELPLINES.map((line) => (
          <Line key={line.id} line={line} />
        ))}

        <Text className="border-t border-border pt-5 pb-10 font-sans text-caption text-muted">
          Sonata isn&apos;t a medical service and never diagnoses. Numbers starting 0800, and 116, are free to call;
          others cost a normal call.
        </Text>
      </ScrollView>
    </Screen>
  );
}