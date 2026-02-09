export function getRangingStatus() {
  return { available: false, state: 'unavailable' };
}

export async function startDiscovery() {
  throw new Error('Ranging not available on web');
}

export async function stopDiscovery() {
  // no-op
}

export async function startRanging() {
  throw new Error('Ranging not available on web');
}

export async function stopRanging() {
  // no-op
}

export function addRangingListener() {
  return { remove() {} };
}

