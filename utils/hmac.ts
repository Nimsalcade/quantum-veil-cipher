const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) return window.crypto;
  if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
  throw new Error('Cryptography API not available.');
};

const HMAC_SEPARATOR = '::QVC::';

export const generateHMAC = async (payload: string, key: string): Promise<string> => {
  const crypto = getCrypto();
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(payload));
  const sigBytes = new Uint8Array(signature);
  const sigB64 = btoa(String.fromCharCode(...sigBytes));

  return sigB64 + HMAC_SEPARATOR + payload;
};

export const verifyHMAC = async (sealed: string, key: string): Promise<string> => {
  const sepIdx = sealed.indexOf(HMAC_SEPARATOR);
  if (sepIdx === -1) throw new Error('HMAC seal missing or malformed.');

  const sigB64 = sealed.slice(0, sepIdx);
  const payload = sealed.slice(sepIdx + HMAC_SEPARATOR.length);

  const crypto = getCrypto();
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['verify']
  );

  const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', keyMaterial, sigBytes, enc.encode(payload));

  if (!valid) throw new Error('HMAC verification failed: data integrity compromised.');
  return payload;
};
