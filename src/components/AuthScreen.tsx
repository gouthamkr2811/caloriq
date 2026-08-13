import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
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
            profile: cloudData.profile || profile,
            dailyLogs: cloudData.dailyLogs || {},
            weightHistory: cloudData.weightHistory || [],
          });
          showAlert('Welcome Back!', 'Successfully logged in and synced your fitness data.', 'success');
        } else {
          // If no cloud data exists yet, sync initial profile to cloud
          await saveUserDataToCloud(credential.user.uid, {
            profile,
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

  const bg = isDarkMode ? '#0a0a0a' : '#f9fafb';
  const cardBg = isDarkMode ? '#171717' : '#ffffff';
  const cardBorder = isDarkMode ? '#262626' : '#f3f4f6';
  const inputBg = isDarkMode ? '#0a0a0a' : '#f9fafb';
  const inputBorder = isDarkMode ? '#262626' : '#e5e7eb';
  const titleColor = isDarkMode ? '#f5f5f5' : '#1f2937';
  const subtitleColor = isDarkMode ? '#a3a3a3' : '#9ca3af';
  const labelColor = isDarkMode ? '#a3a3a3' : '#4b5563';
  const inputText = isDarkMode ? '#e5e5e5' : '#1f2937';
  const tabBg = isDarkMode ? '#262626' : '#f3f4f6';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{ width: 64, height: 64, backgroundColor: '#22c55e', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Flame size={32} color="#ffffff" />
            </View>
            <Text style={{ fontSize: 30, fontWeight: '900', color: titleColor, letterSpacing: -0.5 }}>Caloriq</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: subtitleColor, marginTop: 4 }}>Your Premium Calorie Companion</Text>
          </View>

          {/* Form Card */}
          <View style={{ backgroundColor: cardBg, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: cardBorder, marginBottom: 24 }}>
            {/* Mode Selector */}
            <View style={{ flexDirection: 'row', backgroundColor: tabBg, borderRadius: 16, padding: 4, marginBottom: 24 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setAuthMode('signin')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: authMode === 'signin' ? cardBg : 'transparent',
                }}
              >
                <LogIn size={16} color={authMode === 'signin' ? titleColor : subtitleColor} />
                <Text style={{ fontSize: 13, fontWeight: '700', marginLeft: 8, color: authMode === 'signin' ? titleColor : subtitleColor }}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setAuthMode('signup')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: authMode === 'signup' ? cardBg : 'transparent',
                }}
              >
                <UserPlus size={16} color={authMode === 'signup' ? titleColor : subtitleColor} />
                <Text style={{ fontSize: 13, fontWeight: '700', marginLeft: 8, color: authMode === 'signup' ? titleColor : subtitleColor }}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: labelColor, marginBottom: 8 }}>Email Address</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Mail size={18} color="#737373" />
                  <TextInput
                    placeholder="Enter email"
                    placeholderTextColor="#a3a3a3"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{ flex: 1, fontSize: 14, fontWeight: '600', color: inputText, marginLeft: 12 }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: labelColor, marginBottom: 8 }}>Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Lock size={18} color="#737373" />
                  <TextInput
                    placeholder="Enter password"
                    placeholderTextColor="#a3a3a3"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    style={{ flex: 1, fontSize: 14, fontWeight: '600', color: inputText, marginLeft: 12 }}
                  />
                </View>
              </View>

              {authMode === 'signup' && (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: labelColor, marginBottom: 8 }}>Confirm Password</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Lock size={18} color="#737373" />
                    <TextInput
                      placeholder="Confirm password"
                      placeholderTextColor="#a3a3a3"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      style={{ flex: 1, fontSize: 14, fontWeight: '600', color: inputText, marginLeft: 12 }}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAuth}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 24,
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                  <ChevronRight size={16} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Continue as Guest */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onContinueAsGuest}
            style={{ paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: subtitleColor }}>
              Continue as Guest (Offline)
            </Text>
          </TouchableOpacity>
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
