import React, { useEffect, useRef } from 'react';

interface CipherStreamProps {
  active: boolean;
  color?: string;
}

const STREAM_CHARS = 'αΩΨΦΣΞΛΘΠΓ01⟨⟩⌖⌘⏣⚙✦❋⟰⌀';

const CipherStream: React.FC<CipherStreamProps> = ({ active, color = '#00ff9d' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dropsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const cols = Math.floor(canvas.width / 14);
      dropsRef.current = Array.from({ length: cols }, () => Math.random() * -50);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      if (!active) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.fillStyle = 'rgba(5,5,10,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = color;
      ctx.font = '12px "Space Mono", monospace';

      const drops = dropsRef.current;
      for (let i = 0; i < drops.length; i++) {
        const char = STREAM_CHARS[Math.floor(Math.random() * STREAM_CHARS.length)];
        const x = i * 14;
        const y = drops[i] * 14;

        const opacity = Math.random() > 0.95 ? 1 : 0.25;
        ctx.globalAlpha = opacity;
        ctx.fillText(char, x, y);
        ctx.globalAlpha = 1;

        if (drops[i] * 14 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [active, color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
      style={{ opacity: active ? 0.6 : 0 }}
    />
  );
};

export default CipherStream;
