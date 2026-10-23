import AsyncStorage from "@react-native-async-storage/async-storage";
import { getReactNativePersistence } from "firebase/auth";

/** Where the anonymous sign-in is kept between launches. On the web, see authPersistence.web.ts. */
export const authPersistence = getReactNativePersistence(AsyncStorage);
