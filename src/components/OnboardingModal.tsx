import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, CheckSquare, Brain, Target, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (displayName: string, difficulty: 'easy' | 'normal' | 'hard', taskTitle: string, wheelTarget: Record<string, number>) => Promise<void>;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [taskTitle, setTaskTitle] = useState('Initialize First Cognitive Routine');
  const [wheelTarget, setWheelTarget] = useState<Record<string, number>>({
    health: 7,
    learning: 8,
    creative: 6,
    work: 8,
    personal: 7,
    routine: 6,
  });

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(displayName, difficulty, taskTitle, wheelTarget);
    }
  };

  const handleTargetChange = (axis: string, val: number) => {
    setWheelTarget(prev => ({
      ...prev,
      [axis]: Math.max(1, Math.min(10, val))
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="glass w-full h-full sm:h-auto sm:max-w-lg md:max-w-2xl rounded-none sm:rounded-[2.5rem] border-0 sm:border border-white/10 overflow-hidden flex flex-col relative z-20 shadow-2xl bg-background max-h-screen sm:max-h-[90vh]"
          >
            <div className="p-5 sm:p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div className="flex items-center gap-3">
                <Brain size={24} className="text-accent animate-pulse" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif font-black text-white italic uppercase tracking-tighter">NEURAL_INITIALIZATION_SEQUENCE</h2>
                  <p className="text-[10px] sm:text-xs font-mono text-cyan uppercase tracking-widest font-black">
                    Step {step} of 3
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-5 sm:p-6 md:p-8 space-y-6 overflow-y-auto no-scrollbar">
              {step === 1 && (
                <div className="space-y-6">
                  <h3 className="text-sm sm:text-base font-serif font-black text-white uppercase italic tracking-wider">PROTOCOL_01: Identity & Multipliers</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-mono font-black text-text-m uppercase">User Designation</label>
                    <input
                      type="text"
                      placeholder="ENTER_OPERATOR_NAME..."
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-mono text-white outline-none focus:border-accent/40 min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] sm:text-xs font-mono font-black text-text-m uppercase block">System Difficulty Profile</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['easy', 'normal', 'hard'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`py-3 min-h-[44px] rounded-lg text-xs font-mono font-black uppercase border transition-all ${
                            difficulty === d 
                              ? 'bg-accent border-accent text-white shadow-[0_0_15px_rgba(255,51,102,0.3)]' 
                              : 'bg-white/5 border-white/10 text-text-m hover:bg-white/10'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h3 className="text-sm sm:text-base font-serif font-black text-white uppercase italic tracking-wider">PROTOCOL_02: Deploy Core Task</h3>
                  <p className="text-xs sm:text-sm text-text-m font-mono italic">Establish your prime objective to calibrate early synchronization sensors.</p>
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-mono font-black text-text-m uppercase">Anchor Objective</label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={e => setTaskTitle(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-mono text-white outline-none focus:border-accent/40 min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm sm:text-base font-serif font-black text-white uppercase italic tracking-wider">PROTOCOL_03: Sphere Objectives</h3>
                  <p className="text-xs sm:text-sm text-text-m font-mono italic">Configure focus weights for the standard balance algorithm metrics.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.keys(wheelTarget).map(axis => (
                      <div key={axis} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] sm:text-xs font-mono font-black text-cyan uppercase tracking-wider">{axis}</span>
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={wheelTarget[axis]}
                            onChange={e => handleTargetChange(axis, parseInt(e.target.value))}
                            className="flex-1 accent-accent"
                          />
                          <span className="text-xs sm:text-sm font-mono font-black text-white w-6 text-right">{wheelTarget[axis]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 md:p-8 bg-white/2 border-t border-white/5">
              <button
                onClick={handleNext}
                disabled={step === 1 && !displayName.trim()}
                className="w-full py-4 min-h-[44px] bg-accent text-white font-mono font-black text-xs sm:text-sm rounded-xl hover:shadow-[0_0_20px_rgba(255,51,102,0.3)] transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {step === 3 ? 'CALIBRATE_SYSTEM (+50 XP)' : 'NEXT_PROTOCOL'} <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
