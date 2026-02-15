// Utility for MILITARY-GRADE cryptographic operations
// Standards: AES-256-GCM, PBKDF2-SHA512 (600k rounds), Random Salts

const PBKDF2_ITERATIONS = 600000; // NIST Recommendation for 2023+ is high, we go higher
const SALT_SIZE_BYTES = 16;
const IV_SIZE_BYTES = 12;

// Helper for cross-environment crypto (Browser + Node 19+)
const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) return window.crypto;
  if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
  throw new Error("Cryptography API not available in this environment.");
};

/**
 * Derives the AES-256 key from a password and a salt.
 */
export const deriveKeyRaw = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const crypto = getCrypto();
  const enc = new TextEncoder();

  // Import password as simplified key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive the actual AES-KW key
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-512", // Stronger hash
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

/**
 * Encrypts cleartext using AES-256-GCM with a random salt and IV.
 * Format: Base64( [Scale(16) | IV(12) | Ciphertext(...) ] )
 */
export const encryptAES = async (text: string, password: string): Promise<string> => {
  const crypto = getCrypto();
  const enc = new TextEncoder();

  // 1. Generate Random Salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE_BYTES));

  // 2. Derive Key
  const key = await deriveKeyRaw(password, salt);

  // 3. Generate Random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE_BYTES));

  // 4. Encrypt
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(text)
  );

  // 5. Pack: Salt + IV + Ciphertext
  const encryptedBytes = new Uint8Array(encryptedBuf);
  const packed = new Uint8Array(salt.length + iv.length + encryptedBytes.length);

  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(encryptedBytes, salt.length + iv.length);

  // 6. Return as URL-safe Base64 (roughly)
  return btoa(String.fromCharCode(...packed));
};

/**
 * Decrypts the packed format.
 */
export const decryptAES = async (packedBase64: string, password: string): Promise<string> => {
  try {
    const crypto = getCrypto();
    const binaryStr = atob(packedBase64);
    const len = binaryStr.length;
    const packed = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      packed[i] = binaryStr.charCodeAt(i);
    }

    if (packed.length < SALT_SIZE_BYTES + IV_SIZE_BYTES) {
      throw new Error("Payload too short");
    }

    // 1. Extract Salt and IV
    const salt = packed.slice(0, SALT_SIZE_BYTES);
    const iv = packed.slice(SALT_SIZE_BYTES, SALT_SIZE_BYTES + IV_SIZE_BYTES);
    const ciphertext = packed.slice(SALT_SIZE_BYTES + IV_SIZE_BYTES);

    // 2. Derive Key (Expensive operation, might take a moment)
    const key = await deriveKeyRaw(password, salt);

    // 3. Decrypt
    const decryptedBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuf);
  } catch {
    // Do not log raw exception (could leak sensitive info)
    throw new Error("Decryption Failed: Invalid Password or Corrupted Data.");
  }
};
