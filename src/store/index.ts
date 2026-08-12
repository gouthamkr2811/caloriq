import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import { saveUserDataToCloud } from '../lib/sync';

// Interfaces
export interface UserProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number; // in kg
  height: number; // in cm
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  weightGoal: 'lose_fast' | 'lose_slow' | 'maintain' | 'gain_slow' | 'gain_fast';
  onboardingComplete: boolean;
  calorieTarget: number;
  proteinTarget: number; // in grams
  carbsTarget: number; // in grams
  fatTarget: number; // in grams
  
  // New onboarding properties
  goal?: 'lose' | 'maintain' | 'gain';
  targetWeight?: number; // in kg
  weeklyRate?: number; // in kg/week
  estimatedGoalDate?: string;
  notificationsEnabled?: boolean;
}

export interface FoodLogItem {
  id: string;
  name: string;
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  quantity: number; // multiplier/servings, default 1
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  loggedAt: string; // ISO string
  imageUrl?: string;
  originalPrompt?: string;
  aiAnalysis?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  foods: FoodLogItem[];
  waterIntake: number; // in ml
  stepCount: number;
  activeCaloriesBurned: number;
}

export interface WeightLog {
  date: string; // YYYY-MM-DD
  weight: number; // in kg
}

export interface AppUser {
  uid: string;
  email: string | null;
}

interface AppState {
  profile: UserProfile;
  dailyLogs: Record<string, DailyLog>; // Key: YYYY-MM-DD
  weightHistory: WeightLog[];
  user: AppUser | null;
  isDarkMode: boolean;
  
  // Actions
  toggleDarkMode: () => void;
  setUser: (user: AppUser | null) => void;
  setAllData: (data: { profile: UserProfile; dailyLogs: Record<string, DailyLog>; weightHistory: WeightLog[] }) => void;
  mergeCloudData: (data: { profile: UserProfile; dailyLogs: Record<string, DailyLog>; weightHistory: WeightLog[] }) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  setOnboarding: (profileData: Omit<UserProfile, 'onboardingComplete' | 'calorieTarget' | 'proteinTarget' | 'carbsTarget' | 'fatTarget'>) => void;
  resetOnboarding: () => void;
  
  // Log Actions
  addFood: (date: string, food: Omit<FoodLogItem, 'id' | 'loggedAt'>) => void;
  deleteFood: (date: string, foodId: string) => void;
  updateWater: (date: string, amount: number) => void; // absolute or delta
  addWater: (date: string, amountMl: number) => void; // incremental
  updateSteps: (date: string, count: number) => void;
  updateActiveCalories: (date: string, calories: number) => void;
  
  // Weight Actions
  logWeight: (date: string, weight: number) => void;
  deleteWeight: (date: string) => void;
  
  // Reset
  clearAllData: () => void;
}

// Math Helpers for BMR / TDEE
export function calculateBMR(weight: number, height: number, age: number, gender: 'male' | 'female' | 'other'): number {
  // Mifflin-St Jeor Equation
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    // Average baseline for other/neutral
    return 10 * weight + 6.25 * height - 5 * age - 78;
  }
}

export function calculateTDEE(bmr: number, activityLevel: UserProfile['activityLevel']): number {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * multipliers[activityLevel]);
}

export function calculateTargets(
  tdee: number,
  weightGoal: UserProfile['weightGoal']
): { calorieTarget: number; proteinTarget: number; carbsTarget: number; fatTarget: number } {
  // Adjust calorie budget based on goals
  let calorieTarget = tdee;
  let pRatio = 0.30; // protein ratio
  let cRatio = 0.40; // carbs ratio
  let fRatio = 0.30; // fat ratio

  switch (weightGoal) {
    case 'lose_fast':
      calorieTarget = tdee - 750;
      // High protein to preserve muscle mass during fast weight loss
      pRatio = 0.35;
      cRatio = 0.35;
      fRatio = 0.30;
      break;
    case 'lose_slow':
      calorieTarget = tdee - 350;
      pRatio = 0.30;
      cRatio = 0.40;
      fRatio = 0.30;
      break;
    case 'maintain':
      calorieTarget = tdee;
      pRatio = 0.25;
      cRatio = 0.45;
      fRatio = 0.30;
      break;
    case 'gain_slow':
      calorieTarget = tdee + 300;
      pRatio = 0.25;
      cRatio = 0.50;
      fRatio = 0.25;
      break;
    case 'gain_fast':
      calorieTarget = tdee + 500;
      pRatio = 0.25;
      cRatio = 0.50;
      fRatio = 0.25;
      break;
  }

  // Safe minimum floor calories
  const minFloor = 1200;
  if (calorieTarget < minFloor) {
    calorieTarget = minFloor;
  }

  // Calculate grams (Protein/Carb = 4kcal/g, Fat = 9kcal/g)
  const proteinTarget = Math.round((calorieTarget * pRatio) / 4);
  const carbsTarget = Math.round((calorieTarget * cRatio) / 4);
  const fatTarget = Math.round((calorieTarget * fRatio) / 9);

  return {
    calorieTarget: Math.round(calorieTarget),
    proteinTarget,
    carbsTarget,
    fatTarget,
  };
}

// Initial defaults
const defaultProfile: UserProfile = {
  age: 28,
  gender: 'male',
  weight: 70,
  height: 175,
  activityLevel: 'moderate',
  weightGoal: 'maintain',
  onboardingComplete: false,
  calorieTarget: 2000,
  proteinTarget: 125,
  carbsTarget: 225,
  fatTarget: 66,
  goal: 'maintain',
  targetWeight: 70,
  weeklyRate: 0,
  estimatedGoalDate: '',
  notificationsEnabled: false,
};

// Storage setup for MMKV (Native) and LocalStorage (Web)
let mmkvStorage: any = {
  setItem: () => {},
  getItem: () => null,
  removeItem: () => {},
};

if (Platform.OS !== 'web') {
  try {
    const { MMKV } = require('react-native-mmkv');
    const mmkvInstance = new MMKV({ id: 'caloriq-local-store' });
    mmkvStorage = {
      setItem: (name: string, value: string) => {
        mmkvInstance.set(name, value);
      },
      getItem: (name: string) => {
        const val = mmkvInstance.getString(name);
        return val ?? null;
      },
      removeItem: (name: string) => {
        mmkvInstance.delete(name);
      },
    };
  } catch (err) {
    console.warn('Failed to initialize MMKV storage:', err);
  }
}

const webLocalStorage = {
  setItem: (name: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(name, value);
    }
  },
  getItem: (name: string) => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(name);
    }
    return null;
  },
  removeItem: (name: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(name);
    }
  },
};

const customStorage = Platform.OS === 'web' ? webLocalStorage : mmkvStorage;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      dailyLogs: {},
      weightHistory: [],
      user: null,
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setUser: (user) => set({ user }),
      setAllData: (data) => set({
        profile: data.profile,
        dailyLogs: data.dailyLogs,
        weightHistory: data.weightHistory
      }),
      mergeCloudData: (cloudData) => set((state) => {
        // Merge daily logs
        const mergedLogs = { ...state.dailyLogs };
        
        Object.keys(cloudData.dailyLogs || {}).forEach(date => {
          if (mergedLogs[date]) {
            const localFoods = mergedLogs[date].foods || [];
            const cloudFoods = cloudData.dailyLogs[date].foods || [];
            
            const uniqueFoods = [...localFoods];
            cloudFoods.forEach(cf => {
              if (!uniqueFoods.some(lf => lf.id === cf.id)) {
                uniqueFoods.push(cf);
              }
            });
            
            mergedLogs[date] = {
              ...mergedLogs[date],
              ...cloudData.dailyLogs[date],
              foods: uniqueFoods,
              waterIntake: Math.max(mergedLogs[date].waterIntake || 0, cloudData.dailyLogs[date].waterIntake || 0),
              stepCount: Math.max(mergedLogs[date].stepCount || 0, cloudData.dailyLogs[date].stepCount || 0),
              activeCaloriesBurned: Math.max(mergedLogs[date].activeCaloriesBurned || 0, cloudData.dailyLogs[date].activeCaloriesBurned || 0),
            };
          } else {
            mergedLogs[date] = cloudData.dailyLogs[date];
          }
        });

        // Merge weight history
        const weightMap = new Map<string, number>();
        state.weightHistory.forEach(w => weightMap.set(w.date, w.weight));
        (cloudData.weightHistory || []).forEach(w => weightMap.set(w.date, w.weight));
        
        const mergedWeight = Array.from(weightMap.entries())
          .map(([date, weight]) => ({ date, weight }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Cloud profile takes priority over local profile
        const isAlreadyOnboarded = Boolean(state.profile?.onboardingComplete || cloudData.profile?.onboardingComplete);
        const mergedProfile = {
          ...state.profile,
          ...cloudData.profile,
          onboardingComplete: isAlreadyOnboarded,
        };

        return {
          profile: mergedProfile,
          dailyLogs: mergedLogs,
          weightHistory: mergedWeight
        };
      }),

      updateProfile: (profileUpdates) =>
        set((state) => {
          const newProfile = { ...state.profile, ...profileUpdates };
          // If body metrics changed, recalculate targets
          if (
            profileUpdates.weight !== undefined ||
            profileUpdates.height !== undefined ||
            profileUpdates.age !== undefined ||
            profileUpdates.gender !== undefined ||
            profileUpdates.activityLevel !== undefined ||
            profileUpdates.weightGoal !== undefined
          ) {
            const bmr = calculateBMR(newProfile.weight, newProfile.height, newProfile.age, newProfile.gender);
            const tdee = calculateTDEE(bmr, newProfile.activityLevel);
            const targets = calculateTargets(tdee, newProfile.weightGoal);
            Object.assign(newProfile, targets);
          }

          // Auto-sync to Firebase cloud if logged in
          if (state.user?.uid) {
            saveUserDataToCloud(state.user.uid, {
              profile: newProfile,
              dailyLogs: state.dailyLogs,
              weightHistory: state.weightHistory,
            });
          }

          return { profile: newProfile };
        }),

      setOnboarding: (profileData) =>
        set((state) => {
          const bmr = calculateBMR(profileData.weight, profileData.height, profileData.age, profileData.gender);
          const tdee = calculateTDEE(bmr, profileData.activityLevel);
          const targets = calculateTargets(tdee, profileData.weightGoal);
          
          return {
            profile: {
              ...state.profile,
              ...profileData,
              ...targets,
              onboardingComplete: true,
            },
          };
        }),

      resetOnboarding: () =>
        set((state) => ({
          profile: {
            ...state.profile,
            onboardingComplete: false,
          },
        })),

      addFood: (date, food) =>
        set((state) => {
          const currentLog = state.dailyLogs[date] || {
            date,
            foods: [],
            waterIntake: 0,
            stepCount: 0,
            activeCaloriesBurned: 0,
          };

          const newFood: FoodLogItem = {
            ...food,
            id: Math.random().toString(36).substr(2, 9),
            loggedAt: new Date().toISOString(),
          };

          return {
            dailyLogs: {
              ...state.dailyLogs,
              [date]: {
                ...currentLog,
                foods: [...currentLog.foods, newFood],
              },
            },
          };
        }),

      deleteFood: (date, foodId) =>
        set((state) => {
          const currentLog = state.dailyLogs[date];
          if (!currentLog) return {};
          return {
            dailyLogs: {
              ...state.dailyLogs,
              [date]: {
                ...currentLog,
                foods: currentLog.foods.filter((f) => f.id !== foodId),
              },
            },
          };
        }),

      updateWater: (date, amount) =>
        set((state) => {
          const currentLog = state.dailyLogs[date] || {
            date,
            foods: [],
            waterIntake: 0,
            stepCount: 0,
            activeCaloriesBurned: 0,
          };
          return {
            dailyLogs: {
              ...state.dailyLogs,
              [date]: {
                ...currentLog,
                waterIntake: Math.max(0, amount),
              },
            },
          };
        }),

      addWater: (date, amountMl) =>
        set((state) => {
          const currentLog = state.dailyLogs[date] || {
            date,
            foods: [],
            waterIntake: 0,
            stepCount: 0,
            activeCaloriesBurned: 0,
          };
          return {
            dailyLogs: {
              ...state.dailyLogs,
              [date]: {
                ...currentLog,
                waterIntake: Math.max(0, currentLog.waterIntake + amountMl),
              },
            },
          };
        }),

      updateSteps: (date, count) =>
        set((state) => {
          const currentLog = state.dailyLogs[date] || {
            date,
            foods: [],
            waterIntake: 0,
            stepCount: 0,
            activeCaloriesBurned: 0,
          };
          return {
            dailyLogs: {
              ...state.dailyLogs,
              [date]: {
                ...currentLog,
                stepCount: Math.max(0, count),
              },
            },
          };
        }),

      updateActiveCalories: (date, calories) =>
        set((state) => {
          const currentLog = state.dailyLogs[date] || {
            date,
            foods: [],
            waterIntake: 0,
            stepCount: 0,
            activeCaloriesBurned: 0,
          };
          return {
            dailyLogs: {
              ...state.dailyLogs,
              [date]: {
                ...currentLog,
                activeCaloriesBurned: Math.max(0, calories),
              },
            },
          };
        }),

      logWeight: (date, weight) =>
        set((state) => {
          const cleanHistory = state.weightHistory.filter((w) => w.date !== date);
          const newEntry: WeightLog = { date, weight };
          const sortedHistory = [...cleanHistory, newEntry].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          // Also dynamically update weight in profile if this is the newest weight entry
          const isLatest = sortedHistory[sortedHistory.length - 1]?.date === date;
          let updatedProfile = state.profile;
          if (isLatest) {
            const bmr = calculateBMR(weight, state.profile.height, state.profile.age, state.profile.gender);
            const tdee = calculateTDEE(bmr, state.profile.activityLevel);
            const targets = calculateTargets(tdee, state.profile.weightGoal);
            updatedProfile = { ...state.profile, weight, ...targets };
          }

          return {
            weightHistory: sortedHistory,
            profile: updatedProfile,
          };
        }),

      deleteWeight: (date) =>
        set((state) => ({
          weightHistory: state.weightHistory.filter((w) => w.date !== date),
        })),

      clearAllData: () =>
        set((state) => ({
          profile: {
            ...defaultProfile,
            onboardingComplete: state.profile?.onboardingComplete || false,
          },
          dailyLogs: {},
          weightHistory: [],
        })),
    }),
    {
      name: 'caloriq-app-state',
      storage: createJSONStorage(() => customStorage),
    }
  )
);

// Subscribe to state changes to sync them reactively to Firestore database when logged in
useStore.subscribe((state, prevState) => {
  if (state.user) {
    if (
      state.profile !== prevState.profile ||
      state.dailyLogs !== prevState.dailyLogs ||
      state.weightHistory !== prevState.weightHistory
    ) {
      saveUserDataToCloud(state.user.uid, {
        profile: state.profile,
        dailyLogs: state.dailyLogs,
        weightHistory: state.weightHistory,
      }).catch((err) => console.error('Cloud sync error:', err));
    }
  }
});
