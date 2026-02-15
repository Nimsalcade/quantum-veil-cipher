import React, { useState, useRef } from 'react';
import { CipherMode, CipherResult } from './types';
import { encryptQVC, decryptQVC } from './utils/qvcCipher';


const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [key, setKey] = useState('');
  const [mode, setMode] = useState<CipherMode>(CipherMode.ENCRYPT);
  const [useAES, setUseAES] = useState(false);
  const [result, setResult] = useState<CipherResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const processingRef = useRef<boolean>(false);

  const handleProcess = async () => {
    if (processingRef.current) return;
    setError('');
    setResult(null);
    setResult(null);

    if (!input || !key) {
      setError('INPUT STREAM & ACCESS KEY REQUIRED');
      return;
    }

    // Basic validation
    if (!/^[a-zA-Z]+$/.test(key)) {
      setError('KEY MUST BE ALPHABETIC (A-Z) ONLY');
      return;
    }

    try {
      processingRef.current = true;
      setIsProcessing(true);

      // Artificial delay for "tactical" feel - optional, but helps UX perceive effort
      await new Promise(r => setTimeout(r, 400));

      let res: CipherResult;
      if (mode === CipherMode.ENCRYPT) {
        res = await encryptQVC(input, key, { useAES });
      } else {
        res = await decryptQVC(input, key, { useAES });
      }
      setResult(res);
    } catch (e: any) {
      console.error(e);
      setError(e.message?.toUpperCase() || 'OPERATION FAILED. CHECK PROTOCOLS.');
      setResult(null);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const handleCopy = () => {
    if (result?.final) {
      navigator.clipboard.writeText(result.final);
    }
  };

  const handleWipe = () => {
    setInput('');
    setKey('');
    setResult(null);
    setResult(null);
    setError('');
  };



  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 p-4 md:p-8 font-mono relative overflow-hidden selection:bg-cyber-primary selection:text-black">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-secondary via-cyber-primary to-cyber-accent animate-pulse"></div>
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyber-secondary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-40 -left-20 w-96 h-96 bg-cyber-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        <header className="mb-8 text-center relative">
          <div className="inline-block border-b-2 border-cyber-primary px-8 pb-2">
            <h1 className="text-4xl md:text-6xl font-cyber font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-cyber-primary to-cyber-accent drop-shadow-[0_0_15px_rgba(0,255,157,0.5)]">
              QVC
            </h1>
          </div>
          <p className="text-cyber-secondary font-bold tracking-[0.4em] text-xs mt-3 uppercase">
            QUANTUM VEIL CIPHER // <span className="text-red-500 animate-pulse">MIL-SPEC READY</span>
          </p>
        </header>

        {/* Status Bar */}
        <div className="flex justify-between items-center mb-6 text-[10px] uppercase tracking-widest text-gray-500 border-y border-cyber-dim py-2">
          <span>SYS_STATUS: ONLINE</span>
          <span className={useAES ? "text-red-500 font-bold" : "text-cyber-dim"}>
            ENCRYPTION: {useAES ? 'AES-256-GCM + PBKDF2' : 'STANDARD_QVC'}
          </span>
          <span>SEC_LEVEL: {useAES ? 'MAXIMUM' : 'NOMINAL'}</span>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* CONTROL PANEL */}
          <div className="bg-black/40 border border-cyber-dim p-1 rounded-lg shadow-2xl backdrop-blur-md">
            <div className="bg-cyber-dark/80 p-5 rounded border border-white/5 h-full flex flex-col">

              {/* Mode Select */}
              <div className="flex bg-black/60 rounded p-1 mb-6 border border-cyber-dim/50">
                <button
                  onClick={() => { setMode(CipherMode.ENCRYPT); setInput(''); setResult(null); }}
                  className={`flex-1 py-2 text-xs rounded transition-all tracking-wider ${mode === CipherMode.ENCRYPT ? 'bg-cyber-primary text-black font-black shadow-[0_0_10px_rgba(0,255,157,0.4)]' : 'text-gray-500 hover:text-white'}`}
                >
                  ENCRYPT_MODE
                </button>
                <button
                  onClick={() => { setMode(CipherMode.DECRYPT); setInput(''); setResult(null); }}
                  className={`flex-1 py-2 text-xs rounded transition-all tracking-wider ${mode === CipherMode.DECRYPT ? 'bg-cyber-secondary text-white font-black shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'text-gray-500 hover:text-white'}`}
                >
                  DECRYPT_MODE
                </button>
              </div>

              {/* Key Inputs */}
              <div className="mb-6 space-y-4">
                <div className="relative group">
                  <label className="absolute -top-2 left-2 bg-cyber-dark px-1 text-[10px] text-cyber-primary font-bold">
                    ACCESS_KEY (ALPHA)
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                    disabled={isProcessing}
                    placeholder="ENTER_SECURE_KEY"
                    className="w-full bg-black/50 border border-cyber-dim focus:border-cyber-primary text-cyber-primary p-4 rounded outline-none tracking-[0.2em] font-cyber text-center text-xl placeholder-gray-800 transition-colors uppercase disabled:opacity-50"
                  />
                </div>

                {/* AES Toggle - Tactical Switch */}
                <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-cyber-dim/30">
                  <span className={`text-xs font-bold tracking-wider ${useAES ? 'text-white' : 'text-gray-500'}`}>
                    MILITARY_GRADE_ARMOR
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={useAES} onChange={(e) => setUseAES(e.target.checked)} className="sr-only peer" disabled={isProcessing} />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
                  </label>
                </div>
              </div>

              {/* Text Input */}
              <div className="flex-grow mb-4 relative group">
                <label className="absolute -top-2 left-2 bg-cyber-dark px-1 text-[10px] text-gray-400 font-bold">
                  DATA_STREAM
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isProcessing}
                  placeholder={mode === CipherMode.ENCRYPT ? "ENTER PLAINTEXT TARGET..." : "PASTE ENCRYPTED PAYLOAD..."}
                  className="w-full h-full min-h-[120px] bg-black/50 border border-cyber-dim focus:border-white text-gray-300 p-4 rounded outline-none font-mono text-sm resize-none disabled:opacity-50 transition-colors"
                />
              </div>

              {error && (
                <div className="mb-4 p-2 bg-red-900/20 border-l-2 border-red-500 text-red-500 text-xs font-bold animate-shake">
                  ⚠ ERROR: {error}
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button
                  onClick={handleWipe}
                  disabled={isProcessing}
                  className="py-3 border border-red-900/50 text-red-700/50 hover:text-red-500 hover:border-red-500 hover:bg-red-900/10 rounded uppercase font-bold text-xs tracking-widest transition-all disabled:opacity-30"
                >
                  WIPE_MEM
                </button>
                <button
                  onClick={handleProcess}
                  disabled={isProcessing || !input || !key}
                  className={`py-3 rounded uppercase font-black text-sm tracking-widest transition-all shadow-lg flex items-center justify-center relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed
                            ${mode === CipherMode.ENCRYPT
                      ? 'bg-cyber-primary text-black hover:bg-white shadow-cyber-primary/20'
                      : 'bg-cyber-secondary text-white hover:bg-white hover:text-black shadow-cyber-secondary/20'
                    }`}
                >
                  {isProcessing && <span className="absolute inset-0 bg-white/20 animate-progress origin-left"></span>}
                  <span className="relative z-10">{isProcessing ? 'PROCESSING...' : (mode === CipherMode.ENCRYPT ? 'EXECUTE_ENCRYPT' : 'EXECUTE_DECRYPT')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* OUTPUT TERMINAL */}
          <div className="bg-black/80 border border-cyber-dim p-1 rounded-lg shadow-2xl backdrop-blur-sm relative overflow-hidden">
            {/* Scanlines Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://transparenttextures.com/patterns/black-scales.png')] opacity-10"></div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/5 to-transparent h-1 w-full animate-scan"></div>

            <div className="bg-black/90 p-5 rounded border border-white/5 h-full flex flex-col relative z-10">
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <label className="text-cyber-accent text-xs font-bold uppercase tracking-widest">
                  TERMINAL_OUTPUT
                </label>
                <div className="flex gap-2">

                  <button
                    onClick={handleCopy}
                    disabled={!result}
                    className="text-[10px] bg-cyber-dim/20 text-gray-400 hover:text-white px-3 py-1 rounded uppercase hover:bg-cyber-dim/40 disabled:opacity-30"
                  >
                    COPY
                  </button>
                </div>
              </div>

              <div className="flex-grow bg-black border border-gray-800 p-4 rounded relative overflow-y-auto min-h-[200px] max-h-[50vh] font-mono shadow-inner">
                {result ? (
                  <div className="space-y-4">
                    <div className="text-[10px] text-gray-500 border-b border-gray-800 pb-2 mb-2">
                      OPERATION_COMPLETE // {new Date().toLocaleTimeString()}
                    </div>
                    <div className={`break-words whitespace-pre-wrap font-mono text-sm leading-relaxed ${useAES ? 'text-red-400' : 'text-cyber-accent'} selection:bg-white selection:text-black`}>
                      {result.final}
                    </div>

                    {/* Steps Visualization (Collapsed by default maybe? For now just show) */}
                    <div className="mt-8 pt-4 border-t border-gray-800/50">
                      <p className="text-[10px] text-gray-600 mb-2 uppercase">Encryption Layers:</p>
                      <div className="space-y-1">
                        {result.steps.map((step, idx) => (
                          <div key={idx} className="flex items-center text-[10px] text-gray-500">
                            <span className="w-4 h-4 rounded-full border border-gray-700 flex items-center justify-center mr-2 text-[8px]">{idx + 1}</span>
                            <span className="text-gray-400">{step.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-2">
                    <div className="w-2 h-2 bg-gray-700 animate-ping rounded-full"></div>
                    <span className="text-xs uppercase tracking-widest">Awaiting Command...</span>
                  </div>
                )}
              </div>

              {/* AI Analyst Output */}

            </div>
          </div>
        </div>

        <footer className="text-center text-[10px] text-gray-700 uppercase tracking-widest mt-12">
          SECURE TRANSMISSION PROTOCOL v2.0 // CLASSIFIED
        </footer>
      </div>
    </div>
  );
};

export default App;