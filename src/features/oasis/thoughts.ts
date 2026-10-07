// A thought record (a CBT reframe): what happened, the thought it brought, an optional thinking
// pattern, and a kinder, more balanced thought. Pure, so it's tested; stored by lib/thoughtRecords.ts.

/** Common thinking patterns, each with one plain line on what it means. Picked from chips, never typed. */
export const PATTERNS = [
  { id: "all-or-nothing", name: "All-or-nothing", meaning: "Seeing it as all good or all bad, with nothing in between." },
  { id: "catastrophising", name: "Catastrophising", meaning: "Jumping to the worst thing that could happen." },
  { id: "mind-reading", name: "Mind reading", meaning: "Assuming you know what someone else is thinking." },
  { id: "fortune-telling", name: "Fortune telling", meaning: "Deciding it will go badly before it happens." },
  { id: "should", name: "Should statements", meaning: "Holding yourself to rigid 'should' and 'must' rules." },
  { id: "overgeneralising", name: "Overgeneralising", meaning: "Treating one moment as proof it will always happen." },
  { id: "discounting", name: "Discounting the good", meaning: "Brushing off what went well as not counting." },
  { id: "labelling", name: "Labelling", meaning: "Calling yourself a name instead of describing what happened." },
  { id: "unsure", name: "Not sure", meaning: "That's fine: noticing the thought is the main step." },
] as const;

export type PatternId = (typeof PATTERNS)[number]["id"];

export type ThoughtRecord = {
  situation: string;
  thought: string;
  pattern: PatternId | null;
  balanced: string;
};

export const MAX_FIELD_LENGTH = 500;

export const patternOf = (id: PatternId | null) => PATTERNS.find((p) => p.id === id) ?? null;

/** Trimmed and within length. */
export function cleanRecord(record: ThoughtRecord): ThoughtRecord {
  const clean = (text: string) => text.trim().slice(0, MAX_FIELD_LENGTH);
  return {
    situation: clean(record.situation),
    thought: clean(record.thought),
    pattern: record.pattern,
    balanced: clean(record.balanced),
  };
}

/** Only the thought itself is needed; everything else is optional. */
export const canSave = (record: ThoughtRecord) => record.thought.trim().length > 0;

/** What a record is shown by in the list: its balanced thought if there is one, otherwise the thought. */
export const headline = (record: ThoughtRecord) => record.balanced || record.thought;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** e.g. "Tue 6 Oct". */
export function recordDate(ms: number) {
  const d = new Date(ms);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
