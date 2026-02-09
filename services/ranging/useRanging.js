import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addRangingListener,
  getRangingStatus,
  startRanging,
  stopRanging,
} from './index';

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

// UI-facing hook. Produces the same shape the mock UI expects.
export function useRanging(params) {
  const seekGroupId = String(params?.seekGroupId || '');
  const myMemberId = String(params?.myMemberId || '');
  const targetMemberId = String(params?.targetMemberId || '');
  const enabled = Boolean(params?.enabled);

  const status = useMemo(() => getRangingStatus(), []);
  const [state, setState] = useState('idle'); // 'idle'|'searching'|'ranging'|'error'|'unavailable'
  const [error, setError] = useState('');
  const [distanceM, setDistanceM] = useState(undefined);
  const [relativeDeg, setRelativeDeg] = useState(0);
  const [quality, setQuality] = useState(0);

  const lastUpdateAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (!status?.available) {
      setState('unavailable');
      return;
    }

    const sub = addRangingListener((evt) => {
      // Expected native payload:
      // { state, distanceM, relativeDeg, quality, error }
      if (evt?.state) setState(String(evt.state));
      if (evt?.error) setError(String(evt.error));
      if (evt?.distanceM !== undefined) setDistanceM(Number(evt.distanceM));
      if (evt?.relativeDeg !== undefined) setRelativeDeg(Number(evt.relativeDeg));
      if (evt?.quality !== undefined) setQuality(clamp01(evt.quality));
      lastUpdateAt.current = Date.now();
    });
    return () => sub?.remove?.();
  }, [enabled, status?.available]);

  const start = useCallback(async () => {
    setError('');
    if (!enabled) return;
    if (!seekGroupId || !myMemberId || !targetMemberId) {
      setState('error');
      setError('Missing IDs for ranging');
      return;
    }
    try {
      setState('searching');
      await startRanging({ seekGroupId, myMemberId, targetMemberId });
    } catch (e) {
      setState('error');
      setError(e?.message ?? 'Failed to start ranging');
    }
  }, [enabled, seekGroupId, myMemberId, targetMemberId]);

  const stop = useCallback(async () => {
    setError('');
    try {
      await stopRanging();
    } finally {
      setState('idle');
    }
  }, []);

  const staleMs = Date.now() - (lastUpdateAt.current || 0);
  const freshnessMul = staleMs <= 2000 ? 1 : staleMs <= 5000 ? 0.6 : 0.2;
  const stateMul = state === 'ranging' ? 1 : state === 'searching' || state === 'connecting' ? 0.3 : 0;
  const derivedQuality = clamp01(quality) * freshnessMul * stateMul;

  return {
    // mock-compatible fields
    distanceM: distanceM ?? undefined,
    relativeDeg: Number.isFinite(relativeDeg) ? relativeDeg : 0,
    quality: clamp01(derivedQuality),
    // extra fields
    state,
    error,
    staleMs,
    start,
    stop,
  };
}

