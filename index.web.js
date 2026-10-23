// The web entry. Skia's drawing engine (CanvasKit, public/canvaskit.wasm) has to be ready before any screen loads,
// because some modules build Skia shapes as soon as they're imported. Only then is the app itself required.
import "@expo/metro-runtime";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  require("expo-router/entry");
});
