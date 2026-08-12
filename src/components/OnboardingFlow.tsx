import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
  SafeAreaView
} from 'react-native';
import { ChevronLeft, Moon, Sun, Bell, Circle, CheckCircle, Menu, X } from 'lucide-react-native';
import { useStore, UserProfile } from '../store';
import { auth } from '../lib/firebase';
import { saveUserDataToCloud } from '../lib/sync';

// Pure JS Custom Slider Component to avoid external dependencies
function CustomSlider({ value, min, max, onChange, isDarkMode }: {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  isDarkMode: boolean;
}) {
  const [width, setWidth] = useState(0);
  const handleTouch = (evt: any) => {
    if (width <= 0) return;
    const touchX = evt.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, touchX / width));
    const newVal = min + ratio * (max - min);
    onChange(Math.round(newVal));
  };
  
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <View 
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      style={{ width: '100%', height: 32, justifyContent: 'center', marginBottom: 16, paddingHorizontal: 8 }}
    >
      <View style={{ height: 6, width: '100%', backgroundColor: isDarkMode ? '#404040' : '#e5e5e5', borderRadius: 3 }}>
        <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: '#22C55E', borderRadius: 3 }} />
        <View 
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            backgroundColor: '#22C55E',
            borderRadius: 10,
            top: -7,
            left: `${percentage}%`,
            marginLeft: -10,
            borderWidth: 2,
            borderColor: '#fff',
            elevation: 2,
          }}
        />
      </View>
    </View>
  );
}

interface OnboardingFlowProps {
  visible: boolean;
  onClose: () => void;
}

export default function OnboardingFlow({ visible, onClose }: OnboardingFlowProps) {
  const { profile, dailyLogs, weightHistory, updateProfile, isDarkMode } = useStore();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 10;

  // Onboarding States
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  
  // Height State
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');

  // Weight State
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [weightValue, setWeightValue] = useState('');

  // Gender & Age State
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [age, setAge] = useState('');

  // Target Weight State
  const [targetWeight, setTargetWeight] = useState(70);

  // Activity Level State
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null>(null);

  // Speed selection State
  const [speedRate, setSpeedRate] = useState<number | null>(null);

  // Validation Error State
  const [errorMsg, setErrorMsg] = useState('');

  // Android Back Handler integration
  useEffect(() => {
    const backAction = () => {
      if (visible && currentStep > 1) {
        setCurrentStep((prev) => prev - 1);
        setErrorMsg('');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, currentStep]);

  // Reset states when opened
  useEffect(() => {
    if (visible) {
      setCurrentStep(1);
      setGoal(null);
      setHeightCm('');
      setHeightFt('');
      setHeightIn('');
      setWeightValue('');
      setGender(null);
      setAge('');
      setActivityLevel(null);
      setSpeedRate(null);
      setErrorMsg('');
    }
  }, [visible]);

  // Dynamic Height calculation (to normalized cm)
  const getNormalizedHeightCm = (): number => {
    if (heightUnit === 'cm') {
      return parseFloat(heightCm) || 0;
    } else {
      const ft = parseFloat(heightFt) || 0;
      const inch = parseFloat(heightIn) || 0;
      return Math.round((ft * 12 + inch) * 2.54);
    }
  };

  // Dynamic Weight calculation (to normalized kg)
  const getNormalizedWeightKg = (): number => {
    const val = parseFloat(weightValue) || 0;
    return weightUnit === 'kg' ? val : Math.round(val * 0.45359237);
  };

  // Convert height unit representation
  const handleHeightUnitChange = (unit: 'cm' | 'ft') => {
    if (unit === heightUnit) return;
    setHeightUnit(unit);
    setErrorMsg('');

    if (unit === 'ft') {
      const cmVal = parseFloat(heightCm);
      if (!isNaN(cmVal) && cmVal > 0) {
        const totalInches = cmVal / 2.54;
        const ft = Math.floor(totalInches / 12);
        const inch = Math.round(totalInches % 12);
        setHeightFt(ft.toString());
        setHeightIn(inch.toString());
      }
    } else {
      const ftVal = parseFloat(heightFt) || 0;
      const inVal = parseFloat(heightIn) || 0;
      if (ftVal > 0 || inVal > 0) {
        const cm = Math.round((ftVal * 12 + inVal) * 2.54);
        setHeightCm(cm.toString());
      }
    }
  };

  // Convert weight unit representation
  const handleWeightUnitChange = (unit: 'kg' | 'lb') => {
    if (unit === weightUnit) return;
    setWeightUnit(unit);
    setErrorMsg('');

    const wVal = parseFloat(weightValue);
    if (!isNaN(wVal) && wVal > 0) {
      if (unit === 'lb') {
        setWeightValue(Math.round(wVal * 2.20462).toString());
      } else {
        setWeightValue(Math.round(wVal / 2.20462).toString());
      }
    }
  };

  // BMI-based healthy range calculator
  const getHealthyRange = () => {
    const hCm = getNormalizedHeightCm();
    if (hCm <= 0) return { min: 50, max: 80 };
    const hM = hCm / 100;
    return {
      min: Math.round(18.5 * (hM ** 2)),
      max: Math.round(24.9 * (hM ** 2))
    };
  };

  // Initialize target weight defaults based on current weight
  useEffect(() => {
    if (currentStep === 6) {
      const currentKg = getNormalizedWeightKg();
      if (currentKg > 0) {
        setTargetWeight(currentKg);
      }
    }
  }, [currentStep]);

  // Date projector calculator
  const getProjectedDate = (rate: number): string => {
    const currentKg = getNormalizedWeightKg();
    const targetKg = targetWeight;
    const diff = Math.abs(currentKg - targetKg);
    if (diff === 0 || rate <= 0) return 'Today';
    
    const weeks = diff / rate;
    const days = Math.round(weeks * 7);
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + days);

    return dateObj.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Mifflin-St Jeor formulas
  const calculateBMR = (): number => {
    const wKg = getNormalizedWeightKg();
    const hCm = getNormalizedHeightCm();
    const ageNum = parseInt(age) || 25;
    
    if (gender === 'male') {
      return Math.round(10 * wKg + 6.25 * hCm - 5 * ageNum + 5);
    } else {
      return Math.round(10 * wKg + 6.25 * hCm - 5 * ageNum - 161);
    }
  };

  const calculateTDEE = (): number => {
    const bmrVal = calculateBMR();
    let factor = 1.2;
    if (activityLevel === 'light') factor = 1.375;
    else if (activityLevel === 'moderate') factor = 1.55;
    else if (activityLevel === 'active') factor = 1.725;
    else if (activityLevel === 'very_active') factor = 1.9;

    return Math.round(bmrVal * factor);
  };

  const calculateDailyCalorieTarget = (): { target: number; warning: boolean } => {
    const tdee = calculateTDEE();
    if (goal === 'maintain') {
      return { target: tdee, warning: false };
    }

    const rate = speedRate || 0.5;
    const dailyDeficit = Math.round((rate * 7700) / 7);
    
    let target = goal === 'lose' ? tdee - dailyDeficit : tdee + dailyDeficit;
    
    // Safety thresholds
    const minSafety = gender === 'male' ? 1500 : 1200;
    let warning = false;
    if (target < minSafety) {
      target = minSafety;
      warning = true;
    }
    return { target: Math.round(target), warning };
  };

  // Onboarding Step Validations
  const validateAndProceed = async () => {
    setErrorMsg('');

    if (currentStep === 1) {
      if (!goal) {
        setErrorMsg('Please select your goal.');
        return;
      }
      setCurrentStep(2);
    } 
    else if (currentStep === 2) {
      const hCm = getNormalizedHeightCm();
      if (hCm < 100 || hCm > 250) {
        setErrorMsg('Please enter a valid height (100 - 250 cm).');
        return;
      }
      setCurrentStep(3);
    } 
    else if (currentStep === 3) {
      const wKg = getNormalizedWeightKg();
      if (wKg < 30 || wKg > 300) {
        setErrorMsg('Please enter a valid weight (30 - 300 kg).');
        return;
      }
      setCurrentStep(4);
    } 
    else if (currentStep === 4) {
      if (!gender) {
        setErrorMsg('Please select your gender.');
        return;
      }
      setCurrentStep(5);
    } 
    else if (currentStep === 5) {
      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 100) {
        setErrorMsg('Please enter a valid age (13 - 100 years).');
        return;
      }
      setCurrentStep(6);
    } 
    else if (currentStep === 6) {
      const currentKg = getNormalizedWeightKg();
      if (goal === 'lose' && targetWeight >= currentKg) {
        setErrorMsg(`Target weight must be less than current weight (${currentKg} kg).`);
        return;
      }
      if (goal === 'gain' && targetWeight <= currentKg) {
        setErrorMsg(`Target weight must be greater than current weight (${currentKg} kg).`);
        return;
      }
      
      // Proceed: go to activity level (Step 7)
      setCurrentStep(7);
    }
    else if (currentStep === 7) {
      if (!activityLevel) {
        setErrorMsg('Please select your activity level.');
        return;
      }
      // If maintenance, skip speed and go directly to results (Step 9)
      if (goal === 'maintain') {
        setSpeedRate(0);
        setCurrentStep(9);
      } else {
        setCurrentStep(8);
      }
    }
    else if (currentStep === 8) {
      if (!speedRate) {
        setErrorMsg('Please select a rate speed.');
        return;
      }
      setCurrentStep(9); // Step 9: Calorie Result screen
    }
    else if (currentStep === 9) {
      setCurrentStep(10); // Step 10: Notification request screen
    }
  };

  // Notification setup
  const handleAllowNotifications = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      Alert.alert('Notifications Enabled', 'We will keep you motivated on your journey!');
    }
    handleFinishOnboarding(granted);
  };

  const requestNotificationPermissions = async () => {
    try {
      // Dynamic require check using expo-constants to detect Expo Go client
      const Constants = require('expo-constants').default;
      const isExpoGo = Constants.appOwnership === 'expo';
      
      if (isExpoGo) {
        console.warn('Native push notifications are not supported inside Expo Go Client. Skipping permissions request.');
        Alert.alert(
          'Onboarding Complete',
          'Note: Push notifications are disabled in the Expo Go development sandbox. You can enable them in a production build.',
          [{ text: 'Continue' }]
        );
        return false;
      }

      // Dynamic require to prevent crash on load in Expo Go SDK 53/55
      const Notifications = require('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('Notifications request error:', e);
      return false;
    }
  };

  // Save profile and finish
  const handleFinishOnboarding = (notifEnabled = false) => {
    const finalHeight = getNormalizedHeightCm();
    const finalWeight = getNormalizedWeightKg();
    const bmrVal = calculateBMR();
    const tdeeVal = calculateTDEE();
    const { target: calTarget } = calculateDailyCalorieTarget();
    
    // Macro ratios (Protein = 25%, Carbs = 45%, Fat = 30%)
    const pTarget = Math.round((calTarget * 0.25) / 4);
    const cTarget = Math.round((calTarget * 0.45) / 4);
    const fTarget = Math.round((calTarget * 0.30) / 9);

    const targetDateStr = goal !== 'maintain' ? getProjectedDate(speedRate || 0.5) : '';

    const newProfile: Partial<UserProfile> = {
      age: parseInt(age) || 25,
      gender: gender || 'male',
      weight: finalWeight,
      height: finalHeight,
      activityLevel: activityLevel || 'moderate',
      onboardingComplete: true,
      calorieTarget: calTarget,
      proteinTarget: pTarget,
      carbsTarget: cTarget,
      fatTarget: fTarget,
      // Extended fields
      goal: goal || 'maintain',
      targetWeight: targetWeight,
      weeklyRate: speedRate || 0,
      estimatedGoalDate: targetDateStr,
      notificationsEnabled: notifEnabled,
      weightGoal: goal === 'lose' ? 'lose_slow' : goal === 'gain' ? 'gain_slow' : 'maintain',
    };

    updateProfile(newProfile);

    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
      saveUserDataToCloud(currentUser.uid, {
        profile: { ...profile, ...newProfile },
        dailyLogs,
        weightHistory,
      });
    }

    onClose();
  };

  const renderContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View className="flex-1 justify-center px-4">
            <Text className={`text-2xl font-black text-center mb-8 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>What's your goal?</Text>
            
            <View className="space-y-4">
              {[
                { key: 'lose', label: 'Lose Weight' },
                { key: 'maintain', label: 'Maintain Weight' },
                { key: 'gain', label: 'Gain Weight' }
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setGoal(opt.key as any);
                    setErrorMsg('');
                  }}
                  className={`flex-row items-center p-5 border rounded-2xl ${
                    goal === opt.key 
                      ? 'border-green-500 bg-green-50/20' 
                      : (isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-250 bg-white')
                  }`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 justify-center items-center mr-4 ${
                    goal === opt.key ? 'border-green-500' : 'border-neutral-300'
                  }`}>
                    {goal === opt.key && <View className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                  </View>
                  <Text className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View className="flex-1 justify-center px-4">
            <Text className={`text-2xl font-black text-center mb-4 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>How tall are you?</Text>
            
            {/* Unit Switcher */}
            <View className="flex-row justify-center mb-8 bg-neutral-100 dark:bg-neutral-850 p-1.5 rounded-2xl self-center">
              <Pressable
                onPress={() => handleHeightUnitChange('cm')}
                className={`px-6 py-2 rounded-xl ${heightUnit === 'cm' ? 'bg-white dark:bg-neutral-800 shadow-sm' : ''}`}
              >
                <Text className={`text-xs font-bold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}`}>cm</Text>
              </Pressable>
              <Pressable
                onPress={() => handleHeightUnitChange('ft')}
                className={`px-6 py-2 rounded-xl ${heightUnit === 'ft' ? 'bg-white dark:bg-neutral-800 shadow-sm' : ''}`}
              >
                <Text className={`text-xs font-bold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}`}>ft / in</Text>
              </Pressable>
            </View>

            {/* Inputs */}
            {heightUnit === 'cm' ? (
              <View className="flex-row justify-center items-baseline border-b border-green-500 pb-2 mx-16 self-center">
                <TextInput
                  value={heightCm}
                  onChangeText={(val) => {
                    setHeightCm(val.replace(/[^0-9]/g, ''));
                    setErrorMsg('');
                  }}
                  keyboardType="numeric"
                  placeholder="170"
                  placeholderTextColor="#a3a3a3"
                  className={`text-4xl font-extrabold text-center min-w-[100px] ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}
                />
                <Text className="text-xl font-bold text-neutral-400 ml-2">cm</Text>
              </View>
            ) : (
              <View className="flex-row justify-center items-center space-x-6">
                <View className="flex-row items-baseline border-b border-green-500 pb-2">
                  <TextInput
                    value={heightFt}
                    onChangeText={(val) => {
                      setHeightFt(val.replace(/[^0-9]/g, ''));
                      setErrorMsg('');
                    }}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor="#a3a3a3"
                    className={`text-4xl font-extrabold text-center min-w-[50px] ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}
                  />
                  <Text className="text-xl font-bold text-neutral-400 ml-2">ft</Text>
                </View>
                <View className="flex-row items-baseline border-b border-green-500 pb-2">
                  <TextInput
                    value={heightIn}
                    onChangeText={(val) => {
                      setHeightIn(val.replace(/[^0-9]/g, ''));
                      setErrorMsg('');
                    }}
                    keyboardType="numeric"
                    placeholder="8"
                    placeholderTextColor="#a3a3a3"
                    className={`text-4xl font-extrabold text-center min-w-[50px] ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}
                  />
                  <Text className="text-xl font-bold text-neutral-400 ml-2">in</Text>
                </View>
              </View>
            )}
          </View>
        );

      case 3:
        return (
          <View className="flex-1 justify-center px-4">
            <Text className={`text-2xl font-black text-center mb-4 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>What's your weight?</Text>
            
            {/* Unit Switcher */}
            <View className="flex-row justify-center mb-8 bg-neutral-100 dark:bg-neutral-850 p-1.5 rounded-2xl self-center">
              <Pressable
                onPress={() => handleWeightUnitChange('kg')}
                className={`px-6 py-2 rounded-xl ${weightUnit === 'kg' ? 'bg-white dark:bg-neutral-800 shadow-sm' : ''}`}
              >
                <Text className={`text-xs font-bold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}`}>kg</Text>
              </Pressable>
              <Pressable
                onPress={() => handleWeightUnitChange('lb')}
                className={`px-6 py-2 rounded-xl ${weightUnit === 'lb' ? 'bg-white dark:bg-neutral-800 shadow-sm' : ''}`}
              >
                <Text className={`text-xs font-bold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}`}>lb</Text>
              </Pressable>
            </View>

            {/* Input */}
            <View className="flex-row justify-center items-baseline border-b border-green-500 pb-2 mx-16 self-center">
              <TextInput
                value={weightValue}
                onChangeText={(val) => {
                  setWeightValue(val.replace(/[^0-9]/g, ''));
                  setErrorMsg('');
                }}
                keyboardType="numeric"
                placeholder="70"
                placeholderTextColor="#a3a3a3"
                className={`text-4xl font-extrabold text-center min-w-[100px] ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}
              />
              <Text className="text-xl font-bold text-neutral-400 ml-2">{weightUnit}</Text>
            </View>
          </View>
        );

      case 4:
        return (
          <View className="flex-1 justify-center px-4">
            <Text className={`text-2xl font-black text-center mb-8 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>What's your gender?</Text>
            
            <View className="space-y-4">
              {[
                { key: 'male', label: 'Male' },
                { key: 'female', label: 'Female' }
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setGender(opt.key as any);
                    setErrorMsg('');
                  }}
                  className={`flex-row items-center p-5 border rounded-2xl ${
                    gender === opt.key 
                      ? 'border-green-500 bg-green-50/20' 
                      : (isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-250 bg-white')
                  }`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 justify-center items-center mr-4 ${
                    gender === opt.key ? 'border-green-500' : 'border-neutral-300'
                  }`}>
                    {gender === opt.key && <View className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                  </View>
                  <Text className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <View className="flex-1 justify-center px-4">
            <Text className={`text-2xl font-black text-center mb-8 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>How old are you?</Text>
            
            <View className="flex-row justify-center items-baseline border-b border-green-500 pb-2 mx-16 self-center">
              <TextInput
                value={age}
                onChangeText={(val) => {
                  setAge(val.replace(/[^0-9]/g, ''));
                  setErrorMsg('');
                }}
                keyboardType="numeric"
                placeholder="25"
                placeholderTextColor="#a3a3a3"
                className={`text-4xl font-extrabold text-center min-w-[100px] ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}
              />
              <Text className="text-xl font-bold text-neutral-400 ml-2">years</Text>
            </View>
          </View>
        );

      case 6:
        const healthyRange = getHealthyRange();
        const isOutsideRange = targetWeight < healthyRange.min || targetWeight > healthyRange.max;
        
        return (
          <View className="flex-1 justify-center px-4">
            <Text className={`text-2xl font-black text-center mb-2 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>What is your target weight?</Text>
            <Text className="text-xs text-neutral-400 font-bold text-center mb-6 uppercase tracking-wider">
              Recommended healthy range: {healthyRange.min} – {healthyRange.max} kg
            </Text>

            {/* Slider sync target value */}
            <View className="flex-row justify-center items-baseline border-b border-green-500 pb-2 mx-20 self-center mb-8">
              <TextInput
                value={targetWeight.toString()}
                onChangeText={(val) => {
                  const num = parseInt(val) || 0;
                  setTargetWeight(num);
                  setErrorMsg('');
                }}
                keyboardType="numeric"
                className={`text-4xl font-extrabold text-center min-w-[100px] ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}
              />
              <Text className="text-xl font-bold text-neutral-400 ml-2">kg</Text>
            </View>

            <CustomSlider
              min={Math.max(30, healthyRange.min - 20)}
              max={Math.min(250, healthyRange.max + 35)}
              value={targetWeight}
              onChange={(val) => {
                setTargetWeight(val);
                setErrorMsg('');
              }}
              isDarkMode={isDarkMode}
            />

            {isOutsideRange && (
              <View className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 mt-2">
                <Text className="text-amber-800 dark:text-amber-300 text-[10px] leading-relaxed font-bold text-center uppercase tracking-wide">
                  ⚠️ Your target weight falls outside the medically recommended BMI range ({healthyRange.min} - {healthyRange.max} kg)
                </Text>
              </View>
            )}
          </View>
        );

      case 7:
        return (
          <View className="flex-1 justify-center px-4">
            <Text className={`text-2xl font-black text-center mb-8 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>What's your activity level?</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[380px]">
              {[
                { key: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise, desk job' },
                { key: 'light', label: 'Lightly Active', desc: 'Light exercise or active hobbies 1-3 days/week' },
                { key: 'moderate', label: 'Moderately Active', desc: 'Moderate workout or active sports 3-5 days/week' },
                { key: 'active', label: 'Very Active', desc: 'Intense workout or hard physical tasks 6-7 days/week' },
                { key: 'very_active', label: 'Extra Active', desc: 'Highly strenuous physical work or dual athletic training' }
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setActivityLevel(opt.key as any);
                    setErrorMsg('');
                  }}
                  className={`flex-row items-start p-4 border rounded-2xl mb-3 ${
                    activityLevel === opt.key 
                      ? 'border-green-500 bg-green-50/20' 
                      : (isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-100 bg-white')
                  }`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 justify-center items-center mr-3.5 mt-0.5 ${
                    activityLevel === opt.key ? 'border-green-500' : 'border-neutral-300'
                  }`}>
                    {activityLevel === opt.key && <View className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{opt.label}</Text>
                    <Text className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">{opt.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );

      case 8:
        const loseOptions = [
          { rate: 0.25, title: 'Mild Weight Loss', desc: '0.25 kg/week' },
          { rate: 0.50, title: 'Weight Loss (Recommended)', desc: '0.5 kg/week' },
          { rate: 1.00, title: 'Extreme Weight Loss', desc: '1 kg/week' }
        ];

        const gainOptions = [
          { rate: 0.125, title: 'Slow Gain', desc: '0.125 kg/week' },
          { rate: 0.250, title: 'Moderate Gain', desc: '0.25 kg/week' },
          { rate: 0.500, title: 'Fast Gain', desc: '0.5 kg/week' }
        ];

        const speedOptions = goal === 'lose' ? loseOptions : gainOptions;

        return (
          <View className="flex-1 justify-center px-4">
            <Text className={`text-2xl font-black text-center mb-8 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>
              How quickly do you want to {goal === 'lose' ? 'lose' : 'gain'} weight?
            </Text>

            <View className="space-y-4">
              {speedOptions.map((opt) => (
                <Pressable
                  key={opt.rate}
                  onPress={() => {
                    setSpeedRate(opt.rate);
                    setErrorMsg('');
                  }}
                  className={`p-4 border rounded-2xl ${
                    speedRate === opt.rate 
                      ? 'border-green-500 bg-green-50/20' 
                      : (isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-100 bg-white')
                  }`}
                >
                  <View className="flex-row items-center mb-1.5">
                    <View className={`w-5 h-5 rounded-full border-2 justify-center items-center mr-3 ${
                      speedRate === opt.rate ? 'border-green-500' : 'border-neutral-300'
                    }`}>
                      {speedRate === opt.rate && <View className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                    </View>
                    <Text className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{opt.title}</Text>
                  </View>
                  <Text className="text-[10px] text-green-500 font-bold ml-8 uppercase">
                    Reach goal by: {getProjectedDate(opt.rate)} ({opt.desc})
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 9:
        const { target: finalCalTarget, warning: isSafetyWarning } = calculateDailyCalorieTarget();
        const calculatedBmr = calculateBMR();
        const calculatedTdee = calculateTDEE();

        return (
          <View className="flex-1 justify-center px-4">
            <Text className={`text-2xl font-black text-center mb-2 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>Daily Calorie Goal</Text>
            
            <View className="items-center py-6">
              <View className="bg-green-50/40 dark:bg-neutral-900 border border-green-100 dark:border-neutral-800 px-8 py-6 rounded-3xl items-center mb-4">
                <Text className="text-5xl font-black text-green-500">{finalCalTarget}</Text>
                <Text className="text-xs font-black text-neutral-400 uppercase mt-1">kcal / Day</Text>
              </View>

              <Text className="text-xs text-neutral-500 text-center leading-relaxed px-6">
                {goal === 'maintain' 
                  ? 'This is your estimated daily calorie target for maintaining your current weight.'
                  : `This is the number of daily calories you need to consume to ${goal === 'lose' ? 'lose' : 'gain'} approximately ${speedRate} kg per week.`}
              </Text>
            </View>

            {/* Calculations Breakdown */}
            <View className={`border rounded-2xl p-4 mt-2 space-y-2.5 ${isDarkMode ? 'border-neutral-800 bg-neutral-900/35' : 'border-neutral-100 bg-neutral-50/50'}`}>
              <View className="flex-row justify-between">
                <Text className="text-[10px] font-bold text-neutral-400 uppercase">Current Weight</Text>
                <Text className={`text-[10px] font-extrabold ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{getNormalizedWeightKg()} kg</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[10px] font-bold text-neutral-400 uppercase">Target Weight</Text>
                <Text className={`text-[10px] font-extrabold ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{targetWeight} kg</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[10px] font-bold text-neutral-400 uppercase">Estimated BMR</Text>
                <Text className={`text-[10px] font-extrabold ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{calculatedBmr} kcal</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[10px] font-bold text-neutral-400 uppercase">Estimated TDEE</Text>
                <Text className={`text-[10px] font-extrabold ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{calculatedTdee} kcal</Text>
              </View>
              {goal !== 'maintain' && (
                <View className="flex-row justify-between border-t border-neutral-200/50 dark:border-neutral-800 pt-2">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase">Target Goal Date</Text>
                  <Text className="text-[10px] font-extrabold text-green-500">{getProjectedDate(speedRate || 0.5)}</Text>
                </View>
              )}
            </View>

            {isSafetyWarning && (
              <View className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 mt-4">
                <Text className="text-amber-800 dark:text-amber-300 text-[10px] leading-relaxed font-bold text-center uppercase tracking-wide">
                  ⚠️ Calculated calories are below the safe daily intake. Threshold limits applied.
                </Text>
              </View>
            )}
          </View>
        );

      case 10:
        return (
          <View className="flex-1 justify-center px-4 items-center">
            <View className="w-16 h-16 bg-blue-100 dark:bg-neutral-900 rounded-full items-center justify-center mb-6">
              <Bell size={32} color="#3b82f6" />
            </View>
            <Text className={`text-2xl font-black text-center mb-2.5 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>Stay on track every day</Text>
            <Text className="text-center text-xs text-neutral-400 leading-relaxed px-6 mb-8">
              A gentle reminder can make all the difference. Enable notifications to stay on track and keep progressing towards your goal.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-neutral-950' : 'bg-white'}`}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          {/* Top Wizard Navigation & Progress bar */}
          <View className="px-4 py-3 flex-row items-center justify-between">
            {currentStep > 1 ? (
              <Pressable
                onPress={() => {
                  setCurrentStep((prev) => prev - 1);
                  setErrorMsg('');
                }}
                className="p-1 active:opacity-60"
              >
                <ChevronLeft size={24} color={isDarkMode ? '#e5e5e5' : '#404040'} />
              </Pressable>
            ) : (
              <View className="w-6" />
            )}
            <Text className="text-xs font-black text-neutral-400 uppercase tracking-widest">
              Step {currentStep} of {totalSteps}
            </Text>
            {profile?.onboardingComplete ? (
              <Pressable onPress={onClose} className="p-1 active:opacity-60">
                <X size={22} color={isDarkMode ? '#e5e5e5' : '#404040'} />
              </Pressable>
            ) : (
              <View className="w-6" />
            )}
          </View>

          {/* Thin Progress bar indicator */}
          <View className="h-1 w-full bg-neutral-100 dark:bg-neutral-800">
            <View 
              className="h-full bg-green-500" 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </View>

          {/* Main Form Fields */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          >
            {renderContent()}
          </ScrollView>

          {/* Error Message Indicator */}
          {errorMsg !== '' && (
            <View className="absolute bottom-20 left-0 right-0 items-center px-4">
              <Text className="text-red-500 font-bold text-xs text-center">{errorMsg}</Text>
            </View>
          )}

          {/* Bottom Primary/Action Buttons */}
          <View className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
          }`}>
            {currentStep < 10 ? (
              <Pressable
                onPress={validateAndProceed}
                className="w-full h-12 bg-green-500 active:bg-green-600 rounded-full items-center justify-center shadow-md shadow-green-500/20"
              >
                <Text className="text-white font-extrabold text-sm uppercase tracking-wider">Next</Text>
              </Pressable>
            ) : (
              <View className="space-y-3">
                <Pressable
                  onPress={handleAllowNotifications}
                  className="w-full h-12 bg-green-500 active:bg-green-600 rounded-full items-center justify-center shadow-md shadow-green-500/20"
                >
                  <Text className="text-white font-extrabold text-sm uppercase tracking-wider">Allow Notifications</Text>
                </Pressable>
                
                <Pressable
                  onPress={() => handleFinishOnboarding(false)}
                  className="w-full py-2 items-center justify-center"
                >
                  <Text className="text-neutral-400 font-bold text-xs uppercase tracking-widest">Maybe later</Text>
                </Pressable>
              </View>
            )}
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
