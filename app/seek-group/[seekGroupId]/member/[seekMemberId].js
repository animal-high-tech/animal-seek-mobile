import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { getSeekMembersByGroup } from '../../../../services/animalSeekCore';
import { ICONS } from '../../../../constants/icons';
import { listSeekEvents } from '../../../../services/seekEventsStore';
import { useRanging } from '../../../../services/ranging/useRanging';

let MapView = null;
let Marker = null;
try {
  // Avoid hard-crashing web builds if maps isn't supported there.
  // (Expo native will include the module after installing react-native-maps.)
  // eslint-disable-next-line global-require
  const Maps = require('react-native-maps');
  // CJS/ESM interop differs by bundler, so accept both shapes.
  MapView = Maps?.default ?? Maps;
  Marker = Maps?.Marker ?? Maps?.default?.Marker ?? null;
} catch {
  MapView = null;
  Marker = null;
}

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [member, setMember] = useState(null);
  const [locationPerm, setLocationPerm] = useState(false);
  const [rangingEnabled, setRangingEnabled] = useState(false);

  const load = useCallback(async () => {
    if (!id || !memberId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getSeekMembersByGroup(id);
      const list = Array.isArray(res?.payload) ? res.payload : [];
      const found = list.find((m) => String(m?.id) === memberId) ?? null;
      setMember(found);
      if (!found) setError('Member not found.');
    } catch (e) {
      setError(e?.message ?? 'Failed to load member');
    } finally {
      setLoading(false);
    }
  }, [id, memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const myMemberId = useMemo(() => {
    try {
      const events = listSeekEvents?.() ?? [];
      const ev = events.find((e) => String(e?.seekGroupId) === id);
      return ev?.memberId ? String(ev.memberId) : '';
    } catch {
      return '';
    }
  }, [id]);

  const ranging = useRanging({
    seekGroupId: id,
    myMemberId,
    targetMemberId: memberId,
    enabled: rangingEnabled,
  });

  const rangingStatusText = useMemo(() => {
    if (!rangingEnabled) return 'Off';
    const s = String(ranging.state || '');
    if (s === 'unavailable') return 'Unavailable (build a dev client)';
    if (s === 'idle') return 'Idle';
    if (s === 'searching') return 'Searching for peer…';
    if (s === 'connecting') return 'Connecting…';
    if (s === 'ranging') return 'Ranging';
    if (s === 'error') return 'Error';
    return s || '…';
  }, [rangingEnabled, ranging.state]);

  const mock = useMockRanging();
  const relativeDeg = rangingEnabled ? ranging.relativeDeg : mock.relativeDeg;
  const distanceM = rangingEnabled ? ranging.distanceM ?? undefined : mock.distanceM;
  const quality = rangingEnabled ? ranging.quality : mock.quality;

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

  const coords = useMemo(() => {
    const lat = Number(member?.lastLatitude);
    const lng = Number(member?.lastLongitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { latitude: lat, longitude: lng };
  }, [member?.lastLatitude, member?.lastLongitude]);

  const memberEmoji = useMemo(() => {
    const iconId = member?.icon;
    return iconId && ICONS[iconId] ? ICONS[iconId] : '🐾';
  }, [member?.icon]);

  const locationUpdatedText = useMemo(() => {
    const raw = member?.lastLocationAt;
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }, [member?.lastLocationAt]);

  useEffect(() => {
    let cancelled = false;
    async function ensurePerm() {
      // Only request on native when we have something to render.
      if (Platform.OS === 'web') return;
      if (!coords) return;
      try {
        const res = await Location.requestForegroundPermissionsAsync();
        if (!cancelled) setLocationPerm(Boolean(res?.granted));
      } catch {
        if (!cancelled) setLocationPerm(false);
      }
    }
    ensurePerm();
    return () => {
      cancelled = true;
    };
  }, [coords]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 16 + insets.top, paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          </View>

          <Text style={styles.heroTitle}>Direction & Distance</Text>
          <Text style={styles.heroMetaText} numberOfLines={1}>
            Group: {id} • Member: {member?.name ? `${memberEmoji} ${member.name}` : memberId}
          </Text>

          {loading ? (
            <View style={{ marginTop: 10 }}>
              <ActivityIndicator />
            </View>
          ) : null}

          {!loading && error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Ranging controls */}
          <View style={styles.rangingCard}>
            <View style={styles.rangingHeaderRow}>
              <Text style={styles.rangingTitle}>Ranging</Text>
              <View style={styles.rangingHeaderRight}>
                <QualityBars quality={quality} />
                <Text style={styles.rangingMeta}>{rangingStatusText}</Text>
              </View>
            </View>

            {!myMemberId ? (
              <Text style={styles.muted}>Join this event on this device to start ranging.</Text>
            ) : myMemberId === memberId ? (
              <Text style={styles.muted}>You can’t range to yourself.</Text>
            ) : null}

            {rangingEnabled && ranging.error ? <Text style={styles.errorText}>{ranging.error}</Text> : null}

            <View style={styles.playStopRow}>
              <Pressable
                style={[
                  styles.playBtn,
                  (rangingEnabled || !myMemberId || myMemberId === memberId) && styles.btnDisabled,
                ]}
                disabled={rangingEnabled || !myMemberId || myMemberId === memberId}
                accessibilityRole="button"
                accessibilityLabel="Start ranging"
                onPress={async () => {
                  setRangingEnabled(true);
                  await ranging.start();
                }}
              >
                <FontAwesome name="play" size={16} color="#fff" />
                <Text style={styles.playStopText}>Start</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.secondaryBtn,
                  (!rangingEnabled || ranging.state === 'ranging' || !myMemberId || myMemberId === memberId) &&
                    styles.btnDisabled,
                ]}
                disabled={!rangingEnabled || ranging.state === 'ranging' || !myMemberId || myMemberId === memberId}
                accessibilityRole="button"
                accessibilityLabel="Retry ranging"
                onPress={async () => {
                  await ranging.start();
                }}
              >
                <FontAwesome name="refresh" size={16} color="#111" />
                <Text style={styles.secondaryBtnText}>Retry</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.stopBtn,
                  rangingEnabled ? styles.stopBtnActive : null,
                  !rangingEnabled && styles.btnDisabled,
                ]}
                disabled={!rangingEnabled}
                accessibilityRole="button"
                accessibilityLabel="Stop ranging"
                onPress={async () => {
                  await ranging.stop();
                  setRangingEnabled(false);
                }}
              >
                <FontAwesome name="stop" size={16} color={rangingEnabled ? '#fff' : '#111'} />
                <Text style={[styles.playStopTextStop, rangingEnabled ? styles.playStopTextStopActive : null]}>
                  Stop
                </Text>
              </Pressable>
            </View>

            {rangingEnabled ? (
              <>
                {/* Compass + distance live inside ranging */}
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
                    <Text style={styles.metricLabel}>State</Text>
                    <Text style={styles.metricValue} numberOfLines={1}>
                      {String(ranging.state)}
                    </Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Stale</Text>
                    <Text style={styles.metricValue}>{Math.round((ranging.staleMs ?? 0) / 1000)}s</Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Rel</Text>
                    <Text style={styles.metricValue}>{Math.round(relativeDeg)}°</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {/* Map: last registered location */}
          <View style={styles.mapCard}>
            <View style={styles.mapHeaderRow}>
              <Text style={styles.mapTitle}>Last location</Text>
              {locationUpdatedText ? <Text style={styles.mapMeta}>{locationUpdatedText}</Text> : null}
            </View>

            {!coords ? (
              <Text style={styles.muted}>No location registered yet.</Text>
            ) : Platform.OS === 'web' || !MapView ? (
              <View style={styles.mapFallback}>
                <Text style={styles.muted}>Map preview isn’t available on this platform/build.</Text>
                <Text style={styles.mutedSmall}>
                  Lat: {coords.latitude.toFixed(5)} • Lng: {coords.longitude.toFixed(5)}
                </Text>
              </View>
            ) : (
              <View style={styles.mapWrap}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  initialRegion={{
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  // Keep the page scrollable even when swiping on the map preview.
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  showsUserLocation={locationPerm}
                  showsMyLocationButton={locationPerm}
                >
                  {Marker ? (
                    <Marker coordinate={coords} title={member?.name ? String(member.name) : 'Member'} />
                  ) : null}
                </MapView>
              </View>
            )}
          </View>

          {/* Compass UI moved into Ranging section */}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
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
  errorText: { marginTop: 10, color: '#b00020', fontWeight: '700' },

  rangingCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    gap: 10,
  },
  rangingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  rangingHeaderRight: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  rangingTitle: { fontSize: 14, fontWeight: '900' },
  rangingMeta: { fontSize: 11, opacity: 0.65, fontWeight: '700' },

  mapCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    gap: 10,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapTitle: { fontSize: 14, fontWeight: '900' },
  mapMeta: { fontSize: 11, opacity: 0.65, fontWeight: '700' },
  mapWrap: {
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  mapFallback: {
    paddingVertical: 10,
    gap: 6,
  },
  muted: { opacity: 0.7, lineHeight: 18 },
  mutedSmall: { opacity: 0.7, fontSize: 12 },

  playStopRow: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', alignItems: 'center' },
  playBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7d32',
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  secondaryBtnText: { color: '#111', fontSize: 16, fontWeight: '900' },
  stopBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  stopBtnActive: {
    borderColor: 'rgba(176,0,32,0.18)',
    backgroundColor: '#b00020',
  },
  playStopText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  playStopTextStop: { color: '#111', fontSize: 16, fontWeight: '900' },
  playStopTextStopActive: { color: '#fff' },
  btnDisabled: { opacity: 0.5 },

  compassWrap: {
    marginTop: 6,
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
    marginTop: 10,
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

