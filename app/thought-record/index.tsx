import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Lock, Plus } from "lucide-react-native";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import { headline, patternOf, recordDate } from "@/features/oasis/thoughts";
import { deleteThoughtRecord, useThoughtRecords, type SavedThoughtRecord } from "@/lib/thoughtRecords";
import colours from "@/theme/colours";

/** One saved record: its date and headline, opening to show everything. */
function RecordCard({ record, open, onToggle }: { record: SavedThoughtRecord; open: boolean; onToggle: () => void }) {
  const pattern = patternOf(record.pattern);
  const confirmDelete = () =>
    Alert.alert("Delete this thought record?", "It can't be brought back.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteThoughtRecord(record.id) },
    ]);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${recordDate(record.updatedAt)}. ${headline(record)}`}
      className={`gap-2 rounded-card border p-4 ${open ? "border-violet-500 bg-surface-raised" : "border-border bg-surface/70"}`}
    >
      <Text className="font-mono text-caption text-muted">{recordDate(record.updatedAt)}</Text>
      {open ? (
        <View className="gap-5">
          {[
            ["What happened", record.situation],
            ["What went through my mind", record.thought],
            ["Pattern", pattern?.name ?? ""],
            ["A kinder, more balanced thought", record.balanced],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <View key={label} className="gap-1">
                <Text className="font-sans-medium text-caption text-secondary">{label}</Text>
                <Text className="font-sans text-body text-primary">{value}</Text>
              </View>
            ))}
          <Pressable onPress={confirmDelete} accessibilityRole="button" className="min-h-[44px] justify-center self-start">
            <Text className="font-sans-medium text-caption text-muted">Delete</Text>
          </Pressable>
        </View>
      ) : (
        <Text numberOfLines={2} className="font-sans text-body text-primary">
          {headline(record)}
        </Text>
      )}
    </Pressable>
  );
}

/** Thought record: past records, newest first, and a way to start a new one. */
export default function ThoughtRecords() {
  const records = useThoughtRecords();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Screen header={<BackHeader title="Thought record" />}>
      <ScrollView contentContainerClassName="gap-3 pb-10" showsVerticalScrollIndicator={false}>
        <Text className="mb-2 font-sans text-body text-secondary">
          Write down a thought that&apos;s weighing on you, then find a kinder way to see it.
        </Text>
        <Pressable
          onPress={() => router.push("/thought-record/new")}
          accessibilityRole="button"
          className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill bg-violet-700"
        >
          <Plus color={colours.textPrimary} size={18} strokeWidth={1.5} />
          <Text className="font-sans-bold text-body text-primary">New thought record</Text>
        </Pressable>
        <View className="mb-3 flex-row items-center justify-center gap-1.5">
          <Lock color={colours.textMuted} size={12} strokeWidth={1.5} />
          <Text className="font-sans text-caption text-muted">Encrypted on this phone</Text>
        </View>

        {records === null ? (
          <ActivityIndicator color={colours.violet[200]} />
        ) : records.length === 0 ? (
          <Text className="text-center font-sans text-caption text-muted">Your records will appear here.</Text>
        ) : (
          records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              open={open === record.id}
              onToggle={() => setOpen(open === record.id ? null : record.id)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
