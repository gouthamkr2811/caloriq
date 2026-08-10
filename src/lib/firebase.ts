import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth conditionally for Web and Native
let auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    const { MMKV } = require('react-native-mmkv');
    // Initialize MMKV storage instance
    const mmkvInstance = new MMKV({ id: 'firebase-auth-storage' });

    // Create an AsyncStorage compatible interface using MMKV
    const mmkvPersistence = {
      getItem: (key: string): Promise<string | null> => {
        return Promise.resolve(mmkvInstance.getString(key) || null);
      },
      setItem: (key: string, value: string): Promise<void> => {
        mmkvInstance.set(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string): Promise<void> => {
        mmkvInstance.delete(key);
        return Promise.resolve();
      },
    };

    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(mmkvPersistence),
    });
  } catch (error) {
    console.warn('Failed to initialize native Firebase persistence:', error);
    auth = getAuth(app);
  }
}

// Initialize Firestore
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true, // helps with network stability in simulators
});

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };
