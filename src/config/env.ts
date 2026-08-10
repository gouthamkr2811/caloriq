import Constants from 'expo-constants';

export const ENV = {
  firebaseApiKey: Constants.expoConfig?.extra?.firebaseApiKey || '',
  firebaseAuthDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || '',
  firebaseProjectId: Constants.expoConfig?.extra?.firebaseProjectId || '',
  firebaseStorageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || '',
  firebaseMessagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || '',
  firebaseAppId: Constants.expoConfig?.extra?.firebaseAppId || '',
  firebaseMeasurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || '',
  
  openaiApiKey: Constants.expoConfig?.extra?.openaiApiKey || '',
  nutritionixAppId: Constants.expoConfig?.extra?.nutritionixAppId || '',
  nutritionixApiKey: Constants.expoConfig?.extra?.nutritionixApiKey || '',
  usdaApiKey: Constants.expoConfig?.extra?.usdaApiKey || '',
  groqApiKey: Constants.expoConfig?.extra?.groqApiKey || '',
};
