import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatMeters(m) {
  const v = Math.max(0, Number(m) || 0);
  if (v < 1000) return `${Math.round(v)} m`;
  return `${(v / 1000).toFixed(2)} km`;
}

// Mock “direction” + “distance” + “quality” over time.
function useMockRanging() {
  const [bearingDeg, setBearingDeg] = useState(30); // where teammate is, relative to north
  const [headingDeg, setHeadingDeg] = useState(0); // device heading (mock)
  const [distanceM, setDistanceM] = useState(220);
  const [quality, setQuality] = useState(0.72); // 0..1

  useEffect(() => {
    const t = setInterval(() => {
      setHeadingDeg((h) => (h + 7) % 360);
      setBearingDeg((b) => (b + 3) % 360);
      setDistanceM((d) => clamp(d + (Math.random() * 16 - 8), 5, 2500));
      setQuality((q) => clamp(q + (Math.random() * 0.10 - 0.05), 0.05, 1));
    }, 650);
    return () => clearInterval(t);
  }, []);

  // What we want to point to on-screen: bearing relative to current heading.
  const relativeDeg = useMemo(() => {
    const raw = bearingDeg - headingDeg;
    // normalize to [-180, 180]
    const n = ((raw + 540) % 360) - 180;
    return n;
  }, [bearingDeg, headingDeg]);

  return { bearingDeg, headingDeg, relativeDeg, distanceM, quality };
}

function QualityBars({ quality }) {
  const bars = 4;
  const active = Math.round(clamp(quality, 0, 1) * bars);
  return (
    <View style={styles.qWrap} accessibilityLabel={`Connection quality ${active}/${bars}`}>
      {Array.from({ length: bars }).map((_, i) => {
        const on = i < active;
        return <View key={i} style={[styles.qBar, on ? styles.qBarOn : styles.qBarOff]} />;
      })}
    </View>
  );
}

export default function MemberRangingMockScreen() {
  const { seekGroupId, seekMemberId } = useLocalSearchParams();
  const id = String(seekGroupId || '');
  const memberId = String(seekMemberId || '');

  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const iconColor = scheme === 'dark' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.68)';

  const { relativeDeg, distanceM, quality, bearingDeg, headingDeg } = useMockRanging();

  const rotate = useRef(new Animated.Value(relativeDeg)).current;
  useEffect(() => {
    Animated.timing(rotate, {
      toValue: relativeDeg,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [relativeDeg, rotate]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg'],
  });

  return (
    <View style={[styles.screen, { paddingTop: 16 + insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.heroCard}>
        <View style={styles.heroNavRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.heroNavIconBtn}
          >
            <FontAwesome name="chevron-left" size={18} color={iconColor} />
          </Pressable>
          <View style={styles.heroNavSpacer} />
          <QualityBars quality={quality} />
        </View>

        <Text style={styles.heroTitle}>Direction & Distance</Text>
        <Text style={styles.heroMetaText} numberOfLines={1}>
          Group: {id} • Member: {memberId}
        </Text>

        <View style={styles.compassWrap}>
          <View style={styles.compassRing} />
          <Text style={[styles.cardinal, styles.cardN]}>N</Text>
          <Text style={[styles.cardinal, styles.cardE]}>E</Text>
          <Text style={[styles.cardinal, styles.cardS]}>S</Text>
          <Text style={[styles.cardinal, styles.cardW]}>W</Text>

          <Animated.View style={[styles.arrowWrap, { transform: [{ rotate: rotateInterpolate }] }]}>
            <View style={styles.arrow} />
            <View style={styles.arrowTip} />
          </Animated.View>
        </View>

        <Text style={styles.distanceText}>{formatMeters(distanceM)}</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Text style={styles.metricLabel}>Heading</Text>
            <Text style={styles.metricValue}>{Math.round(headingDeg)}°</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricLabel}>Bearing</Text>
            <Text style={styles.metricValue}>{Math.round(bearingDeg)}°</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricLabel}>Rel</Text>
            <Text style={styles.metricValue}>{Math.round(relativeDeg)}°</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Mock data for now. Next we’ll replace this with offline ranging + real compass.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroNavSpacer: { flex: 1 },
  heroNavIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroTitle: { fontSize: 22, fontWeight: '900' },
  heroMetaText: { marginTop: 6, opacity: 0.7, fontSize: 12 },

  compassWrap: {
    marginTop: 16,
    alignSelf: 'center',
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 240,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.14)',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  cardinal: {
    position: 'absolute',
    fontWeight: '900',
    opacity: 0.65,
  },
  cardN: { top: 14 },
  cardS: { bottom: 14 },
  cardE: { right: 18 },
  cardW: { left: 18 },

  arrowWrap: {
    width: 18,
    height: 150,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  arrow: {
    width: 8,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#2f7d32',
  },
  arrowTip: {
    marginTop: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2f7d32',
  },

  distanceText: {
    marginTop: 16,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  metricsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  metricPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
  },
  metricLabel: { fontSize: 11, opacity: 0.6, fontWeight: '800' },
  metricValue: { marginTop: 2, fontWeight: '900' },

  qWrap: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  qBar: { width: 8, borderRadius: 4 },
  qBarOn: { height: 18, backgroundColor: '#2f7d32' },
  qBarOff: { height: 18, backgroundColor: 'rgba(0,0,0,0.12)' },

  note: { marginTop: 14, textAlign: 'center', opacity: 0.7, lineHeight: 20 },
});

