# Tasks

- [x] **Phase 1: Core Architecture, Database, & User Onboarding**
  - [x] Create Zustand & MMKV state store (`src/store/index.ts`)
  - [x] Update tab navigation in `src/components/app-tabs.tsx` & `src/components/app-tabs.web.tsx`
  - [x] Generate tab icons (`log.png`, `coach.png`, `profile.png`)
  - [x] Build profile, onboarding, and BMR/TDEE math (`src/app/profile.tsx`)
- [x] **Phase 2: Dashboard & Manual Food Logging**
  - [x] Build dashboard with circular progress & quick loggers (`src/app/index.tsx`)
  - [x] Build meal log screen & add food modal (`src/app/log.tsx`)
- [x] **Phase 3: AI Food Coach & Intelligent Logging**
  - [x] Create OpenAI/API wrapper with mock fallbacks (`src/lib/openai.ts`)
  - [x] Build conversational AI Coach chat screen (`src/app/coach.tsx`)
- [x] **Phase 4: Analytics, Integrations, and Polish**
  - [x] Build weight trend charts (`src/app/analytics.tsx`)
  - [x] Apply dark/light theme polish & haptics
