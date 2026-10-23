import { browserLocalPersistence } from "firebase/auth";

/** The browser build of firebase/auth has no React Native persistence; it keeps the sign-in in local storage. */
export const authPersistence = browserLocalPersistence;
