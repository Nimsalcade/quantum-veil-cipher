
// Helper for cross-environment crypto (Browser + Node 19+)
const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) return window.crypto;
  if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
  throw new Error("Cryptography API not available in this environment.");
};

export class CSPRNG {
  private currentKey: CryptoKey;
  private buffer: Uint8Array;
  private pointer: number;
  private counterValue: bigint; // Track 128-bit counter
  private crypto: Crypto;

  private constructor(key: CryptoKey, initialBuffer: Uint8Array, startCounter: bigint, crypto: Crypto) {
    this.currentKey = key;
    this.buffer = initialBuffer;
    this.pointer = 0;
    this.counterValue = startCounter;
    this.crypto = crypto;
  }

  static async create(seedKey: string, purpose: string, initialBytes: number = 65536): Promise<CSPRNG> {
    const crypto = getCrypto();
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(seedKey + "::" + purpose),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    const derivationSalt = enc.encode("CSPRNG_CONTEXT_" + purpose);
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: derivationSalt,
        iterations: 10000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-CTR", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    // Initial generation
    const counter = new Uint8Array(16); // Start 0
    const zeroInput = new Uint8Array(initialBytes);

    const keystreamBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-CTR",
        counter: counter,
        length: 64,
      },
      aesKey,
      zeroInput
    );

    // We track counter as a BigInt roughly for refills
    // AES-CTR increments counter by 1 for each Block (16 bytes)
    // So for N bytes, we increment by N / 16.

    return new CSPRNG(aesKey, new Uint8Array(keystreamBuffer), BigInt(0), crypto);
  }

  private async refill() {
    // Generate next chunk
    // Increment counter based on how much we've consumed
    // Counter increments by 1 per 16-byte block
    const consumedBlocks = BigInt(Math.ceil(this.buffer.length / 16));
    this.counterValue += consumedBlocks;

    // Create counter buffer
    const counterBuf = new Uint8Array(16);
    const view = new DataView(counterBuf.buffer);
    // Simple 64-bit low-part set for counter (good enough for petabytes)
    // We only use low 64 bits for counter in AES-CTR usually
    view.setBigUint64(8, this.counterValue, false); // Big-endian

    const newSize = 65536;
    const zeroInput = new Uint8Array(newSize);

    const keystreamBuffer = await this.crypto.subtle.encrypt(
      {
        name: "AES-CTR",
        counter: counterBuf,
        length: 64,
      },
      this.currentKey,
      zeroInput
    );

    this.buffer = new Uint8Array(keystreamBuffer);
    this.pointer = 0;
  }

  // Get next byte (0-255)
  // Async because refill might be needed
  async nextByte(): Promise<number> {
    if (this.pointer >= this.buffer.length) {
      await this.refill();
    }
    return this.buffer[this.pointer++];
  }

  // Returns float between 0 (inclusive) and 1 (exclusive)
  async nextFloat(): Promise<number> {
    // Use 32 bits (4 bytes)
    const b0 = await this.nextByte();
    const b1 = await this.nextByte();
    const b2 = await this.nextByte();
    const b3 = await this.nextByte();

    const val = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
    const uVal = val >>> 0;
    return uVal / 4294967296;
  }

  // Returns integer in range [min, max)
  async nextRange(min: number, max: number): Promise<number> {
    const range = max - min;
    return min + Math.floor((await this.nextFloat()) * range);
  }
}
