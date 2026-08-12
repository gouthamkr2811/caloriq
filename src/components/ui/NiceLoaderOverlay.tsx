import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { DumbbellLoader } from './fitness-loaders';
import { Flame, Sparkles } from 'lucide-react-native';

interface NiceLoaderOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  isDarkMode?: boolean;
}

export default function NiceLoaderOverlay({
  visible,
  message = 'Loading...',
  subMessage = 'Syncing your fitness data',
  isDarkMode = false,
}: NiceLoaderOverlayProps) {
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View className="flex-1 justify-center items-center px-6 bg-black/65">
        <View
          className={`w-full max-w-xs rounded-3xl border p-6 items-center shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-neutral-100'
          }`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Animated Fitness Loader */}
          <View className="my-2 items-center justify-center">
            <DumbbellLoader size={100} color="#14B8A6" speed="fast" />
          </View>

          {/* Caloriq AI / Sync Badge */}
          <View className="flex-row items-center mt-4 mb-1">
            <Sparkles size={14} color="#14B8A6" />
            <Text className="text-[10px] font-black text-teal-500 uppercase tracking-widest ml-1">
              CALORIQ ACTIVE
            </Text>
          </View>

          {/* Main Message */}
          <Animated.Text
            style={animatedTextStyle}
            className={`text-base font-black text-center ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            {message}
          </Animated.Text>

          {/* Sub Message */}
          {subMessage ? (
            <Text
              className={`text-xs font-semibold text-center mt-1 ${
                isDarkMode ? 'text-slate-400' : 'text-neutral-500'
              }`}
            >
              {subMessage}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
