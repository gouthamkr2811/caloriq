import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useAnimatedProps,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Circle,
  Ellipse,
  Defs,
  ClipPath,
  Rect,
  G,
} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export type LoaderSpeed = 'slow' | 'normal' | 'fast';

export interface FitnessLoaderProps {
  size?: number;
  color?: string;
  speed?: LoaderSpeed;
  style?: StyleProp<ViewStyle>;
}

// Helper to map speed to duration in ms
const getDuration = (speed: LoaderSpeed, base: { slow: number; normal: number; fast: number }) => {
  return base[speed];
};

/**
 * 1. Dumbbell Bicep Curl & Spin Loader
 * A dumbbell that swings/curls up and down with a dynamic squeezing/compressing shadow.
 */
export function DumbbellLoader({
  size = 120,
  color = '#14B8A6',
  speed = 'normal',
  style,
}: FitnessLoaderProps) {
  const rotation = useSharedValue(-20);
  const translateY = useSharedValue(5);
  const shadowScale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.4);

  const dur = getDuration(speed, { slow: 1500, normal: 1000, fast: 600 });

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(45, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(-20, { duration: dur, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    translateY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: dur, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    shadowScale.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.1, { duration: dur, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    shadowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: dur, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [speed]);

  const animatedDumbbellStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const animatedShadowStyle = useAnimatedStyle(() => {
    return {
      opacity: shadowOpacity.value,
      transform: [
        { scaleX: shadowScale.value },
      ],
    };
  });

  const pad = 10;
  const viewBoxSize = 100;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Dumbbell Container */}
      <Animated.View style={[{ width: '80%', height: '80%' }, animatedDumbbellStyle]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* Left Weights */}
          <Rect x="15" y="32" width="6" height="36" rx="3" fill={color} />
          <Rect x="23" y="27" width="8" height="46" rx="4" fill={color} />
          {/* Shaft/Bar */}
          <Rect x="28" y="46" width="44" height="8" rx="2" fill={color} opacity="0.9" />
          {/* Grip pattern */}
          <Rect x="42" y="46" width="3" height="8" fill="#FFF" opacity="0.3" />
          <Rect x="48" y="46" width="3" height="8" fill="#FFF" opacity="0.3" />
          <Rect x="54" y="46" width="3" height="8" fill="#FFF" opacity="0.3" />
          {/* Right Weights */}
          <Rect x="69" y="27" width="8" height="46" rx="4" fill={color} />
          <Rect x="79" y="32" width="6" height="36" rx="3" fill={color} />
        </Svg>
      </Animated.View>

      {/* Shadow */}
      <Animated.View style={[styles.shadow, animatedShadowStyle, { bottom: size * 0.08, width: size * 0.5 }]}>
        <Svg width="100%" height={10} viewBox="0 0 100 10">
          <Ellipse cx="50" cy="5" rx="45" ry="4" fill="#000" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * 2. ECG Heartbeat Pulse Loader
 * A heartbeat scale animation accompanied by a sweeping ECG wave line.
 */
export function HeartPulseLoader({
  size = 120,
  color = '#EF4444',
  speed = 'normal',
  style,
}: FitnessLoaderProps) {
  const heartScale = useSharedValue(1);
  const ecgProgress = useSharedValue(0);

  const dur = getDuration(speed, { slow: 2000, normal: 1400, fast: 800 });

  useEffect(() => {
    // Double beat bounciness for heartbeat
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: dur * 0.15, easing: Easing.bezier(0.25, 0.8, 0.25, 1) }),
        withTiming(1.02, { duration: dur * 0.1 }),
        withTiming(1.22, { duration: dur * 0.15, easing: Easing.bezier(0.25, 0.8, 0.25, 1) }),
        withTiming(1.0, { duration: dur * 0.6 })
      ),
      -1,
      false
    );

    // Continuous sweep for ECG line
    ecgProgress.value = withRepeat(
      withTiming(1, { duration: dur, easing: Easing.linear }),
      -1,
      false
    );
  }, [speed]);

  const animatedHeartStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: heartScale.value }],
    };
  });

  const animatedEcgProps = useAnimatedProps(() => {
    const strokeDashoffset = 300 * (1 - ecgProgress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Heart Shape */}
      <Animated.View style={[{ width: '70%', height: '70%', position: 'absolute' }, animatedHeartStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Path
            d="M 50 85 C 50 85 15 60 15 35 C 15 20 27 10 40 10 C 46 10 50 15 50 15 C 50 15 54 10 60 10 C 73 10 85 20 85 35 C 85 60 50 85 50 85 Z"
            fill={color}
            opacity="0.15"
          />
          <Path
            d="M 50 85 C 50 85 15 60 15 35 C 15 20 27 10 40 10 C 46 10 50 15 50 15 C 50 15 54 10 60 10 C 73 10 85 20 85 35 C 85 60 50 85 50 85 Z"
            stroke={color}
            strokeWidth="3"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* ECG Line Overlay */}
      <Svg width="90%" height="40%" viewBox="0 0 150 60" style={{ position: 'absolute', bottom: '30%' }}>
        <AnimatedPath
          d="M 10 30 L 40 30 L 48 20 L 53 45 L 60 5 L 68 55 L 75 30 L 80 30 L 85 25 L 90 35 L 95 30 L 140 30"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="300"
          animatedProps={animatedEcgProps}
        />
      </Svg>
    </View>
  );
}

/**
 * 3. Weightlifter Barbell Loader
 * A barbell bending and wobbling under stress, lifted vertically with a squishing shadow.
 */
export function BarbellLoader({
  size = 120,
  color = '#F59E0B', // Amber
  speed = 'normal',
  style,
}: FitnessLoaderProps) {
  const translateY = useSharedValue(20);
  const barRotation = useSharedValue(0);
  const shadowScale = useSharedValue(1.1);
  const shadowOpacity = useSharedValue(0.4);

  const dur = getDuration(speed, { slow: 2200, normal: 1600, fast: 1000 });

  useEffect(() => {
    // Lift sequence: Lift up, tremble/shake at peak (struggle), drop down
    translateY.value = withRepeat(
      withSequence(
        // Lift up
        withTiming(-15, { duration: dur * 0.4, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        // Wobble/shake at top
        withTiming(-17, { duration: dur * 0.08 }),
        withTiming(-13, { duration: dur * 0.08 }),
        withTiming(-16, { duration: dur * 0.08 }),
        // Hold
        withTiming(-15, { duration: dur * 0.1 }),
        // Drop down quickly
        withTiming(20, { duration: dur * 0.18, easing: Easing.bounce }),
        // Settle
        withTiming(20, { duration: dur * 0.08 })
      ),
      -1,
      false
    );

    // Tremble rotation
    barRotation.value = withRepeat(
      withSequence(
        withTiming(0, { duration: dur * 0.4 }),
        withTiming(-3, { duration: dur * 0.06 }),
        withTiming(3, { duration: dur * 0.06 }),
        withTiming(-2, { duration: dur * 0.06 }),
        withTiming(2, { duration: dur * 0.06 }),
        withTiming(0, { duration: dur * 0.36 })
      ),
      -1,
      false
    );

    shadowScale.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: dur * 0.4 }),
        withTiming(0.5, { duration: dur * 0.38 }), // keep small during shake & hold
        withTiming(1.2, { duration: dur * 0.18 }), // expand on bounce drop
        withTiming(1.1, { duration: dur * 0.04 })
      ),
      -1,
      false
    );

    shadowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: dur * 0.4 }),
        withTiming(0.15, { duration: dur * 0.38 }),
        withTiming(0.4, { duration: dur * 0.18 }),
        withTiming(0.4, { duration: dur * 0.04 })
      ),
      -1,
      false
    );
  }, [speed]);

  const animatedBarbellStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { rotate: `${barRotation.value}deg` },
      ],
    };
  });

  const animatedShadowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleX: shadowScale.value }],
      opacity: shadowOpacity.value,
    };
  });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Barbell Graphics */}
      <Animated.View style={[{ width: '85%', height: '60%', justifyContent: 'center' }, animatedBarbellStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 120 60">
          <Defs>
            {/* Clamping clips for weights */}
          </Defs>
          {/* Main Bar */}
          <Path
            d="M 12 30 L 108 30"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Bar Ends */}
          <Circle cx="8" cy="30" r="3" fill={color} />
          <Circle cx="112" cy="30" r="3" fill={color} />
          
          {/* Left Weights Stack */}
          <Rect x="24" y="10" width="6" height="40" rx="3" fill={color} />
          <Rect x="16" y="15" width="6" height="30" rx="2" fill={color} />
          <Rect x="32" y="24" width="3" height="12" fill={color} opacity="0.8" />

          {/* Right Weights Stack */}
          <Rect x="90" y="10" width="6" height="40" rx="3" fill={color} />
          <Rect x="98" y="15" width="6" height="30" rx="2" fill={color} />
          <Rect x="85" y="24" width="3" height="12" fill={color} opacity="0.8" />

          {/* Collars */}
          <Rect x="35" y="27" width="2" height="6" fill="#FFF" opacity="0.6" />
          <Rect x="83" y="27" width="2" height="6" fill="#FFF" opacity="0.6" />
        </Svg>
      </Animated.View>

      {/* Lift Platform Shadow */}
      <Animated.View style={[styles.shadow, animatedShadowStyle, { bottom: size * 0.12, width: size * 0.65 }]}>
        <Svg width="100%" height={8} viewBox="0 0 100 8">
          <Ellipse cx="50" cy="4" rx="48" ry="3" fill="#000" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * 4. Running Track Circular/Oval Loader
 * Concentric running track lanes with a glowing runner indicator dot + trailing tail circles.
 */
export function RunnerTrackLoader({
  size = 120,
  color = '#3B82F6', // Blue
  speed = 'normal',
  style,
}: FitnessLoaderProps) {
  const theta = useSharedValue(0);

  const dur = getDuration(speed, { slow: 3000, normal: 2000, fast: 1200 });

  useEffect(() => {
    theta.value = 0;
    theta.value = withRepeat(
      withTiming(2 * Math.PI, { duration: dur, easing: Easing.linear }),
      -1,
      false
    );
  }, [speed]);

  // Center offsets and radii matching the SVG viewBox (100x100)
  const cx = 50;
  const cy = 50;
  const rx = 36;
  const ry = 28;

  // Primary Runner
  const runnerStyle = useAnimatedStyle(() => {
    const angle = theta.value;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    return {
      transform: [
        { translateX: x },
        { translateY: y },
      ],
    };
  });

  // Trail 1 (slightly behind)
  const trail1Style = useAnimatedStyle(() => {
    const angle = theta.value - 0.15;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    return {
      transform: [
        { translateX: x },
        { translateY: y },
      ],
    };
  });

  // Trail 2 (further behind)
  const trail2Style = useAnimatedStyle(() => {
    const angle = theta.value - 0.3;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    return {
      transform: [
        { translateX: x },
        { translateY: y },
      ],
    };
  });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        {/* Outer Lane Track */}
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4, 4"
          opacity="0.3"
          fill="none"
        />
        {/* Inner Lane Track */}
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx - 8}
          ry={ry - 8}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3, 3"
          opacity="0.15"
          fill="none"
        />
        {/* Track center lines */}
        <Path
          d="M 50 10 L 50 20 M 50 80 L 50 90 M 10 50 L 20 50 M 80 50 L 90 50"
          stroke={color}
          strokeWidth="1"
          opacity="0.25"
        />
      </Svg>

      {/* Runner Dots */}
      {/* Trail 2 */}
      <Animated.View style={[styles.runnerDot, trail2Style, { backgroundColor: color, opacity: 0.25, width: 6, height: 6, borderRadius: 3 }]} />
      {/* Trail 1 */}
      <Animated.View style={[styles.runnerDot, trail1Style, { backgroundColor: color, opacity: 0.55, width: 8, height: 8, borderRadius: 4 }]} />
      {/* Primary Runner */}
      <Animated.View style={[styles.runnerDot, runnerStyle, { backgroundColor: color, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 }]} />
    </View>
  );
}

/**
 * 5. Hydration Water Droplet Wave Loader
 * A water droplet container with an animated sloshing wave inside.
 */
export function HydrationWaterLoader({
  size = 120,
  color = '#06B6D4', // Cyan
  speed = 'normal',
  style,
}: FitnessLoaderProps) {
  const waveTranslateX = useSharedValue(0);
  const waveTranslateY = useSharedValue(65); // Water height level

  const dur = getDuration(speed, { slow: 2500, normal: 1800, fast: 1100 });

  useEffect(() => {
    // Sloshing wave horizontally
    waveTranslateX.value = 0;
    waveTranslateX.value = withRepeat(
      withTiming(-80, { duration: dur, easing: Easing.linear }),
      -1,
      false
    );

    // Slowly rising and falling water level (between 15 to 65 y-axis inside 100 viewBox)
    waveTranslateY.value = 65;
    waveTranslateY.value = withRepeat(
      withSequence(
        withTiming(15, { duration: dur * 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(65, { duration: dur * 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [speed]);

  const animatedWaveStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: waveTranslateX.value },
        { translateY: waveTranslateY.value },
      ],
    };
  });

  // Droplet path definition for clipping mask and border
  const dropletPath = "M 50 12 C 50 12 85 45 85 68 C 85 86 69 98 50 98 C 31 98 15 86 15 68 C 15 45 50 12 50 12 Z";

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          {/* Clip path to constrain the sloshing wave to the droplet shape */}
          <ClipPath id="droplet-clip">
            <Path d={dropletPath} />
          </ClipPath>
        </Defs>

        {/* Droplet Background Glow */}
        <Path
          d={dropletPath}
          fill={color}
          opacity="0.08"
        />

        {/* Clipped Wavy Water Liquid */}
        <G clipPath="url(#droplet-clip)">
          {/* We animate a wider wave path horizontally & vertically */}
          <AnimatedG {...{ style: animatedWaveStyle } as any}>
            {/* Double wave to ensure seamless loop overlap */}
            <Path
              d="M 0 40 Q 20 30, 40 40 T 80 40 T 120 40 T 160 40 L 160 120 L 0 120 Z"
              fill={color}
              opacity="0.8"
            />
            {/* Back wave with slightly offset sine and lighter color for depth */}
            <Path
              d="M 0 40 Q 20 48, 40 40 T 80 40 T 120 40 T 160 40 L 160 120 L 0 120 Z"
              fill={color}
              opacity="0.45"
              transform="translate(-15, -3)"
            />
          </AnimatedG>
        </G>

        {/* Droplet Outline Border */}
        <Path
          d={dropletPath}
          stroke={color}
          strokeWidth="3.5"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Shine Reflection Highlight on the side of droplet */}
        <Path
          d="M 28 50 A 24 24 0 0 1 45 22"
          stroke="#FFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.4"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    height: 10,
    opacity: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runnerDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    // Negative offset to center the relative point
    marginLeft: -5,
    marginTop: -5,
    left: 0,
    top: 0,
  },
});
