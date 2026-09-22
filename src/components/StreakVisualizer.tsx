import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { subDays, isSameDay, parseISO } from 'date-fns';

export function StreakVisualizer({ journals, tasks }: { journals: any[], tasks: any[] }) {
  const data = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
    
    return last7Days.map(day => {
      const dayStr = day.toISOString().split('T')[0];
      const journalCount = journals.filter(j => j.createdAt?.startsWith(dayStr)).length;
      const taskCount = tasks.filter(t => t.status === 'completed' && (t.completedAt || '').startsWith(dayStr)).length;
      return {
        day: dayStr,
        engagement: journalCount + taskCount,
      };
    });
  }, [journals, tasks]);

  return (
    <div className="h-16 w-full glass border border-white/5 rounded-xl p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area 
            type="monotone" 
            dataKey="engagement" 
            stroke="#ec4899" 
            fill="#ec4899" 
            fillOpacity={0.2} 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
