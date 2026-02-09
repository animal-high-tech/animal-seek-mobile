const DEFAULT_API_BASE_URL_DEV = 'http://localhost:3001';
const DEFAULT_API_BASE_URL_PROD = 'https://animalsplit.com';

export function getApiBaseUrl() {
  const isProd = process.env.NODE_ENV === 'production';

  // Optional override (Expo public env var)
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

  const fallback = isProd ? DEFAULT_API_BASE_URL_PROD : DEFAULT_API_BASE_URL_DEV;
  return String(fromEnv || fallback).replace(/\/$/, '');
}

function headersToObject(headers) {
  if (!headers) return {};
  // RN + web can pass Headers, array tuples, or plain object.
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...(headers) };
}

async function requestAny(path, init, opts) {
  const url = `${getApiBaseUrl()}${path}`;
  let res;
  try {
    const baseHeaders = headersToObject(init?.headers);
    const headers = {
      Accept: 'application/json',
      ...(baseHeaders ?? {}),
    };

    if (opts?.json !== false && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    res = await fetch(url, {
      ...init,
      headers,
    });
  } catch (e) {
    const err = new Error(e?.message ? `Network error: ${e.message}` : 'Network error');
    err.url = url;
    throw err;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${path}`);
    err.status = res.status;
    err.data = data;
    err.url = url;
    throw err;
  }

  return data;
}

async function requestJson(path, init) {
  return requestAny(path, init, { json: true });
}

// API types (lightweight JS shapes)
// Envelope: { status: boolean, message: string, payload: any }

export async function postSeekGroup(params) {
  const body = {
    name: params.name,
    ...(params.lang ? { lang: params.lang } : {}),
  };
  return requestJson('/api/v0/seek-group', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function putSeekGroup(seekGroupId, params) {
  const body = {
    ...(params.name ? { name: params.name } : {}),
    ...(params.lang ? { lang: params.lang } : {}),
  };
  return requestJson(`/api/v0/seek-group/${seekGroupId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function getSeekGroup(seekGroupId) {
  return requestJson(`/api/v0/seek-group/${seekGroupId}`, { method: 'GET' });
}

export async function postSeekMember(seekGroupId, params) {
  const body = {
    name: params.name,
    ...(params.icon ? { icon: params.icon } : {}),
    ...(params.deviceUuid ? { deviceUuid: params.deviceUuid } : {}),
  };
  return requestJson(`/api/v0/seek-member/${seekGroupId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function putSeekMember(seekMemberId, params) {
  const body = {
    ...(params.name ? { name: params.name } : {}),
    ...(params.icon ? { icon: params.icon } : {}),
    ...(params.deviceUuid ? { deviceUuid: params.deviceUuid } : {}),
  };
  return requestJson(`/api/v0/seek-member/${seekMemberId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function getSeekMembersByGroup(seekGroupId) {
  return requestJson(`/api/v0/seek-member/by-group/${seekGroupId}`, {
    method: 'GET',
  });
}

