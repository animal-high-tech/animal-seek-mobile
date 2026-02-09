import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

function NoonSun({ size = 120 } = {}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 40_000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width="100%" height="100%" viewBox="0 0 64 64">
        <Circle cx="32" cy="32" r="14" fill="#FFD93B" />
        <Circle cx="27" cy="29" r="2" fill="#000" />
        <Circle cx="37" cy="29" r="2" fill="#000" />
        <Path d="M26 38c2 2 8 2 10 0" stroke="#000" strokeWidth="2" strokeLinecap="round" fill="none" />
        <G stroke="#FFD93B" strokeWidth="3" strokeLinecap="round">
          <Line x1="32" y1="4" x2="32" y2="14" />
          <Line x1="32" y1="50" x2="32" y2="60" />
          <Line x1="4" y1="32" x2="14" y2="32" />
          <Line x1="50" y1="32" x2="60" y2="32" />
          <Line x1="12" y1="12" x2="20" y2="20" />
          <Line x1="44" y1="44" x2="52" y2="52" />
          <Line x1="12" y1="52" x2="20" y2="44" />
          <Line x1="44" y1="20" x2="52" y2="12" />
        </G>
      </Svg>
    </Animated.View>
  );
}

function NoonCloud({ size = 160, top = 0, left = 0, driftMs = 110_000, delayMs = 0, opacity = 0.86 } = {}) {
  const { width } = useWindowDimensions();
  const x = useRef(new Animated.Value(-size)).current;

  useEffect(() => {
    const run = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(x, {
          toValue: width + size,
          duration: driftMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(x, { toValue: -size, duration: 0, useNativeDriver: true }),
      ])
    );
    run.start();
    return () => run.stop();
  }, [delayMs, driftMs, size, width, x]);

  return (
    <Animated.View style={[styles.cloud, { top, left, opacity }, { transform: [{ translateX: x }] }]}>
      <Svg width={size} height={(size * 60) / 100} viewBox="0 0 64 64" fill="none">
        <Path d="M20,45H52A12,12,0,0,0,52,21a14,14,0,0,0-27-4A10,10,0,0,0,20,45Z" fill="#ffffff" />
      </Svg>
    </Animated.View>
  );
}

function NoonMountains({ height = 220 } = {}) {
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.mountainsWrap, { height }]} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 1440 320" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="mountainGrass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#9CCC65" />
            <Stop offset="60%" stopColor="#66BB6A" />
            <Stop offset="100%" stopColor="#2E7D32" />
          </SvgLinearGradient>
        </Defs>
        <Path
          fill="url(#mountainGrass)"
          fillOpacity="1"
          d="M0,256L80,240C160,224,320,192,480,165.3C640,139,800,117,960,117.3C1120,117,1280,139,1360,149.3L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
        />
      </Svg>
    </View>
  );
}

export default function LandingScreen() {
  const router = useRouter();

  const colors = useMemo(
    () => ({
      text: '#0b1224',
      subtext: 'rgba(11,18,36,0.72)',
      cardBg: 'rgba(255,255,255,0.78)',
      border: 'rgba(0,0,0,0.10)',
      primary: '#2E7D32',
      primaryText: '#ffffff',
      secondaryBg: 'rgba(255,255,255,0.60)',
    }),
    []
  );

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient
        colors={['#7dd3fc', '#e0f2fe', '#ffffff']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.sunWrap}>
          <NoonSun size={120} />
        </View>
        <NoonCloud top={42} left={-40} size={150} driftMs={120_000} delayMs={0} opacity={0.88} />
        <NoonCloud top={76} left={-220} size={180} driftMs={135_000} delayMs={16_000} opacity={0.80} />
        <NoonCloud top={28} left={-340} size={120} driftMs={110_000} delayMs={28_000} opacity={0.76} />
        <NoonMountains height={220} />
      </View>

      <View style={styles.container}>
        <View style={styles.heroStack}>
          {/* Logo badge (crop to avoid baked-in checkerboard background). */}
          <View style={[styles.logoWrap, { borderColor: colors.border }]} pointerEvents="none">
            <Image source={require('../assets/icon.png')} style={styles.logo} />
          </View>

          <View style={[styles.heroCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>AnimalSeek</Text>
            <View
              style={[styles.stripWrap, { borderColor: colors.border }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={[styles.strip, { color: colors.text }]} aria-hidden numberOfLines={1} ellipsizeMode="tail">
                🧭🐾🏔️⛷️🧭🐾🏔️⛷️
              </Text>
            </View>
            <Text style={[styles.slogan, { color: colors.subtext }]}>
              Find your teammate offline in the backcountry.
            </Text>

            <View style={styles.actions}>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary, borderColor: colors.border }]}
                onPress={() => router.replace('/(tabs)/new-event')}
                accessibilityRole="button"
                hitSlop={10}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>Start</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sunWrap: {
    position: 'absolute',
    top: 30,
    left: '46%',
    marginLeft: -60,
    opacity: 0.95,
  },
  cloud: {
    position: 'absolute',
  },
  mountainsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -24,
    opacity: 0.62,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  heroStack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  logoWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    transform: [{ scale: 1.12 }],
  },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -0.6 },
  stripWrap: {
    marginTop: 14,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  strip: { fontSize: 16, opacity: 0.9 },
  slogan: { marginTop: 8, fontSize: 16, opacity: 0.9, textAlign: 'center', lineHeight: 22 },
  actions: {
    marginTop: 18,
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  primaryBtn: {
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    width: '100%',
    minWidth: 240,
  },
  primaryBtnText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
});

