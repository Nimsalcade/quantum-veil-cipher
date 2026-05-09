import React, { useMemo } from 'react';

interface KeyStrengthMeterProps {
  keyValue: string;
}

const computeKeyStrength = (key: string): { score: number; label: string; color: string } => {
  if (!key || key.length === 0) return { score: 0, label: 'NONE', color: '#333' };

  let score = 0;
  score += Math.min(key.length * 5, 40);

  const uniqueChars = new Set(key.split('')).size;
  score += Math.min(uniqueChars * 3, 30);

  const freq = new Map<string, number>();
  for (const ch of key) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const len = key.length;
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  score += Math.min(Math.round(entropy * 6), 30);

  score = Math.min(100, score);

  if (score >= 80) return { score, label: 'ELITE', color: '#00ff9d' };
  if (score >= 60) return { score, label: 'STRONG', color: '#00f0ff' };
  if (score >= 40) return { score, label: 'MODERATE', color: '#ffcc00' };
  if (score >= 20) return { score, label: 'WEAK', color: '#ff8800' };
  return { score, label: 'CRITICAL', color: '#ff3c3c' };
};

const KeyStrengthMeter: React.FC<KeyStrengthMeterProps> = ({ keyValue }) => {
  const { score, label, color } = useMemo(() => computeKeyStrength(keyValue), [keyValue]);

  if (!keyValue) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[9px] tracking-[0.3em] text-gray-600 uppercase">KEY STRENGTH</span>
        <span className="text-[10px] font-black tracking-widest" style={{ color, textShadow: `0 0 8px ${color}60` }}>
          {label}
        </span>
      </div>
      <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${score}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
    </div>
  );
};

export default KeyStrengthMeter;
