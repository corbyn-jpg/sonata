import { Intro } from "@/features/onboarding/Intro";
import { setPreference } from "@/lib/preferences";

/** First launch. Finishing (or skipping) is remembered, and the root layout then opens Home. */
export default function Onboarding() {
  return (
    <Intro mode="first" onFinish={() => setPreference("onboarded", true)} />
  );
}
