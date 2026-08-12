import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { Flame, BookOpen, Bot, User, TrendingUp } from 'lucide-react-native';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useStore } from '../store';
import { loadUserDataFromCloud } from '../lib/sync';
import AuthScreen from '../components/AuthScreen';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const { setUser, mergeCloudData, updateProfile, user, isDarkMode } = useStore();
  const [guestMode, setGuestMode] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });

        // Background download user profile and food logs
        try {
          const cloudData = await loadUserDataFromCloud(firebaseUser.uid);
          if (cloudData) {
            mergeCloudData({
              profile: {
                ...cloudData.profile,
                onboardingComplete: true, // Returning users always skip onboarding
              },
              dailyLogs: cloudData.dailyLogs || {},
              weightHistory: cloudData.weightHistory || [],
            });
          } else {
            // No cloud data but already logged in = returning user, skip onboarding
            updateProfile({ onboardingComplete: true });
          }
        } catch (err: any) {
          const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
          if (isOffline) {
            console.warn('App is offline. Using local cached data for this session.');
          } else {
            console.error('Failed to restore data from cloud:', err);
          }
        }
      } else {
        setUser(null);
        setGuestMode(false); // Reset guest mode on sign out
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDarkMode ? '#0F172A' : '#ffffff',
            borderTopColor: isDarkMode ? '#1e293b' : '#f1f5f9',
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: isDarkMode ? '#14B8A6' : '#0F172A',
          tabBarInactiveTintColor: isDarkMode ? '#64748b' : '#94a3b8',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: 'bold',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Flame size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: 'Journal',
            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="coach"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="loaders"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Render AuthScreen overlay over Tabs if unauthenticated */}
      {!user && !guestMode && !initializing && (
        <AuthScreen onContinueAsGuest={() => setGuestMode(true)} />
      )}

      {/* Render Animated Splash Overlay during initial rehydration */}
      {initializing && <AnimatedSplashOverlay />}
    </>
  );
}
