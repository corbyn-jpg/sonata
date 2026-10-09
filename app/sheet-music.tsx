import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { FileDown, FileMusic } from "lucide-react-native";
import { INSTRUMENT_LABELS } from "@/audio";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import { composeWeek, MODE_NAMES } from "@/engine";
import { shareMusicXml, sharePdf } from "@/features/sheet/exportScore";
import { PdfUnavailable } from "@/lib/pdf";
import { monthScore, weekScore, type Score } from "@/features/sheet/score";
import { SongPicker } from "@/features/sheet/SongPicker";
import type { SongChoice } from "@/features/sheet/songs";
import { scoreLines } from "@/features/sheet/svg";
import { useSheetSongs } from "@/features/sheet/useSheetSongs";
import colours from "@/theme/colours";

/** The song as a lead sheet: its melody on a treble staff with the chords named above. */
function scoreOf(song: SongChoice): Score {
  const instrument = INSTRUMENT_LABELS[song.instrument];
  if (song.kind === "week") {
    const composition = composeWeek(song.week, song.seed);
    return weekScore(
      composition,
      song.title,
      `${MODE_NAMES[composition.mode]} · ${instrument}`,
    );
  }
  const weeks =
    song.weeks.length === 1 ? "1 week" : `${song.weeks.length} weeks`;
  return monthScore(
    song.weeks,
    song.seed,
    song.labels,
    song.title,
    `${weeks} · ${instrument}`,
  );
}

/** Sheet music: any week's or month's song as a score, to read here or export as PDF or MusicXML. */
export default function SheetMusic() {
  const songs = useSheetSongs();
  const { width } = useWindowDimensions();
  const [chosen, setChosen] = useState<SongChoice | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "xml" | null>(null);

  // The newest week until another song is chosen
  const selected = chosen ?? songs?.weeks[0] ?? songs?.months[0] ?? null;
  const score = useMemo(
    () => (selected ? scoreOf(selected) : null),
    [selected],
  );
  // Dark ink on a white page, as sheet music is read everywhere else
  const lines = useMemo(
    () =>
      score
        ? scoreLines(score, {
            ink: colours.canvas,
            lines: colours.canvas,
            accent: colours.violet[700],
            font: "DMMono_500Medium",
            gap: 8,
            width: width - 48 - 24, // the screen's 24px margins and the page's 12px padding
            barsPerLine: 2,
          })
        : [],
    [score, width],
  );

  const exportAs = async (kind: "pdf" | "xml") => {
    if (!score || !selected || exporting) return;
    setExporting(kind);
    const name = `Sonata - ${score.title}`;
    try {
      if (kind === "pdf") await sharePdf(score, name);
      else
        await shareMusicXml(
          score,
          INSTRUMENT_LABELS[selected.instrument],
          name,
        );
    } catch (error) {
      if (error instanceof PdfUnavailable)
        Alert.alert(
          "PDF needs the new app build",
          "Install the latest development build, then try again. MusicXML works now.",
        );
      else {
        console.warn("Couldn't export the sheet music:", error);
        Alert.alert(
          kind === "pdf"
            ? "Couldn't make the PDF"
            : "Couldn't make the MusicXML file",
          "Please try again.",
        );
      }
    } finally {
      setExporting(null);
    }
  };

  if (songs === null)
    return (
      <Screen header={<BackHeader title="Sheet music" />}>
        <ActivityIndicator color={colours.violet[200]} />
      </Screen>
    );

  if (!selected || !score)
    return (
      <Screen header={<BackHeader title="Sheet music" />}>
        <Text className="font-sans text-body text-secondary">
          Your songs appear here as sheet music after your first check-in.
        </Text>
      </Screen>
    );

  return (
    <Screen header={<BackHeader title="Sheet music" />}>
      <ScrollView
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        <SongPicker
          weeks={songs.weeks}
          months={songs.months}
          selected={selected}
          onChange={setChosen}
        />
        <Text className="mb-4 mt-3 font-sans text-caption text-secondary">
          {score.subtitle}
        </Text>
        <View
          accessible
          accessibilityLabel={`Sheet music for ${score.title}`}
          className="rounded-card p-3"
          style={{ backgroundColor: colours.textPrimary }} // the palette's near-white, as paper
        >
          {lines.map((line, i) => (
            <SvgXml
              key={i}
              xml={line.svg}
              width={line.width}
              height={line.height}
            />
          ))}
        </View>
      </ScrollView>

      <View className="gap-3 border-t border-border pb-8 pt-4">
        <Pressable
          onPress={() => exportAs("pdf")}
          disabled={exporting !== null}
          accessibilityRole="button"
          accessibilityState={{
            busy: exporting === "pdf",
            disabled: exporting !== null,
          }}
          className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill bg-violet-700 ${exporting && exporting !== "pdf" ? "opacity-40" : ""}`}
        >
          {exporting === "pdf" ? (
            <ActivityIndicator color={colours.textPrimary} />
          ) : (
            <FileDown color={colours.textPrimary} size={18} strokeWidth={1.5} />
          )}
          <Text className="font-sans-bold text-body text-primary">
            Export PDF
          </Text>
        </Pressable>
        <Pressable
          onPress={() => exportAs("xml")}
          disabled={exporting !== null}
          accessibilityRole="button"
          accessibilityState={{
            busy: exporting === "xml",
            disabled: exporting !== null,
          }}
          className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill border border-violet-500 ${exporting && exporting !== "xml" ? "opacity-40" : ""}`}
        >
          {exporting === "xml" ? (
            <ActivityIndicator color={colours.textPrimary} />
          ) : (
            <FileMusic
              color={colours.textPrimary}
              size={18}
              strokeWidth={1.5}
            />
          )}
          <Text className="font-sans-medium text-body text-primary">
            Export MusicXML
          </Text>
        </Pressable>
        <Text className="text-center font-sans text-caption text-muted">
          MusicXML opens in MuseScore, Sibelius or Dorico.
        </Text>
      </View>
    </Screen>
  );
}
