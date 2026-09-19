import React, { useState, useEffect } from 'react';
import { chronos } from '../services/chronos';
import { format } from 'date-fns';

export const ChronosClock = () => {
  const [timeLeft, setTimeLeft] = useState(chronos.getRemainingMs());
  const [cycle, setCycle] = useState(chronos.getCurrentCycle());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(chronos.getRemainingMs());
      setCycle(chronos.getCurrentCycle());
    }, 1000);

    const unsubscribe = chronos.subscribe(() => {
      setTimeLeft(chronos.getRemainingMs());
      setCycle(chronos.getCurrentCycle());
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = Math.max(0, Math.min(100, ((24 * 60 * 60 * 1000 - timeLeft) / (24 * 60 * 60 * 1000)) * 100));

  return (
    <div className="glass rounded-2xl p-6 border border-white/5 bg-black/20 backdrop-blur-md shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">CHRONOS</h3>
        <span className="text-[10px] uppercase text-text-s font-mono">24h_cycle</span>
      </div>

      <div className="text-4xl font-mono font-bold text-white tracking-tighter">
        {formatTime(timeLeft)}
      </div>
      <div className="text-[12px] font-mono text-text-s uppercase tracking-widest">Remaining</div>

      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-cyan transition-all duration-1000 ease-linear" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div>
          <p className="text-text-s uppercase">Start</p>
          <p className="text-white">{format(cycle.start, 'HH:mm')}</p>
        </div>
        <div>
          <p className="text-text-s uppercase">Reset</p>
          <p className="text-white">{format(cycle.end, 'HH:mm')}</p>
        </div>
      </div>
    </div>
  );
};
