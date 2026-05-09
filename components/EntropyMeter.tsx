import React from 'react';

interface EntropyMeterProps {
  score: number;
  label?: string;
}

const EntropyMeter: React.FC<EntropyMeterProps> = ({ score, label = 'ENTROPY' }) => {
  const getColor = () => {
    if (score >= 85) return '#00ff9d';
    if (score >= 60) return '#00f0ff';
    if (score >= 35) return '#ffcc00';
    return '#ff3c3c';
  };

  const getGrade = () => {
    if (score >= 90) return 'S+';
    if (score >= 80) return 'S';
    if (score >= 70) return 'A';
    if (score >= 55) return 'B';
    if (score >= 40) return 'C';
    return 'F';
  };

  const color = getColor();
  const grade = getGrade();
  const segments = 20;
  const filled = Math.round((score / 100) * segments);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] text-gray-500 uppercase">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color }}>{score}%</span>
          <span
            className="text-[10px] font-black font-cyber px-1.5 py-0.5 rounded border"
            style={{ color, borderColor: color, textShadow: `0 0 8px ${color}` }}
          >
            {grade}
          </span>
        </div>
      </div>
      <div className="flex gap-[2px] h-2">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-[1px] transition-all duration-500"
            style={{
              backgroundColor: i < filled ? color : '#1a1a2e',
              boxShadow: i < filled ? `0 0 4px ${color}80` : 'none',
              transitionDelay: `${i * 20}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default EntropyMeter;
