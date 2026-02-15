import { CSPRNG } from './random';
import { encryptAES, decryptAES } from './aes';
import { CipherResult } from '../types';

// Constants for transmutation
const CHAR_ALPHA = 'α';
const CHAR_OMEGA = 'Ω';
const CHAR_SEP_LETTER = '∆';
const CHAR_SEP_WORD = '⊘';

const NOISE_CHARS = ['Ψ', 'Φ', 'Σ', 'Ξ'];

// Base64 alphabet (standard order) — case-sensitive for correct Unicode round-trip
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// CROSS-ENV BASE64 HELPERS
const toBase64 = (str: string): string => {
  if (typeof window !== 'undefined') return window.btoa(unescape(encodeURIComponent(str)));
  return Buffer.from(str, 'utf8').toString('base64');
};

const fromBase64 = (str: string): string => {
  if (typeof window !== 'undefined') return decodeURIComponent(escape(window.atob(str)));
  return Buffer.from(str, 'base64').toString('utf8');
};

// Layer 1: case-preserving Base64 → 6-bit α/Ω encoding (one symbol per bit, 6 per char)
const layer1Encode = (text: string): string => {
  const b64 = toBase64(text).replace(/=+$/, ''); // strip padding; restore in reverse
  return b64.split('').map(char => {
    const idx = B64_ALPHABET.indexOf(char);
    if (idx === -1) return '';
    const six = (idx & 0x3f).toString(2).padStart(6, '0');
    return six.replace(/0/g, CHAR_ALPHA).replace(/1/g, CHAR_OMEGA);
  }).join(CHAR_SEP_LETTER);
};

const layer2Shift = async (morseStr: string, keyStr: string): Promise<string> => {
  // UPGRADE: Use CSPRNG stream
  const rng = await CSPRNG.create(keyStr, "L2_SHIFT");
  let result = '';
  let currentGroup = '';

  const processGroup = async (group: string) => {
    const k = await rng.nextByte();
    return group.split('').map(symbol => {
      const shouldFlip = (k % 2 === 0) || (k % 3 === 0);
      if (shouldFlip) {
        if (symbol === CHAR_ALPHA) return CHAR_OMEGA;
        if (symbol === CHAR_OMEGA) return CHAR_ALPHA;
      }
      return symbol;
    }).join('');
  };

  for (let i = 0; i < morseStr.length; i++) {
    const char = morseStr[i];
    if (char === CHAR_SEP_LETTER || char === CHAR_SEP_WORD) {
      if (currentGroup.length > 0) {
        result += await processGroup(currentGroup);
        currentGroup = '';
      }
      result += char;
    } else {
      currentGroup += char;
    }
  }

  if (currentGroup.length > 0) {
    result += await processGroup(currentGroup);
  }

  return result;
};

const layer3Transmute = (shiftedStr: string): string => {
  // Layer1 now outputs α/Ω; layer2 flips α↔Ω. Pass through (identity).
  return shiftedStr;
};

const layer4Scramble = (text: string, key: string): { scrambled: string, grid: string[][] } => {
  const width = key.length;
  if (width === 0) return { scrambled: text, grid: [] };

  const rows = Math.ceil(text.length / width);
  const grid: string[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < width; c++) {
      const idx = r * width + c;
      row.push(idx < text.length ? text[idx] : '');
    }
    grid.push(row);
  }

  const keyMap = key.toUpperCase().split('').map((char, idx) => ({ char, idx }));
  keyMap.sort((a, b) => a.char.localeCompare(b.char));

  let scrambled = '';
  for (const k of keyMap) {
    const colIdx = k.idx;
    for (let r = 0; r < rows; r++) {
      const char = grid[r][colIdx];
      if (char !== '') scrambled += char;
    }
  }

  return { scrambled, grid };
};

const layer5Noise = async (text: string, key: string): Promise<string> => {
  // UPGRADE: Use Key-Derived Noise via CSPRNG
  const rng = await CSPRNG.create(key, "L5_NOISE");
  let result = '';

  let textIdx = 0;
  while (textIdx < text.length) {
    // Check if we inject noise
    const isNoise = (await rng.nextFloat()) < 0.25;

    if (isNoise) {
      // Insert Random Noise Char from NOISE_CHARS
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

const reverseLayer5NoiseRobust = async (text: string, key: string): Promise<string> => {
  const rng = await CSPRNG.create(key, "L5_NOISE");
  let result = '';
  // Iterate full ciphertext
  for (let i = 0; i < text.length; i++) {
    const isNoise = (await rng.nextFloat()) < 0.25;
    if (!isNoise) {
      result += text[i];
    } else {
      // We must consume the RNG state even if we discard the noise char
      // to stay in sync with encryption stream
      await rng.nextRange(0, NOISE_CHARS.length);
    }
  }
  return result;
}

const reverseLayer4Scramble = (text: string, key: string): string => {
  const width = key.length;
  if (width === 0) return text;

  const len = text.length;
  const rows = Math.ceil(len / width);
  const fullCells = len % width;

  const grid: string[][] = Array.from({ length: rows }, () => Array(width).fill(''));

  const keyMap = key.toUpperCase().split('').map((char, idx) => ({ char, idx }));
  keyMap.sort((a, b) => a.char.localeCompare(b.char));

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

const reverseLayer3Transmute = (text: string): string => text;

const reverseLayer2Shift = async (morseStr: string, keyStr: string): Promise<string> => {
  const rng = await CSPRNG.create(keyStr, "L2_SHIFT");
  let result = '';
  let currentGroup = '';

  const processGroup = async (group: string) => {
    const k = await rng.nextByte();
    return group.split('').map(symbol => {
      const shouldFlip = (k % 2 === 0) || (k % 3 === 0);
      if (shouldFlip) {
        if (symbol === CHAR_ALPHA) return CHAR_OMEGA;
        if (symbol === CHAR_OMEGA) return CHAR_ALPHA;
      }
      return symbol;
    }).join('');
  };

  for (let i = 0; i < morseStr.length; i++) {
    const char = morseStr[i];
    if (char === CHAR_SEP_LETTER || char === CHAR_SEP_WORD) {
      if (currentGroup.length > 0) {
        result += await processGroup(currentGroup);
        currentGroup = '';
      }
      result += char;
    } else {
      currentGroup += char;
    }
  }

  if (currentGroup.length > 0) {
    result += await processGroup(currentGroup);
  }

  return result;
};

const reverseLayer1Decode = (encoded: string): string => {
  const parts = encoded.split(CHAR_SEP_LETTER).filter(p => p.length === 6);
  let decodedB64 = parts.map(part => {
    const bits = part.split('').map(c => c === CHAR_ALPHA ? '0' : c === CHAR_OMEGA ? '1' : '').join('');
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

// --- MAIN FUNCTIONS ---

export interface QVCOptions {
  useAES?: boolean;
}

export const encryptQVC = async (plaintext: string, key: string, options?: QVCOptions): Promise<CipherResult> => {
  if (!plaintext || !key) return { final: '', steps: [] };

  const step1 = layer1Encode(plaintext);
  const step2 = await layer2Shift(step1, key);
  const step3 = layer3Transmute(step2);
  const { scrambled, grid } = layer4Scramble(step3, key);
  const step4 = scrambled;
  const step5 = await layer5Noise(step4, key);

  let final = step5;
  const steps: any[] = [
    { name: 'Layer 1: Base64 Encode', description: 'Case-preserving 6-bit α/Ω encoding.', output: step1 },
    { name: 'Layer 2: Keyed Shift (Secure Stream)', description: `Shifted using AES-CTR stream.`, output: step2 },
    { name: 'Layer 3: Transmutation', description: 'Symbols mapped to Greek glyphs.', output: step3 },
    { name: 'Layer 4: Grid Scramble', description: 'Columnar transposition applied.', output: step4, grid },
    { name: 'Layer 5: Noise Injection', description: 'Nulls inserted via Secure RNG.', output: step5 },
  ];

  if (options?.useAES) {
    final = await encryptAES(step5, key);
    steps.push({
      name: 'Layer 6: AES Armor',
      description: 'Military-grade AES-256-GCM encryption with derived key (PBKDF2-SHA512).',
      output: final
    });
  }

  return { final, steps };
};

export const decryptQVC = async (ciphertext: string, key: string, options?: QVCOptions): Promise<CipherResult> => {
  if (!ciphertext || !key) return { final: '', steps: [] };

  let currentText = ciphertext;
  const steps: any[] = [];

  // Decrypt AES if active
  if (options?.useAES) {
    try {
      currentText = await decryptAES(ciphertext, key);
      steps.push({ name: 'Layer 6 Decrypt', description: 'AES-GCM armor removed.', output: currentText });
    } catch (e) {
      throw new Error("AES Decryption Failed. Check Key or Data.");
    }
  }

  const step5Rev = await reverseLayer5NoiseRobust(currentText, key);
  steps.push({ name: 'Layer 5 Decrypt', description: 'Dynamic noise removed.', output: step5Rev });

  const step4Rev = reverseLayer4Scramble(step5Rev, key);
  steps.push({ name: 'Layer 4 Decrypt', description: 'Grid columns reconstructed.', output: step4Rev });

  const step3Rev = reverseLayer3Transmute(step4Rev);
  steps.push({ name: 'Layer 3 Decrypt', description: 'Glyphs reverted to Morse.', output: step3Rev });

  const step2Rev = await reverseLayer2Shift(step3Rev, key);
  steps.push({ name: 'Layer 2 Decrypt', description: 'Shift reversed.', output: step2Rev });

  const step1Rev = reverseLayer1Decode(step2Rev);
  steps.push({ name: 'Layer 1 Decrypt', description: 'Base64 decoded.', output: step1Rev });

  return {
    final: step1Rev,
    steps
  };
};