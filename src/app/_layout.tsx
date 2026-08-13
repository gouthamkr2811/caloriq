import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { useColorScheme, Modal } from 'react-native';
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
  const { setUser, mergeCloudData, updateProfile, user, isDarkMode, isGuestMode, setGuestMode } = useStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (mounted) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
          });
          setInitializing(false);
        }

        try {
          const cloudData = await loadUserDataFromCloud(firebaseUser.uid);
          if (!mounted) return;
          if (cloudData && cloudData.profile) {
            mergeCloudData({
              profile: cloudData.profile,
              dailyLogs: cloudData.dailyLogs || {},
              weightHistory: cloudData.weightHistory || [],
            });
          }
        } catch (err: any) {
          if (!mounted) return;
          const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
          if (isOffline) {
            console.warn('App is offline. Using local cached data for this session.');
          } else {
            console.error('Failed to restore data from cloud:', err);
          }
        }
      } else {
        if (mounted) {
          setUser(null);
          setGuestMode(false);
          setInitializing(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const showTabBar = !!(user || isGuestMode);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: showTabBar ? 'flex' : 'none',
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
        <Tabs.Screen name="coach" options={{ href: null }} />
        <Tabs.Screen name="loaders" options={{ href: null }} />
      </Tabs>

      {/* Splash covers everything during auth initialization */}
      <AnimatedSplashOverlay isReady={!initializing} />
    </>
  );
}


