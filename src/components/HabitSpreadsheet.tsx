import React, { useState, useRef } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import { Plus, Trash2, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { updateDoc, doc, getFirestore } from 'firebase/firestore';

const db = getFirestore();
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function HabitSpreadsheet({ habits, habitLogs, onToggleHabit, onAddHabit, onDeleteHabit, stats }: any) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedHabit, setSelectedHabit] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth));
  const today = format(now, 'yyyy-MM-dd');
  const activeHabits = (habits || []).filter((h: any) => !h.isArchived);

  const isCompleted = (habitId: string, day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return (habitLogs || []).some((l: any) => l.habitId === habitId && l.date === dateStr && l.completed);
  };

  const isFuture = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr > today;
  };

  const isToday = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === today;
  };

  const handleCellTap = async (habit: any, day: number) => {
    if (isFuture(day)) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    try {
      await onToggleHabit(habit, dateStr);
    } catch (e) {
      console.error('Habit toggle error:', e);
    }
  };

  const getStreak = (habitId: string) => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const done = (habitLogs || []).some((l: any) => l.habitId === habitId && l.date === dateStr && l.completed);
      if (done) streak++;
      else break;
    }
    return streak;
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;
    await onAddHabit({ name: newHabitName.trim(), category: 'routine', frequency: 'daily', targetStreak: 30, color: '#00D9FF' });
    setNewHabitName('');
    setShowAddForm(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-mono text-cyan uppercase tracking-[0.4em] font-black">ROUTINE_MATRIX</p>
          <h2 className="text-xl font-serif font-black text-white italic uppercase">HABIT_TRACKER</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass border border-white/10 rounded-xl px-3 py-2">
            <button onClick={prevMonth} className="text-text-m hover:text-white transition-all"><ChevronLeft size={14} /></button>
            <span className="text-[11px] font-mono font-black text-white uppercase">{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="text-text-m hover:text-white transition-all"><ChevronRight size={14} /></button>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan/20 border border-cyan/30 text-cyan font-mono font-black text-[10px] uppercase rounded-xl hover:bg-cyan/30 transition-all">
            <Plus size={12} /> NEW_HABIT
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <input value={newHabitName} onChange={e => setNewHabitName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
            placeholder="Habit name..."
            className="flex-1 px-4 py-3 bg-white/5 border border-cyan/20 rounded-xl text-sm font-mono text-white placeholder-white/20 outline-none focus:border-cyan/50 transition-all" />
          <button onClick={handleAddHabit} className="px-4 py-3 bg-cyan text-black font-mono font-black text-xs uppercase rounded-xl">ADD</button>
          <button onClick={() => setShowAddForm(false)} className="px-4 py-3 bg-white/5 text-text-m font-mono font-black text-xs uppercase rounded-xl">CANCEL</button>
        </div>
      )}

      {/* Spreadsheet */}
      <div className="glass border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto" ref={scrollRef}>
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-[9px] font-mono font-black text-text-s uppercase tracking-widest sticky left-0 bg-[#0a0a0a] min-w-[160px]">HABIT</th>
                <th className="px-2 py-3 text-[9px] font-mono font-black text-orange-400 uppercase w-12">STK</th>
                <th className="px-2 py-3 text-[9px] font-mono font-black text-cyan/50 uppercase w-10">🛡</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                  <th key={day} className={`px-1 py-3 text-[9px] font-mono font-black uppercase w-8 text-center ${isToday(day) ? 'text-cyan' : 'text-text-s opacity-40'}`}>
                    {day}
                  </th>
                ))}
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {activeHabits.length === 0 && (
                <tr><td colSpan={daysInMonth + 4} className="text-center py-12 text-[10px] font-mono text-text-s opacity-30">NO_HABITS — add one above</td></tr>
              )}
              {activeHabits.map((habit: any) => {
                const streak = getStreak(habit.id);
                const shields = stats?.streakShields || 0;
                return (
                  <tr key={habit.id} className="border-b border-white/5 hover:bg-white/2 transition-all group">
                    <td className="px-4 py-3 sticky left-0 bg-[#0a0a0a] group-hover:bg-[#111]">
                      <button onClick={() => setSelectedHabit(selectedHabit?.id === habit.id ? null : habit)}
                        className="text-left">
                        <p className="text-[11px] font-mono font-black text-white uppercase truncate max-w-[140px]">{habit.name}</p>
                        {habit.rewardBundle && (
                          <p className="text-[9px] font-mono text-cyan/50 truncate max-w-[140px]">🎯 {habit.rewardBundle}</p>
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Flame size={10} className={streak > 0 ? 'text-orange-500' : 'text-text-s opacity-20'} />
                        <span className="text-[10px] font-mono font-black text-warning">{streak}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="text-[10px]">{shields > 0 ? '🛡' : '·'}</span>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const done = isCompleted(habit.id, day);
                      const future = isFuture(day);
                      const todayCell = isToday(day);
                      return (
                        <td key={day} className="px-1 py-3 text-center">
                          <button
                            onClick={() => handleCellTap(habit, day)}
                            disabled={future}
                            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all
                              ${future ? 'opacity-10 cursor-not-allowed' :
                                done ? 'bg-success/20 border border-success/40 hover:bg-success/30' :
                                todayCell ? 'border border-cyan/30 hover:bg-cyan/10' :
                                'border border-white/5 hover:border-white/20 hover:bg-white/5'
                              }`}
                          >
                            {done && <span className="text-[10px] text-success font-black">✓</span>}
                            {!done && todayCell && <span className="text-[8px] text-cyan/40">·</span>}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-3">
                      <button onClick={() => onDeleteHabit(habit.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-text-s hover:text-danger transition-all">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Habit detail popup */}
      {selectedHabit && (
        <div className="glass border border-white/10 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono font-black text-white uppercase">{selectedHabit.name}</p>
            <button onClick={() => setSelectedHabit(null)} className="text-text-s hover:text-white text-xs">✕</button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[9px] font-mono text-text-s uppercase opacity-50">Category</p>
              <p className="text-[11px] font-mono font-black text-white uppercase">{selectedHabit.category}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[9px] font-mono text-text-s uppercase opacity-50">Target</p>
              <p className="text-[11px] font-mono font-black text-warning">{selectedHabit.targetStreak}d</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[9px] font-mono text-text-s uppercase opacity-50">Frequency</p>
              <p className="text-[11px] font-mono font-black text-cyan uppercase">{selectedHabit.frequency}</p>
            </div>
          </div>
          {selectedHabit.rewardBundle && (
            <div className="bg-cyan/5 border border-cyan/20 rounded-xl p-3">
              <p className="text-[9px] font-mono text-cyan uppercase opacity-60">Bundle Reward</p>
              <p className="text-[11px] font-mono text-white">{selectedHabit.rewardBundle}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
