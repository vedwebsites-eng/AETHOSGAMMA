import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function NotFoundPage({ onReturn }: { onReturn: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setProgress(prev => (prev < 100 ? prev + 2 : 100));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animationProps = reducedMotion ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 }
  };

  return (
    <motion.div 
      {...animationProps}
      className="fixed inset-0 bg-[#080808] flex items-center justify-center p-6 text-white font-mono overflow-hidden"
    >
      {/* Subtle Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,217,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,217,255,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10 text-center max-w-lg w-full space-y-8">
        {/* 404 */}
        <motion.div 
          className="text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500"
          animate={reducedMotion ? {} : { opacity: [0.8, 1, 0.9] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          404
        </motion.div>

        <p className="text-xl tracking-widest uppercase text-gray-400">SIGNAL NOT FOUND</p>

        {/* System Panel */}
        <div className="border border-white/10 bg-white/5 p-6 rounded-2xl text-left space-y-4">
          <div className="text-[10px] text-gray-500 flex justify-between uppercase">
            <span>AETHOS // ROUTE SCANNER</span>
            <span>STATUS: LOST</span>
          </div>
          
          <div className="font-mono text-xs space-y-1 text-gray-300">
            <p>ROUTE .................. UNKNOWN</p>
            <p>SIGNAL ................. LOST</p>
            <p>STATUS ................. 404</p>
          </div>

          {!reducedMotion && (
            <div className="h-1 bg-white/10 mt-4 overflow-hidden rounded-full">
              <motion.div 
                className="h-full bg-cyan"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <p className="text-[10px] uppercase text-cyan">{progress < 100 ? 'SEARCHING FOR VALID ROUTE...' : 'ROUTE NOT FOUND'}</p>
        </div>

        {/* CTA */}
        <button 
          onClick={onReturn}
          className="px-8 py-4 border border-cyan/30 bg-cyan/5 text-cyan hover:bg-cyan/10 transition-all uppercase tracking-widest text-sm rounded-xl"
        >
          RETURN TO AETHOS
        </button>
      </div>
    </motion.div>
  );
}
