import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';

const faqItems = [
  { q: "What is AETHOS?", a: "AETHOS is a connected personal operating system designed to help you execute daily work, reflect on your progress, and grow over time, all within a single integrated environment." },
  { q: "How does AETHOS work?", a: "AETHOS connects your daily tasks, journaling, habit tracking, goal planning, and AI coaching into a continuous loop that ensures every action you take is connected to your long-term evolution." },
  { q: "What is Chronos?", a: "Chronos is the central 24-hour operating cycle of AETHOS, helping you anchor your daily execution and reflection routines into a consistent, daily rhythm." },
  { q: "What is WOOP?", a: "WOOP stands for Wish, Outcome, Obstacle, and Plan. It is a psychological framework integrated into AETHOS to help you transform your intentions into actionable, concrete plans." },
  { q: "How does AETHOS Coach use my context?", a: "The AETHOS Coach intelligently analyzes your recent task completion, journal entries, habit streaks, and Wheel of Life balance to provide hyper-personalized guidance tailored specifically to your current trajectory." },
  { q: "What is the Evidence Vault?", a: "The Evidence Vault is your dedicated space to manually record and revisit proof of your progress, wins, and breakthroughs, creating a bank of evidence you can return to for motivation." },
  { q: "Is AETHOS a task manager?", a: "AETHOS includes powerful task management, but it is not just a task manager. Its core value lies in connecting task execution to reflection, habit growth, and strategic goal planning." },
  { q: "Does AETHOS reset my data every 24 hours?", a: "No. AETHOS uses persistent cloud storage. Your data, streaks, journal entries, and progress are securely saved and accessible across all your devices." },
  { q: "What happens to previous journal entries and Wheel of Life data?", a: "All your previous journal entries and Wheel of Life data are stored securely in your personal account, allowing you to review your history, patterns, and development over time." },
];

export const AethosFaq = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="px-8 md:px-16 py-32 bg-[#060606] border-t border-b border-white/5">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <p className="text-[10px] font-mono text-[#C8651B] uppercase tracking-[0.5em] mb-4">
            FAQ
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-black uppercase italic text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-sm font-mono text-white/50">
            Everything you need to know before entering AETHOS.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className="border border-white/5 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300 overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="font-mono text-sm text-white font-bold tracking-tight">
                    {item.q}
                  </span>
                  <span className="text-[#C8651B]">
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="border-t border-white/5 bg-white/[0.005]"
                    >
                      <p className="p-6 text-xs font-mono text-white/40 leading-relaxed">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        
        <div className="mt-20 text-center">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-8">Ready to enter AETHOS?</p>
            <button
                className="px-8 py-3 bg-[#C8651B] hover:bg-[#b05412] text-white text-xs font-mono font-bold uppercase tracking-widest rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(200,101,27,0.2)]"
            >
                ENTER AETHOS →
            </button>
        </div>
      </div>
    </section>
  );
};
