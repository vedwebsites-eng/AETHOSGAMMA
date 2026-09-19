import React from 'react';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, Book, Target, TrendingUp, Zap, HardDrive, Brain } from 'lucide-react';

const systems = [
  { name: 'CHRONOS', desc: 'Your 24-hour operating cycle.', icon: Clock },
  { name: 'TASKS', desc: 'Turn intentions into daily execution.', icon: CheckCircle2 },
  { name: 'JOURNAL', desc: 'Capture what happened and what you learned.', icon: Book },
  { name: 'GROW', desc: 'Turn reflection into development.', icon: TrendingUp },
  { name: 'WOOP', desc: 'Turn goals into concrete plans.', icon: Target },
  { name: 'EVIDENCE VAULT', desc: 'Proof of progress you can return to.', icon: HardDrive },
  { name: 'AETHOS COACH', desc: 'Personalized guidance using your context.', icon: Brain },
];

export const HowAethosWorks = () => {
  return (
    <section id="how-it-works" className="py-24 px-8 md:px-16 bg-[#060606] border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[10px] font-mono text-[#C8651B] uppercase tracking-[0.5em] mb-4"
        >
          HOW AETHOS WORKS
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-serif font-black uppercase text-3xl md:text-5xl text-white mb-8"
        >
          One system.<br/>
          Different parts.<br/>
          One direction.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm text-white/50 font-mono max-w-2xl mb-16 leading-relaxed"
        >
          AETHOS connects daily execution, reflection, growth, goals, evidence, and AI coaching into one continuous personal operating system.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {systems.map((system, index) => {
            const Icon = system.icon;
            return (
              <motion.div
                key={system.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-[#C8651B]/50 transition-colors group"
              >
                <Icon size={24} className="text-[#C8651B] mb-4" />
                <h3 className="font-mono text-xs font-bold text-white mb-2 uppercase">{system.name}</h3>
                <p className="text-[11px] font-mono text-white/40 leading-relaxed">{system.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
