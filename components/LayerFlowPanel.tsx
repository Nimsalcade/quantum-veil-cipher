import React, { useState } from 'react';
import { CipherLayerStep } from '../types';

interface LayerFlowPanelProps {
  steps: CipherLayerStep[];
  mode: 'ENCRYPT' | 'DECRYPT';
}

const LAYER_COLORS = [
  '#00ff9d',
  '#00f0ff',
  '#bc13fe',
  '#ffcc00',
  '#ff8800',
  '#ff3c3c',
  '#ff3cf0',
];

const LayerFlowPanel: React.FC<LayerFlowPanelProps> = ({ steps, mode }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (steps.length === 0) return null;

  return (
    <div className="space-y-2 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-800" />
        <span className="text-[9px] tracking-[0.4em] text-gray-600 uppercase">
          {mode === 'ENCRYPT' ? '▼ ENCRYPTION PIPELINE' : '▲ DECRYPTION PIPELINE'}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-800" />
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-800 to-transparent" />

        {steps.map((step, idx) => {
          const color = LAYER_COLORS[idx % LAYER_COLORS.length];
          const isOpen = expanded === idx;
          const preview = step.output.slice(0, 60) + (step.output.length > 60 ? '…' : '');

          return (
            <div key={idx} className="relative pl-10 mb-2 group">
              <div
                className="absolute left-3 top-3 w-3 h-3 rounded-full border-2 transition-all duration-300"
                style={{
                  borderColor: color,
                  backgroundColor: isOpen ? color : 'transparent',
                  boxShadow: isOpen ? `0 0 8px ${color}` : 'none',
                }}
              />

              <button
                onClick={() => setExpanded(isOpen ? null : idx)}
                className="w-full text-left bg-black/40 border rounded transition-all duration-200 hover:bg-black/70 focus:outline-none"
                style={{
                  borderColor: isOpen ? color + '60' : '#1a1a2e',
                  boxShadow: isOpen ? `0 0 12px ${color}20` : 'none',
                }}
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded border"
                      style={{ color, borderColor: color + '50' }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-[10px] font-bold tracking-wider" style={{ color }}>
                      {step.name}
                    </span>
                  </div>
                  <span className="text-gray-700 text-[10px]">{isOpen ? '▲' : '▼'}</span>
                </div>

                {!isOpen && (
                  <div className="px-3 pb-2">
                    <p className="text-[9px] text-gray-600 font-mono truncate">{preview}</p>
                  </div>
                )}

                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t border-gray-900">
                    <p className="text-[9px] text-gray-500 pt-2 italic">{step.description}</p>
                    <div
                      className="font-mono text-[9px] break-all p-2 rounded border bg-black/60 max-h-24 overflow-y-auto"
                      style={{ borderColor: color + '20', color: color + 'cc' }}
                    >
                      {step.output}
                    </div>

                    {step.grid && step.grid.length > 0 && (
                      <div>
                        <p className="text-[9px] text-gray-600 mb-1 tracking-widest">GRID_MATRIX</p>
                        <div
                          className="grid gap-px bg-black/80 p-1 rounded border overflow-x-auto"
                          style={{
                            gridTemplateColumns: `repeat(${step.grid[0].length}, minmax(20px, 1fr))`,
                            borderColor: color + '20',
                            maxHeight: '120px',
                          }}
                        >
                          {step.grid.map((row, rIdx) =>
                            row.map((cell, cIdx) => (
                              <div
                                key={`${rIdx}-${cIdx}`}
                                className="flex items-center justify-center text-[8px] aspect-square rounded-sm"
                                style={{ color, backgroundColor: color + '10' }}
                              >
                                {cell || '·'}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayerFlowPanel;
