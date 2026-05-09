import React, { useEffect, useState } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
  interval?: number;
}

const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#@$%αΩΨΦΣΞ';

const GlitchText: React.FC<GlitchTextProps> = ({ text, className = '', interval = 3000 }) => {
  const [display, setDisplay] = useState(text);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const triggerGlitch = () => {
      if (isGlitching) return;
      setIsGlitching(true);

      let iterations = 0;
      const maxIterations = text.length * 2;
      const glitchInterval = setInterval(() => {
        setDisplay(
          text.split('').map((char, i) => {
            if (char === ' ') return ' ';
            if (i < iterations / 2) return char;
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          }).join('')
        );
        iterations++;
        if (iterations >= maxIterations) {
          clearInterval(glitchInterval);
          setDisplay(text);
          setIsGlitching(false);
        }
      }, 40);
    };

    const timer = setInterval(triggerGlitch, interval + Math.random() * 2000);
    return () => clearInterval(timer);
  }, [text, interval, isGlitching]);

  useEffect(() => {
    setDisplay(text);
  }, [text]);

  return <span className={className}>{display}</span>;
};

export default GlitchText;
