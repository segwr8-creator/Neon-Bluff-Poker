import { apiBase } from './api-config.mjs';
// Hosted play defaults to same-origin; wrappers explicitly configure their API.
export function inviteCode(value) {
  let code = String(value || '').trim();
  if (/^https?:\/\//i.test(code)) {
    try { code = new URL(code).searchParams.get('room') || ''; } catch { code = ''; }
  }
  code = code.replace(/\s/g, '').toUpperCase();
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/.test(code))
    throw new Error('Paste an invite link or enter the 10-character table code.');
  return code;
}

export async function apiRequest(path, options = {}) {
  const base=apiBase(globalThis.NEON_API_BASE_URL,location);
  if(!base)throw new Error('This mobile bundle needs a configured HTTPS game API. Open the hosted game or set NEON_API_BASE_URL.');
  if(!path.startsWith('/api/')||path.startsWith('//'))throw new Error('Invalid game API path.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(new URL(path, base), {
      ...options, credentials: base===location.origin?'same-origin':'omit', cache: 'no-store', redirect: 'error',
      signal: controller.signal,
      headers: { Accept: 'application/json', ...options.headers }
    });
    const type = response.headers.get('content-type') || '';
    if (!type.toLowerCase().includes('application/json')) {
      throw new Error('The game service returned a sign-in or unavailable page. Open the game directly below and sign in with the invited account. A table code does not grant site access.');
    }
    let data;
    try { data = await response.json(); } catch {
      throw new Error('The game service returned an incomplete response. Please retry.');
    }
    if (!response.ok) {
      const error = new Error(data.error || 'The game service is temporarily unavailable. Please retry.');
      error.view = data.view;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Connection timed out. Your saved bank is kept. Please retry.');
    if (error instanceof TypeError) throw new Error('Cannot reach the game service. Check your connection or open the game directly below to sign in.');
    throw error;
  } finally { clearTimeout(timer); }
}
