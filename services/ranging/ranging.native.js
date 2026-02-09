import { NativeEventEmitter, NativeModules } from 'react-native';

let emitter = null;

function getNative() {
  // This module is implemented as a standard RN native module (Swift + RCTEventEmitter).
  return NativeModules?.SeekRanging ?? null;
}

function getEmitter() {
  if (emitter) return emitter;
  const n = getNative();
  if (!n) return null;
  emitter = new NativeEventEmitter(n);
  return emitter;
}

export function getRangingStatus() {
  const n = getNative();
  if (!n) return { available: false, state: 'unavailable' };
  return { available: true, state: 'idle' };
}

export async function startDiscovery(params) {
  const n = getNative();
  if (!n) throw new Error('SeekRanging native module not installed (build a dev client).');
  return n.startDiscovery?.(params);
}

export async function stopDiscovery() {
  const n = getNative();
  if (!n) return;
  return n.stopDiscovery?.();
}

export async function startRanging(params) {
  const n = getNative();
  if (!n) throw new Error('SeekRanging native module not installed (build a dev client).');
  return n.startRanging?.(params);
}

export async function stopRanging() {
  const n = getNative();
  if (!n) return;
  return n.stopRanging?.();
}

export function addRangingListener(listener) {
  const n = getNative();
  const e = getEmitter();
  if (!n || !e) return { remove() {} };
  return e.addListener('onUpdate', listener);
}

