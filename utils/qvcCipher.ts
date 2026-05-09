import { CSPRNG } from './random';
import { encryptAES, decryptAES } from './aes';
import { generateHMAC, verifyHMAC } from './hmac';
import { CipherResult } from '../types';

const KEY_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

const CHAR_ALPHA = 'α';
const CHAR_OMEGA = 'Ω';
const CHAR_SEP_LETTER = '∆';

const NOISE_CHARS = ['Ψ', 'Φ', 'Σ', 'Ξ', 'Λ', 'Θ', 'Π', 'Γ'];

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const TRANSMUTATION_SYMBOLS = [
  '⟨', '⟩', '⌖', '⌗', '⌘', '⌬', '⏣', '⏥', '⏻', '⏼',
  '⚙', '⚛', '⛬', '⛭', '⛮', '✦', '✧', '✩', '✪', '✫',
  '✬', '✭', '✮', '✯', '✰', '❋', '❊', '❉', '❈', '❇',
  '❆', '❅', '❄', '❃', '❂', '⟰', '⟱', '⟲', '⟳', '⟴',
  '⌀', '⌁', '⌂', '⌃', '⌄', '⌅', '⌆', '⌇', '⌈', '⌉',
  '⌊', '⌋', '⌌', '⌍', '⌎', '⌏', '⌐', '⌑', '⌒', '⌓',
  '⌔', '⌕', '⌙', '⌚'
];

const toBase64 = (str: string): string => {
  if (typeof window !== 'undefined') return window.btoa(unescape(encodeURIComponent(str)));
  return Buffer.from(str, 'utf8').toString('base64');
};

const fromBase64 = (str: string): string => {
  if (typeof window !== 'undefined') return decodeURIComponent(escape(window.atob(str)));
  return Buffer.from(str, 'base64').toString('utf8');
};

// Layer 1: UTF-8 → Base64 → 6-bit α/Ω glyph encoding
const layer1Encode = (text: string): string => {
  const b64 = toBase64(text).replace(/=+$/, '');
  return b64.split('').map(char => {
    const idx = B64_ALPHABET.indexOf(char);
    if (idx === -1) return '';
    const six = (idx & 0x3f).toString(2).padStart(6, '0');
    return six.replace(/0/g, CHAR_ALPHA).replace(/1/g, CHAR_OMEGA);
  }).join(CHAR_SEP_LETTER);
};

// Layer 2: Per-symbol keyed stream shift via AES-CTR CSPRNG
const layer2Shift = async (encoded: string, keyStr: string): Promise<string> => {
  const rng = await CSPRNG.create(keyStr, 'L2_SHIFT_V2');
  let result = '';
  let currentGroup = '';

  const processGroup = async (group: string) => {
    const k = await rng.nextByte();
    const k2 = await rng.nextByte();
    return group.split('').map((symbol, i) => {
      const flip = ((k ^ (i * 7)) & 0x01) !== ((k2 >> (i % 8)) & 0x01);
      if (flip) {
        if (symbol === CHAR_ALPHA) return CHAR_OMEGA;
        if (symbol === CHAR_OMEGA) return CHAR_ALPHA;
      }
      return symbol;
    }).join('');
  };

  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    if (char === CHAR_SEP_LETTER) {
      if (currentGroup.length > 0) {
        result += await processGroup(currentGroup);
        currentGroup = '';
      }
      result += char;
    } else {
      currentGroup += char;
    }
  }
  if (currentGroup.length > 0) result += await processGroup(currentGroup);
  return result;
};

// Layer 3: Keyed S-Box symbol transmutation (NOT identity - real substitution)
const layer3Transmute = async (text: string, keyStr: string): Promise<string> => {
  const rng = await CSPRNG.create(keyStr, 'L3_SBOX_V2');

  // Build a shuffled S-Box from TRANSMUTATION_SYMBOLS deterministically from key
  const sBox = [...TRANSMUTATION_SYMBOLS];
  for (let i = sBox.length - 1; i > 0; i--) {
    const j = await rng.nextRange(0, i + 1);
    [sBox[i], sBox[j]] = [sBox[j], sBox[i]];
  }

  // Build reverse lookup for decryption
  const ALPHA_CODE = 0;
  const OMEGA_CODE = 1;
  const SEP_CODE = 2;

  const encode = (symbol: string): string => {
    if (symbol === CHAR_ALPHA) return sBox[ALPHA_CODE];
    if (symbol === CHAR_OMEGA) return sBox[OMEGA_CODE];
    if (symbol === CHAR_SEP_LETTER) return sBox[SEP_CODE];
    return symbol;
  };

  return text.split('').map(encode).join('');
};

// Layer 4: Columnar transposition with key-sorted column order
const layer4Scramble = (text: string, key: string): { scrambled: string; grid: string[][] } => {
  const width = key.length;
  if (width === 0) return { scrambled: text, grid: [] };

  const rows = Math.ceil(text.length / width);
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < width; c++) {
      const idx = r * width + c;
      row.push(idx < text.length ? text[idx] : '\x00');
    }
    grid.push(row);
  }

  const keyMap = key.split('').map((char, idx) => ({ char, idx }));
  keyMap.sort((a, b) => a.char.charCodeAt(0) - b.char.charCodeAt(0) || a.idx - b.idx);

  let scrambled = '';
  for (const k of keyMap) {
    for (let r = 0; r < rows; r++) {
      const cell = grid[r][k.idx];
      if (cell !== '\x00') scrambled += cell;
    }
  }
  return { scrambled, grid };
};

// Layer 5: CSPRNG noise injection with variable density
const layer5Noise = async (text: string, key: string): Promise<string> => {
  const rng = await CSPRNG.create(key, 'L5_NOISE_V2');
  let result = '';
  let textIdx = 0;

  while (textIdx < text.length) {
    const noiseDensity = 0.3;
    const isNoise = (await rng.nextFloat()) < noiseDensity;
    if (isNoise) {
      const noiseIdx = await rng.nextRange(0, NOISE_CHARS.length);
      result += NOISE_CHARS[noiseIdx];
    } else {
      result += text[textIdx];
      textIdx++;
    }
  }
  return result;
};

// --- DECRYPTION LAYERS ---

const reverseLayer5Noise = async (text: string, key: string): Promise<string> => {
  const rng = await CSPRNG.create(key, 'L5_NOISE_V2');
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const noiseDensity = 0.3;
    const isNoise = (await rng.nextFloat()) < noiseDensity;
    if (!isNoise) {
      result += text[i];
    } else {
      await rng.nextRange(0, NOISE_CHARS.length);
    }
  }
  return result;
};

const reverseLayer4Scramble = (text: string, key: string): string => {
  const width = key.length;
  if (width === 0) return text;

  const len = text.length;
  const rows = Math.ceil(len / width);
  const fullCells = len % width;

  const grid: string[][] = Array.from({ length: rows }, () => Array(width).fill(''));

  const keyMap = key.split('').map((char, idx) => ({ char, idx }));
  keyMap.sort((a, b) => a.char.charCodeAt(0) - b.char.charCodeAt(0) || a.idx - b.idx);

  let currentIdx = 0;
  for (const k of keyMap) {
    const colIdx = k.idx;
    const colHeight = (fullCells === 0 || colIdx < fullCells) ? rows : rows - 1;
    for (let r = 0; r < colHeight; r++) {
      if (currentIdx < text.length) {
        grid[r][colIdx] = text[currentIdx];
        currentIdx++;
      }
    }
  }

  let result = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < width; c++) {
      result += grid[r][c];
    }
  }
  return result;
};

const reverseLayer3Transmute = async (text: string, keyStr: string): Promise<string> => {
  const rng = await CSPRNG.create(keyStr, 'L3_SBOX_V2');
  const sBox = [...TRANSMUTATION_SYMBOLS];
  for (let i = sBox.length - 1; i > 0; i--) {
    const j = await rng.nextRange(0, i + 1);
    [sBox[i], sBox[j]] = [sBox[j], sBox[i]];
  }

  const reverseMap = new Map<string, string>();
  reverseMap.set(sBox[0], CHAR_ALPHA);
  reverseMap.set(sBox[1], CHAR_OMEGA);
  reverseMap.set(sBox[2], CHAR_SEP_LETTER);

  return text.split('').map(ch => reverseMap.get(ch) ?? ch).join('');
};

const reverseLayer2Shift = async (encoded: string, keyStr: string): Promise<string> => {
  const rng = await CSPRNG.create(keyStr, 'L2_SHIFT_V2');
  let result = '';
  let currentGroup = '';

  const processGroup = async (group: string) => {
    const k = await rng.nextByte();
    const k2 = await rng.nextByte();
    return group.split('').map((symbol, i) => {
      const flip = ((k ^ (i * 7)) & 0x01) !== ((k2 >> (i % 8)) & 0x01);
      if (flip) {
        if (symbol === CHAR_ALPHA) return CHAR_OMEGA;
        if (symbol === CHAR_OMEGA) return CHAR_ALPHA;
      }
      return symbol;
    }).join('');
  };

  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    if (char === CHAR_SEP_LETTER) {
      if (currentGroup.length > 0) {
        result += await processGroup(currentGroup);
        currentGroup = '';
      }
      result += char;
    } else {
      currentGroup += char;
    }
  }
  if (currentGroup.length > 0) result += await processGroup(currentGroup);
  return result;
};

const reverseLayer1Decode = (encoded: string): string => {
  const parts = encoded.split(CHAR_SEP_LETTER).filter(p => p.length === 6);
  let decodedB64 = parts.map(part => {
    const bits = part.split('').map(c => (c === CHAR_ALPHA ? '0' : c === CHAR_OMEGA ? '1' : '')).join('');
    const idx = parseInt(bits, 2);
    return isNaN(idx) || idx < 0 || idx > 63 ? '' : B64_ALPHABET[idx];
  }).join('');
  if (decodedB64.length % 4 !== 0) decodedB64 += '='.repeat(4 - (decodedB64.length % 4));
  try {
    return fromBase64(decodedB64);
  } catch {
    return 'DECODING_ERROR';
  }
};

export interface QVCOptions {
  useAES?: boolean;
  useHMAC?: boolean;
}

export const encryptQVC = async (plaintext: string, key: string, options?: QVCOptions): Promise<CipherResult> => {
  if (!plaintext || !key) return { final: '', steps: [], entropyScore: 0 };

  const step1 = layer1Encode(plaintext);
  const step2 = await layer2Shift(step1, key);
  const step3 = await layer3Transmute(step2, key);
  const { scrambled, grid } = layer4Scramble(step3, key);
  const step4 = scrambled;
  const step5 = await layer5Noise(step4, key);

  let final = step5;
  const steps: any[] = [
    { name: 'L1 :: BASE64 GLYPH ENCODE', description: 'UTF-8 → Base64 → 6-bit α/Ω binary glyph stream.', output: step1 },
    { name: 'L2 :: AES-CTR KEYSTREAM SHIFT', description: 'Per-group α↔Ω bit flip via dual-byte AES-CTR CSPRNG.', output: step2 },
    { name: 'L3 :: KEYED S-BOX TRANSMUTATION', description: 'Fisher-Yates shuffled symbol substitution from key-derived S-Box.', output: step3 },
    { name: 'L4 :: COLUMNAR GRID TRANSPOSITION', description: 'Key-sorted columnar transposition cipher.', output: step4, grid },
    { name: 'L5 :: CSPRNG NOISE INJECTION', description: '30% noise density from AES-CTR random stream.', output: step5 },
  ];

  if (options?.useAES) {
    final = await encryptAES(step5, key);
    steps.push({
      name: 'L6 :: AES-256-GCM ARMOR',
      description: 'PBKDF2-SHA512 / 600k rounds. Random 128-bit salt + 96-bit IV. Authenticated encryption.',
      output: final
    });
  }

  if (options?.useHMAC) {
    const sealed = await generateHMAC(final, key);
    final = sealed;
    steps.push({
      name: 'L7 :: HMAC-SHA512 INTEGRITY SEAL',
      description: 'HMAC-SHA512 integrity tag prepended. Tamper detection guaranteed.',
      output: final
    });
  }

  const entropyScore = computeEntropyScore(final);
  return { final, steps, entropyScore };
};

export const decryptQVC = async (ciphertext: string, key: string, options?: QVCOptions): Promise<CipherResult> => {
  if (!ciphertext || !key) return { final: '', steps: [], entropyScore: 0 };

  let currentText = ciphertext;
  const steps: any[] = [];

  if (options?.useHMAC) {
    try {
      currentText = await verifyHMAC(currentText, key);
      steps.push({ name: 'L7 :: HMAC VERIFIED', description: 'Integrity seal verified. No tampering detected.', output: currentText });
    } catch {
      throw new Error('INTEGRITY VIOLATION: HMAC verification failed. Data may be tampered.');
    }
  }

  if (options?.useAES) {
    try {
      currentText = await decryptAES(currentText, key);
      steps.push({ name: 'L6 :: AES-256-GCM UNLOCKED', description: 'AES-GCM armor removed. Authenticated.', output: currentText });
    } catch {
      throw new Error('AES DECRYPTION FAILED: Invalid key or corrupted payload.');
    }
  }

  const step5Rev = await reverseLayer5Noise(currentText, key);
  steps.push({ name: 'L5 :: NOISE STRIPPED', description: 'CSPRNG-seeded noise symbols removed.', output: step5Rev });

  const step4Rev = reverseLayer4Scramble(step5Rev, key);
  steps.push({ name: 'L4 :: GRID RECONSTRUCTED', description: 'Columnar transposition reversed.', output: step4Rev });

  const step3Rev = await reverseLayer3Transmute(step4Rev, key);
  steps.push({ name: 'L3 :: S-BOX INVERTED', description: 'Reverse S-Box lookup applied.', output: step3Rev });

  const step2Rev = await reverseLayer2Shift(step3Rev, key);
  steps.push({ name: 'L2 :: SHIFT REVERSED', description: 'AES-CTR stream shift undone.', output: step2Rev });

  const step1Rev = reverseLayer1Decode(step2Rev);
  steps.push({ name: 'L1 :: BASE64 DECODED', description: 'Glyph stream decoded to plaintext.', output: step1Rev });

  return { final: step1Rev, steps, entropyScore: 0 };
};

export const computeEntropyScore = (text: string): number => {
  if (!text || text.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of text) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const len = text.length;
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(Math.min(len, 256));
  return Math.min(100, Math.round((entropy / Math.max(maxEntropy, 1)) * 100));
};

export const generateSecureKey = (length: number = 16): string => {
  const CHARSET_LEN = KEY_CHARSET.length;
  const REJECTION_THRESHOLD = 256 - (256 % CHARSET_LEN);
  const buf = new Uint8Array(length * 2);
  crypto.getRandomValues(buf);
  let key = '';
  let consumed = 0;

  while (key.length < length) {
    if (consumed >= buf.length) {
      crypto.getRandomValues(buf);
      consumed = 0;
    }
    if (buf[consumed] < REJECTION_THRESHOLD) {
      key += KEY_CHARSET[buf[consumed] % CHARSET_LEN];
    }
    consumed++;
  }
  return key;
};
