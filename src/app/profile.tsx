import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, UserProfile } from '../store';
import NiceAlertModal, { NiceAlertConfig } from '../components/ui/NiceAlertModal';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { saveUserDataToCloud, loadUserDataFromCloud } from '../lib/sync';
import { 
  User, 
  Activity, 
  Target, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  Check, 
  Sparkles,
  Info,
  Trash2,
  Scale,
  Calendar,
  Cloud
} from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg';

const formatEntryDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const formatChartDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
};

export default function ProfileScreen() {
  const { profile, setOnboarding, updateProfile, clearAllData, user, mergeCloudData, dailyLogs, weightHistory, isDarkMode } = useStore();
  const { openAuth } = useLocalSearchParams<{ openAuth?: string }>();

  // Auth States
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (openAuth === 'true') {
      setAuthMode('signin');
      setIsAuthModalVisible(true);
    }
  }, [openAuth]);

  // Local state for onboarding/editing form
  const [age, setAge] = useState((profile?.age ?? 28).toString());
  const [height, setHeight] = useState((profile?.height ?? 175).toString());
  const [weight, setWeight] = useState((profile?.weight ?? 70).toString());
  const [gender, setGender] = useState<UserProfile['gender']>(profile?.gender ?? 'male');
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>(profile?.activityLevel ?? 'moderate');
  const [weightGoal, setWeightGoal] = useState<UserProfile['weightGoal']>(profile?.weightGoal ?? 'maintain');
  
  const [isEditing, setIsEditing] = useState(!profile?.onboardingComplete);

  // Keep local state continuously in sync with profile store updates
  useEffect(() => {
    if (profile) {
      setAge((profile.age ?? 28).toString());
      setHeight((profile.height ?? 175).toString());
      setWeight((profile.weight ?? 70).toString());
      setGender(profile.gender ?? 'male');
      setActivityLevel(profile.activityLevel ?? 'moderate');
      setWeightGoal(profile.weightGoal ?? 'maintain');
    }
  }, [profile?.age, profile?.height, profile?.weight, profile?.gender, profile?.activityLevel, profile?.weightGoal]);

  const [alertConfig, setAlertConfig] = useState<NiceAlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });

  const handleSave = async () => {
    const numAge = parseInt(age, 10);
    const numHeight = parseFloat(height);
    const numWeight = parseFloat(weight);

    if (isNaN(numAge) || numAge <= 0 || numAge > 120) {
      setAlertConfig({
        visible: true,
        title: 'Invalid Input',
        message: 'Please enter a valid age (1-120).',
        type: 'warning',
      });
      return;
    }
    if (isNaN(numHeight) || numHeight <= 50 || numHeight > 250) {
      setAlertConfig({
        visible: true,
        title: 'Invalid Input',
        message: 'Please enter a valid height (50-250 cm).',
        type: 'warning',
      });
      return;
    }
    if (isNaN(numWeight) || numWeight <= 10 || numWeight > 500) {
      setAlertConfig({
        visible: true,
        title: 'Invalid Input',
        message: 'Please enter a valid weight (10-500 kg).',
        type: 'warning',
      });
      return;
    }

    const updatedProfile = {
      ...profile,
      age: numAge,
      gender,
      height: numHeight,
      weight: numWeight,
      activityLevel,
      weightGoal,
    };

    setOnboarding(updatedProfile);
    setIsEditing(false);

    if (user?.uid) {
      try {
        await saveUserDataToCloud(user.uid, {
          profile: {
            ...profile,
            ...updatedProfile,
          },
          dailyLogs,
          weightHistory,
        });
      } catch (err) {
        console.warn('Failed to sync updated profile to cloud:', err);
      }
    }

    setAlertConfig({
      visible: true,
      title: 'Metrics Saved!',
      message: 'Your body metrics and daily calorie targets have been recalculated and updated.',
      type: 'success',
    });
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Data',
      'Are you sure you want to clear all logs, weight history, and reset your profile? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Everything', 
          style: 'destructive',
          onPress: () => {
            clearAllData();
            setAge('28');
            setHeight('175');
            setWeight('70');
            setGender('male');
            setActivityLevel('moderate');
            setWeightGoal('maintain');
            setIsEditing(true);
          }
        }
      ]
    );
  };

  const handleAuthAction = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Error', 'Please fill in all credentials.');
      return;
    }
    if (authMode === 'signup' && authPassword !== authConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        const credential = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        const cloudData = await loadUserDataFromCloud(credential.user.uid);
        if (cloudData) {
          mergeCloudData({
            profile: cloudData.profile,
            dailyLogs: cloudData.dailyLogs || {},
            weightHistory: cloudData.weightHistory || [],
          });
          Alert.alert('Cloud Sync Success', 'Successfully restored user profile and food logs from cloud!');
        } else {
          await saveUserDataToCloud(credential.user.uid, {
            profile,
            dailyLogs,
            weightHistory,
          });
          Alert.alert('Auth Success', 'First time login. Backed up current local logs to cloud.');
        }
      } else {
        const credential = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        await saveUserDataToCloud(credential.user.uid, {
          profile,
          dailyLogs,
          weightHistory,
        });
        Alert.alert('Account Created', 'Successfully registered and synced data to the cloud.');
      }
      setIsAuthModalVisible(false);
      setAuthPassword('');
      setAuthConfirmPassword('');
    } catch (err: any) {
      const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
      if (isOffline) {
        console.warn('Network offline during profile auth sync. Using cached local session.');
      } else {
        console.error(err);
      }
      Alert.alert('Authentication Failed', err.message || 'Failed to authenticate.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local data will remain cached, but cloud syncing will be paused.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseSignOut(auth);
              clearAllData(); // Clear local state on sign out
              Alert.alert('Signed Out', 'Signed out successfully.');
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const activityOptions: { label: string; value: UserProfile['activityLevel']; desc: string }[] = [
    { label: 'Sedentary', value: 'sedentary', desc: 'Little to no exercise' },
    { label: 'Light', value: 'light', desc: 'Light exercise 1-3 days/week' },
    { label: 'Moderate', value: 'moderate', desc: 'Moderate exercise 3-5 days/week' },
    { label: 'Active', value: 'active', desc: 'Hard exercise 6-7 days/week' },
    { label: 'Very Active', value: 'very_active', desc: 'Very intense daily exercise/physical job' },
  ];

  const goalOptions: { label: string; value: UserProfile['weightGoal']; desc: string }[] = [
    { label: 'Lose Weight Fast', value: 'lose_fast', desc: 'Target deficit of ~750 kcal/day' },
    { label: 'Lose Weight Slow', value: 'lose_slow', desc: 'Target deficit of ~350 kcal/day' },
    { label: 'Maintain Weight', value: 'maintain', desc: 'Eat at your calculated TDEE' },
    { label: 'Gain Weight Slow', value: 'gain_slow', desc: 'Target surplus of ~300 kcal/day' },
    { label: 'Gain Weight Fast', value: 'gain_fast', desc: 'Target surplus of ~500 kcal/day' },
  ];

  return (
    <SafeAreaView className={`flex-1 px-4 ${isDarkMode ? 'bg-neutral-950' : 'bg-white'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between py-4 mb-4 border-b border-neutral-100 dark:border-neutral-800">
            <View className="flex-1 pr-2">
              <Text className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>Caloriq Profile</Text>
              <Text className="text-neutral-400 text-xs mt-0.5">Configure metrics, targets, & settings</Text>
            </View>
            {user ? (
              <View className="bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 max-w-[160px]">
                <Text numberOfLines={1} className="text-emerald-500 text-xs font-semibold">
                  {user.email}
                </Text>
              </View>
            ) : (
              <View className={`px-3 py-1.5 rounded-full border ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-100 border-neutral-200'}`}>
                <Text className="text-neutral-500 text-xs font-semibold uppercase">Local Guest</Text>
              </View>
            )}
          </View>

          {/* Setup Banner if onboarding is not done */}
          {!profile.onboardingComplete && (
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex-row items-start space-x-3">
              <ShieldAlert size={20} color="#f59e0b" className="mt-0.5" />
              <View className="flex-1 ml-2">
                <Text className="text-amber-500 font-bold text-sm">Action Required</Text>
                <Text className="text-neutral-400 text-xs mt-1 leading-relaxed">
                  Please complete the onboarding setup below. This calculates your customized BMR, TDEE, and daily target calories/macros.
                </Text>
              </View>
            </View>
          )}

          {/* Read-Only Goal Summary Card */}
          {!isEditing && profile.onboardingComplete && (
            <View className={`border rounded-3xl p-5 mb-6 shadow-sm ${
              isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
            }`}>
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                  <View className="w-9 h-9 bg-purple-500/10 rounded-xl items-center justify-center border border-purple-500/20 mr-3">
                    <Sparkles size={16} color="#c084fc" />
                  </View>
                  <View>
                    <Text className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>Your Daily Target Goals</Text>
                    <Text className="text-neutral-500 text-xs">Calculated via Mifflin-St Jeor</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setIsEditing(true)}
                  className={`px-3 py-1.5 rounded-xl border ${
                    isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-100 border-neutral-200'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>Edit Metrics</Text>
                </Pressable>
              </View>

              {/* Target Calories */}
              <View className={`items-center py-4 rounded-2xl border mb-4 ${
                isDarkMode ? 'bg-neutral-950/40 border-neutral-800' : 'bg-neutral-50 border-neutral-100'
              }`}>
                <Text className="text-neutral-400 text-xs uppercase tracking-widest font-semibold mb-1">Calorie Target</Text>
                <Text className="text-3xl font-black text-emerald-500">{profile.calorieTarget} <Text className="text-lg font-normal text-neutral-400">kcal</Text></Text>
              </View>

              {/* Target Macros */}
              <View className="flex-row justify-between space-x-2">
                <View className="flex-1 bg-red-500/5 border border-red-500/10 rounded-xl p-3 items-center">
                  <Text className="text-red-400 text-xs font-semibold">Protein</Text>
                  <Text className={`text-lg font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>{profile.proteinTarget}g</Text>
                  <Text className="text-[10px] text-neutral-400 mt-0.5">{profile.proteinTarget * 4} kcal</Text>
                </View>
                <View className="flex-1 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 items-center">
                  <Text className="text-amber-500 text-xs font-semibold">Carbs</Text>
                  <Text className={`text-lg font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>{profile.carbsTarget}g</Text>
                  <Text className="text-[10px] text-neutral-400 mt-0.5">{profile.carbsTarget * 4} kcal</Text>
                </View>
                <View className="flex-1 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 items-center">
                  <Text className="text-emerald-500 text-xs font-semibold">Fat</Text>
                  <Text className={`text-lg font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>{profile.fatTarget}g</Text>
                  <Text className="text-[10px] text-neutral-400 mt-0.5">{profile.fatTarget * 9} kcal</Text>
                </View>
              </View>

              <View className={`border rounded-2xl p-3.5 mt-4 flex-row items-center space-x-2.5 ${
                isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-100'
              }`}>
                <Info size={15} color="#10B981" />
                <Text className={`text-xs font-medium flex-1 ${
                  isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
                }`}>
                  Macro targets: 30% Protein, 40% Carbs, 30% Fat adjusted for your {profile.weightGoal.replace('_', ' ')} goal.
                </Text>
              </View>
            </View>
          )}

          {/* Form Content */}
          {(isEditing || !profile.onboardingComplete) ? (
            <View className="space-y-6">
              {/* Profile Fields Card */}
              <View className={`border rounded-3xl p-5 space-y-4 shadow-sm ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
              }`}>
                <View className="flex-row items-center mb-2 space-x-2">
                  <User size={18} color={isDarkMode ? '#e5e5e5' : '#404040'} />
                  <Text className={`font-bold text-base ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>Body Metrics</Text>
                </View>

                {/* Age Input */}
                <View>
                  <Text className="text-neutral-400 text-xs font-semibold mb-2">Age (years)</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                    placeholder="28"
                    placeholderTextColor="#737373"
                    className={`border rounded-2xl px-4 py-3 text-sm font-semibold ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-850'
                    }`}
                  />
                </View>

                {/* Height Input */}
                <View>
                  <Text className="text-neutral-400 text-xs font-semibold mb-2">Height (cm)</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                    placeholder="175"
                    placeholderTextColor="#737373"
                    className={`border rounded-2xl px-4 py-3 text-sm font-semibold ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-850'
                    }`}
                  />
                </View>

                {/* Weight Input */}
                <View>
                  <Text className="text-neutral-400 text-xs font-semibold mb-2">Weight (kg)</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="70"
                    placeholderTextColor="#737373"
                    className={`border rounded-2xl px-4 py-3 text-sm font-semibold ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-850'
                    }`}
                  />
                </View>

                {/* Gender Selector */}
                <View>
                  <Text className="text-neutral-400 text-xs font-semibold mb-2">Gender</Text>
                  <View className="flex-row space-x-2">
                    {(['male', 'female', 'other'] as const).map((opt) => (
                      <Pressable
                        key={opt}
                        onPress={() => setGender(opt)}
                        className={`flex-1 py-3.5 rounded-2xl border items-center capitalize ${
                          gender === opt
                            ? 'bg-amber-500/10 border-amber-500'
                            : isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                        }`}
                      >
                        <Text
                          className={`font-semibold text-xs ${
                            gender === opt ? 'text-amber-500' : isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                          }`}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              {/* Activity Level Card */}
              <View className={`border rounded-3xl p-5 shadow-sm ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
              }`}>
                <View className="flex-row items-center mb-3 space-x-2">
                  <Activity size={18} color={isDarkMode ? '#e5e5e5' : '#404040'} />
                  <Text className={`font-bold text-base ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>Activity Level</Text>
                </View>

                <View className="space-y-2.5">
                  {activityOptions.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setActivityLevel(opt.value)}
                      className={`p-3.5 rounded-2xl border flex-row justify-between items-center ${
                        activityLevel === opt.value
                          ? 'bg-amber-500/10 border-amber-500'
                          : isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <View className="flex-1 pr-2">
                        <Text
                          className={`font-bold text-sm ${
                            activityLevel === opt.value ? 'text-amber-500' : isDarkMode ? 'text-white' : 'text-neutral-850'
                          }`}
                        >
                          {opt.label}
                        </Text>
                        <Text className="text-neutral-400 text-xs mt-0.5">{opt.desc}</Text>
                      </View>
                      {activityLevel === opt.value && <Check size={16} color="#f59e0b" />}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Fitness Goal Card */}
              <View className={`border rounded-3xl p-5 shadow-sm ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
              }`}>
                <View className="flex-row items-center mb-3 space-x-2">
                  <Target size={18} color={isDarkMode ? '#e5e5e5' : '#404040'} />
                  <Text className={`font-bold text-base ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>Caloric Goal</Text>
                </View>

                <View className="space-y-2.5">
                  {goalOptions.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setWeightGoal(opt.value)}
                      className={`p-3.5 rounded-2xl border flex-row justify-between items-center ${
                        weightGoal === opt.value
                          ? 'bg-amber-500/10 border-amber-500'
                          : isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <View className="flex-1 pr-2">
                        <Text
                          className={`font-bold text-sm ${
                            weightGoal === opt.value ? 'text-amber-500' : isDarkMode ? 'text-white' : 'text-neutral-850'
                          }`}
                        >
                          {opt.label}
                        </Text>
                        <Text className="text-neutral-400 text-xs mt-0.5">{opt.desc}</Text>
                      </View>
                      {weightGoal === opt.value && <Check size={16} color="#f59e0b" />}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Buttons */}
              <View className="flex-row space-x-3 mt-4">
                {profile.onboardingComplete && (
                  <Pressable
                    onPress={() => setIsEditing(false)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 py-4 rounded-2xl items-center justify-center active:bg-neutral-850"
                  >
                    <Text className="text-white font-bold text-sm">Cancel</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleSave}
                  className="flex-2 bg-amber-500 py-4 rounded-2xl items-center justify-center active:bg-amber-600 flex-row space-x-2"
                  style={{ flexGrow: 2 }}
                >
                  <Text className="text-neutral-950 font-bold text-sm">Save & Calculate Targets</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="space-y-6">
              {/* Weight Journal Card */}
              <WeightJournalSection />

              {/* Settings Actions Card */}
              <View className={`border rounded-3xl p-5 space-y-4 shadow-sm ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
              }`}>
                <View className="flex-row items-center space-x-2 mb-2">
                  <Settings size={18} color={isDarkMode ? '#e5e5e5' : '#404040'} />
                  <Text className={`font-bold text-base ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>App Settings & Management</Text>
                </View>

                <Pressable
                  onPress={handleReset}
                  className="bg-red-500/10 border border-red-500/20 py-4 px-4 rounded-2xl flex-row items-center justify-between active:bg-red-500/25"
                >
                  <View className="flex-row items-center">
                    <LogOut size={16} color="#ef4444" />
                    <Text className="text-red-500 font-semibold text-sm ml-3">Reset All Local Data</Text>
                  </View>
                  <Text className="text-neutral-400 text-xs">Clears logs</Text>
                </Pressable>

                {/* Firebase Cloud Sync Card */}
                <View className={`border rounded-3xl p-5 mt-4 space-y-4 ${
                  isDarkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <View className="flex-row items-center space-x-2 mb-2">
                    <Cloud size={18} color="#10B981" />
                    <Text className={`font-bold text-base ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>Cloud Backup & Sync</Text>
                  </View>

                  {user ? (
                    <View className="space-y-4">
                      <View className={`p-4 rounded-2xl border space-y-2 ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                      }`}>
                        <Text className="font-semibold text-xs uppercase tracking-wider text-emerald-500">Cloud Connected</Text>
                        <Text className="text-neutral-400 text-xs leading-relaxed">
                          Your profile metrics, daily food journal, and weight logs are automatically backed up and synchronized to Cloud Firestore under:
                        </Text>
                        <Text className={`font-mono text-xs p-2 rounded-lg ${
                          isDarkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-850'
                        }`}>{user.email}</Text>
                      </View>

                      <View className="flex-row space-x-2">
                        <Pressable
                          onPress={async () => {
                            try {
                              await saveUserDataToCloud(user.uid, { profile, dailyLogs, weightHistory });
                              Alert.alert('Synced', 'Successfully uploaded current state to Cloud Firestore!');
                            } catch (err: any) {
                              Alert.alert('Sync Failed', err.message || 'Failed to sync.');
                            }
                          }}
                          className="flex-1 bg-emerald-500 py-3.5 rounded-2xl items-center justify-center active:bg-emerald-600"
                        >
                          <Text className="text-white font-bold text-xs text-center">Sync Now</Text>
                        </Pressable>

                        <Pressable
                          onPress={handleSignOut}
                          className={`flex-1 border py-3.5 rounded-2xl items-center justify-center ${
                            isDarkMode ? 'bg-neutral-850 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
                          }`}
                        >
                          <Text className="text-red-500 font-bold text-xs text-center">Sign Out</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View className="space-y-4">
                      <View className={`p-4 rounded-2xl border space-y-2 ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                      }`}>
                        <Text className="font-semibold text-xs uppercase tracking-wider text-amber-500">Backup and Sync Off</Text>
                        <Text className="text-neutral-400 text-xs leading-relaxed font-medium">
                          Sign in or register an account to sync your logs, weight history, and targets to the cloud. Access your profile seamlessly from any device!
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => {
                          setAuthMode('signin');
                          setIsAuthModalVisible(true);
                        }}
                        className="bg-emerald-500 py-4 rounded-2xl items-center justify-center active:bg-emerald-600"
                      >
                        <Text className="text-white font-bold text-xs text-center">Sign In / Register</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Auth Modal */}
      <Modal
        visible={isAuthModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAuthModalVisible(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="w-full"
          >
            <View className="bg-neutral-900 border-t border-neutral-800 rounded-t-[32px] p-6 pb-10">
              <View className="w-12 h-1.5 bg-neutral-800 rounded-full self-center mb-6" />
              
              <Text className="text-xl font-black text-white text-center mb-1">
                {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text className="text-neutral-500 text-xs text-center mb-6">
                {authMode === 'signin' 
                  ? 'Sign in to restore your cloud backups' 
                  : 'Start backing up your logs and targets securely'}
              </Text>

              <View className="space-y-4 mb-6">
                <View>
                  <Text className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-2">Email Address</Text>
                  <TextInput
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="name@example.com"
                    placeholderTextColor="#525252"
                    className="bg-neutral-950 border border-neutral-850 rounded-2xl px-4 py-3.5 text-white text-sm"
                  />
                </View>

                <View>
                  <Text className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-2">Password</Text>
                  <TextInput
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    placeholder="••••••••"
                    placeholderTextColor="#525252"
                    className="bg-neutral-950 border border-neutral-850 rounded-2xl px-4 py-3.5 text-white text-sm"
                  />
                </View>

                {authMode === 'signup' && (
                  <View>
                    <Text className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-2">Confirm Password</Text>
                    <TextInput
                      value={authConfirmPassword}
                      onChangeText={setAuthConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      placeholder="••••••••"
                      placeholderTextColor="#525252"
                      className="bg-neutral-950 border border-neutral-850 rounded-2xl px-4 py-3.5 text-white text-sm"
                    />
                  </View>
                )}
              </View>

              <Pressable
                onPress={handleAuthAction}
                disabled={authLoading}
                className="bg-amber-500 py-4 rounded-2xl items-center justify-center active:bg-amber-600 mb-4"
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text className="text-neutral-950 font-bold text-sm">
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </Pressable>

              <View className="flex-row justify-center space-x-1">
                <Text className="text-neutral-500 text-xs">
                  {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                </Text>
                <Pressable
                  onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                >
                  <Text className="text-amber-500 text-xs font-bold">
                    {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setIsAuthModalVisible(false)}
                className="mt-6 border border-neutral-850 py-3.5 rounded-2xl items-center justify-center active:bg-neutral-800"
              >
                <Text className="text-neutral-400 font-bold text-xs">Close</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <NiceAlertModal
        config={alertConfig}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
}

function WeightJournalSection() {
  const { weightHistory, logWeight, deleteWeight, isDarkMode } = useStore();
  const [newWeight, setNewWeight] = useState('');
  const [alertConfig, setAlertConfig] = useState<NiceAlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });

  const handleLogWeight = () => {
    const wt = parseFloat(newWeight);
    if (isNaN(wt) || wt <= 10 || wt > 500) {
      setAlertConfig({
        visible: true,
        title: 'Invalid Entry',
        message: 'Please enter a valid weight between 10 kg and 500 kg.',
        type: 'warning',
        confirmText: 'Got It',
      });
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    logWeight(todayStr, wt);
    setNewWeight('');
    setAlertConfig({
      visible: true,
      title: 'Weight Logged!',
      message: `${wt} kg logged to your daily weight tracker successfully.`,
      type: 'success',
      confirmText: 'Awesome',
    });
  };

  // Prepare chart data (last 7 entries)
  const chartData = weightHistory.slice(-7);

  // SVG Chart Dimensions
  const chartWidth = 320;
  const chartHeight = 150;
  const padding = 25;

  let points = '';
  let fillPoints = '';
  const xPoints: number[] = [];
  const yPoints: number[] = [];

  if (chartData.length >= 2) {
    const weights = chartData.map((d) => d.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const weightRange = maxWeight - minWeight;

    chartData.forEach((d, i) => {
      // Calculate X coordinate
      const x = padding + (i * (chartWidth - 2 * padding)) / (chartData.length - 1);
      // Calculate Y coordinate (inverted in SVG)
      const y = chartHeight - padding - ((d.weight - minWeight) * (chartHeight - 2 * padding)) / weightRange;

      xPoints.push(x);
      yPoints.push(y);

      if (i === 0) {
        points = `M ${x} ${y}`;
        fillPoints = `M ${x} ${chartHeight - padding} L ${x} ${y}`;
      } else {
        points += ` L ${x} ${y}`;
        fillPoints += ` L ${x} ${y}`;
      }

      if (i === chartData.length - 1) {
        fillPoints += ` L ${x} ${chartHeight - padding} Z`;
      }
    });
  }

  return (
    <View className={`border rounded-3xl p-5 space-y-4 shadow-sm ${
      isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
    }`}>
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center">
          <Scale size={18} color={isDarkMode ? '#e5e5e5' : '#404040'} />
          <Text className={`font-bold text-base ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>Weight Tracker</Text>
        </View>
        <Text className="text-neutral-400 text-xs">{weightHistory.length} entries</Text>
      </View>

      {/* Log Weight Inline Input */}
      <View className={`flex-row space-x-2 p-2 rounded-2xl border ${
        isDarkMode ? 'bg-neutral-950/65 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
      }`}>
        <TextInput
          keyboardType="numeric"
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder="Today's weight (kg)"
          placeholderTextColor="#737373"
          className={`flex-1 text-xs px-3 py-2 font-semibold ${
            isDarkMode ? 'text-white' : 'text-neutral-850'
          }`}
        />
        <Pressable
          onPress={handleLogWeight}
          className="bg-amber-500 px-4 py-2.5 rounded-xl items-center justify-center active:bg-amber-600"
        >
          <Text className="text-neutral-950 font-bold text-xs">Log Weight</Text>
        </Pressable>
      </View>

      {/* SVG Chart */}
      {chartData.length < 2 ? (
        <View className={`h-32 border border-dashed rounded-2xl items-center justify-center p-4 ${
          isDarkMode ? 'bg-neutral-950/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <Scale size={24} color="#737373" />
          <Text className="text-neutral-400 text-xs mt-2 text-center">
            Log your weight on 2 different days to generate a progress chart.
          </Text>
        </View>
      ) : (
        <View className={`p-3 rounded-2xl border items-center overflow-hidden ${
          isDarkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Grid Line */}
            <Line
              x1={padding}
              y1={chartHeight - padding}
              x2={chartWidth - padding}
              y2={chartHeight - padding}
              stroke={isDarkMode ? '#262626' : '#e5e5e5'}
              strokeWidth="1"
            />
            <Line
              x1={padding}
              y1={padding}
              x2={chartWidth - padding}
              y2={padding}
              stroke={isDarkMode ? '#262626' : '#e5e5e5'}
              strokeWidth="1"
              strokeDasharray="2, 2"
            />

            {/* Filled Area */}
            <Path d={fillPoints} fill="url(#weightGrad)" />

            {/* Line Path */}
            <Path d={points} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

            {/* Dots & Labels */}
            {chartData.map((d, i) => (
              <React.Fragment key={d.date}>
                <Circle
                  cx={xPoints[i]}
                  cy={yPoints[i]}
                  r="4"
                  fill="#f59e0b"
                  stroke={isDarkMode ? '#171717' : '#ffffff'}
                  strokeWidth="1.5"
                />
                {/* Weight Label above point */}
                <SvgText
                  x={xPoints[i]}
                  y={yPoints[i] - 8}
                  fill={isDarkMode ? '#ffffff' : '#262626'}
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {d.weight}
                </SvgText>
                {/* Date Label below baseline */}
                <SvgText
                  x={xPoints[i]}
                  y={chartHeight - 8}
                  fill="#737373"
                  fontSize="8"
                  textAnchor="middle"
                >
                  {formatChartDate(d.date)}
                </SvgText>
              </React.Fragment>
            ))}
          </Svg>
        </View>
      )}

      {/* Weight History Drawer List */}
      {weightHistory.length > 0 && (
        <View className="space-y-2 mt-2">
          <Text className="text-neutral-400 text-[10px] uppercase font-bold tracking-wider mb-1">Recent Entries</Text>
          {weightHistory.slice(-3).reverse().map((entry) => (
            <View key={entry.date} className={`flex-row justify-between items-center px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-neutral-950/45 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <View className="flex-row items-center space-x-2">
                <Calendar size={12} color="#737373" />
                <Text className={`text-xs font-semibold ml-1 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {formatEntryDate(entry.date)}
                </Text>
              </View>
              <View className="flex-row items-center space-x-3">
                <Text className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>{entry.weight} kg</Text>
                <Pressable onPress={() => deleteWeight(entry.date)} className="p-1 active:opacity-70">
                  <Trash2 size={12} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <NiceAlertModal
        config={alertConfig}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}
