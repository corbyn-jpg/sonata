import { router } from "expo-router";
import { Intro } from "@/features/onboarding/Intro";

/** The intro again, opened from Settings. View-only: nothing stored changes, and it returns to Settings. */
export default function Introduction() {
  return <Intro mode="replay" onFinish={() => router.back()} />;
}
