import React, { useState, useRef, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { addDoc, collection, doc, updateDoc, getFirestore } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Trash2, Flame, Check, Plus } from 'lucide-react';

const db = getFirestore();
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function GoalsTab({ user, yearlyGoals, dailyGoals, dailyGoalStreak, onAddXP }: any) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [newGoalText, setNewGoalText] = useState('');
  const [newDailyText, setNewDailyText] = useState('');
  const [addingYearly, setAddingYearly] = useState(false);
  const [addingDaily, setAddingDaily] = useState(false);
  const [liveTime, setLiveTime] = useState(format(new Date(), 'HH:mm:ss'));
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(format(new Date(), 'HH:mm:ss'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const years = Array.from(new Set([currentYear, ...yearlyGoals.map((g: any) => g.year)])).sort() as number[];
  const monthDoc = yearlyGoals.find((g: any) => g.year === selectedYear && g.month === selectedMonth);
  const monthGoals: any[] = monthDoc?.goals || [];
  const todayDoc = dailyGoals.find((d: any) => d.date === todayStr);
  const todayGoals: any[] = todayDoc?.goals || [];
  const allDone = todayGoals.length > 0 && todayGoals.every((g: any) => g.completed);

  async function addYearlyGoal() {
    if (!newGoalText.trim() || addingYearly) return;
    setAddingYearly(true);
    try {
      const newGoal = { id: Date.now().toString(), text: newGoalText.trim(), completed: false, createdAt: new Date().toISOString() };
      if (monthDoc) {
        await updateDoc(doc(db, 'yearly_goals', monthDoc.id), { goals: [...monthGoals, newGoal] });
      } else {
        await addDoc(collection(db, 'yearly_goals'), {
          userId: user.uid, year: selectedYear, month: selectedMonth,
          goals: [newGoal], createdAt: new Date().toISOString()
        });
      }
      setNewGoalText('');
    } catch (e) {
      console.error('Failed to add yearly goal:', e);
    } finally {
      setAddingYearly(false);
    }
  }

  async function toggleYearlyGoal(goalId: string) {
    if (!monthDoc) return;
    const updated = monthGoals.map((g: any) => g.id === goalId ? { ...g, completed: !g.completed } : g);
    try {
      await updateDoc(doc(db, 'yearly_goals', monthDoc.id), { goals: updated });
      const wasCompleted = monthGoals.find((g: any) => g.id === goalId)?.completed;
      if (!wasCompleted) onAddXP(50, 'YEARLY_GOAL_COMPLETE');
    } catch (e) { console.error('Toggle yearly goal error:', e); }
  }

  async function deleteYearlyGoal(goalId: string) {
    if (!monthDoc) return;
    try {
      await updateDoc(doc(db, 'yearly_goals', monthDoc.id), { goals: monthGoals.filter((g: any) => g.id !== goalId) });
    } catch (e) { console.error('Delete yearly goal error:', e); }
  }

  async function addDailyGoal() {
    if (!newDailyText.trim() || addingDaily) return;
    setAddingDaily(true);
    try {
      const newGoal = { id: Date.now().toString(), text: newDailyText.trim(), completed: false };
      if (todayDoc) {
        await updateDoc(doc(db, 'daily_goals', todayDoc.id), { goals: [...todayGoals, newGoal] });
      } else {
        await addDoc(collection(db, 'daily_goals'), {
          userId: user.uid, date: todayStr,
          goals: [newGoal], dayCompleted: false, createdAt: new Date().toISOString()
        });
      }
      setNewDailyText('');
    } catch (e) {
      console.error('Failed to add daily goal:', e);
    } finally {
      setAddingDaily(false);
    }
  }

  async function toggleDailyGoal(goalId: string) {
    if (!todayDoc) return;
    try {
      const updated = todayGoals.map((g: any) => g.id === goalId ? { ...g, completed: !g.completed } : g);
      const allComplete = updated.every((g: any) => g.completed);
      await updateDoc(doc(db, 'daily_goals', todayDoc.id), { goals: updated, dayCompleted: allComplete });
      const wasCompleted = todayGoals.find((g: any) => g.id === goalId)?.completed;
      if (!wasCompleted) {
        onAddXP(20, 'DAILY_GOAL_COMPLETE');
        if (allComplete) onAddXP(30, 'ALL_DAILY_GOALS_COMPLETE');
      }
    } catch (e) { console.error('Toggle daily goal error:', e); }
  }

  async function deleteDailyGoal(goalId: string) {
    if (!todayDoc) return;
    try {
      await updateDoc(doc(db, 'daily_goals', todayDoc.id), { goals: todayGoals.filter((g: any) => g.id !== goalId) });
    } catch (e) { console.error('Delete daily goal error:', e); }
  }

  return (
    <div className="space-y-8 pb-8">

      {/* SECTION 1 — YEARLY GOALS */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-6">
        <div>
          <p className="text-[9px] font-mono text-accent uppercase tracking-[0.4em] font-black">SECTION_01</p>
          <h2 className="text-2xl font-serif font-black text-white italic uppercase">YEARLY_GOALS</h2>
        </div>

        {/* Year tabs — auto-generated, no manual add */}
        <div className="flex items-center gap-2 flex-wrap">
          {years.map(yr => (
            <button key={yr} onClick={() => setSelectedYear(yr)}
              className={`px-4 py-2 rounded-xl text-[11px] font-mono font-black uppercase transition-all ${selectedYear === yr ? 'bg-accent text-white' : 'bg-white/5 text-text-m hover:bg-white/10'}`}>
              {yr}
            </button>
          ))}
        </div>

        {/* Month carousel */}
        <div className="relative">
          <button onClick={() => setSelectedMonth(m => Math.max(0, m - 1))}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-black/60 rounded-lg">
            <ChevronLeft size={16} className="text-text-m" />
          </button>
          <div ref={monthScrollRef} className="flex gap-2 overflow-x-auto no-scrollbar px-8 scroll-smooth">
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => setSelectedMonth(i)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-[11px] font-mono font-black uppercase transition-all ${selectedMonth === i ? 'bg-accent text-white shadow-[0_0_15px_rgba(200,101,27,0.4)]' : 'bg-white/5 text-text-m hover:bg-white/10'}`}>
                {m}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedMonth(m => Math.min(11, m + 1))}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-black/60 rounded-lg">
            <ChevronRight size={16} className="text-text-m" />
          </button>
        </div>

        {/* Goal checklist */}
        <div className="space-y-2">
          <p className="text-[9px] font-mono text-text-s uppercase opacity-40">{MONTHS[selectedMonth]} {selectedYear}</p>
          {monthGoals.length === 0 && (
            <p className="text-[10px] font-mono text-text-s opacity-30 py-4 text-center">NO_GOALS_SET — add one below</p>
          )}
          {monthGoals.map((goal: any) => (
            <div key={goal.id} className="flex items-center gap-3 p-3 bg-white/3 border border-white/5 rounded-xl group">
              <button onClick={() => toggleYearlyGoal(goal.id)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${goal.completed ? 'bg-success border-success' : 'border-white/20 hover:border-white/40'}`}>
                {goal.completed && <Check size={12} className="text-black" />}
              </button>
              <p className={`flex-1 text-sm font-mono ${goal.completed ? 'line-through text-text-s opacity-40' : 'text-white'}`}>{goal.text}</p>
              <button onClick={() => deleteYearlyGoal(goal.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-text-s hover:text-danger transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <input
              value={newGoalText}
              onChange={e => setNewGoalText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addYearlyGoal()}
              placeholder="Add a goal for this month..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-white placeholder-white/20 outline-none focus:border-accent/50 transition-all"
            />
            <button
              onClick={addYearlyGoal}
              disabled={addingYearly || !newGoalText.trim()}
              className="px-4 py-3 bg-accent text-white font-mono font-black text-xs uppercase rounded-xl hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {addingYearly ? '...' : 'ADD'}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2 — TODAY'S GOALS */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-mono text-cyan uppercase tracking-[0.4em] font-black">SECTION_02</p>
            <h2 className="text-2xl font-serif font-black text-white italic uppercase">TODAY_GOALS</h2>
            <p className="text-[11px] font-mono text-text-s opacity-60 mt-1">
              {format(new Date(), 'EEEE, MMM d')} · <span className="text-cyan font-black">{liveTime}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Flame size={16} className={dailyGoalStreak > 0 ? 'text-orange-500' : 'text-text-s opacity-30'} />
            <span className="text-lg font-serif font-black text-warning">{dailyGoalStreak}</span>
            <span className="text-[9px] font-mono text-text-s opacity-40 uppercase">DAY_STREAK</span>
          </div>
        </div>

        {/* Last 7 days indicators */}
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = subDays(new Date(), 6 - i);
            const dStr = format(d, 'yyyy-MM-dd');
            const isToday = dStr === todayStr;
            const entry = dailyGoals.find((g: any) => g.date === dStr);
            const completed = entry?.dayCompleted;
            const isPast = dStr < todayStr;
            return (
              <div key={dStr} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full h-2 rounded-full ${isToday ? 'bg-cyan/40' : completed ? 'bg-success' : isPast ? 'bg-danger/60' : 'bg-white/10'}`} />
                <span className="text-[8px] font-mono text-text-s opacity-40">{format(d, 'EEE').toUpperCase()}</span>
              </div>
            );
          })}
        </div>

        {/* Daily goal checklist */}
        <div className="space-y-2">
          {todayGoals.length === 0 && (
            <p className="text-[10px] font-mono text-text-s opacity-30 py-4 text-center">NO_DAILY_GOALS — set what you want to achieve today</p>
          )}
          {todayGoals.map((goal: any) => (
            <div key={goal.id} className="flex items-center gap-3 p-3 bg-white/3 border border-white/5 rounded-xl group">
              <button onClick={() => toggleDailyGoal(goal.id)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${goal.completed ? 'bg-cyan border-cyan' : 'border-white/20 hover:border-cyan/50'}`}>
                {goal.completed && <Check size={12} className="text-black" />}
              </button>
              <p className={`flex-1 text-sm font-mono ${goal.completed ? 'line-through text-text-s opacity-40' : 'text-white'}`}>{goal.text}</p>
              <button onClick={() => deleteDailyGoal(goal.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-text-s hover:text-danger transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {allDone && todayGoals.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-xl">
              <Check size={14} className="text-success" />
              <p className="text-[10px] font-mono font-black text-success uppercase tracking-widest">ALL_GOALS_COMPLETE — DAY_SYNCED ✓</p>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <input
              value={newDailyText}
              onChange={e => setNewDailyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDailyGoal()}
              placeholder="Add today's goal..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-white placeholder-white/20 outline-none focus:border-cyan/50 transition-all"
            />
            <button
              onClick={addDailyGoal}
              disabled={addingDaily || !newDailyText.trim()}
              className="px-4 py-3 bg-cyan text-black font-mono font-black text-xs uppercase rounded-xl hover:bg-cyan/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {addingDaily ? '...' : 'ADD'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
