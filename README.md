# 🛡️ QUANTUM VEIL CIPHER (QVC)
### // MILITARY-GRADE CRYPTOGRAPHIC SUITE // v2.0

Quantum Veil Cipher is a high-security cryptographic application designed for secure transmission in adversarial environments. It combines a multi-layered proprietary obfuscation algorithm with industry-standard authenticated encryption (AES-256-GCM) to ensure data confidentiality, integrity, and forward secrecy.

---

## ⚡ Technical Specifications

### 🛡️ Encryption Standard: AES-GCM-256
When **MILITARY_GRADE_ARMOR** is engaged, the system utilizes AES-256 in Galois/Counter Mode (GCM).
- **Authenticated Encryption**: Built-in integrity checks detect any tampering attempt.
- **Random Salting**: Every encryption generates a unique 16-byte random salt. Two identical messages will produce completely different ciphertexts.

### 🔑 Key Derivation: PBKDF2-SHA512
- **Standard**: NIST-compliant Password-Based Key Derivation Function 2.
- **Rounds**: **600,000 iterations** of HMAC-SHA512.
- **Resilience**: Designed to neutralize GPU-accelerated brute-force attacks and rainbow table lookups.

### 🎲 Secure Entropy: CSPRNG
The system utilizes a custom **AES-CTR based Stream Cipher** as its Cryptographically Secure Pseudo-Random Number Generator.
- **Key Separation**: Each cipher layer derives its own unique RNG seed using PBKDF2.
- **Infinite Stream**: The generator supports automatic buffer refills for massive data payloads without entropy exhaustion.

---

## 🛰️ QVC Multi-Layer Architecture

QVC processes data through a tactical "Veil" composed of six distinct protection layers:

1.  **Bit-Encoding (L1)**: Case-preserving Base64 encoding mapped to custom α/Ω bit-glyphs.
2.  **Keyed Shift (L2)**: Dynamic glyph inversion driven by a secure AES-CTR keystream.
3.  **Transmutation (L3)**: Mapping of bitstreams to exotic symbol sets.
4.  **Grid Scramble (L4)**: Columnar transposition based on the access key length and order.
5.  **Noise Injection (L5)**: Targeted insertion of obfuscation nulls (Ψ, Φ, Σ, Ξ) via secure entropy.
6.  **AES Armor (L6)**: Optional military-grade envelope using AES-256-GCM.

---

## 🛠️ Usage Protocols

### Installation
`npm install`

### Local Deployment
`npm run dev`

### Security Verification
The system includes a rigorous automated audit script to verify cryptographic integrity and entropy statistical health.
`npx tsx tests/security_verify.ts`

---

## 🕹️ Tactical Interface Features
- **Manual Execution**: No auto-processing to prevent side-channel leakage or unintended data commitment.
- **Wipe Memory (WIPE_MEM)**: Instantly clears all inputs, keys, and internal results from the UI state.
- **Security Status Bar**: Real-time monitoring of `SYS_STATUS`, `ENCRYPTION` mode, and `SEC_LEVEL`.
- **Terminal Terminal**: Constrained output with internal scrolling for high-volume data streams.

---
**CLASSIFIED DOCUMENTATION // FOR OPERATIONAL USE ONLY**
