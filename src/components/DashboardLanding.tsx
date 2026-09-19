import React from 'react';
import { Sparkles, Book, CheckCircle2, Flame, Target, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export const DashboardLanding = ({ greeting, coachProfile, inputText, setInputText, handleSendMessage }: any) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
      <Sparkles size={48} className="text-cyan animate-pulse" />
      <h2 className="text-3xl md:text-4xl font-serif font-black uppercase italic tracking-wide text-text-p text-glow-white">
        {greeting}, {coachProfile.userName}
      </h2>
      <p className="font-mono text-text-m text-sm">{coachProfile.coachName} is online — what should we work on?</p>
      
      <div className="w-full max-w-lg space-y-2">
         <div className="flex gap-2">
           <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm text-text-p"
              placeholder="MESSAGE_COACH..."
           />
           <button onClick={() => handleSendMessage(inputText)} className="px-6 bg-cyan/10 border border-cyan/20 text-cyan rounded-xl font-mono text-xs font-black uppercase tracking-widest hover:bg-cyan/20 transition-all">SEND</button>
         </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
         {[
           { icon: <Book size={14} />, label: 'MY_JOURNAL', prompt: "Look at my recent journal entries and tell me what patterns or emotional trends you're noticing." },
           { icon: <CheckCircle2 size={14} />, label: 'MY_TASKS', prompt: "Give me a quick status report on my current tasks — what's pending, what's overdue, and what I should prioritize today." },
           { icon: <Flame size={14} />, label: 'HABIT_STREAKS', prompt: "How are my habit streaks looking right now? Flag anything at risk of breaking." },
           { icon: <Target size={14} />, label: 'LIFE_BALANCE', prompt: "Analyze my current life sync parameters and streak. Synthesize where my balance scores are healthy and which specific categories are suffering. Keep it actionable." },
           { icon: <Calendar size={14} />, label: 'PLAN_TODAY', prompt: "Using my tasks and habits, help me plan out today. What should I focus on first?" }
         ].map(action => (
           <button 
              key={action.label} 
              onClick={() => handleSendMessage(action.prompt)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-text-m font-mono text-[10px] uppercase tracking-widest hover:border-cyan/50 hover:text-cyan transition-all"
           >
             {action.icon}
             {action.label}
           </button>
         ))}
      </div>
    </div>
  );
};
