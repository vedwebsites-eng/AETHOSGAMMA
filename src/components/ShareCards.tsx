import React from 'react';
import { User } from 'firebase/auth';
import { UserStats } from '../types';

export const ShareCardWrapper = ({ 
  id, 
  children 
}: { 
  id: string; 
  children: React.ReactNode 
}) => (
  <div
    id={id}
    style={{
      position: 'fixed',
      top: '-9999px',
      left: '-9999px',
      zIndex: -1,
      pointerEvents: 'none',
    }}
  >
    {children}
  </div>
);

export const StreakShareCard = ({ 
  stats, 
  user 
}: { 
  stats: UserStats | null; 
  user: User | null;
}) => {
  const streak = stats?.currentStreak || 0;
  const level = stats?.level || 1;
  const levelTitle = 
    level <= 10 ? 'NOVICE' :
    level <= 25 ? 'APPRENTICE' :
    level <= 50 ? 'JOURNEYMAN' :
    level <= 75 ? 'EXPERT' : 'LEGEND';

  const streakColor = 
    streak >= 365 ? '#FFD700' :
    streak >= 90  ? '#C8651B' :
    streak >= 30  ? '#7f77dd' :
    streak >= 7   ? '#00D9FF' : '#ffffff';

  const streakLabel = 
    streak >= 365 ? 'LEGENDARY STREAK' :
    streak >= 90  ? 'ELITE STREAK' :
    streak >= 30  ? 'RARE STREAK' :
    streak >= 7   ? 'ACTIVE STREAK' : 'STREAK';

  return (
    <div
      id="streak-share-card"
      style={{
        width: '1080px',
        height: '1080px',
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${streakColor}15, transparent 70%)`,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* Grid lines background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Top label */}
      <p style={{
        color: 'rgba(255,255,255,0.3)',
        fontSize: '18px',
        letterSpacing: '0.5em',
        textTransform: 'uppercase',
        marginBottom: '40px',
        position: 'relative',
      }}>
        NEURAL_OPERATING_SYSTEM
      </p>

      {/* Flame emoji */}
      <div style={{
        fontSize: '100px',
        marginBottom: '20px',
        position: 'relative',
        filter: `drop-shadow(0 0 40px ${streakColor})`,
      }}>
        🔥
      </div>

      {/* Big streak number */}
      <div style={{
        fontSize: '220px',
        fontWeight: '900',
        color: streakColor,
        lineHeight: '1',
        position: 'relative',
        textShadow: `0 0 80px ${streakColor}60`,
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
      }}>
        {streak}
      </div>

      {/* DAY STREAK label */}
      <p style={{
        color: 'rgba(255,255,255,0.6)',
        fontSize: '36px',
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
        marginTop: '20px',
        position: 'relative',
      }}>
        DAY {streakLabel}
      </p>

      {/* Divider */}
      <div style={{
        width: '200px',
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${streakColor}, transparent)`,
        margin: '40px 0',
        position: 'relative',
      }} />
      
      {/* Level title */}
      <p style={{
        color: 'rgba(255,255,255,0.8)',
        fontSize: '24px',
        letterSpacing: '0.3em',
        position: 'relative',
      }}>
        {levelTitle} LEVEL {level}
      </p>
    </div>
  );
};
