import React from 'react';
import { CipherLayerStep } from '../types';

interface LayerVisualizerProps {
  steps: CipherLayerStep[];
}

const LayerVisualizer: React.FC<LayerVisualizerProps> = ({ steps }) => {
  if (steps.length === 0) return null;

  return (
    <div className="w-full space-y-4 mt-8">
      <h3 className="text-xl font-cyber text-cyber-primary border-b border-cyber-dim pb-2 mb-4">
        <span className="mr-2">⚡</span> QUANTUM PROCESS LOG
      </h3>
      
      <div className="space-y-6">
        {steps.map((step, idx) => (
          <div key={idx} className="relative group bg-cyber-dark/50 border border-cyber-dim p-4 rounded-md overflow-hidden hover:border-cyber-primary/50 transition-all duration-300">
            {/* Index Label */}
            <div className="absolute top-0 right-0 bg-cyber-light px-2 py-1 text-xs font-mono text-cyber-secondary border-b border-l border-cyber-dim">
              L{idx + 1}
            </div>

            <div className="mb-2">
              <h4 className="text-cyber-accent font-bold font-cyber text-sm tracking-widest">{step.name.toUpperCase()}</h4>
              <p className="text-gray-400 text-xs font-mono">{step.description}</p>
            </div>

            {/* Content */}
            <div className="font-mono text-xs md:text-sm text-gray-300 break-all bg-black/30 p-2 rounded border border-white/5">
              {step.output}
            </div>

            {/* Grid Visualization for Layer 4 (Encryption) or Layer 4 Decrypt */}
            {step.grid && (
              <div className="mt-4">
                <p className="text-[10px] text-cyber-secondary mb-1">GRID_MATRIX_VIEW</p>
                <div className="grid gap-1 bg-black/50 p-2 rounded border border-cyber-dim" 
                     style={{ gridTemplateColumns: `repeat(${step.grid[0].length}, minmax(0, 1fr))` }}>
                  {step.grid.map((row, rIdx) => (
                    <React.Fragment key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <div key={`${rIdx}-${cIdx}`} className="aspect-square flex items-center justify-center text-[10px] md:text-xs text-cyber-primary bg-cyber-light/30 border border-white/5">
                          {cell}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerVisualizer;
