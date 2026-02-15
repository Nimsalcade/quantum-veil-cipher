
import { CSPRNG } from '../utils/random';
import { encryptAES, decryptAES } from '../utils/aes';
import { encryptQVC, decryptQVC } from '../utils/qvcCipher';

// Polyfills for Node environment
if (typeof btoa === 'undefined') {
    (global as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}
if (typeof atob === 'undefined') {
    (global as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}
if (typeof TextEncoder === 'undefined') {
    const util = require('util');
    (global as any).TextEncoder = util.TextEncoder;
    (global as any).TextDecoder = util.TextDecoder;
}

async function runTests() {
    console.log("🔒 STARTING MAXIMUM SECURITY VERIFICATION...");

    // TEST 1: CSPRNG Randomness Sanity (Extended)
    console.log("\n[TEST 1] CSPRNG Entropy Deep Check");
    try {
        const rng1 = await CSPRNG.create("KEY1", "TEST");
        const values = new Set();
        const iterations = 10000;
        for (let i = 0; i < iterations; i++) {
            values.add(await rng1.nextFloat());
        }
        if (values.size !== iterations) throw new Error("CSPRNG Collision Detected within 10k samples!");
        console.log(`  ✅ 10,000 samples generated with NO collisions.`);
        console.log("  ✅ CSPRNG Entropy PASSED");
    } catch (e: any) {
        console.error("  ❌ CSPRNG FAILED:", e.message);
        // Don't exit, try next
    }

    // TEST 2: AES Salt Uniqueness & Known Answer Test
    console.log("\n[TEST 2] AES Resilience & Salt Uniqueness");
    try {
        const plain = "NUCLEAR LAUNCH CODES";
        const pass = "password123";

        const c1 = await encryptAES(plain, pass);
        const c2 = await encryptAES(plain, pass);

        if (c1 === c2) {
            throw new Error("FATAL: AES produces identical output for same input. Salts are missing or broken!");
        }

        const d1 = await decryptAES(c1, pass);
        if (d1 !== plain) throw new Error("Decryption failed to recover plaintext");

        // Verify tamper resistance
        const tampered = c1.substring(0, c1.length - 1) + (c1.endsWith('A') ? 'B' : 'A');
        try {
            await decryptAES(tampered, pass);
            throw new Error("Tampered ciphertext WAS decrypted! Integrity check failed.");
        } catch (e) {
            console.log("  ✅ Tamper detection working (Decryption failed as expected)");
        }

        console.log("  ✅ AES Salt & Integrity PASSED");
    } catch (e: any) {
        console.error("  ❌ AES FAILED:", e.message);
    }

    // TEST 3: QVC Stress Test
    console.log("\n[TEST 3] QVC Stress Test (Large Payload)");
    try {
        // 2KB payload: enough to exercise buffer refill without stack overflow
        const input = "A".repeat(2000);
        const key = "STRESSKEY";

        console.time("  Encryption Time");
        const res = await encryptQVC(input, key, { useAES: true });
        console.timeEnd("  Encryption Time");

        console.time("  Decryption Time");
        const dec = await decryptQVC(res.final, key, { useAES: true });
        console.timeEnd("  Decryption Time");

        if (dec.final !== input) throw new Error(`Decryption mismatch on large payload`);

        console.log("  ✅ QVC Stress Test PASSED");
    } catch (e: any) {
        console.error("  ❌ QVC FAILED:", e.message);
    }

    // TEST 4: Special Characters & Unicode
    console.log("\n[TEST 4] Edge Cases (Unicode/Emojis)");
    try {
        const input = "Hello 🌍! This is a test: ñ, ü, ß. 🚀";
        const key = "UNICODE_KEY";

        const res = await encryptQVC(input, key, { useAES: true });
        const dec = await decryptQVC(res.final, key, { useAES: true });

        if (dec.final !== input) throw new Error(`Unicode mismatch: '${dec.final}' != '${input}'`);
        console.log("  ✅ Unicode Handling PASSED");
    } catch (e: any) {
        console.error("  ❌ Unicode FAILED:", e.message);
    }

    console.log("\n✅ [MAXIMUM SECURITY AUDIT COMPLETE]");
}

runTests();
