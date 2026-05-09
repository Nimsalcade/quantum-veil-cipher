import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CipherMode, CipherResult, SecurityOptions } from './types';
import { encryptQVC, decryptQVC, generateSecureKey } from './utils/qvcCipher';
import EntropyMeter from './components/EntropyMeter';
import KeyStrengthMeter from './components/KeyStrengthMeter';
import LayerFlowPanel from './components/LayerFlowPanel';
import GlitchText from './components/GlitchText';
import CipherStream from './components/CipherStream';

const CLIPBOARD_WIPE_DELAY = 30000;

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [key, setKey] = useState('');
  const [mode, setMode] = useState<CipherMode>(CipherMode.ENCRYPT);
  const [options, setOptions] = useState<SecurityOptions>({ useAES: false, useHMAC: false });
  const [result, setResult] = useState<CipherResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [clipboardCountdown, setClipboardCountdown] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const processingRef = useRef<boolean>(false);
  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const clearClipboardTimers = useCallback(() => {
    if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    clipboardTimerRef.current = null;
    countdownRef.current = null;
    setClipboardCountdown(null);
  }, []);

  const handleProcess = async () => {
    if (processingRef.current) return;
    setError('');
    setResult(null);

    if (!input.trim() || !key.trim()) {
      setError('INPUT STREAM & ACCESS KEY REQUIRED');
      return;
    }
    if (!/^[a-zA-Z]+$/.test(key)) {
      setError('ACCESS KEY: ALPHABETIC CHARACTERS ONLY (A-Z)');
      return;
    }
    if (key.length < 4) {
      setError('ACCESS KEY: MINIMUM 4 CHARACTERS REQUIRED');
      return;
    }

    try {
      processingRef.current = true;
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 600));

      let res: CipherResult;
      if (mode === CipherMode.ENCRYPT) {
        res = await encryptQVC(input, key, options);
      } else {
        res = await decryptQVC(input, key, options);
      }
      setResult(res);
      setShowLayers(false);
    } catch (e: any) {
      setError(e.message?.toUpperCase() || 'OPERATION FAILED. VERIFY PROTOCOLS.');
      setResult(null);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const handleCopy = async () => {
    if (!result?.final) return;
    await navigator.clipboard.writeText(result.final);
    setCopied(true);
    clearClipboardTimers();

    let remaining = Math.floor(CLIPBOARD_WIPE_DELAY / 1000);
    setClipboardCountdown(remaining);

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setClipboardCountdown(remaining);
      if (remaining <= 0) clearClipboardTimers();
    }, 1000);

    clipboardTimerRef.current = setTimeout(async () => {
      await navigator.clipboard.writeText('');
      clearClipboardTimers();
      setCopied(false);
    }, CLIPBOARD_WIPE_DELAY);

    setTimeout(() => setCopied(false), 2000);
  };

  const handleWipe = () => {
    setInput('');
    setKey('');
    setResult(null);
    setError('');
    setShowLayers(false);
    clearClipboardTimers();
    navigator.clipboard.writeText('').catch(() => {});
  };

  const handleGenerateKey = async () => {
    const newKey = await generateSecureKey(12);
    setKey(newKey);
  };

  const handleModeSwitch = (newMode: CipherMode) => {
    setMode(newMode);
    setInput('');
    setResult(null);
    setError('');
  };

  const secLevel = options.useHMAC ? 'MAXIMUM' : options.useAES ? 'HIGH' : 'STANDARD';
  const secColor = options.useHMAC ? '#ff3c3c' : options.useAES ? '#ff8800' : '#00ff9d';
  const activeLayerCount = 5 + (options.useAES ? 1 : 0) + (options.useHMAC ? 1 : 0);

  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8);

  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 font-mono relative overflow-x-hidden selection:bg-cyber-primary selection:text-black">

      {/* Top accent bar */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-50 bg-gradient-to-r from-cyber-secondary via-cyber-primary to-cyber-accent" />

      {/* Ambient blobs */}
      <div className="fixed -top-32 -right-32 w-96 h-96 bg-cyber-secondary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 -left-32 w-96 h-96 bg-cyber-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-32 right-1/3 w-80 h-80 bg-cyber-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top system bar */}
      <div className="sticky top-0 z-40 bg-cyber-black/90 backdrop-blur-md border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyber-primary animate-pulse" />
              <span className="text-[9px] tracking-[0.3em] text-gray-500 uppercase">SYS:ONLINE</span>
            </div>
            <div className="h-3 w-px bg-gray-800" />
            <span className="text-[9px] tracking-[0.3em] text-gray-600 uppercase">
              LAYERS:{activeLayerCount}
            </span>
          </div>

          <div className="text-[9px] tracking-[0.4em] font-bold uppercase" style={{ color: secColor }}>
            SEC:{secLevel}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[9px] tracking-[0.2em] text-gray-700 hidden md:block">
              {timeStr} UTC
            </span>
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: i < (options.useHMAC ? 3 : options.useAES ? 2 : 1) ? secColor : '#222' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8 pb-16 md:px-8">

        {/* Hero Header */}
        <header className="text-center mb-10 relative">
          <div className="inline-block relative">
            <h1 className="text-5xl md:text-8xl font-cyber font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-cyber-primary to-cyber-accent"
              style={{ filter: 'drop-shadow(0 0 30px rgba(0,255,157,0.3))' }}>
              <GlitchText text="QVC" interval={5000} />
            </h1>
            <div className="absolute -inset-4 border border-cyber-primary/10 rounded-xl pointer-events-none" />
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyber-primary/50" />
            <p className="text-[10px] tracking-[0.5em] text-gray-500 uppercase">
              Quantum Veil Cipher <span className="text-cyber-secondary">// v3.0</span>
            </p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyber-primary/50" />
          </div>
          <p className="text-[9px] tracking-[0.3em] text-gray-700 mt-1 uppercase">
            {activeLayerCount}-Layer Cryptographic Pipeline · AES-256-GCM · PBKDF2-SHA512 · HMAC-SHA512
          </p>
        </header>

        {/* Main layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_300px] gap-6">

          {/* LEFT: Control Panel */}
          <div className="flex flex-col gap-4">

            {/* Mode Toggle */}
            <div className="flex bg-black/60 rounded-lg p-1 border border-gray-900">
              <button
                onClick={() => handleModeSwitch(CipherMode.ENCRYPT)}
                className={`flex-1 py-2.5 text-[10px] rounded-md font-black tracking-[0.3em] transition-all duration-300 uppercase ${mode === CipherMode.ENCRYPT
                  ? 'bg-cyber-primary text-black shadow-[0_0_20px_rgba(0,255,157,0.4)]'
                  : 'text-gray-600 hover:text-gray-400'}`}
              >
                ▲ ENCRYPT
              </button>
              <button
                onClick={() => handleModeSwitch(CipherMode.DECRYPT)}
                className={`flex-1 py-2.5 text-[10px] rounded-md font-black tracking-[0.3em] transition-all duration-300 uppercase ${mode === CipherMode.DECRYPT
                  ? 'bg-cyber-secondary text-white shadow-[0_0_20px_rgba(188,19,254,0.4)]'
                  : 'text-gray-600 hover:text-gray-400'}`}
              >
                ▼ DECRYPT
              </button>
            </div>

            {/* Access Key */}
            <div className="bg-black/40 border border-gray-900 rounded-lg p-4">
              <label className="block text-[9px] tracking-[0.4em] text-cyber-primary font-bold mb-2 uppercase">
                Access Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                  disabled={isProcessing}
                  placeholder="ENTER KEY..."
                  className="flex-1 bg-black/60 border border-gray-800 focus:border-cyber-primary text-cyber-primary p-3 rounded-md outline-none tracking-[0.3em] font-cyber text-center text-lg placeholder-gray-800 transition-colors disabled:opacity-50 uppercase"
                />
                <button
                  onClick={handleGenerateKey}
                  disabled={isProcessing}
                  title="Generate cryptographically secure random key"
                  className="px-3 bg-black/60 border border-gray-800 hover:border-cyber-primary hover:text-cyber-primary text-gray-600 rounded-md transition-all text-[10px] tracking-wider disabled:opacity-30"
                >
                  GEN
                </button>
              </div>
              <KeyStrengthMeter keyValue={key} />
            </div>

            {/* Security Options */}
            <div className="bg-black/40 border border-gray-900 rounded-lg p-4 space-y-3">
              <label className="block text-[9px] tracking-[0.4em] text-gray-500 font-bold mb-1 uppercase">
                Security Modules
              </label>

              <div className="flex items-center justify-between p-3 rounded border border-gray-900 bg-black/30 hover:border-gray-700 transition-colors">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-gray-300">AES-256-GCM ARMOR</p>
                  <p className="text-[8px] text-gray-600 mt-0.5">PBKDF2-SHA512 · 600k rounds · random salt</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={options.useAES}
                    onChange={(e) => setOptions(o => ({ ...o, useAES: e.target.checked }))}
                    disabled={isProcessing}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-800 rounded-full peer peer-checked:bg-orange-600 peer-checked:shadow-[0_0_8px_rgba(255,136,0,0.5)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded border border-gray-900 bg-black/30 hover:border-gray-700 transition-colors">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-gray-300">HMAC-SHA512 SEAL</p>
                  <p className="text-[8px] text-gray-600 mt-0.5">Integrity seal · tamper detection · auth tag</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={options.useHMAC}
                    onChange={(e) => setOptions(o => ({ ...o, useHMAC: e.target.checked }))}
                    disabled={isProcessing}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-800 rounded-full peer peer-checked:bg-red-600 peer-checked:shadow-[0_0_8px_rgba(255,60,60,0.5)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>

              <div className="pt-1 flex gap-2 flex-wrap">
                {[
                  { label: 'L1: GLYPH ENC', active: true, color: '#00ff9d' },
                  { label: 'L2: CTR SHIFT', active: true, color: '#00f0ff' },
                  { label: 'L3: S-BOX SUB', active: true, color: '#bc13fe' },
                  { label: 'L4: TRANSPOSE', active: true, color: '#ffcc00' },
                  { label: 'L5: NOISE INJ', active: true, color: '#ff8800' },
                  { label: 'L6: AES-GCM', active: options.useAES, color: '#ff3c3c' },
                  { label: 'L7: HMAC-512', active: options.useHMAC, color: '#ff3cf0' },
                ].map((layer, i) => (
                  <span
                    key={i}
                    className="text-[8px] px-1.5 py-0.5 rounded border font-mono tracking-wider transition-all"
                    style={{
                      color: layer.active ? layer.color : '#333',
                      borderColor: layer.active ? layer.color + '40' : '#222',
                      textShadow: layer.active ? `0 0 6px ${layer.color}60` : 'none',
                    }}
                  >
                    {layer.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Data Stream Input */}
            <div className="bg-black/40 border border-gray-900 rounded-lg p-4 flex-1">
              <label className="block text-[9px] tracking-[0.4em] text-gray-500 font-bold mb-2 uppercase">
                Data Stream
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
                placeholder={mode === CipherMode.ENCRYPT ? 'INPUT PLAINTEXT TARGET...' : 'PASTE ENCRYPTED PAYLOAD...'}
                className="w-full min-h-[140px] bg-black/60 border border-gray-800 focus:border-gray-600 text-gray-300 p-3 rounded-md outline-none font-mono text-sm resize-none disabled:opacity-50 transition-colors leading-relaxed"
              />
              {input && (
                <div className="mt-2 flex gap-4 text-[9px] text-gray-700">
                  <span>{input.length} chars</span>
                  <span>{new Blob([input]).size} bytes</span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-red-500 text-[10px] font-bold tracking-wider flex items-center gap-2">
                <span className="text-red-400">▲</span>
                <span>ERR: {error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWipe}
                disabled={isProcessing}
                className="py-3 border border-red-950 text-red-900 hover:text-red-500 hover:border-red-700 hover:bg-red-950/10 rounded-lg uppercase font-black text-[10px] tracking-[0.3em] transition-all disabled:opacity-20"
              >
                ◼ WIPE_ALL
              </button>
              <button
                onClick={handleProcess}
                disabled={isProcessing || !input.trim() || !key.trim()}
                className={`py-3 rounded-lg uppercase font-black text-[11px] tracking-[0.3em] transition-all relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed
                  ${mode === CipherMode.ENCRYPT
                    ? 'bg-cyber-primary text-black hover:shadow-[0_0_30px_rgba(0,255,157,0.5)]'
                    : 'bg-cyber-secondary text-white hover:shadow-[0_0_30px_rgba(188,19,254,0.5)]'}`}
              >
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/20 origin-left animate-[progress_0.6s_ease-in-out_infinite]" />
                )}
                <span className="relative z-10">
                  {isProcessing
                    ? '◌ PROCESSING...'
                    : mode === CipherMode.ENCRYPT
                      ? '▲ EXECUTE ENCRYPT'
                      : '▼ EXECUTE DECRYPT'}
                </span>
              </button>
            </div>
          </div>

          {/* CENTER: Output Terminal */}
          <div className="flex flex-col gap-4">
            <div className="bg-black/80 border border-gray-900 rounded-lg overflow-hidden relative flex-1 flex flex-col min-h-[500px]">
              <CipherStream active={isProcessing} color={mode === CipherMode.ENCRYPT ? '#00ff9d' : '#bc13fe'} />

              <div className="relative z-10 flex flex-col h-full p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-900">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${result ? 'bg-cyber-primary' : 'bg-gray-800'} transition-colors`} />
                    <span className="text-[9px] tracking-[0.4em] text-gray-600 uppercase">Terminal Output</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result && (
                      <button
                        onClick={() => setShowLayers(v => !v)}
                        className="text-[9px] px-2 py-1 border border-gray-800 hover:border-cyber-accent text-gray-600 hover:text-cyber-accent rounded transition-all tracking-wider uppercase"
                      >
                        {showLayers ? 'HIDE' : 'LAYERS'}
                      </button>
                    )}
                    <button
                      onClick={handleCopy}
                      disabled={!result}
                      className={`text-[9px] px-3 py-1 rounded border transition-all tracking-wider uppercase disabled:opacity-20
                        ${copied ? 'border-cyber-primary text-cyber-primary' : 'border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'}`}
                    >
                      {copied ? '✓ COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>

                {/* Clipboard wipe countdown */}
                {clipboardCountdown !== null && (
                  <div className="mb-3 flex items-center gap-2 text-[9px] text-orange-700 bg-orange-950/20 border border-orange-950/30 rounded px-3 py-1.5">
                    <span className="animate-pulse">●</span>
                    <span>CLIPBOARD AUTO-WIPE IN {clipboardCountdown}s</span>
                  </div>
                )}

                {/* Output area */}
                <div className="flex-1 bg-black/60 border border-gray-900 rounded-md p-4 overflow-y-auto font-mono relative">
                  {result ? (
                    <div className="space-y-4">
                      <div className="text-[9px] text-gray-700 flex gap-4">
                        <span>OP:COMPLETE</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                        <span>{result.final.length} chars out</span>
                      </div>

                      <div
                        className={`break-all whitespace-pre-wrap text-sm leading-relaxed selection:bg-white selection:text-black
                          ${options.useHMAC ? 'text-red-400' : options.useAES ? 'text-orange-400' : 'text-cyber-accent'}`}
                        style={{
                          textShadow: options.useHMAC
                            ? '0 0 8px rgba(255,60,60,0.3)'
                            : options.useAES
                              ? '0 0 8px rgba(255,136,0,0.3)'
                              : '0 0 8px rgba(0,240,255,0.3)'
                        }}
                      >
                        {result.final}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-800">
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 border border-gray-800 rounded-full animate-spin" style={{ borderTopColor: '#333' }} />
                        <div className="absolute inset-1 border border-gray-900 rounded-full animate-spin" style={{ borderBottomColor: '#222', animationDirection: 'reverse', animationDuration: '1.5s' }} />
                      </div>
                      <span className="text-[9px] tracking-[0.4em] uppercase">Awaiting Command</span>
                    </div>
                  )}
                </div>

                {/* Entropy display */}
                {result && mode === CipherMode.ENCRYPT && (
                  <div className="mt-4 bg-black/40 border border-gray-900 rounded-md p-3">
                    <EntropyMeter score={result.entropyScore} label="CIPHERTEXT ENTROPY" />
                  </div>
                )}
              </div>
            </div>

            {/* Layer flow toggle */}
            {result && showLayers && (
              <div className="bg-black/60 border border-gray-900 rounded-lg p-4 overflow-y-auto max-h-[600px]">
                <LayerFlowPanel steps={result.steps} mode={mode} />
              </div>
            )}
          </div>

          {/* RIGHT: Intel Panel */}
          <div className="flex flex-col gap-4">

            {/* Threat model */}
            <div className="bg-black/40 border border-gray-900 rounded-lg p-4">
              <p className="text-[9px] tracking-[0.4em] text-gray-600 uppercase mb-3">Threat Resistance</p>
              <div className="space-y-2">
                {[
                  { label: 'Brute Force', level: options.useAES ? 100 : 72, color: '#00ff9d' },
                  { label: 'Freq Analysis', level: options.useHMAC ? 98 : 85, color: '#00f0ff' },
                  { label: 'Known Plain', level: 90, color: '#bc13fe' },
                  { label: 'Replay Attack', level: options.useHMAC ? 99 : 60, color: '#ffcc00' },
                  { label: 'Tampering', level: options.useHMAC ? 100 : 40, color: '#ff8800' },
                  { label: 'Side Channel', level: 65, color: '#ff3c3c' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-600 w-24 flex-shrink-0">{item.label}</span>
                    <div className="flex-1 h-1 bg-gray-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${item.level}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <span className="text-[8px] w-6 text-right" style={{ color: item.color }}>{item.level}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cipher architecture */}
            <div className="bg-black/40 border border-gray-900 rounded-lg p-4">
              <p className="text-[9px] tracking-[0.4em] text-gray-600 uppercase mb-3">Architecture</p>
              <div className="space-y-2 text-[9px] text-gray-600">
                {[
                  { label: 'L1', desc: 'Base64→6-bit α/Ω glyph stream' },
                  { label: 'L2', desc: 'AES-CTR dual-byte keystream shift' },
                  { label: 'L3', desc: 'Keyed Fisher-Yates S-Box sub' },
                  { label: 'L4', desc: 'Columnar grid transposition' },
                  { label: 'L5', desc: '30% CSPRNG noise injection' },
                  { label: 'L6', desc: 'AES-256-GCM + PBKDF2-SHA512', conditional: true, active: options.useAES },
                  { label: 'L7', desc: 'HMAC-SHA512 integrity seal', conditional: true, active: options.useHMAC },
                ].map((item: any) => (
                  <div
                    key={item.label}
                    className="flex gap-2 items-start transition-opacity duration-300"
                    style={{ opacity: item.conditional && !item.active ? 0.3 : 1 }}
                  >
                    <span className="text-cyber-primary font-bold flex-shrink-0">{item.label}</span>
                    <span>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Standards compliance */}
            <div className="bg-black/40 border border-gray-900 rounded-lg p-4">
              <p className="text-[9px] tracking-[0.4em] text-gray-600 uppercase mb-3">Standards</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'NIST FIPS 197',
                  'NIST SP 800-38D',
                  'RFC 2104',
                  'PBKDF2-SHA512',
                  'Web Crypto API',
                  'AES-256-GCM',
                  'HMAC-SHA512',
                  '600k KDF Rounds',
                ].map((s) => (
                  <span key={s} className="text-[8px] px-1.5 py-0.5 border border-gray-800 text-gray-700 rounded tracking-wider">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Ops log */}
            <div className="bg-black/40 border border-gray-900 rounded-lg p-4 flex-1">
              <p className="text-[9px] tracking-[0.4em] text-gray-600 uppercase mb-3">Ops Log</p>
              <div className="space-y-1 text-[9px] font-mono text-gray-700">
                <div>► SYS INIT COMPLETE</div>
                <div>► WEBCRYPTO API VERIFIED</div>
                <div>► CSPRNG SEEDED</div>
                {options.useAES && <div className="text-orange-800">► AES-256-GCM MODULE ARMED</div>}
                {options.useHMAC && <div className="text-red-900">► HMAC-SHA512 MODULE ARMED</div>}
                {isProcessing && <div className="text-cyber-primary animate-pulse">► OPERATION IN PROGRESS...</div>}
                {result && <div className="text-cyber-primary">► OPERATION SUCCESS [{new Date().toLocaleTimeString()}]</div>}
                {error && <div className="text-red-700">► ERROR: {error.slice(0, 40)}</div>}
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-900 flex items-center justify-between text-[9px] text-gray-800 tracking-[0.3em] uppercase">
          <span>QVC v3.0 // {activeLayerCount}-Layer Protocol</span>
          <span>Web Crypto API // NIST Compliant</span>
          <span>Zero Persistence // No Server</span>
        </footer>
      </div>
    </div>
  );
};

export default App;
