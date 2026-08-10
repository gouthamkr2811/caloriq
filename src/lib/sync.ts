import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

export interface CloudUserData {
  profile: any;
  dailyLogs: any;
  weightHistory: any;
  updatedAt: string;
}

/**
 * Saves all user Zustand state to Firestore under the user's UID.
 */
export async function saveUserDataToCloud(
  uid: string,
  data: { profile: any; dailyLogs: any; weightHistory: any }
) {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      profile: data.profile,
      dailyLogs: data.dailyLogs,
      weightHistory: data.weightHistory,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('User data synced to cloud for uid:', uid);
  } catch (error) {
    console.warn('Failed to sync user data to cloud (offline):', error);
  }
}

/**
 * Loads user state from Firestore.
 */
export async function loadUserDataFromCloud(uid: string): Promise<CloudUserData | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as CloudUserData;
    }
    return null;
  } catch (error: any) {
    const isOffline = error?.message?.includes('offline') || error?.code === 'unavailable';
    if (isOffline) {
      console.warn('Network offline: Load data from cloud skipped.');
    } else {
      console.error('Error loading user data from cloud:', error);
    }
    throw error;
  }
}

/**
 * Uploads a local image URI (from camera/gallery) to Firebase Storage and returns its download URL.
 */
export async function uploadImageToStorage(uri: string, userId: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Create a unique filename under the user's directory
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const storageRef = ref(storage, `users/${userId}/foods/${filename}`);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image to Firebase Storage:', error);
    throw error;
  }
}
