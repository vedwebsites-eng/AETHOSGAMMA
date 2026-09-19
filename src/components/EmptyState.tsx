import React from 'react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, actionLabel, onAction }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass p-12 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-6 max-w-lg mx-auto my-8 bg-black/20"
    >
      <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center text-text-m bg-white/5 shadow-inner">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="font-mono text-sm font-black uppercase tracking-wider text-white">
          {title}
        </h3>
      </div>
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="px-6 py-2.5 bg-accent text-white font-mono font-black text-[10px] uppercase tracking-wider rounded-xl hover:shadow-[0_0_15px_rgba(255,51,102,0.4)] transition-all"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
