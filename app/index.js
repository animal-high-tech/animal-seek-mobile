import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

export default function LandingScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = useMemo(() => {
    const dark = scheme === 'dark';
    return {
      bg: dark ? '#06101e' : '#f4f7fb',
      text: dark ? '#f6f8ff' : '#0b1224',
      subtext: dark ? 'rgba(246,248,255,0.72)' : 'rgba(11,18,36,0.72)',
      cardBg: dark ? 'rgba(11, 18, 36, 0.72)' : 'rgba(255,255,255,0.75)',
      border: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)',
      stripBg: dark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.65)',
      stripBorder: dark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
      primary: '#2f7d32',
      primaryText: '#ffffff',
    };
  }, [scheme]);

  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoTranslateY, {
            toValue: -8,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1.03,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(logoTranslateY, {
            toValue: 0,
            duration: 420,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1400),
      ])
    );

    const timer = setTimeout(() => loop.start(), 450);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [logoScale, logoTranslateY]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Background (decorative) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={require('../assets/aniamlseek.png')}
          style={[styles.bgImage, { opacity: scheme === 'dark' ? 0.16 : 0.1 }]}
          resizeMode="cover"
          blurRadius={scheme === 'dark' ? 18 : 12}
        />
        <View style={[styles.blob, styles.blobTop, { backgroundColor: scheme === 'dark' ? '#1a4d8f' : '#7cc4ff' }]} />
        <View
          style={[
            styles.blob,
            styles.blobBottom,
            { backgroundColor: scheme === 'dark' ? '#2f7d32' : '#7ee081' },
          ]}
        />
        <View style={[styles.bgTint, { backgroundColor: colors.bg, opacity: scheme === 'dark' ? 0.62 : 0.72 }]} />
      </View>

      <View style={styles.container}>
        <View style={[styles.heroCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Animated.View
            style={[
              styles.mascotWrap,
              { borderColor: colors.border },
              { transform: [{ translateY: logoTranslateY }, { scale: logoScale }] },
            ]}
          >
            <Image source={require('../assets/icon.png')} style={styles.logo} />
          </Animated.View>

          <Text style={[styles.title, { color: colors.text }]}>AnimalSeek</Text>

          <View
            style={[styles.stripWrap, { backgroundColor: colors.stripBg, borderColor: colors.stripBorder }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={[styles.strip, { color: colors.text }]} aria-hidden numberOfLines={1} ellipsizeMode="tail">
              🧭🐾🏔️⛷️🧭🐾🏔️⛷️
            </Text>
          </View>

          <Text style={[styles.slogan, { color: colors.subtext }]}>Find your teammate offline in the backcountry.</Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary, borderColor: colors.border }]}
              onPress={() => router.replace('/(tabs)/new-event')}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>Get started</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bgImage: { ...StyleSheet.absoluteFillObject },
  bgTint: { ...StyleSheet.absoluteFillObject },
  blob: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 340,
    opacity: 0.18,
  },
  blobTop: { top: -140, left: -120 },
  blobBottom: { bottom: -160, right: -130 },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  mascotWrap: {
    width: 108,
    height: 108,
    borderRadius: 108,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  logo: { width: 78, height: 78, resizeMode: 'contain' },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -0.6 },
  stripWrap: {
    marginTop: 14,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: '100%',
  },
  strip: { fontSize: 16, opacity: 0.9 },
  slogan: { marginTop: 6, fontSize: 16, opacity: 0.9, textAlign: 'center' },
  actions: {
    marginTop: 18,
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    width: '100%',
    maxWidth: 320,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '900' },
});

