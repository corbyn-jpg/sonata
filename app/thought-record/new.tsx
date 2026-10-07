import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Lock } from "lucide-react-native";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import { canSave, MAX_FIELD_LENGTH, PATTERNS, patternOf, type ThoughtRecord } from "@/features/oasis/thoughts";
import { saveThoughtRecord } from "@/lib/thoughtRecords";
import colours from "@/theme/colours";

/**
 One step of the record, as its own panel: the question, its hint and its answer belong together, and the
 space between panels keeps one step from running into the next. The answer box inside has no border of its
 own (a darker fill instead), so there's one outline per step, not a box inside a box.
 */
function Section({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <View className="rounded-card bg-surface/70 p-4">
      <Text className="font-mono-medium text-body text-primary">{label}</Text>
      <Text className="mt-1 font-sans text-caption text-secondary">{hint}</Text>
      <View className="mt-4">{children}</View>
    </View>
  );
}

type FieldProps = { label: string; hint: string; value: string; onChange: (text: string) => void; placeholder: string };

function Field({ label, hint, value, onChange, placeholder }: FieldProps) {
  return (
    <Section label={label} hint={hint}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colours.textMuted}
        maxLength={MAX_FIELD_LENGTH}
        multiline
        textAlignVertical="top"
        accessibilityLabel={label}
        className="min-h-[96px] rounded-xl bg-canvas/70 px-4 py-3 font-sans text-body text-primary"
      />
    </Section>
  );
}

/** A new thought record in four short steps, each in its own panel. Only the thought itself is needed. */
export default function NewThoughtRecord() {
  const [record, setRecord] = useState<ThoughtRecord>({ situation: "", thought: "", pattern: null, balanced: "" });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ThoughtRecord>(key: K) => (value: ThoughtRecord[K]) => setRecord((r) => ({ ...r, [key]: value }));
  const pattern = patternOf(record.pattern);
  const ready = canSave(record) && !saving;

  const save = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      await saveThoughtRecord(record);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.warn("Couldn't save the thought record:", error); // never the record itself
      setSaving(false);
    }
  };

  return (
    <Screen header={<BackHeader title="New thought record" />}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerClassName="gap-5 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Field
            label="What happened?"
            hint="Just the facts: where you were, what happened."
            value={record.situation}
            onChange={set("situation")}
            placeholder="A sentence is enough"
          />
          <Field
            label="What went through your mind?"
            hint="The thought, in your own words."
            value={record.thought}
            onChange={set("thought")}
            placeholder="I thought…"
          />

          <Section label="Does it follow a pattern?" hint="Optional. Tap one if it fits.">
            <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
              {PATTERNS.map((p) => {
                const chosen = record.pattern === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => set("pattern")(chosen ? null : p.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen }}
                    accessibilityHint={p.meaning}
                    className={`min-h-[40px] justify-center rounded-pill border px-4 ${chosen ? "border-violet-500 bg-violet-700" : "border-border bg-canvas/70"}`}
                  >
                    <Text className={`font-sans-medium text-caption ${chosen ? "text-primary" : "text-secondary"}`}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {pattern && <Text className="mt-3 font-sans text-caption text-secondary">{pattern.meaning}</Text>}
          </Section>

          <Field
            label="A kinder, more balanced thought"
            hint="What would you say to a friend who thought this?"
            value={record.balanced}
            onChange={set("balanced")}
            placeholder="Another way to see it…"
          />

          <View className="gap-3 pb-10 mt-5">
            <Pressable
              onPress={save}
              disabled={!ready}
              accessibilityRole="button"
              accessibilityState={{ disabled: !ready }}
              className={`min-h-[52px] items-center justify-center rounded-pill bg-violet-700 ${ready ? "" : "opacity-40"}`}
            >
              <Text className="font-sans-bold text-body text-primary">Save record</Text>
            </Pressable>
            <View className="flex-row items-center justify-center gap-1.5">
              <Lock color={colours.textMuted} size={12} strokeWidth={1.5} />
              <Text className="font-sans text-caption text-muted">Encrypted on this phone</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
