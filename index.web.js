// The web entry. Skia's drawing engine (CanvasKit, public/canvaskit.wasm) has to be ready before any screen loads,
// because some modules build Skia shapes as soon as they're imported. Only then is the app itself required.
import "@expo/metro-runtime";
import { Alert } from "react-native";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

// react-native-web's Alert.alert does nothing, so messages and confirmations would be skipped. Every alert in Sonata
// is either a message or Cancel plus one action, which the browser's own alert and confirm can show.
Alert.alert = (title, message, buttons = []) => {
  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons.find((button) => button.style === "cancel");
  const action = buttons.filter((button) => button !== cancel).at(-1);
  if (!action) {
    window.alert(text);
    cancel?.onPress?.();
  } else if (window.confirm(text)) action.onPress?.();
  else cancel?.onPress?.();
};

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  require("expo-router/entry");
});
