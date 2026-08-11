import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Flame,
  Activity,
  Award,
  Zap,
  Droplet,
  Copy,
  Info,
  Sliders,
  Palette,
  Eye,
  Check,
} from 'lucide-react-native';
import { useStore } from '../store';
import {
  DumbbellLoader,
  HeartPulseLoader,
  BarbellLoader,
  RunnerTrackLoader,
  HydrationWaterLoader,
  LoaderSpeed,
} from '../components/ui/fitness-loaders';

interface LoaderConfig {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  description: string;
  icon: React.ComponentType<any>;
  defaultColor: string;
}

const LOADERS: LoaderConfig[] = [
  {
    id: 'dumbbell',
    name: 'Bicep Curl',
    component: DumbbellLoader,
    description: 'Perfect for strength training, lifting logs, or workout initialization. Animates Y-translation, rotation curl, and dynamic scaling shadow.',
    icon: Award,
    defaultColor: '#14B8A6',
  },
  {
    id: 'heartbeat',
    name: 'ECG Pulse',
    component: HeartPulseLoader,
    description: 'Ideal for cardio tracking, heart rate logs, or health sync. Animates scale bounciness (heartbeat) and SVG dash-offset (ECG wave sweep).',
    icon: Activity,
    defaultColor: '#EF4444',
  },
  {
    id: 'barbell',
    name: 'Barbell Press',
    component: BarbellLoader,
    description: 'Perfect for gym workouts, heavy weight logs, or PR milestones. Animates vertical barbell lift, peak wobble, drop-down bounce, and platform shadow.',
    icon: Flame,
    defaultColor: '#F59E0B',
  },
  {
    id: 'runner',
    name: 'Cardio Run',
    component: RunnerTrackLoader,
    description: 'Ideal for running logs, step counting, or location sync. Animates multiple dots trailing each other along a mathematically computed ellipse track.',
    icon: Zap,
    defaultColor: '#3B82F6',
  },
  {
    id: 'water',
    name: 'Hydration Wave',
    component: HydrationWaterLoader,
    description: 'Perfect for water intake logging, hydration goals, or recovery screen. Animates a vector wave sloshing horizontally and rising vertically inside a droplet.',
    icon: Droplet,
    defaultColor: '#06B6D4',
  },
];

const PRESET_COLORS = [
  { value: '#14B8A6', label: 'Teal' },
  { value: '#EF4444', label: 'Red' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#8B5CF6', label: 'Purple' },
];

export default function LoadersShowcaseScreen() {
  const router = useRouter();
  const { isDarkMode } = useStore();

  const [activeLoaderId, setActiveLoaderId] = useState('dumbbell');
  const [selectedColor, setSelectedColor] = useState('#14B8A6');
  const [selectedSpeed, setSelectedSpeed] = useState<LoaderSpeed>('normal');
  const [copied, setCopied] = useState(false);

  const activeLoader = LOADERS.find((l) => l.id === activeLoaderId) || LOADERS[0];
  const ActiveLoaderComponent = activeLoader.component;

  // Change active loader and auto-set its default preset color
  const handleSelectLoader = (id: string) => {
    setActiveLoaderId(id);
    const loader = LOADERS.find((l) => l.id === id);
    if (loader) {
      setSelectedColor(loader.defaultColor);
    }
  };

  const codeSnippet = `<${activeLoader.component.name}
  size={120}
  color="${selectedColor}"
  speed="${selectedSpeed}"
/>`;

  const copyToClipboard = () => {
    Share.share({
      message: codeSnippet,
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}
        >
          <ChevronLeft size={24} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFF' : '#0F172A' }]}>
          Fitness Loaders
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introContainer}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFF' : '#0F172A' }]}>
            Interactive Playground
          </Text>
          <Text style={[styles.sectionSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            A library of 5 premium animated SVGs optimized with React Native Reanimated for maximum fluidity (60 FPS).
          </Text>
        </View>

        {/* Live Preview Card */}
        <View style={[
          styles.previewCard,
          {
            backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
            borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          }
        ]}>
          <View style={[styles.previewDisplay, { backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9' }]}>
            <ActiveLoaderComponent size={140} color={selectedColor} speed={selectedSpeed} />
          </View>

          {/* Loader Info */}
          <View style={styles.loaderInfo}>
            <View style={styles.loaderInfoHeader}>
              <activeLoader.icon size={20} color={selectedColor} style={{ marginRight: 8 }} />
              <Text style={[styles.loaderName, { color: isDarkMode ? '#FFF' : '#0F172A' }]}>
                {activeLoader.name}
              </Text>
            </View>
            <Text style={[styles.loaderDesc, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
              {activeLoader.description}
            </Text>
          </View>
        </View>

        {/* Selector Tabs */}
        <View style={styles.controlSection}>
          <View style={styles.sectionHeaderRow}>
            <Eye size={16} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
            <Text style={[styles.controlLabel, { color: isDarkMode ? '#FFF' : '#0F172A' }]}>Select Animation</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.loaderTabsRow}>
            {LOADERS.map((loader) => {
              const isActive = loader.id === activeLoaderId;
              const LoaderIcon = loader.icon;
              return (
                <Pressable
                  key={loader.id}
                  onPress={() => handleSelectLoader(loader.id)}
                  style={[
                    styles.loaderTab,
                    {
                      backgroundColor: isActive
                        ? selectedColor
                        : (isDarkMode ? '#1E293B' : '#E2E8F0'),
                    }
                  ]}
                >
                  <LoaderIcon size={16} color={isActive ? '#FFF' : (isDarkMode ? '#94A3B8' : '#475569')} style={{ marginRight: 6 }} />
                  <Text style={[styles.loaderTabText, { color: isActive ? '#FFF' : (isDarkMode ? '#E2E8F0' : '#475569') }]}>
                    {loader.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Color Presets */}
        <View style={styles.controlSection}>
          <View style={styles.sectionHeaderRow}>
            <Palette size={16} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
            <Text style={[styles.controlLabel, { color: isDarkMode ? '#FFF' : '#0F172A' }]}>Animation Color</Text>
          </View>
          <View style={styles.colorsRow}>
            {PRESET_COLORS.map((c) => {
              const isSelected = selectedColor === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => setSelectedColor(c.value)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.value },
                    isSelected && { borderColor: isDarkMode ? '#FFF' : '#000', borderWidth: 3 }
                  ]}
                >
                  {isSelected && <Check size={14} color="#FFF" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Speed Controls */}
        <View style={styles.controlSection}>
          <View style={styles.sectionHeaderRow}>
            <Sliders size={16} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
            <Text style={[styles.controlLabel, { color: isDarkMode ? '#FFF' : '#0F172A' }]}>Animation Speed</Text>
          </View>
          <View style={styles.speedButtonGroup}>
            {(['slow', 'normal', 'fast'] as LoaderSpeed[]).map((sp) => {
              const isSelected = selectedSpeed === sp;
              return (
                <TouchableOpacity
                  key={sp}
                  onPress={() => setSelectedSpeed(sp)}
                  style={[
                    styles.speedButton,
                    {
                      backgroundColor: isSelected
                        ? selectedColor
                        : (isDarkMode ? '#1E293B' : '#E2E8F0'),
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.speedButtonText,
                      { color: isSelected ? '#FFF' : (isDarkMode ? '#94A3B8' : '#475569') },
                    ]}
                  >
                    {sp.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Code Snippet Box */}
        <View style={styles.controlSection}>
          <View style={styles.sectionHeaderRow}>
            <Info size={16} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
            <Text style={[styles.controlLabel, { color: isDarkMode ? '#FFF' : '#0F172A' }]}>Usage / React Native Code</Text>
          </View>
          <View style={[
            styles.codeBox,
            {
              backgroundColor: isDarkMode ? '#0F172A' : '#1E293B',
              borderColor: isDarkMode ? '#334155' : '#475569',
            }
          ]}>
            <Text style={styles.codeText}>{codeSnippet}</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
              {copied ? (
                <Text style={styles.copiedText}>Shared!</Text>
              ) : (
                <Copy size={16} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  introContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  previewDisplay: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderInfo: {
    padding: 16,
  },
  loaderInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  loaderName: {
    fontSize: 18,
    fontWeight: '700',
  },
  loaderDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  controlSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  controlLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  loaderTabsRow: {
    paddingRight: 16,
  },
  loaderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  loaderTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  speedButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  codeBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  codeText: {
    fontFamily: 'monospace',
    color: '#34D399',
    fontSize: 13,
    lineHeight: 18,
  },
  copyButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copiedText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
