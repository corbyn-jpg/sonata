import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import colours from "@/theme/colours";

type Props = {
  Icon: LucideIcon;
  title: string;
  detail?: string;
  /** A switch or other control on the right. Rows with `onPress` and no `right` get a chevron. */
  right?: ReactNode;
  onPress?: () => void;
  /** Muted red, for Delete all data (never a solid red button, §6). */
  danger?: boolean;
};

/** One settings row: an icon in line with its words, separated from the next row by a hairline. */
export function SettingRow({ Icon, title, detail, right, onPress, danger = false }: Props) {
  const body = (
    <>
      <Icon color={danger ? colours.danger : colours.textSecondary} size={20} strokeWidth={1.5} />
      <View className="flex-1 gap-0.5">
        <Text className="font-sans text-body" style={{ color: danger ? colours.danger : colours.textPrimary }}>
          {title}
        </Text>
        {detail && <Text className="font-sans text-caption text-secondary">{detail}</Text>}
      </View>
      {right ?? (onPress && <ChevronRight color={colours.textMuted} size={20} strokeWidth={1.5} />)}
    </>
  );
  const className = "min-h-[64px] flex-row items-center gap-4 border-b border-border py-4";
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint={detail} className={`${className} active:opacity-80`}>
      {body}
    </Pressable>
  ) : (
    <View className={className}>{body}</View>
  );
}

/** A group heading above some rows. */
export function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-8">
      <Text className="font-sans-medium text-caption text-secondary" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}