import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, Mail, Lock, UserPlus, LogIn, ChevronRight } from 'lucide-react-native';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { loadUserDataFromCloud, saveUserDataToCloud } from '../lib/sync';
import { useStore } from '../store';
import NiceAlertModal, { NiceAlertConfig } from './ui/NiceAlertModal';
import NiceLoaderOverlay from './ui/NiceLoaderOverlay';

interface AuthScreenProps {
  onContinueAsGuest: () => void;
}

export default function AuthScreen({ onContinueAsGuest }: AuthScreenProps) {
  const { profile, dailyLogs, weightHistory, mergeCloudData, updateProfile, isDarkMode } = useStore();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Popup Alert State
  const [alertConfig, setAlertConfig] = useState<NiceAlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
    });
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing Info', 'Please enter your email and password.', 'warning');
      return;
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      showAlert('Password Mismatch', 'Passwords do not match.', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signin') {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const cloudData = await loadUserDataFromCloud(credential.user.uid);
        if (cloudData) {
          mergeCloudData({
            profile: {
              ...cloudData.profile,
              onboardingComplete: true,
            },
            dailyLogs: cloudData.dailyLogs || {},
            weightHistory: cloudData.weightHistory || [],
          });
          showAlert('Welcome Back!', 'Successfully logged in and synced your fitness data.', 'success');
        } else {
          // If no cloud data exists, sync local profile with onboardingComplete: true to cloud
          const updatedProfile = { ...profile, onboardingComplete: true };
          updateProfile({ onboardingComplete: true });
          await saveUserDataToCloud(credential.user.uid, {
            profile: updatedProfile,
            dailyLogs,
            weightHistory,
          });
        }
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Sync local guest data to new cloud account immediately
        await saveUserDataToCloud(credential.user.uid, {
          profile,
          dailyLogs,
          weightHistory,
        });
        showAlert('Account Created!', 'Your Caloriq account has been registered successfully.', 'success');
      }
    } catch (err: any) {
      const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
      if (isOffline) {
        console.warn('Network offline during authentication. Using cached offline session.');
      } else {
        console.error(err);
      }
      let errMsg = 'An error occurred during authentication.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email is already in use. Try signing in instead.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password should be at least 6 characters.';
      } else if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        errMsg = 'Incorrect email or password. Please check your login credentials and try again.';
      } else if (err.code === 'auth/configuration-not-found') {
        errMsg = 'Email/Password sign-in is not enabled in Firebase Console yet. Please enable it under Firebase Console > Authentication > Sign-in method.';
      } else if (err.message) {
        // Strip technical Firebase prefix if present
        errMsg = err.message.replace(/^Firebase:\s*Error\s*\(auth\/[^)]+\)\.?\s*/i, '');
      }
      showAlert('Authentication Failed', errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
          className="px-6"
        >
          {/* Logo Section */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-green-500 rounded-3xl justify-center items-center shadow-lg shadow-green-500/30 mb-4">
              <Flame size={32} color="#ffffff" />
            </View>
            <Text className="text-3xl font-black text-neutral-800 tracking-tight">Caloriq</Text>
            <Text className="text-sm font-semibold text-neutral-400 mt-1">Your Premium Calorie Companion</Text>
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 mb-6">
            {/* Mode Selector */}
            <View className="flex-row bg-neutral-100 rounded-2xl p-1 mb-6">
              <Pressable
                onPress={() => setAuthMode('signin')}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
                  authMode === 'signin' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <LogIn size={16} color={authMode === 'signin' ? '#1f2937' : '#737373'} />
                <Text
                  className={`text-xs font-bold ml-2 ${
                    authMode === 'signin' ? 'text-neutral-800' : 'text-neutral-500'
                  }`}
                >
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setAuthMode('signup')}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
                  authMode === 'signup' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <UserPlus size={16} color={authMode === 'signup' ? '#1f2937' : '#737373'} />
                <Text
                  className={`text-xs font-bold ml-2 ${
                    authMode === 'signup' ? 'text-neutral-800' : 'text-neutral-500'
                  }`}
                >
                  Register
                </Text>
              </Pressable>
            </View>

            {/* Inputs */}
            <View className="space-y-4">
              <View>
                <Text className="text-xs font-bold text-neutral-600 mb-2">Email Address</Text>
                <View className="flex-row items-center bg-neutral-50 border border-neutral-150 rounded-2xl px-4 py-3">
                  <Mail size={18} color="#737373" />
                  <TextInput
                    placeholder="Enter email"
                    placeholderTextColor="#a3a3a3"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="flex-1 text-sm font-semibold text-neutral-800 ml-3"
                  />
                </View>
              </View>

              <View className="mt-4">
                <Text className="text-xs font-bold text-neutral-600 mb-2">Password</Text>
                <View className="flex-row items-center bg-neutral-50 border border-neutral-150 rounded-2xl px-4 py-3">
                  <Lock size={18} color="#737373" />
                  <TextInput
                    placeholder="Enter password"
                    placeholderTextColor="#a3a3a3"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    className="flex-1 text-sm font-semibold text-neutral-800 ml-3"
                  />
                </View>
              </View>

              {authMode === 'signup' && (
                <View className="mt-4">
                  <Text className="text-xs font-bold text-neutral-600 mb-2">Confirm Password</Text>
                  <View className="flex-row items-center bg-neutral-50 border border-neutral-150 rounded-2xl px-4 py-3">
                    <Lock size={18} color="#737373" />
                    <TextInput
                      placeholder="Confirm password"
                      placeholderTextColor="#a3a3a3"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      className="flex-1 text-sm font-semibold text-neutral-800 ml-3"
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleAuth}
              disabled={loading}
              className="w-full bg-[#0F172A] active:bg-slate-800 rounded-2xl py-4 items-center justify-center shadow-lg shadow-slate-900/10 mt-6 flex-row"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text className="text-sm font-black text-white uppercase tracking-wider">
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                  <ChevronRight size={16} color="#ffffff" className="ml-2" />
                </>
              )}
            </Pressable>
          </View>

          {/* Continue as Guest */}
          <Pressable
            onPress={onContinueAsGuest}
            className="py-3 items-center"
          >
            <Text className="text-xs font-bold text-neutral-400 active:text-neutral-600">
              Continue as Guest (Offline)
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <NiceAlertModal
        config={alertConfig}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        isDarkMode={isDarkMode}
      />

      <NiceLoaderOverlay
        visible={loading}
        message={authMode === 'signin' ? 'Signing in...' : 'Creating Account...'}
        subMessage="Syncing your Caloriq fitness data"
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
}
