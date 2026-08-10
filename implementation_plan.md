# Implementation Plan - FatoFit Calorie Tracker

Build a comprehensive, premium AI-powered calorie and fitness tracking mobile application. The app will be built using Expo (SDK 55), TypeScript, NativeWind (Tailwind CSS), Zustand, MMKV, and Firebase.

We will adopt an **offline-first approach**: all state (logs, goals, weights) will be persisted locally using Zustand and MMKV. If the user decides to create an account, their data will automatically sync with Firebase Firestore. We will also build a resilient AI integration: if the OpenAI or other API keys are missing/placeholder, the app will gracefully run in "Demo Mode" with local smart parsing so it remains 100% functional.

---

## User Review Required

> [!IMPORTANT]
> **API Key Setup & Fallback**: The `.env` file currently contains placeholder API keys. We will implement robust mock fallbacks for all AI coaching, text parsing, and image analysis so the application can be fully tested without editing the `.env` file. We will display a subtle banner in the UI indicating when "Demo/Mock Mode" is active.
>
> **Tab Icons & Navigation**: The current navigation uses `expo-router/unstable-native-tabs` which requires PNG image assets for the tabs. To avoid requiring external asset downloads, we will generate minimalist PNG icon assets (`log.png`, `coach.png`, `profile.png`) directly in the project assets using a local Node script, or adapt the navigation structure.

---

## Open Questions

1. **AI Chat Model**: Do you prefer to use OpenAI's `gpt-4o` or `gpt-4o-mini` for the AI coach and food parsing? (We will write a wrapper that default-falls back to `gpt-4o-mini` for cost-effectiveness).
2. **Onboarding / BMR Equation**: We propose using the Mifflin-St Jeor equation for BMR and TDEE calculations. Is this acceptable, or do you have a preference for another standard (like Harris-Benedict)?

---

## Proposed Changes

We will build the application in **four phases**.

### Phase 1: Core Architecture, Database, & User Onboarding

#### [NEW] [store.ts](file:///Users/goutham/Documents/fatofit/src/store/index.ts)
Create a centralized state store using **Zustand** and **MMKV** for persistent offline-first storage. It will store:
- `profile`: User onboarding data, goals (Lose, Maintain, Gain), and calculated BMR/TDEE limits.
- `logs`: Daily calorie, macro, water, step, and exercise logs.
- `weightHistory`: Date-keyed history of user weights.
- `syncStatus`: Tracks pending Firestore synchronizations.

#### [MODIFY] [app-tabs.tsx](file:///Users/goutham/Documents/fatofit/src/components/app-tabs.tsx) and [app-tabs.web.tsx](file:///Users/goutham/Documents/fatofit/src/components/app-tabs.web.tsx)
Update the navigation triggers to include the four core screens:
- **Home (Dashboard)** (`index`)
- **Log (Meals & Exercises)** (`log`)
- **AI Coach (Assistant)** (`coach`)
- **Profile (Goals & Settings)** (`profile`)

#### [NEW] [profile.tsx](file:///Users/goutham/Documents/fatofit/src/app/profile.tsx)
Build a premium settings and onboarding dashboard:
- Let users input Age, Gender, Weight, Height, Activity Level, and Weight Goal.
- Calculate BMR/TDEE and daily caloric budget.
- Connect with Firebase Auth for email login/registration.
- Sync button to upload local MMKV data to Firestore.

---

### Phase 2: Dashboard & Manual Food Logging

#### [MODIFY] [index.tsx](file:///Users/goutham/Documents/fatofit/src/app/index.tsx)
Build a gorgeous dashboard screen:
- Radial progress rings showing current calories relative to daily budget.
- Progress bars for daily macros (Protein, Carbs, Fat).
- Quick logger widgets for Water (`+250ml`), Steps, and active calories.

#### [NEW] [log.tsx](file:///Users/goutham/Documents/fatofit/src/app/log.tsx)
Implement the daily logging interface:
- Date picker to view previous logs.
- Breakdowns by meal type (Breakfast, Lunch, Dinner, Snacks).
- Add Food Modal allowing searching (from a curated local database of common foods) or entering custom values.
- Card list of logged items with delete functionality.

---

### Phase 3: AI Food Coach & Intelligent Logging

#### [NEW] [openai.ts](file:///Users/goutham/Documents/fatofit/src/lib/openai.ts)
Create the OpenAI wrapper:
- Text food log parser: Send prompt to extract foods and return structured JSON (`[{ name: string, calories: number, protein: number, carbs: number, fat: number }]`).
- AI Coach response: Conversational assistant for fitness and diet advice.
- Smart local fallback parsing: Regular expression/rules based parsing for common commands (e.g. "I ate 2 eggs and a banana") when the API key is not configured.

#### [NEW] [coach.tsx](file:///Users/goutham/Documents/fatofit/src/app/coach.tsx)
Build the conversational interface:
- Chat list displaying messages between the user and the AI coach.
- Keyboard-resilient text input.
- Voice record button using `expo-audio` (sends audio file to Whisper or simulates transcribing locally).
- Image picker button using `expo-image-picker` (sends photo to GPT-4o Vision or mocks recognition in demo mode).

---

### Phase 4: Analytics, Integrations, and Polish

#### [NEW] [analytics.tsx](file:///Users/goutham/Documents/fatofit/src/app/analytics.tsx) or integration in Dashboard
- Use `victory-native` to render beautiful weight fluctuation charts and calorie/macro consumption history charts.

#### [MODIFY] [theme.ts](file:///Users/goutham/Documents/fatofit/src/constants/theme.ts) and components
- Apply full dark and light mode UI compatibility.
- Integrate `expo-haptics` for tactile feedback during logging actions.

---

## Verification Plan

### Automated Tests
- Test helper functions for BMR, TDEE, and macro calculations.
- Test Zustand state mutations (adding food, deleting food, changing onboarding settings).

### Manual Verification
1. Run the app in a web browser via `npm run web` to ensure cross-platform layouts render nicely.
2. Complete onboarding and verify that BMR, TDEE, and daily target calories update dynamically.
3. Log a food manually and verify that the dashboard calorie rings and progress bars update instantly.
4. Open the AI Coach, type a food log (e.g. "1 avocado and 2 slices of toast"), and verify the text is parsed and correctly added to the daily log (testing both simulated local mode and live API mode).
5. Verify weight tracking by adding weight entries and viewing the trend graph.
