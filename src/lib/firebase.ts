// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAX2YNI2bnkqKr4Z5jA7TQ2p6yW_M4NVrM",
  authDomain: "sonata-a1248.firebaseapp.com",
  projectId: "sonata-a1248",
  storageBucket: "sonata-a1248.firebasestorage.app",
  messagingSenderId: "272968533112",
  appId: "1:272968533112:web:de6bfa0a409532c19fd98d"
};

// Fast Refresh re-runs this module; initializeAuth throws if called twice on the same app
const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

export const auth = isFirstInit
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const db = getFirestore(app);