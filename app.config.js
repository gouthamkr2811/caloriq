module.exports = {
  expo: {
    name: "Caloriq",
    slug: "caloriq",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "caloriq",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    ios: {
      bundleIdentifier: "com.goutham.caloriq",
      icon: "./assets/expo.icon",
      supportsTablet: true
    },
    android: {
      package: "com.goutham.caloriq",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76
          }
        }
      ],
      "expo-video",
      "expo-audio",
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 26
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: false
    },
    extra: {
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      nutritionixAppId: process.env.EXPO_PUBLIC_NUTRITIONIX_APP_ID,
      nutritionixApiKey: process.env.EXPO_PUBLIC_NUTRITIONIX_API_KEY,
      usdaApiKey: process.env.EXPO_PUBLIC_USDA_API_KEY,
      groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY
    }
  }
};
