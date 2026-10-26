import ReactMarkdown from 'react-markdown';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { auth, signInWithGoogle, loginWithEmail, registerWithEmail, db, handleFirestoreError, OperationType, removeUndefinedFields, setErrorNotifier } from './lib/firebase';
import { onAuthStateChanged, User, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, orderBy, serverTimestamp, addDoc, deleteDoc, getDocFromServer, writeBatch, limit, getDocs, deleteField, limitToLast } from 'firebase/firestore';
import { ChatManager } from './components/ChatManager';
import { analyzeJournalEntry, breakdownBossTask, generateDailyBriefing, generateLifeInsight, analyzeLifeBalance, generateCoachResponse, generateCoachResponseStream, suggestPassword } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Plus, CheckCircle2, Circle, Trophy, Book, Calendar, 
  BarChart3, LogOut, LogIn, HardDrive, Zap, Database,
  Target, Flame, ChevronRight, ArrowLeft, X, Trash2, Edit3, 
  Smile, Frown, Meh, Star, BarChart, Activity, PieChart, Settings,
  Sparkles, Award, Volume2, Bell, TrendingUp, Clock, CalendarDays, Maximize2, Minimize2, Move, LayoutGrid, List,
  Bold, Italic, Underline as UnderlineIcon, ListOrdered, Heading1, Heading2, Link as LinkIcon, Eraser, Type, Palette,
  ShoppingBag, Shield, ShieldCheck, User as UserIcon, Download, Briefcase,
  Music, Youtube, Instagram, Quote, HelpCircle, Command, Terminal, Heart,
  Mail, Lock, Users, Globe, Network, Cpu, Brain, Menu, Sun, Moon, Info,
  RefreshCw, Copy, Play, FileText, SkipBack, SkipForward, Pause, ExternalLink, ChevronDown, Share2, Eye, EyeOff, Mic, Image,
  PanelLeftClose, PanelLeftOpen, ChevronUp,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, isPast, isFuture, parseISO, startOfDay, addHours, addMinutes, differenceInMinutes, isWithinInterval, subDays, startOfYesterday } from 'date-fns';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid, Cell, PieChart as RePieChart, Pie } from 'recharts';
import { cn } from './lib/utils';
import { EmptyState } from './components/EmptyState';
import { AethosFaq } from './components/AethosFaq';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { HowAethosWorks } from './components/HowAethosWorks';
import { WheelOfLifeVisualization } from './components/WheelOfLife';
import { OnboardingModal } from './components/OnboardingModal';
import { DashboardLanding } from './components/DashboardLanding';
import { WOOPView } from './components/WOOPView';
import { GoalsTab } from './components/GoalsTab';
import { HabitSpreadsheet } from './components/HabitSpreadsheet';
import { WOOPPlan } from './types';
import { chronos } from './services/chronos';
import { ChronosClock } from './components/ChronosClock';
import { StreakVisualizer } from './components/StreakVisualizer';
import { SystemCalibrating } from './components/SystemCalibrating';
import { toPng } from 'html-to-image';

// --- ShareCard Utilities and Components ---
const downloadCard = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  try {
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 3, // High resolution export (3x for retina)
      backgroundColor: '#080808',
    });
    const link = document.createElement('a');
    link.download = `${filename}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('SHARE_CARD_EXPORT_FAILED:', err);
  }
};

const ShareCardWrapper = ({ 
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

const StreakShareCard = ({ 
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

      {/* User info */}
      <p style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: '22px',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        position: 'relative',
      }}>
        {user?.displayName?.toUpperCase() || 'OPERATIVE'} · {levelTitle} · LVL {level}
      </p>

      {/* Bottom watermark */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        right: '50px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.15)',
          fontSize: '18px',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
        }}>
          AETHOS
        </p>
      </div>

      {/* Date bottom left */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '50px',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.15)',
          fontSize: '16px',
          letterSpacing: '0.2em',
        }}>
          {new Date().toISOString().split('T')[0]}
        </p>
      </div>

      {/* Corner accents */}
      {[
        { top: '30px', left: '30px', borderTop: `2px solid ${streakColor}40`, borderLeft: `2px solid ${streakColor}40` },
        { top: '30px', right: '30px', borderTop: `2px solid ${streakColor}40`, borderRight: `2px solid ${streakColor}40` },
        { bottom: '30px', left: '30px', borderBottom: `2px solid ${streakColor}40`, borderLeft: `2px solid ${streakColor}40` },
        { bottom: '30px', right: '30px', borderBottom: `2px solid ${streakColor}40`, borderRight: `2px solid ${streakColor}40` },
      ].map((style, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '40px',
          height: '40px',
          ...style,
        }} />
      ))}
    </div>
  );
};

const AchievementShareCard = ({
  achievement,
  stats,
  user,
}: {
  achievement: Achievement | null;
  stats: UserStats | null;
  user: User | null;
}) => {
  if (!achievement) return null;

  const rarityConfig = {
    common: {
      color: '#ffffff',
      glow: 'rgba(255,255,255,0.15)',
      label: 'COMMON',
      border: 'rgba(255,255,255,0.2)',
    },
    uncommon: {
      color: '#00D9FF',
      glow: 'rgba(0,217,255,0.2)',
      label: 'UNCOMMON',
      border: 'rgba(0,217,255,0.3)',
    },
    rare: {
      color: '#7f77dd',
      glow: 'rgba(127,119,221,0.25)',
      label: 'RARE',
      border: 'rgba(127,119,221,0.4)',
    },
    legendary: {
      color: '#FFD700',
      glow: 'rgba(255,215,0,0.25)',
      label: 'LEGENDARY',
      border: 'rgba(255,215,0,0.5)',
    },
  };

  const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;
  const level = stats?.level || 1;
  const totalXP = stats?.experience || 0;

  const categoryEmoji = {
    milestone: '🎯',
    streak: '🔥',
    skill: '⚡',
    hidden: '🌑',
  }[achievement.category] || '🏆';

  return (
    <div
      id="achievement-share-card"
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
      {/* Background radial glow */}
      <div style={{
        position: 'absolute',
        width: '700px',
        height: '700px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${rarity.glow}, transparent 65%)`,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* Subtle grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '54px 54px',
      }} />

      {/* Rarity border ring */}
      <div style={{
        position: 'absolute',
        inset: '20px',
        border: `1px solid ${rarity.border}`,
        borderRadius: '32px',
        pointerEvents: 'none',
      }} />

      {/* Inner content */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
        padding: '0 80px',
        textAlign: 'center',
      }}>

        {/* Rarity badge */}
        <div style={{
          background: `${rarity.color}15`,
          border: `1px solid ${rarity.color}40`,
          borderRadius: '999px',
          padding: '8px 24px',
          marginBottom: '48px',
        }}>
          <p style={{
            color: rarity.color,
            fontSize: '16px',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
          }}>
            {rarity.label} ACHIEVEMENT
          </p>
        </div>

        {/* Category emoji */}
        <div style={{
          fontSize: '80px',
          marginBottom: '32px',
          filter: `drop-shadow(0 0 30px ${rarity.color}80)`,
        }}>
          {categoryEmoji}
        </div>

        {/* ACHIEVEMENT UNLOCKED label */}
        <p style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: '16px',
          letterSpacing: '0.5em',
          textTransform: 'uppercase',
          marginBottom: '24px',
        }}>
          ACHIEVEMENT UNLOCKED
        </p>

        {/* Achievement title — BIG */}
        <h1 style={{
          color: rarity.color,
          fontSize: '72px',
          fontWeight: '900',
          fontStyle: 'italic',
          fontFamily: 'Georgia, serif',
          textTransform: 'uppercase',
          lineHeight: '1',
          marginBottom: '32px',
          textShadow: `0 0 60px ${rarity.color}50`,
          letterSpacing: '-0.02em',
        }}>
          {achievement.title}
        </h1>

        {/* Description */}
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '24px',
          letterSpacing: '0.1em',
          marginBottom: '48px',
          maxWidth: '700px',
          lineHeight: '1.5',
        }}>
          {achievement.description}
        </p>

        {/* XP reward pill */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '999px',
          padding: '12px 32px',
          marginBottom: '64px',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '20px',
            letterSpacing: '0.3em',
          }}>
            +{achievement.xpReward} XP REWARDED
          </p>
        </div>

        {/* Divider */}
        <div style={{
          width: '300px',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${rarity.color}60, transparent)`,
          marginBottom: '40px',
        }} />

        {/* User stats row */}
        <div style={{
          display: 'flex',
          gap: '48px',
          alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '14px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}>OPERATIVE</p>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '20px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>{user?.displayName || 'UNKNOWN'}</p>
          </div>

          <div style={{
            width: '1px',
            height: '40px',
            background: 'rgba(255,255,255,0.1)',
          }} />

          <div style={{ textAlign: 'center' }}>
            <p style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '14px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}>LEVEL</p>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '20px',
              letterSpacing: '0.15em',
            }}>{level}</p>
          </div>

          <div style={{
            width: '1px',
            height: '40px',
            background: 'rgba(255,255,255,0.1)',
          }} />

          <div style={{ textAlign: 'center' }}>
            <p style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '14px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}>TOTAL XP</p>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '20px',
              letterSpacing: '0.15em',
            }}>{totalXP.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Corner accents */}
      {[
        { top: '40px', left: '40px', borderTop: `2px solid ${rarity.color}30`, borderLeft: `2px solid ${rarity.color}30` },
        { top: '40px', right: '40px', borderTop: `2px solid ${rarity.color}30`, borderRight: `2px solid ${rarity.color}30` },
        { bottom: '40px', left: '40px', borderBottom: `2px solid ${rarity.color}30`, borderLeft: `2px solid ${rarity.color}30` },
        { bottom: '40px', right: '40px', borderBottom: `2px solid ${rarity.color}30`, borderRight: `2px solid ${rarity.color}30` },
      ].map((style, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '50px',
          height: '50px',
          ...style,
        }} />
      ))}

      {/* AETHOS watermark */}
      <div style={{
        position: 'absolute',
        bottom: '44px',
        right: '60px',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.12)',
          fontSize: '18px',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
        }}>
          AETHOS
        </p>
      </div>

      {/* Date watermark */}
      <div style={{
        position: 'absolute',
        bottom: '44px',
        left: '60px',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.12)',
          fontSize: '16px',
          letterSpacing: '0.2em',
        }}>
          {new Date().toISOString().split('T')[0]}
        </p>
      </div>
    </div>
  );
};

const WheelOfLifeShareCard = ({
  stats,
  user,
  categories,
}: {
  stats: UserStats | null;
  user: User | null;
  categories: any[];
}) => {
  const values = stats?.lifeSync?.current || {};
  const balanceScore = categories.length > 0
    ? (Object.values(values).reduce((a: number, b: any) => 
        a + (Number(b) || 0), 0) / categories.length).toFixed(1)
    : '0.0';

  const date = new Date().toISOString().split('T')[0];
  const level = stats?.level || 1;

  // SVG radar chart calculations
  const size = 500;
  const center = size / 2;
  const radius = 180;
  const levels = 5;

  const getPoint = (index: number, value: number, total: number, r: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const dist = (value / 10) * r;
    return {
      x: center + dist * Math.cos(angle),
      y: center + dist * Math.sin(angle),
    };
  };

  const getLabelPoint = (index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const dist = radius + 40;
    return {
      x: center + dist * Math.cos(angle),
      y: center + dist * Math.sin(angle),
    };
  };

  const dataPoints = categories.map((cat: any, i: number) => {
    const val = Number(values[cat.id]) || 5;
    return getPoint(i, val, categories.length, radius);
  });

  const polygonPoints = dataPoints
    .map(p => `${p.x},${p.y}`)
    .join(' ');

  const gridPolygons = Array.from({ length: levels }, (_, lvl) => {
    const r = (radius / levels) * (lvl + 1);
    return categories.map((_: any, i: number) => {
      const angle = (Math.PI * 2 * i) / categories.length - Math.PI / 2;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
  });

  return (
    <div
      id="wheel-share-card"
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
        width: '700px',
        height: '700px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(127,119,221,0.12), rgba(46,107,158,0.08), transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* Grid background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '54px 54px',
      }} />

      {/* Outer border */}
      <div style={{
        position: 'absolute',
        inset: '20px',
        border: '1px solid rgba(127,119,221,0.2)',
        borderRadius: '32px',
      }} />

      {/* Header */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        marginBottom: '40px',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.25)',
          fontSize: '14px',
          letterSpacing: '0.6em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          LIFE_SYNC — NEURAL_BALANCE_MAP
        </p>
        <h1 style={{
          color: '#ffffff',
          fontSize: '48px',
          fontWeight: '900',
          fontStyle: 'italic',
          fontFamily: 'Georgia, serif',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          margin: '0',
        }}>
          WHEEL OF LIFE
        </h1>
      </div>

      {/* SVG Radar Chart */}
      <div style={{ position: 'relative' }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Grid polygons */}
          {gridPolygons.map((points, i) => (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}

          {/* Axis lines */}
          {categories.map((_: any, i: number) => {
            const angle = (Math.PI * 2 * i) / categories.length - Math.PI / 2;
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={center + radius * Math.cos(angle)}
                y2={center + radius * Math.sin(angle)}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Data polygon fill */}
          <polygon
            points={polygonPoints}
            fill="rgba(127,119,221,0.15)"
            stroke="#7f77dd"
            strokeWidth="2"
          />

          {/* Data points */}
          {dataPoints.map((point, i) => {
            const cat = categories[i];
            const color = cat?.color || '#7f77dd';
            return (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r="6"
                fill={color}
                stroke="#080808"
                strokeWidth="2"
              />
            );
          })}

          {/* Labels */}
          {categories.map((cat: any, i: number) => {
            const labelPt = getLabelPoint(i, categories.length);
            const value = Number(values[cat.id]) || 5;
            return (
              <g key={i}>
                <text
                  x={labelPt.x}
                  y={labelPt.y - 8}
                  textAnchor="middle"
                  fill={cat.color || '#ffffff'}
                  fontSize="13"
                  fontFamily="monospace"
                  fontWeight="700"
                  letterSpacing="1"
                >
                  {cat.label}
                </text>
                <text
                  x={labelPt.x}
                  y={labelPt.y + 10}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.4)"
                  fontSize="16"
                  fontFamily="Georgia, serif"
                  fontWeight="900"
                  fontStyle="italic"
                >
                  {value}/10
                </text>
              </g>
            );
          })}

          {/* Center dot */}
          <circle
            cx={center}
            cy={center}
            r="4"
            fill="#7f77dd"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Balance score */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '48px',
        marginTop: '32px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: 'rgba(255,255,255,0.2)',
            fontSize: '12px',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            BALANCE_SCORE
          </p>
          <p style={{
            color: '#7f77dd',
            fontSize: '40px',
            fontWeight: '900',
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
            lineHeight: '1',
            textShadow: '0 0 30px rgba(127,119,221,0.5)',
          }}>
            {balanceScore}
            <span style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.3)',
            }}>/10</span>
          </p>
        </div>

        <div style={{
          width: '1px',
          height: '50px',
          background: 'rgba(255,255,255,0.08)',
        }} />

        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: 'rgba(255,255,255,0.2)',
            fontSize: '12px',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            OPERATIVE
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '20px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {user?.displayName || 'UNKNOWN'}
          </p>
        </div>

        <div style={{
          width: '1px',
          height: '50px',
          background: 'rgba(255,255,255,0.08)',
        }} />

        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: 'rgba(255,255,255,0.2)',
            fontSize: '12px',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            LEVEL
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '20px',
            letterSpacing: '0.1em',
          }}>
            {level}
          </p>
        </div>
      </div>

      {/* Corner accents */}
      {[
        { top: '40px', left: '40px', borderTop: '2px solid rgba(127,119,221,0.25)', borderLeft: '2px solid rgba(127,119,221,0.25)' },
        { top: '40px', right: '40px', borderTop: '2px solid rgba(127,119,221,0.25)', borderRight: '2px solid rgba(127,119,221,0.25)' },
        { bottom: '40px', left: '40px', borderBottom: '2px solid rgba(127,119,221,0.25)', borderLeft: '2px solid rgba(127,119,221,0.25)' },
        { bottom: '40px', right: '40px', borderBottom: '2px solid rgba(127,119,221,0.25)', borderRight: '2px solid rgba(127,119,221,0.25)' },
      ].map((style, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '50px',
          height: '50px',
          ...style,
        }} />
      ))}

      {/* AETHOS watermark */}
      <p style={{
        position: 'absolute',
        bottom: '44px',
        right: '60px',
        color: 'rgba(255,255,255,0.1)',
        fontSize: '16px',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
      }}>
        AETHOS
      </p>

      {/* Date */}
      <p style={{
        position: 'absolute',
        bottom: '44px',
        left: '60px',
        color: 'rgba(255,255,255,0.1)',
        fontSize: '14px',
        letterSpacing: '0.2em',
      }}>
        {date}
      </p>
    </div>
  );
};

const HabitHeatmapShareCard = ({
  stats,
  user,
  habits,
  habitLogs,
}: {
  stats: UserStats | null;
  user: User | null;
  habits: Habit[];
  habitLogs: HabitLog[];
}) => {
  const level = stats?.level || 1;
  const streak = stats?.currentStreak || 0;
  const date = new Date().toISOString().split('T')[0];

  // Build 52 weeks x 7 days grid
  const totalDays = 364;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const gridData = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (totalDays - 1 - i));
    const dateStr = d.toISOString().split('T')[0];
    const logsForDay = habitLogs.filter(
      l => l.date === dateStr && l.completed
    );
    return {
      date: dateStr,
      count: logsForDay.length,
    };
  });

  // Total habits completed all time
  const totalCompleted = habitLogs.filter(l => l.completed).length;

  // Best single day
  const bestDay = gridData.reduce(
    (best, day) => day.count > best.count ? day : best,
    { date: '', count: 0 }
  );

  // Active days (days with at least 1 habit)
  const activeDays = gridData.filter(d => d.count > 0).length;

  // Color intensity for each square
  const getColor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.04)';
    if (count === 1) return 'rgba(0,217,255,0.25)';
    if (count === 2) return 'rgba(0,217,255,0.45)';
    if (count === 3) return 'rgba(0,217,255,0.65)';
    if (count >= 4) return 'rgba(0,217,255,0.90)';
    return 'rgba(0,217,255,0.90)';
  };

  const squareSize = 16;
  const gap = 3;
  const weeks = 52;
  const days = 7;

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div
      id="heatmap-share-card"
      style={{
        width: '1920px',
        height: '640px',
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        fontFamily: 'monospace',
        position: 'relative',
        overflow: 'hidden',
        padding: '60px 80px',
      }}
    >
      {/* Background glow — left side */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,217,255,0.06), transparent 70%)',
        top: '50%',
        left: '20%',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* Grid lines */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Border */}
      <div style={{
        position: 'absolute',
        inset: '16px',
        border: '1px solid rgba(0,217,255,0.1)',
        borderRadius: '24px',
        pointerEvents: 'none',
      }} />

      {/* LEFT SECTION — Title + Stats */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '420px',
          flexShrink: 0,
          marginRight: '80px',
          height: '100%',
          paddingTop: '10px',
          paddingBottom: '10px',
          position: 'relative',
        }}>
          {/* Top — label + title */}
          <div>
            <p style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '13px',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              ROUTINE_MATRIX
            </p>
            <h1 style={{
              color: '#ffffff',
              fontSize: '64px',
              fontWeight: '900',
              fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
              textTransform: 'uppercase',
              lineHeight: '0.9',
              margin: '0 0 8px 0',
            }}>
              52 WEEKS
            </h1>
            <h2 style={{
              color: 'rgba(0,217,255,0.7)',
              fontSize: '32px',
              fontWeight: '900',
              fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
              textTransform: 'uppercase',
              margin: '0',
            }}>
              OF DISCIPLINE
            </h2>
          </div>

          {/* Middle — stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}>
            {[
              { label: 'TOTAL_DONE', value: totalCompleted },
              { label: 'ACTIVE_DAYS', value: activeDays },
              { label: 'BEST_STREAK', value: `${streak}d` },
              { label: 'BEST_DAY', value: `${bestDay.count} habits` },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px',
                padding: '14px 16px',
              }}>
                <p style={{
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: '11px',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}>
                  {stat.label}
                </p>
                <p style={{
                  color: 'rgba(0,217,255,0.9)',
                  fontSize: '24px',
                  fontWeight: '900',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom — user info */}
          <div>
            <div style={{
              width: '80px',
              height: '1px',
              background: 'rgba(0,217,255,0.3)',
              marginBottom: '16px',
            }} />
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '18px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}>
              {user?.displayName || 'OPERATIVE'}
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '13px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
            }}>
              LEVEL {level} · {habits.length} ACTIVE HABITS
            </p>
          </div>
        </div>

        {/* RIGHT SECTION — Heatmap */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          position: 'relative',
        }}>
          {/* Month labels row */}
          <div style={{
            display: 'flex',
            gap: `${gap}px`,
            marginBottom: '8px',
            paddingLeft: '24px',
          }}>
            {Array.from({ length: 12 }, (_, i) => {
              const monthDate = new Date(today);
              monthDate.setDate(monthDate.getDate() - (totalDays - 1));
              monthDate.setMonth(monthDate.getMonth() + i);
              return (
                <div key={i} style={{
                  width: `${(weeks / 12) * (squareSize + gap)}px`,
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {monthDate.toLocaleString('default', { month: 'short' }).toUpperCase()}
                </div>
              );
            })}
          </div>

          {/* Grid + day labels */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Day labels */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: `${gap}px`,
              paddingTop: '0px',
            }}>
              {dayLabels.map((label, i) => (
                <div key={i} style={{
                  width: '16px',
                  height: `${squareSize}px`,
                  color: 'rgba(255,255,255,0.15)',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  letterSpacing: '0.1em',
                }}>
                  {i % 2 === 0 ? label : ''}
                </div>
              ))}
            </div>

            {/* Heatmap squares */}
            <div style={{
              display: 'flex',
              gap: `${gap}px`,
            }}>
              {Array.from({ length: weeks }, (_, weekIdx) => (
                <div key={weekIdx} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${gap}px`,
                }}>
                  {Array.from({ length: days }, (_, dayIdx) => {
                    const dataIdx = weekIdx * days + dayIdx;
                    const dayData = gridData[dataIdx];
                    const color = dayData
                      ? getColor(dayData.count)
                      : 'rgba(255,255,255,0.04)';
                    const isToday = dayData?.date === date;

                    return (
                      <div key={`${weekIdx}-${dayIdx}`} style={{
                        width: `${squareSize}px`,
                        height: `${squareSize}px`,
                        borderRadius: '3px',
                        background: color,
                        border: isToday
                          ? '1px solid rgba(0,217,255,0.8)'
                          : '1px solid rgba(255,255,255,0.03)',
                        boxShadow: dayData && dayData.count >= 4
                          ? '0 0 6px rgba(0,217,255,0.4)'
                          : 'none',
                      }} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            paddingLeft: '24px',
          }}>
            <p style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '11px',
              letterSpacing: '0.2em',
              marginRight: '8px',
            }}>
              LESS
            </p>
            {[0, 1, 2, 3, 4].map(count => (
              <div key={count} style={{
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                background: getColor(count),
                border: '1px solid rgba(255,255,255,0.03)',
              }} />
            ))}
            <p style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '11px',
              letterSpacing: '0.2em',
              marginLeft: '8px',
            }}>
              MORE
            </p>
          </div>
        </div>
      </div>

      {/* AETHOS watermark */}
      <p style={{
        position: 'absolute',
        bottom: '36px',
        right: '60px',
        color: 'rgba(255,255,255,0.08)',
        fontSize: '16px',
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
      }}>
        AETHOS
      </p>

      {/* Date */}
      <p style={{
        position: 'absolute',
        bottom: '36px',
        left: '100px',
        color: 'rgba(255,255,255,0.08)',
        fontSize: '14px',
        letterSpacing: '0.2em',
      }}>
        {date}
      </p>
    </div>
  );
};

const ShareModal = ({
  isOpen,
  onClose,
  cardId,
  filename,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  filename: string;
  title: string;
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && cardId) {
      const timer = setTimeout(async () => {
        const element = document.getElementById(cardId);
        if (element) {
          try {
            const dataUrl = await toPng(element, {
              quality: 0.85,
              pixelRatio: 2, // 2x is plenty for modal preview previewing
              backgroundColor: '#080808',
            });
            setPreviewUrl(dataUrl);
          } catch (err) {
            console.error('PREVIEW_GENERATION_FAILED:', err);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPreviewUrl(null);
    }
  }, [isOpen, cardId]);

  const handleDownload = async () => {
    setIsExporting(true);
    await downloadCard(cardId, filename);
    setIsExporting(false);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-sm w-full space-y-6"
      >
        <div>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">
            SHARE_PROTOCOL
          </p>
          <h3 className="text-xl font-serif font-black text-white uppercase italic">
            {title}
          </h3>
        </div>

        {/* Preview of the card (visible version using data URL) */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#080808] aspect-video flex items-center justify-center relative">
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Card Preview" 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/40">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-[10px] font-mono uppercase tracking-widest">GENERATING_PREVIEW...</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="w-full py-4 bg-[#C8651B] hover:bg-[#b55a17] disabled:opacity-50 text-white font-mono font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                EXPORTING...
              </>
            ) : exported ? (
              '✓ DOWNLOADED'
            ) : (
              <>
                <Download size={16} />
                DOWNLOAD_PNG
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                const text = `Check out my AETHOS stats! 🚀 #AETHOS #SelfImprovement`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="py-3 border border-white/10 hover:border-white/30 text-white/50 hover:text-white font-mono text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              SHARE_X
            </button>
            <button
              onClick={onClose}
              className="py-3 border border-white/10 hover:border-white/30 text-white/50 hover:text-white font-mono text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              CLOSE
            </button>
          </div>
        </div>

        <p className="text-[8px] font-mono text-white/10 text-center uppercase tracking-widest">
          Cards export at 3x resolution for crisp quality
        </p>
      </motion.div>
    </motion.div>
  );
};

// --- Error Boundary and Safeties ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode; name?: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.name || 'ErrorBoundary'}] crashed:`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-64 gap-4 bg-background-card border border-white/5 p-6 rounded-2xl">
          <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
            MODULE_CRASH_DETECTED [{(this.props.name || '').toUpperCase()}]
          </p>
          <p className="text-[9px] font-mono text-white/20">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-[9px] font-mono text-accent uppercase hover:underline cursor-pointer"
          >
            ATTEMPT_RECOVERY →
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const safeDate = (dateStr: string | undefined | null): Date => {
  if (!dateStr) return new Date();
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
};

// --- Types ---
type AppTab = 'dashboard' | 'dailyWork' | 'reflect' | 'grow' | 'aetherCoach' | 'configOs';

interface NotepadLine {
  id: string;
  text: string;
  createdAt: string;
}

interface Habit {
  id: string;
  userId: string;
  name: string;
  category: 'health' | 'learning' | 'creative' | 'work' | 'personal' | 'routine';
  frequency: string;
  createdAt: string;
  targetStreak: number;
  currentStreak: number;
  lastCompletedDate?: string;
  color: string;
  isArchived: boolean;
  temptationBundle?: string;
  rewardBundle?: string;
}

interface HabitLog {
  id: string;
  userId: string;
  habitId: string;
  date: string;
  completed: boolean;
  timestamp: string;
  xpAwarded?: boolean;
  uncompletedAt?: string;
}

interface LifeSnapshot {
  id: string;
  userId: string;
  date: string;
  values: Record<string, number>;
  balanceScore: number;
}

interface ActivityEntry {
  id: string;
  type: 'task' | 'journal' | 'achievement' | 'level' | 'timetable';
  label: string;
  xp: number;
  timestamp: string;
  icon?: string;
}

interface TimeBlock {
  id: string;
  userId: string;
  title: string;
  type: 'task' | 'event' | 'break' | 'routine';
  startTime: string; // ISO
  endTime: string; // ISO
  color?: string;
  notes?: string;
  taskId?: string; // Link to a task
  completed?: boolean;
  adherenceXP?: number;
}

interface ScheduleTemplate {
  id: string;
  label: string;
  icon: string;
  blocks: {
    title: string;
    type: 'task' | 'event' | 'break' | 'routine';
    startHour: number;
    startMinute: number;
    duration: number; // in minutes
  }[];
}

interface MotivationItem {
  id: string;
  userId: string;
  type: 'music' | 'quote' | 'link' | 'text';
  content: string; 
  title?: string;
  vibe?: string;
  createdAt: string;
}

const TEMPLATES: ScheduleTemplate[] = [
  {
    id: 'nine_to_five',
    label: '9-5 OFFICE',
    icon: '💼',
    blocks: [
      { title: 'Morning Prep', type: 'routine', startHour: 8, startMinute: 0, duration: 60 },
      { title: 'Deep Work Block', type: 'task', startHour: 9, startMinute: 0, duration: 180 },
      { title: 'System Refresh (Lunch)', type: 'break', startHour: 12, startMinute: 0, duration: 60 },
      { title: 'Sync Meetings', type: 'event', startHour: 13, startMinute: 0, duration: 60 },
      { title: 'Project Execution', type: 'task', startHour: 14, startMinute: 0, duration: 180 },
      { title: 'Daily Debrief', type: 'routine', startHour: 17, startMinute: 0, duration: 30 },
    ]
  },
  {
    id: 'student',
    label: 'STUDENT_FLOW',
    icon: '🎓',
    blocks: [
      { title: 'Deep Study I', type: 'task', startHour: 9, startMinute: 0, duration: 120 },
      { title: 'Course Lecture', type: 'event', startHour: 11, startMinute: 0, duration: 90 },
      { title: 'Lunch & Relax', type: 'break', startHour: 12, startMinute: 30, duration: 60 },
      { title: 'Study Session II', type: 'task', startHour: 13, startMinute: 30, duration: 150 },
      { title: 'Gym/Active Sync', type: 'routine', startHour: 16, startMinute: 0, duration: 60 },
      { title: 'Assignment Prep', type: 'task', startHour: 19, startMinute: 0, duration: 120 },
    ]
  },
  {
    id: 'freelancer',
    label: 'FREELANCER_NODE',
    icon: '⚡',
    blocks: [
      { title: 'Client Comms', type: 'event', startHour: 10, startMinute: 0, duration: 60 },
      { title: 'Primary Project', type: 'task', startHour: 11, startMinute: 0, duration: 240 },
      { title: 'Quick Fuel', type: 'break', startHour: 15, startMinute: 0, duration: 30 },
      { title: 'Admin & Billing', type: 'routine', startHour: 15, startMinute: 30, duration: 60 },
      { title: 'Professional Dev', type: 'task', startHour: 16, startMinute: 30, duration: 120 },
    ]
  }
];

interface AppSettings {
  difficultyMultiplier: number;
  goalTargets: {
    weeklyTasks: number;
    weeklyJournals: number;
    dailyLogin: number;
  };
  ui: {
    showXpPopups: boolean;
    showAchievements: boolean;
    soundVolume: number;
    microphoneSensitivity: number;
    animations: 'full' | 'reduced' | 'none';
  };
  display: {
    theme: string;
    language: string;
    timeFormat: '12h' | '24h';
  };
  notifications: {
    taskReminders: boolean;
    achievementNotifs: boolean;
    streakReminders: boolean;
  };
  aiRoutine?: string[];
  onboardingComplete?: boolean;
  lifeSyncCategories?: any[];
  includeAIInDailyCheckin?: boolean;
  lastAICheckinDate?: string;
  coreValues?: string[];
}

interface WeeklyReview {
  id: string;
  userId: string;
  wentWell: string;
  didntGo: string;
  avoided: string;
  valueAlignment: string;
  nextWeekFocus: string;
  week: string;
  createdAt: string;
}

interface UserStats {
  userId: string;
  level: number;
  experience: number;
  unlockedFeatures: string[];
  totalTasksCompleted: number;
  currentStreak: number;
  lastActiveDate: string;
  difficultyLevel: 'easy' | 'normal' | 'hard';
  unlockedAchievements: string[];
  unlockedItems: string[];
  activityLog?: ActivityEntry[];
  totalWordsWritten?: number;
  dailyWordsWritten?: { count: number; date: string };
  peakSyncTime?: string;
  streakHistory?: string[];
  journalStreak?: number;
  lastJournalDate?: string;
  reflectionPromptsAnswered?: number;
  adherenceHistory?: Record<string, number>;
  scheduleMasteryLevel?: number;
  scheduledTasksCount?: number;
  punctualStreak?: number;
  pomodoroSessions?: number;
  pomodoroToday?: number;
  streakShields?: number;
  dailyChallenge?: {
    id: string;
    progress: number;
    goal: number;
    completed: boolean;
    lastGenerated: string;
  };
  dailyBriefing?: {
    content: string;
    lastGenerated: string;
  };
  lifeSync?: {
    current: Record<string, number>;
    lastSaved?: string;
    syncMode?: 'manual' | 'ai';
  };
  lifeSyncCategories?: any[];
}

interface DailyChallengeTemplate {
  id: string;
  label: string;
  goal: number;
  xpReward: number;
  type: 'tasks' | 'words' | 'timetable' | 'streak' | 'perfect_day';
}

const DAILY_CHALLENGES: DailyChallengeTemplate[] = [
  { id: 'tasks_5', label: 'COMPLETE_5_TASKS', goal: 5, xpReward: 150, type: 'tasks' },
  { id: 'words_500', label: 'JOURNAL_500_WORDS', goal: 500, xpReward: 100, type: 'words' },
  { id: 'timetable_4', label: 'FOLLOW_TIMETABLE_4X', goal: 4, xpReward: 75, type: 'timetable' },
  { id: 'streak_keep', label: 'MAINTAIN_STREAK', goal: 1, xpReward: 50, type: 'streak' },
  { id: 'perfect_day', label: 'PERFECT_DAY_100', goal: 1, xpReward: 200, type: 'perfect_day' },
];

const LIFE_CATEGORIES = [
  { id: 'GYM', label: 'GYM', color: '#ef4444' }, 
  { id: 'DIET', label: 'DIET', color: '#f97316' }, 
  { id: 'LOVE', label: 'LOVE', color: '#ec4899' }, 
  { id: 'STUDIES', label: 'STUDIES', color: '#6366f1' }, 
  { id: 'FINANCE', label: 'FINANCE', color: '#22c55e' }, 
  { id: 'SLEEP', label: 'SLEEP', color: '#3b82f6' }, 
  { id: 'SOCIAL', label: 'SOCIAL', color: '#f59e0b' }, 
  { id: 'MENTAL_HEALTH', label: 'MENTAL HEALTH', color: '#14b8a6' }, 
];

const RadarChart = React.memo(function RadarChart({ values, categories = LIFE_CATEGORIES }: { values: Record<string, number>; categories?: any[] }) {
  const size = 800;
  const center = size / 2;
  const radius = (size / 2) * 0.75;
  const levels = 5;

  const points = useMemo(() => {
    return categories.map((cat, i) => {
      const angle = (Math.PI * 2 * i) / categories.length - Math.PI / 2;
      const rawVal = values[cat.id];
      const value = (typeof rawVal === 'number' && !isNaN(rawVal)) ? rawVal : 5;
      const r = (value / 10) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        angle
      };
    });
  }, [categories, values, radius, center]);

  const polygonPath = useMemo(() => points.map(p => `${p.x},${p.y}`).join(' '), [points]);

  return (
    <div className="w-full aspect-square relative flex items-center justify-center p-2">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
        {/* Grid lines (Octagon rings) */}
        {[...Array(levels)].map((_, i) => {
          const r = ((i + 1) / levels) * radius;
          const gridPoints = categories.map((_, j) => {
            const angle = (Math.PI * 2 * j) / categories.length - Math.PI / 2;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
          return (
            <polygon 
              key={`radar-ring-${i}`} 
              points={gridPoints} 
              fill="none" 
              stroke="currentColor" 
              className="text-white/5" 
              strokeWidth="1" 
            />
          );
        })}

        {/* Axes */}
        {categories.map((cat, i) => {
          const angle = (Math.PI * 2 * i) / categories.length - Math.PI / 2;
          return (
            <line
              key={`radar-axis-${cat.id || i}-${i}`}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="currentColor"
              className="text-white/5"
              strokeWidth="1"
            />
          );
        })}

        {/* Filled polygon */}
        <motion.polygon
          animate={{ points: polygonPath }}
          transition={{ duration: 0.5, ease: "circOut" }}
          fill="rgba(99, 102, 241, 0.3)" // indigo-500 semi-transparent
          stroke="#6366f1"
          strokeWidth="2"
        />

        {/* Labels and Color Dots */}
        {categories.map((cat, i) => {
          const angle = (Math.PI * 2 * i) / categories.length - Math.PI / 2;
          const labelDist = radius + 25;
          const x = center + labelDist * Math.cos(angle);
          const y = center + labelDist * Math.sin(angle);
          
          const rawVal = values[cat.id];
          const value = (typeof rawVal === 'number' && !isNaN(rawVal)) ? rawVal : 10;
          const rVal = (value / 10) * radius;
          const valX = center + rVal * Math.cos(angle);
          const valY = center + rVal * Math.sin(angle);
          
          return (
            <g key={`radar-group-${cat.id || i}-${i}`}>
              <circle 
                cx={center + radius * Math.cos(angle)} 
                cy={center + radius * Math.sin(angle)} 
                r="3" 
                fill={cat.color} 
                opacity="0.4"
              />
              {/* Actual value indicator dot on the radar web */}
              <circle 
                cx={valX} 
                cy={valY} 
                r="3.5" 
                fill={cat.color} 
                stroke="#111"
                strokeWidth="1"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] font-mono font-black uppercase tracking-widest text-glow-small"
                fill={cat.color}
              >
                {cat.label} ({value})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', 
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'
];

function LifeSyncView({ stats, user, onAddXP, tasks, journals, addToTerminal, openShare, lifeSyncCategories }: { stats: UserStats | null, user: User, onAddXP: any, tasks: Task[], journals: JournalEntry[], addToTerminal: any, openShare?: any, lifeSyncCategories?: any[] }) {
  const categories = lifeSyncCategories || stats?.lifeSyncCategories || LIFE_CATEGORIES;
  
  const [syncMode, setSyncMode] = useState<'manual' | 'ai'>(stats?.lifeSync?.syncMode || 'manual');
  const [values, setValues] = useState<Record<string, number>>(
    stats?.lifeSync?.current || {
      GYM: 10, DIET: 10, LOVE: 4, STUDIES: 10, FINANCE: 10, SLEEP: 10, SOCIAL: 10, MENTAL_HEALTH: 10
    }
  );
  const [history, setHistory] = useState<LifeSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<LifeSnapshot | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSyncingAI, setIsSyncingAI] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dynamic sphere management states
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingCategories, setEditingCategories] = useState<any[]>(categories);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [activeColorUserId, setActiveColorUserId] = useState<string | null>(null);

  useEffect(() => {
    setEditingCategories(categories);
  }, [stats?.lifeSyncCategories]);

  const saveCategories = async (updatedList: any[], valuesOverride?: Record<string, number>) => {
    try {
      const currentValues: Record<string, number> = {};
      const activeVals = valuesOverride || values;
      updatedList.forEach(cl => {
        currentValues[cl.id] = activeVals[cl.id] !== undefined ? activeVals[cl.id] : 5;
      });
      await updateDoc(doc(db, 'user_stats', user.uid), {
        lifeSyncCategories: updatedList,
        'lifeSync.current': currentValues
      });
      setValues(currentValues);
      addToTerminal?.("LIFE_SYNC: SPHERE_CONFIGURATION_UPDATED", "success");
    } catch (err) {
      console.error(err);
      addToTerminal?.("LIFE_SYNC: CONFIG_SAVE_FAILED", "error");
    }
  };

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'life_snapshots'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(12)
      );
      return onSnapshot(q, (snapshot) => {
        if (!snapshot) return;
        if (snapshot.empty) {
          setHistory([]);
          return;
        }
        setHistory(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LifeSnapshot)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'life_snapshots'));
    }
  }, [user]);

  const isViewingHistory = selectedSnapshot !== null;
  const displayedValues = isViewingHistory ? selectedSnapshot.values : values;

  const activeValues = categories.map(cat => displayedValues[cat.id] ?? 10);
  const balanceScore = Number((activeValues.reduce((a, b) => a + b, 0) / (categories.length || 1)).toFixed(1));
  
  const sortedCategories = [...categories].sort((a, b) => (displayedValues[a.id] ?? 10) - (displayedValues[b.id] ?? 10));
  const needsFocus = sortedCategories[0] || { id: 'NONE', label: 'NONE', color: '#888888' };
  const strongest = sortedCategories[sortedCategories.length - 1] || { id: 'NONE', label: 'NONE', color: '#888888' };

  const handleSliderChange = (id: string, val: number) => {
    if (syncMode === 'ai') return; // Prevent manual change in AI mode
    setValues(prev => ({ ...prev, [id]: val }));
  };

  const saveSnapshot = async () => {
    setIsSaving(true);
    try {
      const today = chronos.getLocalDateKey();
      await addDoc(collection(db, 'life_snapshots'), {
        userId: user.uid,
        date: today,
        values,
        balanceScore,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'user_stats', user.uid), {
        'lifeSync.current': values,
        'lifeSync.lastSaved': today,
        'lifeSync.syncMode': syncMode
      });
      onAddXP(38, 'LIFE_SYNC_LOG');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ec4899', '#22c55e']
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiSync = async () => {
    setIsSyncingAI(true);
    try {
      const aiValues = await analyzeLifeBalance(tasks, journals, stats);
      setValues(aiValues);
      addToTerminal("LIFE_SYNC_AI: RECALIBRATION_COMPLETE", "success");
    } catch (e) {
      console.error(e);
      addToTerminal("LIFE_SYNC_AI: SYNC_FAILED", "error");
    } finally {
      setIsSyncingAI(false);
    }
  };

  const getAiPlan = async () => {
    setIsAiLoading(true);
    try {
      const plan = await generateLifeInsight(needsFocus.label, values);
      setAiInsight(plan);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const alreadySavedToday = stats?.lifeSync?.lastSaved === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
            <h1 className="text-4xl font-serif font-black text-text-p uppercase tracking-[0.1em] italic text-glow-white">LIFE_SYNC</h1>
            <p className="text-[10px] font-mono text-text-m uppercase tracking-[0.5em] opacity-40">Holistic_State_Alignment // Reality_Interface</p>
        </div>
        
        {/* Sync Mode Selector */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start md:self-center">
          <button 
            onClick={() => setSyncMode('manual')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all",
              syncMode === 'manual' ? "bg-white/10 text-text-p shadow-xl" : "text-text-m opacity-50 hover:opacity-100"
            )}
          >
            MANUAL_SETTING
          </button>
          <button 
            onClick={() => setSyncMode('ai')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all flex items-center gap-2",
              syncMode === 'ai' ? "bg-indigo-500/20 text-indigo-400 shadow-xl" : "text-text-m opacity-50 hover:opacity-100"
            )}
          >
            <Sparkles size={12} className={syncMode === 'ai' ? "animate-pulse" : ""} />
            AI_GENERATED
          </button>
        </div>
      </div>

      {/* Hero: Wheel of Life */}
      <div className="flex flex-col items-center justify-center p-12 glass rounded-[3rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 via-transparent to-accent/5">
         <div className="w-full h-full">
           <RadarChart values={displayedValues} categories={categories} />
         </div>
      </div>
      <button 
        onClick={() => setIsHistoryOpen(true)}
        className="w-full py-4 bg-white/5 hover:bg-white/10 text-text-m font-mono text-xs font-black uppercase tracking-widest border border-white/5 rounded-xl transition-all"
      >
        VIEW_HISTORY
      </button>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass p-8 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] font-mono font-black text-text-m uppercase tracking-widest mb-3">BALANCE_SCORE</p>
          <div className="text-5xl font-serif font-black text-indigo-400 italic">{balanceScore}</div>
        </div>
        <div className="glass p-8 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] font-mono font-black text-text-m uppercase tracking-widest mb-3">NEEDS_FOCUS</p>
          <div className="text-2xl font-serif font-black uppercase italic" style={{ color: needsFocus.color }}>{needsFocus.label}</div>
        </div>
        <div className="glass p-8 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] font-mono font-black text-text-m uppercase tracking-widest mb-3">STRONGEST_NODE</p>
          <div className="text-2xl font-serif font-black uppercase italic" style={{ color: strongest.color }}>{strongest.label}</div>
        </div>
      </div>

      {/* Categories Sliders */}
      <div className="glass p-12 rounded-[2rem] border border-white/5 space-y-10">
        <h3 className="text-lg font-serif font-black text-text-p uppercase tracking-widest italic">LIFE_CATEGORIES</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
            {categories.map((cat, i) => (
              <div key={`slider-cat-${cat.id || i}-${i}`} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-mono font-black uppercase tracking-widest text-text-p">{cat.label}</span>
                  </div>
                  <span className="text-xl font-mono font-black" style={{ color: cat.color }}>{displayedValues[cat.id] ?? 10}</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={displayedValues[cat.id] ?? 10}
                  onChange={(e) => handleSliderChange(cat.id, parseFloat(e.target.value))}
                  disabled={syncMode === 'ai' || isViewingHistory}
                  className={cn(
                    "w-full h-3 bg-white/5 rounded-full appearance-none accent-indigo-500 transition-all",
                    (syncMode === 'manual' && !isViewingHistory) ? "cursor-pointer" : "cursor-not-allowed opacity-30"
                  )}
                  style={{
                    accentColor: cat.color
                  }}
                />
              </div>
            ))}
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="glass p-12 rounded-[2rem] border border-indigo-500/20 bg-indigo-500/5 space-y-6">
        <div className="flex items-center gap-3">
            <Brain size={24} className="text-indigo-400" />
            <h3 className="text-lg font-serif font-black text-indigo-400 uppercase tracking-widest italic">NEURAL_MOTIVATION_INSIGHT</h3>
        </div>
        {aiInsight ? (
            <p className="text-xl font-serif italic text-text-p leading-relaxed">"{aiInsight}"</p>
        ) : (
            <p className="text-text-m font-mono">No analysis available. Click "Get AI Plan" below to recalibrate your neural focus.</p>
        )}
      </div>

      {/* Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <button 
          onClick={saveSnapshot}
          disabled={isSaving || alreadySavedToday || isViewingHistory}
          className={cn(
            "w-full py-5 rounded-2xl border font-mono text-xs font-black uppercase tracking-widest transition-all",
            (alreadySavedToday || isViewingHistory)
              ? "border-white/5 text-text-m opacity-50 cursor-not-allowed" 
              : "border-white/20 text-text-p hover:bg-white/5 hover:border-white/40 active:scale-95"
          )}
        >
          {isSaving ? "SYNCING..." : isViewingHistory ? "HISTORICAL_VIEW_MODE" : alreadySavedToday ? "LOGGED_FOR_TODAY" : "SAVE_TODAY_SNAPSHOT"}
        </button>
        <button
          onClick={() => openShare?.(
            'wheel-share-card',
            `AETHOS_WHEEL_${new Date().toISOString().split('T')[0]}`,
            'WHEEL OF LIFE CARD'
          )}
          className="flex items-center justify-center gap-2 px-4 py-5 rounded-2xl border border-white/10 hover:border-[#7f77dd]/50 hover:bg-[#7f77dd]/10 transition-all group cursor-pointer active:scale-95"
        >
          <Share2 size={16} className="text-white/30 group-hover:text-[#7f77dd]" />
          <span className="text-[10px] font-mono text-white/30 group-hover:text-[#7f77dd] uppercase tracking-widest font-black">
            SHARE_BALANCE
          </span>
        </button>
        <button 
          onClick={getAiPlan}
          className="w-full py-5 rounded-2xl border border-indigo-500/30 text-indigo-400 font-mono text-xs font-black uppercase tracking-widest hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          {isAiLoading ? "ANALYZING..." : (
            <>GET AI IMPROVEMENT PLAN <Maximize2 size={12} /></>
          )}
        </button>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="flex items-center justify-center gap-2 px-4 py-5 rounded-2xl border border-white/10 hover:border-cyan/50 hover:bg-cyan/10 transition-all group cursor-pointer active:scale-95"
        >
          <Settings size={16} className={cn("text-white/30 group-hover:text-cyan", isConfigOpen ? "animate-spin" : "")} />
          <span className="text-[10px] font-mono text-white/30 group-hover:text-cyan uppercase tracking-widest font-black">
            CUSTOMIZE_SPHERES
          </span>
        </button>
      </div>

      <AnimatePresence>
        {aiInsight && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="glass max-w-2xl w-full p-8 lg:p-12 rounded-3xl border border-indigo-500/30 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setAiInsight(null)} className="text-text-m hover:text-text-p transition-colors">
                   <X size={20} />
                 </button>
               </div>
               <div className="flex items-center gap-3 mb-6">
                 <Brain className="text-indigo-400" />
                 <span className="text-xs font-mono font-black text-indigo-400 uppercase tracking-widest">AETHOS // IMPROVEMENT_PROTOCOL</span>
               </div>
               <div className="space-y-4">
                 <div className="p-6 bg-white/5 rounded-xl border border-white/10 italic text-lg leading-relaxed font-serif text-text-p">
                   "{aiInsight}"
                 </div>
                 <button 
                   onClick={() => setAiInsight(null)}
                   className="w-full py-4 bg-indigo-500 text-white rounded-xl font-mono text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                 >
                   ACKNOWLEDGE_PROTOCOL
                 </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="glass max-w-2xl w-full p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-xl font-serif font-black text-text-p uppercase tracking-widest italic">HISTORY</h3>
              <div className="max-h-[400px] overflow-y-auto space-y-4">
                {history.map((snapshot, idx) => (
                  <div key={snapshot.id || `${snapshot.date}-${idx}`} className="p-4 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center">
                    <span className="font-mono text-text-m">{snapshot.date}</span>
                    <button onClick={() => {
                        setSelectedSnapshot(snapshot);
                        setIsHistoryOpen(false);
                    }} className="text-indigo-400 hover:text-indigo-300 font-mono text-xs">VIEW</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="w-full py-4 bg-white/10 text-white rounded-xl font-mono text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all">
                CLOSE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="glass max-w-lg w-full p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-xl font-serif font-black text-text-p uppercase tracking-widest italic">CONFIGURE_CATEGORIES</h3>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {editingCategories.map((cat, idx) => (
                  <div key={`category-${idx}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-mono text-text-p">{cat.label}</span>
                    </div>
                    <button onClick={() => setEditingCategories(prev => prev.filter((_, i) => i !== idx))} className="text-text-m hover:text-red-400">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input type="text" value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)} placeholder="NEW_CATEGORY" className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono text-text-p" />
                <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="w-12 h-12 bg-transparent rounded-lg cursor-pointer" />
                <button onClick={() => {
                  if (newCatLabel) {
                    setEditingCategories(prev => [...prev, { id: newCatLabel.toUpperCase().replace(/\s+/g, '_'), label: newCatLabel, color: newCatColor }]);
                    setNewCatLabel('');
                  }
                }} className="px-4 bg-indigo-500 text-white rounded-lg font-mono text-xs font-black">ADD</button>
              </div>

              <button onClick={() => {
                saveCategories(editingCategories);
                setIsConfigOpen(false);
              }} className="w-full py-4 bg-white/10 text-white rounded-xl font-mono text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all">
                SAVE_AND_CLOSE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: React.ReactNode;
  category: 'milestone' | 'streak' | 'skill' | 'hidden';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  requiredValue?: number;
}

const ACHIEVEMENTS: Achievement[] = [
  // 1. Milestone Achievements
  { id: 'first_protocol', title: 'INITIAL_BOOT', description: 'Complete your first task.', xpReward: 50, icon: <Target size={20} />, category: 'milestone', rarity: 'common', requiredValue: 1 },
  { id: 'task_10', title: 'TASK_MASTER_I', description: 'Complete 10 tasks.', xpReward: 100, icon: <Target size={20} />, category: 'milestone', rarity: 'common', requiredValue: 10 },
  { id: 'task_100', title: 'TASK_MASTER_II', description: 'Complete 100 tasks.', xpReward: 500, icon: <Target size={20} />, category: 'milestone', rarity: 'rare', requiredValue: 100 },
  { id: 'task_500', title: 'TASK_MASTER_III', description: 'Complete 500 tasks.', xpReward: 1000, icon: <Target size={20} />, category: 'milestone', rarity: 'legendary', requiredValue: 500 },
  
  // Journaling Milestones
  { id: 'journal_initiator', title: 'JOURNAL_INITIATOR', description: 'Write your first neural log.', xpReward: 50, icon: <Book size={20} />, category: 'milestone', rarity: 'common', requiredValue: 1 },
  { id: 'journal_words_1000', title: 'JOURNAL_WORDS_1K', description: 'Write 1,000 words total.', xpReward: 100, icon: <Book size={20} />, category: 'milestone', rarity: 'uncommon', requiredValue: 1000 },
  { id: 'journal_words_10000', title: 'PROLIFIC_AUTHOR_I', description: 'Write 10,000 words total.', xpReward: 500, icon: <Book size={20} />, category: 'milestone', rarity: 'rare', requiredValue: 10000 },
  { id: 'journal_words_100000', title: 'PROLIFIC_AUTHOR_II', description: 'Write 100,000 words total.', xpReward: 3000, icon: <Book size={20} />, category: 'milestone', rarity: 'legendary', requiredValue: 100000 },
  { id: 'reflection_seeker', title: 'REFLECTION_SEEKER', description: 'Answer 50 reflection prompts.', xpReward: 500, icon: <Sparkles size={20} />, category: 'milestone', rarity: 'rare', requiredValue: 50 },
  { id: 'mood_master', title: 'MOOD_MASTER', description: 'Log mood for 30 consecutive days.', xpReward: 1000, icon: <Activity size={20} />, category: 'streak', rarity: 'legendary', requiredValue: 30 },
  { id: 'midnight_thoughts', title: 'MIDNIGHT_THOUGHTS', description: 'Journal at 3+ AM.', xpReward: 200, icon: <Clock size={20} />, category: 'hidden', rarity: 'rare', requiredValue: 1 },
  { id: 'word_wizard', title: 'WORD_WIZARD', description: 'Write 1,000 words in a single entry.', xpReward: 500, icon: <Zap size={20} />, category: 'skill', rarity: 'rare', requiredValue: 1 },
  
  { id: 'level_10', title: 'NODE_ASCENSION_I', description: 'Reach Level 10.', xpReward: 200, icon: <Star size={20} />, category: 'milestone', rarity: 'uncommon', requiredValue: 10 },
  { id: 'level_50', title: 'NODE_ASCENSION_II', description: 'Reach Level 50.', xpReward: 1000, icon: <Star size={20} />, category: 'milestone', rarity: 'rare', requiredValue: 50 },
  { id: 'level_100', title: 'NODE_ASCENSION_III', description: 'Reach Level 100.', xpReward: 5000, icon: <Star size={20} />, category: 'milestone', rarity: 'legendary', requiredValue: 100 },

  // 2. Streak Achievements
  { id: 'streak_3', title: 'CONSISTENCY_V1', description: 'Maintain a 3-day activity streak.', xpReward: 100, icon: <Flame size={20} />, category: 'streak', rarity: 'common', requiredValue: 3 },
  { id: 'streak_7', title: 'UPTIME_7D', description: 'Maintain a 7-day activity streak.', xpReward: 250, icon: <Flame size={20} />, category: 'streak', rarity: 'uncommon', requiredValue: 7 },
  { id: 'streak_14', title: 'UPTIME_14D', description: 'Maintain a 14-day activity streak.', xpReward: 500, icon: <Flame size={24} />, category: 'streak', rarity: 'uncommon', requiredValue: 14 },
  { id: 'streak_30', title: 'UPTIME_30D', description: 'Maintain a 30-day activity streak.', xpReward: 1000, icon: <Flame size={20} />, category: 'streak', rarity: 'rare', requiredValue: 30 },
  { id: 'streak_60', title: 'UPTIME_60D', description: 'Maintain a 60-day activity streak.', xpReward: 2000, icon: <Flame size={24} />, category: 'streak', rarity: 'rare', requiredValue: 60 },
  { id: 'streak_90', title: 'UPTIME_90D', description: 'Maintain a 90-day activity streak.', xpReward: 3000, icon: <Flame size={28} />, category: 'streak', rarity: 'legendary', requiredValue: 90 },
  { id: 'streak_365', title: 'UPTIME_YEAR', description: 'Maintain a 365-day activity streak.', xpReward: 10000, icon: <Flame size={32} />, category: 'streak', rarity: 'legendary', requiredValue: 365 },

  // 3. Skill Achievements
  { id: 'early_bird', title: 'DAWN_OPERATOR', description: 'Complete tasks before 8 AM.', xpReward: 150, icon: <Zap size={20} />, category: 'skill', rarity: 'uncommon', requiredValue: 1 },
  { id: 'night_owl', title: 'NIGHT_OPERATOR', description: 'Complete tasks after 10 PM.', xpReward: 150, icon: <Zap size={20} />, category: 'skill', rarity: 'uncommon', requiredValue: 1 },
  { id: 'speed_demon', title: 'SPEED_DEMON', description: 'Complete a task in 50% of estimated time.', xpReward: 200, icon: <Zap size={20} />, category: 'skill', rarity: 'rare', requiredValue: 1 },
  { id: 'time_master', title: 'TIME_MASTER', description: 'Complete 100 scheduled tasks on time.', xpReward: 500, icon: <Calendar size={20} />, category: 'skill', rarity: 'rare', requiredValue: 100 },

  // 4. Hidden/Surprise
  { id: 'first_fail', title: 'RECOVERY_INITIATED', description: 'Miss a task but complete it the next day.', xpReward: 100, icon: <Zap size={20} />, category: 'hidden', rarity: 'uncommon', requiredValue: 1 },
  { id: 'mood_swing', title: 'EMOTIONAL_DENSITY', description: 'Log mood 5 times in one day.', xpReward: 200, icon: <Smile size={20} />, category: 'hidden', rarity: 'rare', requiredValue: 5 },
  { id: 'creature_of_habit', title: 'CREATURE_OF_HABIT', description: 'Maintain a 7-day streak for any habit.', xpReward: 50, icon: <Flame size={20} />, category: 'streak', rarity: 'uncommon', requiredValue: 7 },
  { id: 'iron_discipline', title: 'IRON_DISCIPLINE', description: 'Maintain a 30-day streak for any habit.', xpReward: 250, icon: <Shield size={20} />, category: 'streak', rarity: 'rare', requiredValue: 30 },
  { id: 'perfect_week', title: 'PERFECT_WEEK', description: '100% completion for all habits for 7 days.', xpReward: 500, icon: <Star size={20} />, category: 'skill', rarity: 'rare', requiredValue: 1 },
];

const REFLECTION_PROMPTS = [
  "What are 3 wins you achieved today?",
  "How did you push past your comfort zone today?",
  "What is one thing you're grateful for right now?",
  "What was the most challenging technical problem you faced today?",
  "How did your environment affect your productivity today?",
  "What is one thing you learned that changed your perspective?",
  "If you could optimize one habit, what would it be?",
  "What are you most grateful for in your current 'build'?",
  "Describe a moment where you felt in 'flow' today.",
  "Which priority shifted the most during your session?",
  "What does 'perfect synchronization' look like to you tomorrow?",
  "How are you managing your mental latency today?",
  "What protocol (habit) are you currently refactoring?",
  "What was the highlight of your day?",
  "What made you smile today?",
  "What's one thing you want to do better tomorrow?",
  "How did you help someone today?",
  "What was a moment of peace you felt?",
  "What's a project you're excited about?",
  "What was the best thing you ate today?",
  "What are you looking forward to this week?",
  "What's a song that matched your mood today?",
  "What's one thing you're proud of?",
  "If you had an extra hour, how would you spend it?",
  "What was a small victory today?",
  "What is a fear you faced or acknowledged?",
  "What's a book or article that inspired you recently?",
  "How did you take care of your body today?",
  "Whom did you have a meaningful conversation with?",
  "What's a goal you want to reach by next month?",
  "What's a hobby you want to spend more time on?",
  "What's a lesson you learned the hard way?",
  "What's a quote that resonates with you right now?",
  "Describe something beautiful you saw today.",
  "How did you stay focused today?",
  "What's a travel destination you're dreaming of?",
  "What's a skill you want to master?",
  "How are you feeling about your current progress?",
  "What's a significant memory from this time last year?",
  "What's something you're letting go of?",
  "How did you express creativity today?",
  "What's a decision you're glad you made?",
  "Describe your ideal morning routine.",
  "What's a challenge you're currently navigating?",
  "What's a thing you often take for granted?",
  "How do you handle stress currently?",
  "What's a piece of advice you'd give your younger self?",
  "What are you most excited to learn next?",
  "What's a person who inspires you and why?",
  "How do you define success at this moment?"
];

const MOTIVATIONAL_MESSAGES = [
  "PROTOCOL_OPTIMIZED. EXCELLENT WORK.",
  "NEURAL_EFFICIENCY_INCREASED.",
  "SYSTEM_COHERENCE_STABILIZED.",
  "DATA_INGESTION_SUCCESSFUL.",
  "COGNITIVE_THROUGHPUT_PEAKED.",
  "OUTSTANDING_PERFORMANCE_DETECTED.",
  "EVOLUTION_IN_PROGRESS.",
  "PHASE_COMPLETE. PROCEED TO NEXT NODE.",
  "STREAK_MAINTAINED. FIRE_EMOJI_DETACHED.",
];

interface XPNotification {
  id: number | string;
  amount: number;
  source: string;
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  duration?: number;
}

interface Task {
  id: string;
  userId: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  category: 'health' | 'learning' | 'creative' | 'work' | 'personal' | 'routine';
  estimate: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard'; // backward compatibility or secondary factor
  customXP?: number;
  isChallenging?: boolean;
  isSpeedRun?: boolean;
  isBoss?: boolean; // IDEA 2
  subTasks?: SubTask[];
  scheduledStart?: string; // ISO
  scheduledEnd?: string; // ISO
  completedAt?: string; // ISO
  adherenceStatus?: 'ontime' | 'late' | 'partial' | 'missed';
  habitId?: string;
  xpAwarded?: boolean;
  expiresAt?: string;
  isExpired?: boolean;
  warnedAt?: string;
}


interface CognitiveSignature {
  emotionalState: string;
  keyTheme: string;
  alignmentScore: number;
  insight: string;
}

interface JournalEntry {
  id: string;
  userId: string;
  content: string; // HTML from TipTap
  mood: 'sad' | 'worried' | 'neutral' | 'happy' | 'ecstatic';
  energyLevel?: 'drained' | 'low' | 'neutral' | 'high' | 'peak';
  tags?: string[];
  createdAt: string;
  wordCount: number;
  promptId?: string;
  isReflection?: boolean;
  promptUsed?: string;
  cognitiveSignature?: CognitiveSignature;
}

interface MotivationItem {
  id: string;
  userId: string;
  type: 'music' | 'quote' | 'link' | 'text';
  content: string; 
  title?: string;
  vibe?: string;
  createdAt: string;
}

const MOODS = [
  { id: 'sad', emoji: '😢', label: 'SAD', color: 'text-blue-400' },
  { id: 'worried', emoji: '😟', label: 'WORRIED', color: 'text-purple-400' },
  { id: 'neutral', emoji: '😐', label: 'NEUTRAL', color: 'text-text-m' },
  { id: 'happy', emoji: '🙂', label: 'HAPPY', color: 'text-cyan' },
  { id: 'ecstatic', emoji: '😄', label: 'ECSTATIC', color: 'text-success' },
] as const;

const MOOD_TAGS = ['stressed', 'anxious', 'energetic', 'calm', 'productive', 'creative', 'grateful'];

// --- Constants ---
const XP_MAP = {
  PRIORITY: { low: 25, medium: 50, high: 75, critical: 100 },
  CATEGORY: { 
    health: 1.2, 
    learning: 1.1, 
    creative: 1.15, 
    work: 1.0, 
    personal: 0.9, 
    routine: 0.7 
  },
  ESTIMATE: (mins: number) => {
    if (mins < 15) return 0.5;
    if (mins <= 30) return 1.0;
    if (mins <= 60) return 1.5;
    if (mins <= 120) return 2.0;
    return 2.5;
  },
  CHALLENGING_BONUS: 1.5,
  SPEED_RUN_BONUS: 1.2,
  JOURNAL_BASE: 25,
  JOURNAL_WORD_RATE: 50,
  JOURNAL_MOOD_BONUS: 5,
  JOURNAL_CONSISTENCY_BONUS: 3,
  JOURNAL_PROMPT_BONUS: 13,
  JOURNAL_LONG_FORM_MULT: 1.5,
  STREAK_BONUS_PER_DAY: 5,
  TIMETABLE_CHECKIN: 3,
  SCHEDULE_TASK: 3,
  TIMETABLE_ON_TIME: 5,
  ADHERENCE_80: 38,
  ADHERENCE_100: 75,
  SPEED_BONUS_MULT: 1.25,
  POMODORO_SESSION_COMPLETE: 13,
  FOCUS_CYCLE_MASTER_BONUS: 25
};

const calculateTaskXP = (task: Task, currentStreak: number = 0) => {
  if (task.customXP) return task.customXP;
  
  const base = XP_MAP.PRIORITY[task.priority || 'medium'];
  const timeMult = XP_MAP.ESTIMATE(task.estimate || 30);
  const catMult = XP_MAP.CATEGORY[task.category as keyof typeof XP_MAP.CATEGORY] || 1;
  const challengeMult = task.isChallenging ? XP_MAP.CHALLENGING_BONUS : 1;
  const speedMult = task.isSpeedRun ? XP_MAP.SPEED_RUN_BONUS : 1;
  const bossMult = task.isBoss ? 5 : 1;
  const streakBonus = currentStreak * XP_MAP.STREAK_BONUS_PER_DAY;

  return Math.round((base * timeMult * catMult * challengeMult * speedMult * bossMult) + streakBonus);
};

const MULTIPLIERS = {
  easy: 0.5,
  normal: 1,
  hard: 2
};

// Daily XP Caps (prevents grinding abuse)
const DAILY_XP_CAPS = {
  total: 50,        // Changed from 2000 → 50
  tasks: 20,        // Changed from 800 → 20
  habits: 10,       // Changed from 300 → 10
  journal: 10,      // Changed from 250 → 10
  pomodoro: 5,      // Changed from 200 → 5
  bonus: 5,         // Changed from 450 → 5
};

const NEURAL_GRADIENT = "bg-gradient-to-br from-background via-background-nested to-card";

const getXPForLevel = (level: number) => {
  if (level <= 10) return 500;
  if (level <= 25) return 750;
  if (level <= 50) return 1200;
  if (level <= 75) return 1800;
  return 2500;
};

const getLevelFromXP = (xp: number) => {
  let currentXP = xp;
  let level = 1;
  while (currentXP >= getXPForLevel(level)) {
    currentXP -= getXPForLevel(level);
    level++;
    if (level === 100) break;
  }
  const nextLevelXP = getXPForLevel(level);
  const levelProgress = (currentXP / nextLevelXP) * 100;
  return { 
    level, 
    progress: currentXP, 
    totalForLevel: nextLevelXP,
    currentXP, 
    nextLevelXP, 
    levelProgress
  };
};

const getTitleForLevel = (level: number) => {
  if (level <= 10) return 'NOVICE';
  if (level <= 25) return 'APPRENTICE';
  if (level <= 50) return 'JOURNEYMAN';
  if (level <= 75) return 'EXPERT';
  return 'LEGEND';
};

const UNLOCKS = [
  { level: 5, id: 'recurring_tasks', label: 'RECURRING_TASKS_DECRYPTED', description: 'Enable repeating tasks protocols.' },
  { level: 10, id: 'timetable', label: 'TEMPORAL_GRID_SYNC', description: 'Access advanced timetable scheduling.' },
  { level: 15, id: 'advanced_filters', label: 'DATA_FILTER_UPGRADE', description: 'Advanced sorting and filtering logic.' },
  { level: 20, id: 'cosmetics', label: 'VISUAL_INTERFACE_SHOP', description: 'Unlock the cosmetic interface shop.' },
  { level: 30, id: 'analytics', label: 'DEEP_ANALYTICS_DASHBOARD', description: 'Access granular productivity streams.' },
  { level: 50, id: 'insights', label: 'NEURAL_INSIGHT_ENGINE', description: 'In-depth AI-powered pattern recognition.' },
  { level: 75, id: 'premium', label: 'ELITE_PROTOCOL_ACCESS', description: 'Unlock experimental premium features.' },
  { level: 100, id: 'lifetime', label: 'LEGENDARY_CORE_UNLOCKED', description: 'Legacy status. Lifetime exclusive rewards.' },
];

const PREMIUM_BEZIER = [0.16, 1, 0.3, 1] as any;

const initializeNewUser = async (user: User) => {
  try {
    const statsRef = doc(db, 'user_stats', user.uid);
    // Seed global_clock for Chronos if not yet created
    try {
      const { Timestamp: FSTimestamp } = await import('firebase/firestore');
      const clockRef = doc(db, 'system_settings', 'global_clock');
      const clockSnap = await getDoc(clockRef);
      if (!clockSnap.exists()) {
        await setDoc(clockRef, {
          lastResetAt: FSTimestamp.now(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        });
      }
    } catch (e) {
      console.warn('Chronos seed error:', e);
    }
    const statsSnap = await getDoc(statsRef);
    if (statsSnap.exists()) return; // Already a real user, don't touch anything

    // console.log('NEW_USER_DETECTED — Initializing Firestore documents...');

    // Batch write all default docs at once (atomic — all or nothing)
    const batch = writeBatch(db);

    const initialStats: UserStats = {
      userId: user.uid,
      level: 1,
      experience: 0,
      unlockedFeatures: [],
      totalTasksCompleted: 0,
      currentStreak: 0,
      lastActiveDate: new Date().toISOString(),
      difficultyLevel: 'normal',
      unlockedAchievements: [],
      unlockedItems: [],
      totalWordsWritten: 0,
      streakHistory: [],
      journalStreak: 0,
      lastJournalDate: '',
      reflectionPromptsAnswered: 0,
      adherenceHistory: {},
      scheduleMasteryLevel: 0,
      scheduledTasksCount: 0,
      punctualStreak: 0,
      pomodoroSessions: 0,
      pomodoroToday: 0,
      streakShields: 0,
      activityLog: [],
      dailyChallenge: undefined,
      lifeSync: {
        current: {
          GYM: 5, DIET: 5, LOVE: 5,
          STUDIES: 5, FINANCE: 5,
          SLEEP: 5, SOCIAL: 5, MENTAL_HEALTH: 5
        },
        lastSaved: undefined,
        syncMode: 'manual'
      },
      lifeSyncCategories: [
        { id: 'GYM', label: 'GYM', color: '#ef4444' },
        { id: 'DIET', label: 'DIET', color: '#f97316' },
        { id: 'LOVE', label: 'LOVE', color: '#ec4899' },
        { id: 'STUDIES', label: 'STUDIES', color: '#6366f1' },
         { id: 'FINANCE', label: 'FINANCE', color: '#22c55e' },
        { id: 'SLEEP', label: 'SLEEP', color: '#3b82f6' },
        { id: 'SOCIAL', label: 'SOCIAL', color: '#f59e0b' },
        { id: 'MENTAL_HEALTH', label: 'MENTAL HEALTH', color: '#14b8a6' },
      ]
    };

    const defaultSettings: AppSettings = {
      difficultyMultiplier: 1.0,
      goalTargets: { weeklyTasks: 20, weeklyJournals: 5, dailyLogin: 1 },
      ui: { showXpPopups: true, showAchievements: true, soundVolume: 0.5, microphoneSensitivity: 50, animations: 'full' },
      display: { theme: 'cyberpunk', language: 'en', timeFormat: '24h' },
      notifications: { taskReminders: true, achievementNotifs: true, streakReminders: true },
      aiRoutine: ['School', 'Tuition', 'Dinner', 'Gym', 'Meditation'],
      onboardingComplete: false
    };

    const settingsRef = doc(db, 'user_settings', user.uid);
    batch.set(statsRef, initialStats);
    batch.set(settingsRef, defaultSettings);

    await batch.commit();
    // console.log('NEW_USER_INITIALIZED — All documents created successfully.');
  } catch (err) {
    console.error('INIT_ERROR:', err);
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const isFetchingBriefing = useRef(false);
  const briefingAttemptedDate = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChoice, setAuthChoice] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notepadLines, setNotepadLines] = useState<NotepadLine[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  
  const deleteJournalEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'journals', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `journals/${id}`);
    }
  };

  const deleteAllJournals = async () => {
    try {
        const batch = writeBatch(db);
        journals.forEach(j => {
          if (j.id) {
            batch.delete(doc(db, 'journals', j.id));
          }
        });
        await batch.commit();
    } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, 'journals');
    }
  };
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [motivationItems, setMotivationItems] = useState<MotivationItem[]>([]);
  const [pendingMotivation, setPendingMotivation] = useState<MotivationItem | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<'single' | 'playlist' | 'shuffle'>('single');
  const [queue, setQueue] = useState<MotivationItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  // Global Share State
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    cardId: string;
    filename: string;
    title: string;
  } | null>(null);

  const [sharingAchievement, setSharingAchievement] = useState<Achievement | null>(null);

  const [shareCardReady, setShareCardReady] = useState(false);

  const openShare = (cardId: string, filename: string, title: string) => {
    setShareCardReady(true); // Mount cards
    setTimeout(() => {
      // Wait for render then open modal
      setShareModal({ isOpen: true, cardId, filename, title });
    }, 150);
  };

  const closeShare = () => {
    setShareModal(null);
    setTimeout(() => setShareCardReady(false), 500); // Unmount after modal closes
  };

  // Journal stats
  const journalStats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    return {
      dailyWords: journals
        .filter(j => j.createdAt?.startsWith(todayStr))
        .reduce((sum, j) => sum + (j.wordCount || 0), 0),
      weeklyWords: journals
        .filter(j => j.createdAt >= weekStart)
        .reduce((sum, j) => sum + (j.wordCount || 0), 0),
      allTimeWords: journals
        .reduce((sum, j) => sum + (j.wordCount || 0), 0),
      totalEntries: journals.length,
    };
  }, [journals]);

  // Mood chart data
  const moodDataEx = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = journals.find(j => j.createdAt?.startsWith(dateStr));
      return {
        date: format(date, 'EEE'),
        mood: entry ? ({ ecstatic: 5, happy: 4, neutral: 3, worried: 2, sad: 1 }[entry.mood] ?? 0) : 0,
        words: entry?.wordCount || 0,
      };
    });
  }, [journals]);

  // Task stats
  const taskStats = useMemo(() => ({
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status !== 'completed').length,
    todayCompleted: tasks.filter(t =>
      t.status === 'completed' &&
      t.completedAt?.startsWith(format(new Date(), 'yyyy-MM-dd'))
    ).length,
  }), [tasks]);

  // Achievement progress
  const achievementStats = useMemo(() => {
    const earned = ACHIEVEMENTS.filter(a =>
      stats?.unlockedAchievements?.includes(a.id)
    );
    return {
      earned: earned.length,
      total: ACHIEVEMENTS.length,
      percentage: Math.round((earned.length / ACHIEVEMENTS.length) * 100),
    };
  }, [stats?.unlockedAchievements]);

  // Habit completion today
  const todayHabitStats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayLogs = habitLogs.filter(l => l.date === todayStr && l.completed);
    return {
      completedToday: todayLogs.length,
      totalHabits: habits.length,
      percentage: habits.length > 0
        ? Math.round((todayLogs.length / habits.length) * 100) : 0,
    };
  }, [habitLogs, habits]);

  // Extract YouTube video ID from any YouTube URL
  const getYoutubeId = (url: string): string | null => {
    const match = url?.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/
    );
    return match ? match[1] : null;
  };

  // Get YouTube thumbnail
  const getYoutubeThumbnail = (url: string): string | null => {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  };

  // Check if URL is a YouTube link
  const isYoutube = (url: string) =>
    url?.includes('youtube.com') || url?.includes('youtu.be');

  // Check if URL is a Spotify link
  const isSpotify = (url: string) => url?.includes('spotify.com');

  // Build YouTube embed URL with autoplay
  const getYoutubeEmbedUrl = (url: string): string | null => {
    const id = getYoutubeId(url);
    return id
      ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
      : null;
  };

  // Build Spotify embed URL
  const getSpotifyEmbedUrl = (url: string): string => {
    return url
      .replace('spotify.com/', 'spotify.com/embed/')
      .replace('/track/', '/track/')
      .replace('/playlist/', '/playlist/');
  };

  // Play next in queue
  const playNext = () => {
    if (playMode === 'shuffle' && queue.length > 0) {
      const next = Math.floor(Math.random() * queue.length);
      setQueueIndex(next);
      setCurrentlyPlaying(queue[next].id);
    } else if (queueIndex < queue.length - 1) {
      setQueueIndex(prev => prev + 1);
      setCurrentlyPlaying(queue[queueIndex + 1].id);
    } else if (playMode === 'playlist' && queue.length > 0) {
      setQueueIndex(0);
      setCurrentlyPlaying(queue[0].id);
    }
  };

  // Play previous in queue
  const playPrev = () => {
    if (queueIndex > 0) {
      setQueueIndex(prev => prev - 1);
      setCurrentlyPlaying(queue[queueIndex - 1].id);
    }
  };

  // Start playlist from a specific item
  const startPlaylist = (startItem: MotivationItem) => {
    const linkItems = motivationItems.filter(
      i => i.type === 'link' || i.type === 'music'
    );
    setQueue(linkItems);
    const startIdx = linkItems.findIndex(i => i.id === startItem.id);
    setQueueIndex(startIdx >= 0 ? startIdx : 0);
    setCurrentlyPlaying(startItem.id);
    setIsPlaying(true);
  };
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [woopPlans, setWoopPlans] = useState<WOOPPlan[]>([]);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [dailyWorkSubTab, setDailyWorkSubTab] = useState<'goals' | 'habits' | 'timetable' | 'woop' | 'tasks'>('goals');
  const [yearlyGoals, setYearlyGoals] = useState<any[]>([]);
  const [dailyGoals, setDailyGoals] = useState<any[]>([]);
  const [dailyGoalStreak, setDailyGoalStreak] = useState(0);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showAICheckinPrompt, setShowAICheckinPrompt] = useState(false);

  useEffect(() => {
    if (settings && settings.includeAIInDailyCheckin === undefined) {
      setShowAICheckinPrompt(true);
    }
  }, [settings]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'woop'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setWoopPlans(snap.docs.map(d => ({ ...d.data(), id: d.id } as WOOPPlan)));
    });
    return unsubscribe;
  }, [user]);
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'yearly_goals'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      setYearlyGoals(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'daily_goals'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(60)
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ ...(d.data() as any), id: d.id }));
      setDailyGoals(docs);
      let streak = 0;
      let checkDate = new Date();
      while (true) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const today = format(new Date(), 'yyyy-MM-dd');
        if (dateStr === today) {
          checkDate = subDays(checkDate, 1);
          const doc = docs.find((d: any) => d.date === today);
          if (doc?.dayCompleted) streak++;
          continue;
        }
        const doc = docs.find((d: any) => d.date === dateStr);
        if (doc?.dayCompleted) { streak++; checkDate = subDays(checkDate, 1); }
        else break;
      }
      setDailyGoalStreak(streak);
    });
    return unsub;
  }, [user]);

  const [xpNotifications, setXpNotifications] = useState<XPNotification[]>([]);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [celebratingAchievement, setCelebratingAchievement] = useState<Achievement | null>(null);
  const [completeToast, setCompleteToast] = useState<string | null>(null);
  const [flowPrompt, setFlowPrompt] = useState<{ taskId: string; taskTitle: string; category: string; estimate: number } | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isMotivationPortalOpen, setIsMotivationPortalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<{ id: string; msg: string; type: 'info' | 'warn' | 'error' | 'success'; time: string }[]>([]);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const addToTerminal = (msg: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTerminalLogs(prev => [{ id, msg, type, time }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (user) {
      addToTerminal(`SYSTEM_BOOT_SEQUENCE_COMPLETE: NODE_${user.uid.slice(0, 8)} CONNECTED`, 'success');
    }
  }, [user]);

  useEffect(() => {
    const showToast = (msg: string) => {
      setCompleteToast(msg);
      setTimeout(() => setCompleteToast(null), 2000);
    };

    const interval = setInterval(() => {
      tasks.forEach(async (task) => {
        if (task.status === 'completed' || task.isExpired || !task.expiresAt) return;
        
        // Mark as expired when time runs out
        if (chronos.isExpired(new Date(task.expiresAt))) {
          try {
            await updateDoc(doc(db, 'tasks', task.id), {
              isExpired: true,
              status: 'expired',
              expiredAt: new Date().toISOString(),
            });
            // Show toast notification
            showToast(`TASK_EXPIRED: "${task.title.toUpperCase()}" — Protocol failed.`);
            // Deduct XP penalty
            addXP(-5, 'TASK_EXPIRED_PENALTY');
          } catch (err) {
            console.error("Failed to expire task", err);
          }
        }

        const now = new Date();
        const expiresAt = new Date(task.expiresAt);
        const msLeft = expiresAt.getTime() - now.getTime();
        
        // 1 hour warning
        if (msLeft > 0 && msLeft <= 60 * 60 * 1000 && !task.warnedAt) {
          try {
            await updateDoc(doc(db, 'tasks', task.id), {
              warnedAt: now.toISOString(),
            });
            showToast(`⚠️ WARNING: "${task.title.toUpperCase()}" expires in 1 hour!`);
          } catch (err) {
            console.error("Failed to update task warning", err);
          }
        }
      });
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [tasks, user, stats]);

  // Helper For ISO Week Calculation
  const getISOWeekString = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  };

  const lastActiveDays = useMemo(() => {
    if (!stats?.lastActiveDate) return 0;
    const diffTime = Math.abs(new Date().getTime() - new Date(stats.lastActiveDate).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [stats?.lastActiveDate]);

  const handleReactivateProtocol = async () => {
    if (!user || !stats) return;
    try {
      const statsRef = doc(db, 'user_stats', user.uid);
      await updateDoc(statsRef, {
        lastActiveDate: new Date().toISOString(),
      });
      await addXP(25, 'REACTIVATE_PROTOCOL');
      setCompleteToast('System ready');
      setIsMotivationPortalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOnboardingComplete = async (
    displayName: string,
    difficulty: 'easy' | 'normal' | 'hard',
    initialTaskTitle: string,
    wheelTarget: Record<string, number>
  ) => {
    if (!user || !stats || !settings) return;
    try {
      await updateProfile(auth.currentUser!, { displayName });
      const newTaskRef = doc(collection(db, 'tasks'));
      await setDoc(newTaskRef, {
        userId: user.uid,
        title: initialTaskTitle,
        priority: 'medium',
        status: 'pending',
        createdAt: new Date().toISOString(),
        category: 'work',
        estimate: 30,
        subTasks: []
      });

      const statsRef = doc(db, 'user_stats', user.uid);
      await updateDoc(statsRef, {
        'lifeSync.current': wheelTarget,
        'lifeSync.lastSaved': new Date().toISOString().split('T')[0]
      });
      await addXP(25, 'NEURAL_ONBOARDING_SEQUENCE_SUCCESS');

      const settingsRef = doc(db, 'user_settings', user.uid);
      await updateDoc(settingsRef, {
        onboardingComplete: true,
        difficultyMultiplier: difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.2 : 1.0
      });

      setIsOnboardingOpen(false);
      setCompleteToast('Setup complete — welcome to AETHOS');
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Weekly Review Check - Removed


  // Trigger Onboarding Check
  useEffect(() => {
    if (stats && settings) {
      const isNewUser = (stats.totalTasksCompleted === 0) && (!settings.onboardingComplete);
      if (isNewUser) {
        setIsOnboardingOpen(true);
      }
    }
  }, [stats, settings]);

  useEffect(() => {
    if (!user || !stats) return; // Don't run if data not loaded yet
    if (!stats.userId) return;   // Don't run if it's an empty object

    const today = new Date().toISOString().split('T')[0];
    const briefingLastGenerated = stats.dailyBriefing?.lastGenerated;

    if ((!briefingLastGenerated || briefingLastGenerated !== today) && briefingAttemptedDate.current !== today && !isFetchingBriefing.current) {
      const fetchBriefing = async () => {
        isFetchingBriefing.current = true;
        briefingAttemptedDate.current = today;
        try {
          const activeTasks = tasks.filter(t => t.status === 'pending');
          const content = await generateDailyBriefing(stats, activeTasks);
          await updateDoc(doc(db, 'user_stats', user.uid), {
            dailyBriefing: {
              content,
              lastGenerated: today
            }
          });
        } catch (e: any) {
          console.warn("Briefing Generation Failed:", e?.message || String(e));
          // Gracefully fall back to writing a stylish, lore-compliant offline protocol update
          // This stops infinite background retries during high load or quota exhaustion
          try {
            await updateDoc(doc(db, 'user_stats', user.uid), {
              dailyBriefing: {
                content: "AETHOS // LINK_STATUS: OFFLINE\n\nCognitive interface bandwidth currently throttled. Local neural telemetry is operating on offline fallback protocols. Prioritize direct action and stay focused on immediate daily items. Systems will attempt synchronization on next refresh loop.",
                lastGenerated: today
              }
            });
          } catch (fsErr) {
            console.error("Failed to write offline fallback briefing:", fsErr);
          }
        } finally {
          isFetchingBriefing.current = false;
        }
      };
      fetchBriefing();
    }
  }, [user, stats, tasks]);

  // Notepad Sync
  useEffect(() => {
    if (!user) return;
    const notepadRef = doc(db, 'notepad_data', user.uid);
    const unsub = onSnapshot(notepadRef, (snap) => {
      setNotepadLines(snap.exists() ? (snap.data().lines || []) : []);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notepad_data'));
    return () => unsub();
  }, [user]);

  const notepadSaveTimeout = useRef<any>(null);
  const saveNotepadLines = (newLines: NotepadLine[]) => {
    setNotepadLines(newLines); // instant local update
    if (notepadSaveTimeout.current) clearTimeout(notepadSaveTimeout.current);
    notepadSaveTimeout.current = setTimeout(async () => {
      if (!user) return;
      try {
        await setDoc(doc(db, 'notepad_data', user.uid), { lines: newLines, userId: user.uid });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'notepad_data');
      }
    }, 600);
  };

  const convertNotepadLineToTask = async (line: NotepadLine) => {
    if (!user || !line.text.trim()) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        userId: user.uid,
        title: line.text.trim(),
        priority: 'medium',
        status: 'pending',
        category: 'personal',
        estimate: 30,
        difficulty: 'medium',
        isChallenging: false,
        isBoss: false,
        isSpeedRun: false,
        createdAt: new Date().toISOString(),
        expiresAt: chronos.getCycleEnd().toISOString(),
        isExpired: false
      });
      saveNotepadLines(notepadLines.filter(l => l.id !== line.id));
      setCompleteToast('Converted to task');
      setTimeout(() => setCompleteToast(null), 2000);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'tasks');
    }
  };

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
  };

  const addMotivationItem = async (item: Partial<MotivationItem>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'motivation_items'), {
        ...item,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      addXP(5, 'NEURAL_BOOST_CONFIG');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'motivation_items');
    }
  };

  const deleteMotivationItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'motivation_items', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `motivation_items/${id}`);
    }
  };

  const playCompletionSound = () => {
    try {
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio Context not supported or blocked");
    }
  };

  const playLevelUpSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const oscillator2 = audioCtx.createOscillator();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);

      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1); // C#5
      oscillator2.frequency.exponentialRampToValueAtTime(1108.73, audioCtx.currentTime + 0.4);

      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator2.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
      oscillator2.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context blocked");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u && u.email === 'vedantsp127@gmail.com') {
        signOut(auth);
        setUser(null);
        setStats(null);
        setSettings(null);
      } else if (u) {
        try {
          await initializeNewUser(u);
        } catch (err) {
          console.error('INIT_ERROR:', err);
        }
        setUser(u);
      } else {
        setUser(null);
        setStats(null);
        setSettings(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setErrorNotifier((msg: string) => {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 6000);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setSettings(null);
      return;
    }

    const docRef = doc(db, 'user_settings', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) return; // Don't process if doc doesn't exist yet
      const data = docSnap.data();
      if (!data) return;
      setSettings(data as AppSettings);
    }, (err) => handleFirestoreError(err, OperationType.GET, docRef.path));

    return () => unsubscribe();
  }, [user]);

  // Fetch User Stats
  useEffect(() => {
    if (!user) {
      setStats(null);
      return;
    }

    const docRef = doc(db, 'user_stats', user.uid);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) return; // Don't process if doc doesn't exist yet
      const data = docSnap.data();
      if (!data) return;
      setStats(data as UserStats);
    }, (err) => handleFirestoreError(err, OperationType.GET, `user_stats/${user.uid}`));

    return () => unsub();
  }, [user]);

  // Fetch Tasks
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot) return;
      if (snapshot.empty) {
        setTasks([]);
        return;
      }
      const t = (snapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(t);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    return () => unsub();
  }, [user]);

  // Fetch TimeBlocks
  useEffect(() => {
    if (!user) {
      setTimeBlocks([]);
      return;
    }

    const q = query(
      collection(db, 'time_blocks'),
      where('userId', '==', user.uid),
      orderBy('startTime', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot) return;
      if (snapshot.empty) {
        setTimeBlocks([]);
        return;
      }
      const b = (snapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id } as TimeBlock));
      setTimeBlocks(b);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'time_blocks'));

    return () => unsub();
  }, [user]);

  // Fetch Journals
  useEffect(() => {
    if (!user) {
      setJournals([]);
      return;
    }

    const q = query(
      collection(db, 'journals'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot) return;
      if (snapshot.empty) {
        setJournals([]);
        return;
      }
      const j = (snapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id } as JournalEntry));
      setJournals(j);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'journals'));

    // Fetch Motivation Items
    const motivQ = query(
      collection(db, 'motivation_items'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const motivUnsub = onSnapshot(motivQ, (snapshot) => {
      if (!snapshot) return;
      if (snapshot.empty) {
        setMotivationItems([]);
        return;
      }
      setMotivationItems((snapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id } as MotivationItem)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'motivation_items'));

    return () => {
      unsub();
      motivUnsub();
    };
  }, [user]);

  // Fetch Routine Matrix (Habits & Logs)
  useEffect(() => {
    if (!user) {
      setHabits([]);
      setHabitLogs([]);
      return;
    }

    const habitsQ = query(
      collection(db, 'habits'),
      where('userId', '==', user.uid),
      limit(200)
    );
    const unsubHabits = onSnapshot(habitsQ, (snapshot) => {
      if (!snapshot) return;
      if (snapshot.empty) {
        setHabits([]);
        return;
      }
      setHabits((snapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id } as Habit)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'habits'));

    const logsQ = query(
      collection(db, 'habit_logs'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(365) 
    );
    const unsubLogs = onSnapshot(logsQ, (snapshot) => {
      if (!snapshot) return;
      if (snapshot.empty) {
        setHabitLogs([]);
        return;
      }
      setHabitLogs((snapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id } as HabitLog)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'habit_logs'));

    return () => {
      unsubHabits();
      unsubLogs();
    };
  }, [user]);

  // Fetch Weekly Reviews
  const fetchWeeklyReviews = async () => {
    if (!user) return;
    const q = query(
      collection(db, 'weekly_reviews'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    try {
      const snap = await getDocs(q);
      setWeeklyReviews((snap.docs || []).map(doc => ({ ...doc.data(), id: doc.id } as WeeklyReview)));
      if (syncFailed) {
        setSyncFailed(false);
        setCompleteToast('Streak shield used — streak protected 🛡');
      }
    } catch (err: any) {
      console.error('FIRESTORE_FETCH_FAILED: ' + err.message);
      setSyncFailed(true);
      handleFirestoreError(err, OperationType.LIST, 'weekly_reviews');
    }
  };

  useEffect(() => {
    fetchWeeklyReviews();
  }, [user]);

  // Daily Sync (Streaks & Challenges)
  useEffect(() => {
    if (!user || !stats) return;
    if (!stats.userId) return;

    const syncDaily = async () => {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const lastActive = stats.lastActiveDate ? stats.lastActiveDate.split('T')[0] : '';
        
        if (!lastActive) {
          const statsRef = doc(db, 'user_stats', user.uid);
          await updateDoc(statsRef, {
            lastActiveDate: now.toISOString(),
          });
          return;
        }

        if (lastActive === today) return; // Already synced today

        let shieldsEarned = 0;
        let newStreak = stats.currentStreak;
        let newExperience = stats.experience;
        let challengeUpdate = stats.dailyChallenge;
        let shieldUsed = false;
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActive === yesterdayStr) {
          // Continuous streak
          newStreak += 1;
          // Streak bonuses
          const dailyBonus = XP_MAP.STREAK_BONUS_PER_DAY * newStreak;
          newExperience += dailyBonus;
          
          // Milestones
          if (newStreak === 7) { newExperience += 200; shieldsEarned++; }
          if (newStreak === 14) { newExperience += 300; shieldsEarned++; }
          if (newStreak === 30) { newExperience += 500; shieldsEarned++; }
          if (newStreak === 90) { newExperience += 800; shieldsEarned++; }
          if (newStreak === 100) { newExperience += 1000; shieldsEarned++; }
          if (newStreak === 365) { newExperience += 2000; shieldsEarned++; }

          if (newStreak === 7 || newStreak === 14 || 
              newStreak === 30 || newStreak === 90 || 
              newStreak === 365) {
            // Auto-open share modal after 2 second delay
            // (let the celebration animation play first)
            setTimeout(() => {
              openShare(
                'streak-share-card',
                `AETHOS_STREAK_${newStreak}D`,
                `${newStreak} DAY STREAK`
              );
            }, 2000);
          }

          const streakId = `streak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setXpNotifications(prev => [...prev, { 
            id: streakId, 
            amount: dailyBonus, 
            source: `STREAK_BONUS: DAY_${newStreak}` 
          }]);
          setTimeout(() => {
            setXpNotifications(prev => prev.filter(n => n.id !== streakId));
          }, 5000);
        } else {
          // Streak broken — check for shield
          const hasShield = (stats.streakShields || 0) > 0;
          if (hasShield) {
            // Shield absorbs the break — streak continues, shield consumed in main updateDoc below
            newStreak = stats.currentStreak;
            shieldUsed = true;
            const shieldId = `shield-${Date.now()}`;
            setXpNotifications(prev => [...prev, {
              id: shieldId,
              amount: 0,
              source: 'STREAK_SHIELD_ACTIVATED — UPTIME_PROTECTED'
            }]);
            setTimeout(() => setXpNotifications(prev => prev.filter(n => n.id !== shieldId)), 4000);
          } else {
            newStreak = 1;
          }
        }

        // Daily Challenge Rotation
        const randomChallenge = DAILY_CHALLENGES[Math.floor(Math.random() * DAILY_CHALLENGES.length)];
        challengeUpdate = {
          id: randomChallenge.id,
          progress: 0,
          goal: randomChallenge.goal,
          completed: false,
          lastGenerated: now.toISOString()
        };

        const statsRef = doc(db, 'user_stats', user.uid);
        await updateDoc(statsRef, {
          currentStreak: newStreak,
          lastActiveDate: now.toISOString(),
          experience: newExperience,
          dailyChallenge: challengeUpdate,
          pomodoroToday: 0,
          streakShields: (stats.streakShields || 0) + shieldsEarned - (shieldUsed ? 1 : 0),
          streakHistory: [...(stats.streakHistory || []), today]
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `user_stats/${user.uid}/daily_sync`);
      }
    };

    syncDaily();
  }, [user, stats?.userId]);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!user || !settings) return;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    const settingsRef = doc(db, 'user_settings', user.uid);
    try {
      await setDoc(settingsRef, updated);
      setCompleteToast('Settings saved');
      setTimeout(() => setCompleteToast(null), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, settingsRef.path);
    }
  };

  const handleUnlockItem = async (item: any) => {
    if (!user || !stats) return;
    const isUnlocked = (stats?.level || 1) >= item.unlockLevel;
    if (!isUnlocked) return;

    try {
      const unlockedItems = [...(stats.unlockedItems || [])];
      if (!unlockedItems.includes(item.id)) {
        unlockedItems.push(item.id);
      }
      
      const updates = { 
        unlockedItems: unlockedItems
      };
      
      await updateDoc(doc(db, 'user_stats', user.uid), updates);
      setStats({ ...stats, ...updates });
      
      setCompleteToast(`Unlocked: ${item.label || item.name}`);
      setTimeout(() => setCompleteToast(null), 3000);
      playLevelUpSound(); // Nice sound for purchase
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'user_stats');
    }
  };

  const addXP = async (amount: number, source: string, meta?: any) => {
    if (!user || !stats) return;

    try {
      const multiplier = settings?.difficultyMultiplier ?? MULTIPLIERS[stats.difficultyLevel || 'normal'] ?? 1.0;
      let finalAmount = Math.round(amount * multiplier);

      // --- DAILY XP CAP CHECK ---
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = stats.activityLog?.filter(
        (a: any) => a.timestamp?.startsWith(today)
      ) || [];

      // Calculate how much XP already earned today
      const totalTodayXP = todayLogs.reduce((sum: number, a: any) => sum + (a.xp || 0), 0);

      const matchesTask = (a: any) => {
        const srcStr = (a.source || a.label || "").toUpperCase();
        return srcStr.includes('TASK') || srcStr.includes('NEURAL_LINK') || srcStr.includes('NEURAL LINK') || srcStr.includes('TEMPORAL') || a.type === 'task';
      };
      const matchesHabit = (a: any) => {
        const srcStr = (a.source || a.label || "").toUpperCase();
        return srcStr.includes('HABIT') || a.type === 'habit';
      };
      const matchesJournal = (a: any) => {
        const srcStr = (a.source || a.label || "").toUpperCase();
        return srcStr.includes('JOURNAL') || srcStr.includes('NEURAL_INGEST') || srcStr.includes('NEURAL INGEST') || a.type === 'journal';
      };
      const matchesPomodoro = (a: any) => {
        const srcStr = (a.source || a.label || "").toUpperCase();
        return srcStr.includes('POMODORO') || srcStr.includes('FOCUS');
      };

      const taskTodayXP = todayLogs.filter(matchesTask).reduce((sum: number, a: any) => sum + (a.xp || 0), 0);
      const habitTodayXP = todayLogs.filter(matchesHabit).reduce((sum: number, a: any) => sum + (a.xp || 0), 0);
      const journalTodayXP = todayLogs.filter(matchesJournal).reduce((sum: number, a: any) => sum + (a.xp || 0), 0);
      const pomodoroTodayXP = todayLogs.filter(matchesPomodoro).reduce((sum: number, a: any) => sum + (a.xp || 0), 0);

      // Hard stop if total daily cap reached
      if (totalTodayXP >= DAILY_XP_CAPS.total) {
        addToTerminal('DAILY_XP_CAP_REACHED: Maximum XP for today achieved. Reset at midnight.', 'warn');
        return;
      }

      // Per-source caps
      const isTask = source.includes('TASK') || source.includes('NEURAL_LINK') || source.includes('TEMPORAL');
      const isHabit = source.includes('HABIT');
      const isJournal = source.includes('JOURNAL') || source.includes('NEURAL_INGEST') || source.includes('INGEST');
      const isPomodoro = source.includes('POMODORO') || source.includes('FOCUS');

      if (isTask && taskTodayXP >= DAILY_XP_CAPS.tasks) {
        addToTerminal('TASK_XP_CAP_REACHED: Task XP limit hit for today.', 'warn');
        return;
      }
      if (isHabit && habitTodayXP >= DAILY_XP_CAPS.habits) {
        addToTerminal('HABIT_XP_CAP_REACHED: Habit XP limit hit for today.', 'warn');
        return;
      }
      if (isJournal && journalTodayXP >= DAILY_XP_CAPS.journal) {
        addToTerminal('JOURNAL_XP_CAP_REACHED: Journal XP limit hit for today.', 'warn');
        return;
      }
      if (isPomodoro && pomodoroTodayXP >= DAILY_XP_CAPS.pomodoro) {
        addToTerminal('POMODORO_XP_CAP_REACHED: Pomodoro XP limit hit for today.', 'warn');
        return;
      }

      // Clamp final amount so it doesn't exceed remaining daily cap
      const remainingCap = DAILY_XP_CAPS.total - totalTodayXP;
      finalAmount = Math.min(finalAmount, remainingCap);
      if (finalAmount <= 0) {
        addToTerminal('DAILY_XP_CAP_REACHED: No remaining XP allocation for today.', 'warn');
        return;
      }
      // --- END DAILY XP CAP CHECK ---

      const logMsg = `XP_ACQUIRED: +${finalAmount} FROM ${source}`;
      addToTerminal(logMsg, 'success');

      // Update daily challenge progress
      let challengeUpdate = stats.dailyChallenge ? { ...stats.dailyChallenge } : null;
      if (challengeUpdate && !challengeUpdate.completed) {
        let progressed = false;
        const isTaskSource = source === 'NEURAL_LINK_ESTABLISHED' || source === 'TASK_COMPLETE_STREAK_SYNC' || source === 'TEMPORAL_ADHERENCE_BONUS';
        const isJournal = source === 'NEURAL_INGEST_COMPLETE';
        const isTimetable = source === 'TIMETABLE_CHECKIN' || source === 'TEMPORAL_ADHERENCE_SYNC';

        if (isTaskSource && challengeUpdate.id.startsWith('tasks')) {
           challengeUpdate.progress += 1;
           progressed = true;
        } else if (isJournal && challengeUpdate.id.startsWith('words') && meta?.wordCount) {
           challengeUpdate.progress += meta.wordCount;
           progressed = true;
        } else if (isTimetable && challengeUpdate.id.startsWith('timetable')) {
           challengeUpdate.progress += 1;
           progressed = true;
        } else if (challengeUpdate.id === 'streak_keep') {
           challengeUpdate.progress = 1;
           progressed = true;
        } else if (challengeUpdate.id === 'perfect_day' && isTaskSource) {
           const pendingTasks = tasks.filter(t => t.status === 'pending');
           if (pendingTasks.length <= 1) {
             challengeUpdate.progress = 1;
             progressed = true;
           }
        }

        if (progressed && challengeUpdate.progress >= challengeUpdate.goal) {
          challengeUpdate.completed = true;
          const reward = DAILY_CHALLENGES.find(c => c.id === challengeUpdate.id)?.xpReward || 0;
          finalAmount += reward;
          const challengeId = `challenge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setXpNotifications(prev => [...prev, { 
            id: challengeId, 
            amount: reward, 
            source: `CHALLENGE_COMPLETE: ${challengeUpdate.id}` 
          }]);
          setTimeout(() => {
            setXpNotifications(prev => prev.filter(n => n.id !== challengeId));
          }, 5000);
        }
      }

      // Trigger Notification
      const id = `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setXpNotifications(prev => [...prev, { id, amount: finalAmount, source }]);
      setTimeout(() => {
        setXpNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);

      const newExp = stats.experience + finalAmount;
      const { level: newLevel } = getLevelFromXP(newExp);
      const leveledUp = newLevel > stats.level;

      let newUnlockedFeatures = [...(stats.unlockedFeatures || [])];

      if (leveledUp) {
        // Calculate Rewards
        for (let l = stats.level + 1; l <= newLevel; l++) {
          const unlock = UNLOCKS.find(u => u.level === l);
          if (unlock) {
            newUnlockedFeatures.push(unlock.id);
          }
        }
      }

      // Activity logging
      const newEntry: ActivityEntry = {
        id: id.toString(),
        type: source?.includes('TASK') || source?.includes('TEMPORAL') ? 'task' : 
              source?.includes('JOURNAL') || source?.includes('INGEST') ? 'journal' :
              source?.includes('ACHIEVEMENT') ? 'achievement' : 'task',
        label: (source || "").replace(/_/g, ' '),
        xp: finalAmount,
        timestamp: new Date().toISOString()
      };

      const updatedLog = [newEntry, ...(stats.activityLog || [])].slice(0, 20);

      const updateData: any = {
        experience: newExp,
        level: newLevel,
        unlockedFeatures: newUnlockedFeatures,
        activityLog: updatedLog,
        lastActiveDate: new Date().toISOString()
      };
      if (challengeUpdate) updateData.dailyChallenge = challengeUpdate;

      await updateDoc(doc(db, 'user_stats', user.uid), updateData);

      if (leveledUp) {
        playLevelUpSound();
        setLevelUpLevel(newLevel);
      }

      checkAchievements(newExp, newLevel);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `user_stats/${user.uid}/add_xp`);
    }
  };

  const checkAchievements = async (newExp: number, newLevel: number) => {
    if (!user || !stats) return;
    
    try {
      const newUnlocked: string[] = [...(stats.unlockedAchievements || [])];
      let achievementXp = 0;

      ACHIEVEMENTS.forEach(ach => {
        if (!newUnlocked.includes(ach.id)) {
          let condition = false;
          const now = new Date();
          const hour = now.getHours();

          // Milestone Logic
          if (ach.id === 'first_protocol' && stats.totalTasksCompleted >= 1) condition = true;
          if (ach.id.startsWith('task_')) {
            const count = parseInt(ach.id.split('_')[1]);
            if (stats.totalTasksCompleted >= count) condition = true;
          }
          if (ach.id === 'journal_initiator' && journals.length >= 1) condition = true;
          if (ach.id.startsWith('journal_words_')) {
            const count = parseInt(ach.id.split('_')[3]);
            if ((stats.totalWordsWritten || 0) >= count) condition = true;
          }
          if (ach.id === 'reflection_seeker' && (stats.reflectionPromptsAnswered || 0) >= 50) condition = true;
          if (ach.id.startsWith('level_')) {
            const lvl = parseInt(ach.id.split('_')[1]);
            if (newLevel >= lvl) condition = true;
          }

          // Streak Logic
          if (ach.id.startsWith('streak_')) {
            const days = parseInt(ach.id.split('_')[1]);
            if (stats.currentStreak >= days) condition = true;
          }
          if (ach.id.startsWith('journal_streak_')) {
            const days = parseInt(ach.id.split('_')[2]);
            if ((stats.journalStreak || 0) >= days) condition = true;
          }
          if (ach.id === 'mood_master' && (stats.journalStreak || 0) >= 30) condition = true;

          // Skill/Hidden Logic
          if (ach.id === 'early_bird' && hour >= 5 && hour < 8) condition = true;
          if (ach.id === 'midnight_thoughts' && hour >= 3 && hour < 5) condition = true;
          if (ach.id === 'mood_swing') {
            const today = now.toISOString().split('T')[0];
            const todayMoods = new Set(journals.filter(j => j.createdAt.startsWith(today)).map(j => j.mood));
            if (todayMoods.size >= 3) condition = true;
          }
          if (ach.id === 'loyalist' && stats.experience >= 10000) condition = true;
          if (ach.id === 'god_mode' && newLevel >= 100 && stats.difficultyLevel === 'hard') condition = true;

          // Routine Matrix Achievements
          if (ach.id === 'creature_of_habit' || ach.id === 'iron_discipline') {
            const required = ach.id === 'creature_of_habit' ? 7 : 30;
            const anyStreak = habits.some(h => {
              const logs = habitLogs.filter(l => l.habitId === h.id && l.completed).map(l => l.date).sort((a,b) => b.localeCompare(a));
              if (logs.length < required) return false;
              let streak = 0;
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
              if (logs[0] !== todayStr && logs[0] !== yesterdayStr) return false;
              for (let i = 0; i < logs.length; i++) {
                const expected = format(subDays(parseISO(logs[0]), i), 'yyyy-MM-dd');
                if (logs.includes(expected)) streak++;
                else break;
              }
              return streak >= required;
            });
            if (anyStreak) condition = true;
          }
          if (ach.id === 'perfect_week') {
            const activeH = habits.filter(h => !h.isArchived);
            if (activeH.length > 0) {
              const last7Days = Array.from({length: 7}).map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
              const allDone = last7Days.every(date => {
                 const logsOnDate = habitLogs.filter(l => l.date === date && l.completed);
                 return activeH.every(h => logsOnDate.some(l => l.habitId === h.id));
              });
              if (allDone) condition = true;
            }
          }
          if (ach.id === 'perfectionist') {
            const pendingCount = tasks.filter(t => t.status === 'pending').length;
            if (pendingCount === 0 && tasks.length > 0) condition = true;
          }
          if (ach.id === 'long_form') {
             const longEntry = journals.some(j => j.content.split(/\s+/).filter(w => w.length > 0).length >= 500);
             if (longEntry) condition = true;
          }
          if (ach.id === 'minimalist') {
             const silentEntries = journals.filter(j => j.content.trim().length === 0).length;
             if (silentEntries >= 5) condition = true;
          }

          if (condition) {
            newUnlocked.push(ach.id);
            achievementXp += ach.xpReward;
            
            setCelebratingAchievement(ach);
            setTimeout(() => setCelebratingAchievement(null), 6000);

            const achId = `ach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setXpNotifications(prev => [...prev, { id: achId, amount: ach.xpReward, source: `ACHIEVEMENT_UNLOCKED: ${ach.title}` }]);
            setTimeout(() => setXpNotifications(prev => prev.filter(n => n.id !== achId)), 5000);
          }
        }
      });

      if (achievementXp > 0 || newUnlocked.length !== (stats.unlockedAchievements?.length || 0)) {
        await updateDoc(doc(db, 'user_stats', user.uid), {
          unlockedAchievements: newUnlocked,
          experience: newExp + achievementXp,
          level: getLevelFromXP(newExp + achievementXp).level
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `user_stats/${user.uid}/achievements`);
    }
  };

  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [focusStartTime, setFocusStartTime] = useState<number>(0);
  const [activeVibe, setActiveVibe] = useState<string | null>(null);

  const CATEGORY_VIBE_MAP: Record<string, string> = {
    work: 'techy',
    learning: 'lofi',
    creative: 'chill',
    health: 'hype',
    personal: 'chill',
    routine: 'lofi',
  };

  const playVibe = (vibeTag: string) => {
    const playable = motivationItems.filter(i => i.type === 'music' || i.type === 'link');
    const exactMatches = playable.filter(i => i.vibe === vibeTag);

    if (exactMatches.length > 0) {
      const pick = exactMatches[Math.floor(Math.random() * exactMatches.length)];
      startPlaylist(pick);
      setActiveVibe(vibeTag);
    } else if (playable.length > 0) {
      // No exact tag match, but you've got songs — play something rather than nothing
      const pick = playable[Math.floor(Math.random() * playable.length)];
      startPlaylist(pick);
      setActiveVibe(null); // no tag was actually matched, so don't show a false "active vibe" label
    } else {
      setActiveVibe(null);
    }
  };

  const startFocus = (task: Task) => {
    setFocusTask(task);
    setFocusStartTime(Date.now());
    const suggestedVibe = CATEGORY_VIBE_MAP[task.category] || 'chill';
    playVibe(suggestedVibe);
  };

  const endFocus = async () => {
    if (!focusTask) return;
    const duration = (Date.now() - focusStartTime) / (60 * 1000);
    if (duration >= 20) {
      await addXP(Math.round(duration), 'FOCUS_SESSION_COMPLETED');
    } else {
      addToTerminal('SESSION_INVALID: Minimum 20 minutes required for Focus Session XP.', 'warn');
    }
    setFocusTask(null);
    setFocusStartTime(0);
  };

  const addTimeBlock = async (block: Omit<TimeBlock, 'id' | 'userId'>) => {
    if (!user) return;
    try {
      if (block.type === 'task') {
        // Find if a task with similar title already exists and is pending, to avoid duplicates? 
        // For now, just create a new task that is scheduled.
        await addDoc(collection(db, 'tasks'), {
          userId: user.uid,
          title: block.title,
          priority: 'medium',
          status: 'pending',
          category: 'learning',
          estimate: differenceInMinutes(parseISO(block.endTime), parseISO(block.startTime)),
          difficulty: 'medium',
          scheduledStart: block.startTime,
          scheduledEnd: block.endTime,
          createdAt: new Date().toISOString(),
          expiresAt: chronos.getCycleEnd().toISOString(),
          isExpired: false
        });
      } else {
        await addDoc(collection(db, 'time_blocks'), {
          ...block,
          userId: user.uid,
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'time_blocks');
    }
  };

  const deleteTimeBlock = async (id: string, source: 'task' | 'block' = 'block') => {
    try {
      if (source === 'task') {
        await updateDoc(doc(db, 'tasks', id), {
          scheduledStart: null,
          scheduledEnd: null
        });
      } else {
        await deleteDoc(doc(db, 'time_blocks', id));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${source === 'task' ? 'tasks' : 'time_blocks'}/${id}`);
    }
  };

  const updateTimeBlock = async (id: string, updates: Partial<TimeBlock>, source: 'task' | 'block' = 'block') => {
    try {
      if (source === 'task' || (updates.type === 'task' && source === 'block')) {
        // If it was a block and now is a task, this is complex. 
        // For simplicity, if source is task, update task.
        if (source === 'task') {
          await updateDoc(doc(db, 'tasks', id), {
            title: updates.title,
            scheduledStart: updates.startTime,
            scheduledEnd: updates.endTime,
            status: updates.completed ? 'completed' : 'pending'
          });
        } else {
          // It's a block but type became task? User probably wants to sync it.
          // In a real app we'd migrate it. For now just update block.
          await updateDoc(doc(db, 'time_blocks', id), updates);
        }
      } else {
        await updateDoc(doc(db, 'time_blocks', id), updates);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${source === 'task' ? 'tasks' : 'time_blocks'}/${id}`);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await updateDoc(doc(db, 'tasks', id), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const applyTemplate = async (templateId: string, date: Date) => {
    if (!user) return;
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      const baseDate = startOfDay(date);
      
      template.blocks.forEach(block => {
        const startTime = addHours(baseDate, block.startHour);
        const finalStart = new Date(startTime.getTime() + block.startMinute * 60000);
        const finalEnd = new Date(finalStart.getTime() + block.duration * 60000);
        
        if (block.type === 'task') {
          const newTaskRef = doc(collection(db, 'tasks'));
          batch.set(newTaskRef, {
            userId: user.uid,
            title: block.title,
            priority: 'medium',
            status: 'pending',
            category: 'learning',
            estimate: block.duration,
            difficulty: 'medium',
            scheduledStart: finalStart.toISOString(),
            scheduledEnd: finalEnd.toISOString(),
            createdAt: new Date().toISOString()
          });
        } else {
          const newBlockRef = doc(collection(db, 'time_blocks'));
          batch.set(newBlockRef, {
            userId: user.uid,
            title: block.title,
            type: block.type,
            startTime: finalStart.toISOString(),
            endTime: finalEnd.toISOString(),
            completed: false
          });
        }
      });

      await batch.commit();
      await addXP(50, 'Template applied');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'apply_template');
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (!user || !stats) return;
    if (task.status === 'completed') {
      addToTerminal('TASK_ALREADY_COMPLETED: XP already awarded for this task.', 'warn');
      return;
    }
    if (task.xpAwarded === true) {
      addToTerminal('TASK_XP_LOCKED: Cannot re-award XP for completed task.', 'warn');
      return;
    }

    try {
      playCompletionSound();
      const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      setCompleteToast(randomMsg);
      setTimeout(() => setCompleteToast(null), 3000);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF4500', '#00D9FF', '#FFFFFF']
      });

      // Tick all subtasks
      if (task.subTasks && task.subTasks.length > 0) {
        const completedSubTasks = task.subTasks.map(st => ({ ...st, completed: true }));
        await updateDoc(doc(db, 'tasks', task.id), { subTasks: completedSubTasks });
      }

      const now = new Date();
      let adherenceStatus: 'ontime' | 'late' | 'partial' | 'missed' | undefined;
      let schedulingBonus = 0;
      let source = 'TASK_COMPLETE_STREAK_SYNC';

      if (task.scheduledStart) {
        const scheduledTime = new Date(task.scheduledStart);
        const diffMinutes = Math.abs((now.getTime() - scheduledTime.getTime()) / (60 * 1000));
        if (diffMinutes <= 60) {
          adherenceStatus = 'ontime';
          schedulingBonus += XP_MAP.TIMETABLE_ON_TIME;
          source = 'TEMPORAL_ADHERENCE_BONUS';
        } else {
          adherenceStatus = 'late';
        }
      }

      let speedBonus = 0;
      if (task.estimate > 0) {
        const startTime = task.scheduledStart ? new Date(task.scheduledStart) : new Date(task.createdAt);
        const actualMinutes = (now.getTime() - startTime.getTime()) / (60 * 1000);
        if (actualMinutes < task.estimate * 0.75) {
          const baseBonus = calculateTaskXP(task, stats.currentStreak) * (XP_MAP.SPEED_BONUS_MULT - 1);
          speedBonus = Math.round(baseBonus);
        }
      }

      // Hardened multi-document update
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      const taskRef = doc(db, 'tasks', task.id);
      const updateData: any = { 
        status: 'completed',
        completedAt: now.toISOString(),
        xpAwarded: true
      };
      if (adherenceStatus) {
        updateData.adherenceStatus = adherenceStatus;
      }
      batch.update(taskRef, updateData);

      const updates: any = {
        totalTasksCompleted: (stats.totalTasksCompleted || 0) + 1
      };
      if (adherenceStatus === 'ontime') {
        updates.punctualStreak = (stats.punctualStreak || 0) + 1;
      } else {
        updates.punctualStreak = 0;
      }

      const today = now.toISOString().split('T')[0];
      const todayScheduledCompleted = tasks.filter(t => 
        t.createdAt.startsWith(today) && 
        t.scheduledStart && 
        (t.status === 'completed' || t.id === task.id)
      ).length;

      const statsRef = doc(db, 'user_stats', user.uid);
      batch.update(statsRef, updates);

      await batch.commit();

      // Update activity streak on task completion
      const lastActive = stats.lastActiveDate?.split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActive !== today) {
        // First activity of the day — update streak
        let newStreak = stats.currentStreak;
        if (lastActive === yesterdayStr) {
          newStreak += 1;
          // Streak milestone bonuses
          if (newStreak === 7) await addXP(100, 'STREAK_MILESTONE_7');
          if (newStreak === 14) await addXP(150, 'STREAK_MILESTONE_14');
          if (newStreak === 30) await addXP(250, 'STREAK_MILESTONE_30');
          if (newStreak === 90) await addXP(400, 'STREAK_MILESTONE_90');
          if (newStreak === 100) await addXP(500, 'STREAK_MILESTONE_100');
          if (newStreak === 365) await addXP(1000, 'STREAK_MILESTONE_365');

          if (newStreak === 7 || newStreak === 14 || 
              newStreak === 30 || newStreak === 90 || 
              newStreak === 365) {
            // Auto-open share modal after 2 second delay
            // (let the celebration animation play first)
            setTimeout(() => {
              openShare(
                'streak-share-card',
                `AETHOS_STREAK_${newStreak}D`,
                `${newStreak} DAY STREAK`
              );
            }, 2000);
          }
        } else if (lastActive !== today) {
          newStreak = 1; // Reset if gap > 1 day
        }

        await updateDoc(doc(db, 'user_stats', user.uid), {
          currentStreak: newStreak,
          lastActiveDate: now.toISOString(),
          streakHistory: [...(stats.streakHistory || []), today]
        });
      }

      // Award XP separately as it has its own complex multi-field logic
      let earnedXP = calculateTaskXP(task, stats.currentStreak) + schedulingBonus + speedBonus;
      
      // Apply XP Decay for late tasks (-30% by default)
      if (adherenceStatus === 'late') {
        let decayMult = 0.7;
        earnedXP = Math.round(earnedXP * decayMult);
      }

      await addXP(earnedXP, source, { isBoss: task.isBoss });
      if ((task.estimate || 0) >= 30) {
        setTimeout(() => setFlowPrompt({ taskId: task.id, taskTitle: task.title, category: task.category || 'personal', estimate: task.estimate || 30 }), 3500);
      }

      // If completing a task synced with a habit, automatically complete the habit log today
      if (task.habitId) {
        const h = habits.find((hb: any) => hb.id === task.habitId);
        if (h) {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const existingLog = habitLogs.find(l => l.habitId === h.id && l.date === todayStr);
          if (!existingLog) {
            await addDoc(collection(db, 'habit_logs'), {
              userId: user.uid,
              habitId: h.id,
              date: todayStr,
              completed: true,
              timestamp: new Date().toISOString()
            });

            // Recalculate habit streak after logging
            const allLogs = habitLogs
              .filter(l => l.habitId === h.id && l.completed)
              .map(l => l.date)
              .sort()
              .reverse();

            let habitStreak = 0;
            let checkDate = new Date();
            for (let i = 0; i < 365; i++) {
              const dateStr = checkDate.toISOString().split('T')[0];
              if (allLogs.includes(dateStr) || dateStr === todayStr) {
                habitStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                break;
              }
            }

            await updateDoc(doc(db, 'habits', h.id), {
              currentStreak: habitStreak,
              lastCompletedDate: todayStr
            });
          }
        }
      }

      if (todayScheduledCompleted === 5) {
        await addXP(25, 'DAILY_TEMPORAL_MASTERY_REACHED');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  async function logFlowState(wasFlow: boolean) {
    if (!flowPrompt || !user) return;
    const now = new Date();
    try {
      await addDoc(collection(db, 'flow_logs'), {
        userId: user.uid,
        taskId: flowPrompt.taskId,
        taskTitle: flowPrompt.taskTitle,
        category: flowPrompt.category,
        estimate: flowPrompt.estimate,
        wasFlow,
        timeOfDay: now.getHours(),
        date: now.toISOString().split('T')[0],
        createdAt: now.toISOString()
      });
    } catch (e) {
      console.warn('Flow log error:', e);
    } finally {
      setFlowPrompt(null);
    }
  }

  const addHabit = async (habitData: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'isArchived'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'habits'), {
        ...habitData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        isArchived: false
      });
      setCompleteToast('Habit created');
      setTimeout(() => setCompleteToast(null), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'habits');
    }
  };

  const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'habits', habitId), updates);
      setCompleteToast('Habit updated');
      setTimeout(() => setCompleteToast(null), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'habits');
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'habits', id), { isArchived: true });
      setCompleteToast('Habit archived');
      setTimeout(() => setCompleteToast(null), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `habits/${id}`);
    }
  };

  const toggleHabit = async (habit: Habit, date: string) => {
    if (!user || !stats) return;
    const existingLog = habitLogs.find(l => l.habitId === habit.id && l.date === date); // unified sync active

    try {
      if (existingLog && existingLog.completed) {
        // UNCOMPLETING — mark as not done, but NEVER give XP back or re-award
        await updateDoc(doc(db, 'habit_logs', existingLog.id), {
          userId: existingLog.userId,
          habitId: existingLog.habitId,
          date: existingLog.date,
          completed: false,
          uncompletedAt: new Date().toISOString()
        });

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const completedTask = tasks.find((t: any) => 
          t.userId === user.uid && 
          t.createdAt.startsWith(todayStr) && 
          ((t.title || "").trim().toLowerCase() === habit.name.trim().toLowerCase() || t.habitId === habit.id) &&
          t.status === 'completed'
        );
        if (completedTask) {
          await updateDoc(doc(db, 'tasks', completedTask.id), {
            status: 'pending',
            completedAt: null
          });
        }
        setCompleteToast('Habit unchecked');
        setTimeout(() => setCompleteToast(null), 3000);
      } else {
        if (existingLog) {
          // Re-completing an uncompleted habit
          const alreadyEarnedXP = existingLog.xpAwarded === true;
          if (alreadyEarnedXP) {
            addToTerminal('HABIT_XP_ALREADY_AWARDED: XP already given for this habit today.', 'warn');
            await updateDoc(doc(db, 'habit_logs', existingLog.id), {
              userId: existingLog.userId,
              habitId: existingLog.habitId,
              date: existingLog.date,
              completed: true,
              uncompletedAt: null
            });

            // Sync linked task completion today!
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const pendingTask = tasks.find((t: any) => 
              t.userId === user.uid && 
              t.createdAt.startsWith(todayStr) && 
              ((t.title || "").trim().toLowerCase() === habit.name.trim().toLowerCase() || t.habitId === habit.id) &&
              t.status === 'pending'
            );
            if (pendingTask) {
              await updateDoc(doc(db, 'tasks', pendingTask.id), {
                status: 'completed',
                completedAt: new Date().toISOString()
              });
            }
            setCompleteToast('Habit rechecked');
            setTimeout(() => setCompleteToast(null), 3000);
            return;
          }
        }

        // Normal/first-time completion
        await addDoc(collection(db, 'habit_logs'), {
          userId: user.uid,
          habitId: habit.id,
          date,
          completed: true,
          xpAwarded: true, // Mark XP as awarded
          timestamp: new Date().toISOString()
        });

        // After creating the habit_log doc successfully:
        const today = format(new Date(), 'yyyy-MM-dd');
        const lastActive = stats.lastActiveDate?.split('T')[0];
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

        if (lastActive !== today) {
          let newStreak = stats.currentStreak;
          if (lastActive === yesterday) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
          await updateDoc(doc(db, 'user_stats', user.uid), {
            currentStreak: newStreak,
            lastActiveDate: new Date().toISOString()
          });
        }

        // Sync linked task completion today!
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const pendingTask = tasks.find((t: any) => 
          t.userId === user.uid && 
          t.createdAt.startsWith(todayStr) && 
          ((t.title || "").trim().toLowerCase() === habit.name.trim().toLowerCase() || t.habitId === habit.id) &&
          t.status === 'pending'
        );
        if (pendingTask) {
          await updateDoc(doc(db, 'tasks', pendingTask.id), {
            status: 'completed',
            completedAt: new Date().toISOString()
          });
        }

        const multipliers: Record<string, number> = {
          health: 1.2,
          learning: 1.1,
          creative: 1.15,
          work: 1.0,
          personal: 0.9,
          routine: 0.7
        };
        const multiplier = multipliers[habit.category] || 1.0;
        const totalXP = Math.round(25 * multiplier);
        addXP(totalXP, `HABIT_DONE: ${habit.name.toUpperCase()}`);

        const axisMap: Record<string, string> = {
          health: 'GYM',
          learning: 'STUDIES',
          personal: 'LOVE',
          routine: 'SLEEP'
        };
        const axis = axisMap[habit.category];
        const categories = stats.lifeSyncCategories || LIFE_CATEGORIES;
        if (axis && categories.some((c: any) => c.id === axis)) {
          const currentLifeValues = stats.lifeSync?.current || {};
          const newVal = Math.min(10, (currentLifeValues[axis] || 0) + 1);
          if (newVal !== currentLifeValues[axis]) {
             await updateDoc(doc(db, 'user_stats', user.uid), {
               [`lifeSync.current.${axis}`]: newVal
             });
          }
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'habit_logs');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 cyber-grid opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Central Pulsing Node */}
          <div className="relative mb-12">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
                rotate: [0, 90, 180, 270, 360]
              }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="w-32 h-32 border-2 border-accent/30 rounded-3xl absolute -inset-4 blur-xl"
            />
            <motion.div 
              animate={{ 
                rotate: -360,
                borderColor: ['rgba(255, 69, 0, 0.5)', 'rgba(0, 217, 255, 0.5)', 'rgba(255, 69, 0, 0.5)']
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-24 h-24 border-t-2 border-r-2 rounded-full flex items-center justify-center p-4"
            >
              <Zap className="text-accent animate-pulse" size={32} />
            </motion.div>
          </div>

          {/* Diagnostic Text Sequence */}
          <div className="space-y-2 text-center">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-white font-mono text-xs uppercase tracking-[0.5em] text-glow-white"
            >
              Initializing_Neural_Sync
            </motion.p>
            <div className="flex gap-1 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={`loading-dot-${i}`}
                  animate={{ 
                    opacity: [0, 1, 0],
                    y: [0, -2, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                  className="w-1 h-1 bg-cyan rounded-full"
                />
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-1 items-center">
              <p className="text-[8px] font-mono text-text-m uppercase opacity-40">Decrypting_User_Node...</p>
              <p className="text-[8px] font-mono text-text-m uppercase opacity-30">Stabilizing_Temporal_Streams...</p>
              <p className="text-[8px] font-mono text-text-m uppercase opacity-20">Optimizing_XP_Algorithm...</p>
            </div>
          </div>
        </div>

        {/* Scanline Effect */}
        <div className="absolute inset-0 bg-scanlines opacity-[0.05] pointer-events-none" />
      </div>
    );
  }

  if (window.location.pathname === '/privacy') {
    return <PrivacyPolicy />;
  }

  if (!user) {
    if (!authChoice) {
      return <LandingPage onEnter={() => setAuthChoice(true)} />;
    }
    return (
      <AuthorizationPage 
        onBack={() => setAuthChoice(false)} 
        onGoogleLogin={signInWithGoogle} 
      />
    );
  }

  if (!stats || !settings) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="flex flex-col items-center gap-6 z-10">
          <div className="relative">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-16 h-16 border-2 border-cyan/10 rounded-full border-t-cyan border-r-cyan/50 shadow-[0_0_20px_rgba(0,217,255,0.2)]"
            />
            <Zap size={24} className="absolute inset-0 m-auto text-cyan animate-pulse" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest animate-pulse">
              SYNCHRONIZING_NEURAL_NODES...
            </p>
            <p className="text-[8px] font-mono text-text-m uppercase opacity-40">Connecting to secure encrypted cluster...</p>
          </div>
        </div>
        <div className="absolute inset-0 bg-scanlines opacity-[0.05] pointer-events-none" />
      </div>
    );
  }

  const achievements = ACHIEVEMENTS;
  const activityLog = stats?.activityLog || [];

  return (
    <div className={cn(
      "min-h-screen text-text-p selection:bg-accent selection:text-white transition-colors duration-500",
      settings?.display.theme === 'light' ? "bg-background light" : "bg-background cyber-grid"
    )}>
      {/* Dormant System Banner */}
      {lastActiveDays > 7 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent/20 border-b border-accent text-white text-[11px] font-mono p-3 text-center flex items-center justify-center gap-4 z-[150] relative"
        >
          <span>SYSTEM_DORMANT. You've been inactive {lastActiveDays} days. Ready to reactivate?</span>
          <button 
            onClick={handleReactivateProtocol}
            className="px-3 py-1 bg-accent text-white hover:bg-accent/80 rounded-[4px] text-[9px] font-black uppercase tracking-wider"
          >
            REACTIVATE_PROTOCOL
          </button>
        </motion.div>
      )}


      {/* Control Panel Buttons */}
      <div className="fixed top-6 right-6 lg:top-8 lg:right-8 z-[60] flex items-center gap-3">
        {/* Dark/Light Mode Toggle */}
        <button 
          onClick={() => {
            const nextTheme = settings?.display.theme === 'light' ? 'cyberpunk' : 'light';
            updateSettings({ display: { ...settings!.display, theme: nextTheme } });
          }}
          className="glass w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center border border-white/10 text-white hover:text-cyan hover:border-cyan/50 hover:bg-cyan/5 transition-all group shadow-2xl backdrop-blur-xl"
        >
          {settings?.display.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* How To Button */}
        <button 
          onClick={() => setIsManualOpen(true)}
          className="flex items-center gap-2 glass px-4 py-2 h-10 lg:h-12 rounded-full border border-white/10 text-[10px] font-mono font-black text-text-m hover:text-cyan hover:border-cyan/50 hover:bg-cyan/5 transition-all group shadow-2xl backdrop-blur-xl"
        >
          <HelpCircle size={14} className="group-hover:rotate-12 transition-transform" />
          HOW_TO
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar (5 icon buttons) */}
      <nav id="mobile-nav" className="fixed bottom-0 left-0 right-0 h-16 bg-black/90 glass border-t border-border-subtle z-50 flex md:hidden items-center justify-around px-2 py-1 select-none [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
        <button 
          onClick={() => handleTabChange('dashboard')} 
          className={cn("flex flex-col items-center justify-center py-1 px-2 text-text-m hover:text-white transition-all active:scale-95 flex-1 min-h-[44px]", activeTab === 'dashboard' ? "text-accent" : "text-text-s")}
        >
          <HardDrive size={18} className={cn("transition-transform", activeTab === 'dashboard' ? "scale-110 text-accent text-glow-accent" : "text-text-s")} />
          <span className="text-[10px] font-mono mt-0.5 font-bold tracking-tight">CORE</span>
        </button>
        <button 
          onClick={() => handleTabChange('dailyWork')} 
          className={cn("flex flex-col items-center justify-center py-1 px-2 text-text-m hover:text-white transition-all active:scale-95 flex-1 min-h-[44px]", activeTab === 'dailyWork' ? "text-accent" : "text-text-s")}
        >
          <CheckCircle2 size={18} className={cn("transition-transform", activeTab === 'dailyWork' ? "scale-110 text-accent text-glow-accent" : "text-text-s")} />
          <span className="text-[10px] font-mono mt-0.5 font-bold tracking-tight">WORK</span>
        </button>
        <button 
          onClick={() => handleTabChange('reflect')} 
          className={cn("flex flex-col items-center justify-center py-1 px-2 text-text-m hover:text-white transition-all active:scale-95 flex-1 min-h-[44px]", activeTab === 'reflect' ? "text-accent" : "text-text-s")}
        >
          <Book size={18} className={cn("transition-transform", activeTab === 'reflect' ? "scale-110 text-accent text-glow-accent" : "text-text-s")} />
          <span className="text-[10px] font-mono mt-0.5 font-bold tracking-tight">REFLECT</span>
        </button>
        <button 
          onClick={() => handleTabChange('grow')} 
          className={cn("flex flex-col items-center justify-center py-1 px-2 text-text-m hover:text-white transition-all active:scale-95 flex-1 min-h-[44px]", activeTab === 'grow' ? "text-accent" : "text-text-s")}
        >
          <TrendingUp size={18} className={cn("transition-transform", activeTab === 'grow' ? "scale-110 text-accent text-glow-accent" : "text-text-s")} />
          <span className="text-[10px] font-mono mt-0.5 font-bold tracking-tight">GROW</span>
        </button>
        <button 
          onClick={() => handleTabChange('aetherCoach')} 
          className={cn("flex flex-col items-center justify-center py-1 px-2 text-text-m hover:text-white transition-all active:scale-95 flex-1 min-h-[44px]", activeTab === 'aetherCoach' ? "text-accent" : "text-text-s")}
        >
          <Sparkles size={18} className={cn("transition-transform", activeTab === 'aetherCoach' ? "scale-110 text-cyan text-glow-cyan" : "text-text-s")} />
          <span className="text-[10px] font-mono mt-0.5 font-bold tracking-tight text-cyan">COACH</span>
        </button>
      </nav>

      {/* Sidebar / Nav for Tablet & Desktop */}
      <nav className="fixed left-0 top-0 bottom-0 glass border-r border-border-subtle z-50 hidden md:flex flex-col items-center justify-start gap-4 py-8 px-2 md:w-16 lg:w-56 transition-all duration-300 select-none">
        {/* Brand System */}
        <div className="flex items-center gap-2 mb-4 hidden lg:flex cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleTabChange('dashboard')}>
          <Cpu className="text-accent animate-pulse" size={16} />
          <span className="text-xs font-mono font-black tracking-widest text-text-p uppercase">AETHOS</span>
        </div>
        <div className="flex items-center justify-center mb-4 md:flex lg:hidden w-8 h-8 rounded-full bg-accent/10">
          <Cpu className="text-accent animate-pulse" size={16} />
        </div>

        <NavButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<HardDrive size={18} className="lg:w-5 lg:h-5" />} label="CORE_COMMAND" />
        <NavButton active={activeTab === 'dailyWork'} onClick={() => handleTabChange('dailyWork')} icon={<CheckCircle2 size={18} className="lg:w-5 lg:h-5" />} label="DAILY_WORK" />
        <NavButton active={activeTab === 'reflect'} onClick={() => handleTabChange('reflect')} icon={<Book size={18} className="lg:w-5 lg:h-5" />} label="REFLECT" />
        <NavButton active={activeTab === 'grow'} onClick={() => handleTabChange('grow')} icon={<TrendingUp size={18} className="lg:w-5 lg:h-5" />} label="GROW" />
        <NavButton active={activeTab === 'aetherCoach'} onClick={() => handleTabChange('aetherCoach')} icon={<Sparkles size={18} className="lg:w-5 lg:h-5 text-cyan" />} label="AETHOS COACH" />
        <NavButton active={activeTab === 'configOs'} onClick={() => handleTabChange('configOs')} icon={<Settings size={18} className="lg:w-5 lg:h-5" />} label="CONFIG_OS" />
        
        <button 
          onClick={() => signOut(auth)}
          className="p-3 text-text-m hover:text-danger hover:bg-neutral-900/40 transition-all mt-auto group shrink-0 flex items-center gap-3 w-full rounded-xl justify-center lg:justify-start lg:px-5 min-h-[44px]"
        >
          <LogOut size={18} className="lg:w-5 lg:h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-mono font-black uppercase text-text-m group-hover:text-danger hidden lg:block tracking-widest">
            TERMINATE
          </span>
          <span className="sr-only">TERMINATE_SESSION</span>
        </button>
      </nav>

      <div className="min-h-screen pb-24 md:pb-0 md:pl-16 lg:pl-56 transition-all duration-300">
        <main className="pb-16 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all duration-300">
        {activeTab !== 'dashboard' && (
          <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 lg:mb-12 gap-4 lg:gap-6 glass p-4 lg:p-6 rounded-xl border border-border-subtle premium-transition">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 shrink-0 rounded-full bg-gradient-to-br from-accent to-cyan flex items-center justify-center font-bold text-lg lg:text-2xl accent-glow text-white shadow-[0_0_20px_rgba(255,69,0,0.2)]">
                {user.displayName?.[0] || 'A'}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="text-[8px] lg:text-[9px] font-mono text-cyan uppercase tracking-widest border border-cyan/20 px-1.5 py-0.5 rounded bg-cyan/5">AUTH_01</span>
                  <span className="text-[8px] lg:text-[9px] font-mono text-accent uppercase tracking-widest border border-accent/20 px-1.5 py-0.5 rounded bg-accent/5">NODE_{user.uid.slice(0, 4)}</span>
                  <span className="text-[8px] lg:text-[9px] font-mono text-success uppercase tracking-widest border border-success/20 px-1.5 py-0.5 rounded bg-success/5 border-dashed animate-pulse">
                    {getTitleForLevel(stats?.level || 1)}
                  </span>
                </div>
                <h1 className="text-xl lg:text-3xl font-serif font-black uppercase tracking-widest text-text-p flex items-center gap-2 truncate">
                  {user.displayName || 'OPERATOR'} 
                  <span className="text-cyan text-glow-cyan ml-1 text-[10px] lg:text-sm font-mono tracking-tighter shrink-0">LVL_{stats?.level || 1}</span>
                  {stats && new Date(stats.lastActiveDate).toDateString() !== new Date().toDateString() && (
                    <div className="flex items-center gap-1 text-warning animate-pulse ml-2 px-2 py-0.5 rounded-full border border-warning/20 bg-warning/10">
                      <Flame size={10} />
                      <span className="text-[8px] uppercase font-black tracking-widest">STREAK_AT_RISK</span>
                    </div>
                  )}
                </h1>
                {stats && (() => {
                  const { progress, totalForLevel } = getLevelFromXP(stats.experience);
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1.5">
                      <div className="w-full sm:w-48 lg:w-64 h-1 bg-background-nested rounded-full overflow-hidden border border-white/5 relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(progress / totalForLevel) * 100}%` }}
                          transition={{ duration: 1, ease: PREMIUM_BEZIER }}
                          className="h-full bg-accent accent-glow shadow-[0_0_10px_rgba(255,69,0,0.4)]"
                        />
                      </div>
                      <span className="text-[8px] lg:text-[10px] text-text-s uppercase tracking-tighter font-mono whitespace-nowrap opacity-60">
                        {Math.floor(progress)}/{totalForLevel} XP
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {stats && (
              <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 lg:gap-8 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                <div className="text-center group relative cursor-help flex flex-col items-center">
                  <p className="text-[8px] lg:text-[10px] text-text-m uppercase font-bold tracking-widest font-mono opacity-40">Streak</p>
                  <div className="text-sm lg:text-xl font-serif font-bold text-warning flex items-center justify-center gap-1 group-hover:drop-shadow-[0_0_8px_rgba(255,165,0,0.5)] transition-all">
                    <Flame size={14} className={cn("lg:w-5 lg:h-5", stats.currentStreak > 0 ? "text-orange-500 animate-pulse" : "text-text-s opacity-30")} />
                    <span>{stats.currentStreak}</span>
                  </div>
                  {(stats.streakShields || 0) > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5" title={`${stats.streakShields} streak shield${stats.streakShields === 1 ? '' : 's'} active`}>
                      {Array.from({ length: Math.min(stats.streakShields || 0, 3) }).map((_, i) => (
                        <span key={i} className="text-[10px]">🛡️</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-center group flex flex-col items-center">
                  <p className="text-[8px] lg:text-[10px] text-text-m uppercase font-bold tracking-widest font-mono opacity-40">Active</p>
                  <p className="text-sm lg:text-xl font-serif font-bold text-accent animate-text-glow">{tasks.filter(t => t.status === 'pending').length}</p>
                </div>
                <div className="text-center group flex flex-col items-center">
                  <p className="text-[8px] lg:text-[10px] text-text-m uppercase font-bold tracking-widest font-mono opacity-40">Sync</p>
                  <p className="text-sm lg:text-xl font-serif font-bold text-cyan text-glow-cyan">94%</p>
                </div>
              </div>
            )}
          </header>
        )}

        <div className="mt-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10, scale: 0.98, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -10, scale: 1.02, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: PREMIUM_BEZIER }}
            >
              {activeTab === 'dashboard' && (
                <ErrorBoundary name="Core_Command_Dashboard">
                  {!stats ? <SystemCalibrating /> : (
                    <Dashboard 
                      stats={stats} 
                      tasks={tasks} 
                      journals={journals} 
                      onComplete={handleCompleteTask} 
                      user={user} 
                      setActiveTab={handleTabChange} 
                      settings={settings}
                      updateSettings={updateSettings}
                      setIsMotivationPortalOpen={setIsMotivationPortalOpen} 
                      motivationItems={motivationItems}
                      currentlyPlaying={currentlyPlaying}
                      isPlaying={isPlaying}
                      playMode={playMode}
                      queue={queue}
                      queueIndex={queueIndex}
                      setCurrentlyPlaying={setCurrentlyPlaying}
                      setIsPlaying={setIsPlaying}
                      setPlayMode={setPlayMode}
                      setQueue={setQueue}
                      setQueueIndex={setQueueIndex}
                      startPlaylist={startPlaylist}
                      openShare={openShare}
                    />
                  )}
                </ErrorBoundary>
              )}
              {activeTab === 'dailyWork' && (
                <ErrorBoundary name="Daily_Work_Processor">
                  <DailyWorkView
                    tasks={tasks}
                    user={user}
                    onComplete={handleCompleteTask}
                    settings={settings}
                    setCompleteToast={setCompleteToast}
                    timeBlocks={timeBlocks}
                    journals={journals}
                    stats={stats}
                    onAddXP={addXP}
                    onFocus={startFocus}
                    addTimeBlock={addTimeBlock}
                    deleteTimeBlock={deleteTimeBlock}
                    updateTimeBlock={updateTimeBlock}
                    updateTask={updateTask}
                    applyTemplate={applyTemplate}
                    onUpdateSettings={updateSettings}
                    habits={habits}
                    habitLogs={habitLogs}
                    onAddHabit={addHabit}
                    onToggleHabit={toggleHabit}
                    onDeleteHabit={deleteHabit}
                    subTab={dailyWorkSubTab}
                    setSubTab={setDailyWorkSubTab}
                    addToTerminal={addToTerminal}
                    openShare={openShare}
                    woopPlans={woopPlans}
                    yearlyGoals={yearlyGoals}
                    dailyGoals={dailyGoals}
                    dailyGoalStreak={dailyGoalStreak}
                  />
                </ErrorBoundary>
              )}
              {activeTab === 'reflect' && (
                <ErrorBoundary name="Reflective_Cognition_Engine">
                  <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>}>
                  <ReflectView
                    journals={journals}
                    user={user}
                    onAddXP={addXP}
                    stats={stats}
                    setActiveTab={handleTabChange}
                    tasks={tasks}
                    habits={habits}
                    habitLogs={habitLogs}
                    deleteJournalEntry={deleteJournalEntry}
                    deleteAllJournals={deleteAllJournals}
                  />
                  </React.Suspense>
                </ErrorBoundary>
              )}
              {activeTab === 'aetherCoach' && (
                <div className="h-[calc(100vh-13rem)] overflow-hidden">
                  <ErrorBoundary name="Aether_Coach_AI">
                    <AetherCoachTabView
                      stats={stats}
                      user={user}
                      journals={journals}
                      tasks={tasks}
                      habits={habits}
                      habitLogs={habitLogs}
                      motivationItems={motivationItems}
                      woopPlans={woopPlans}
                      startPlaylist={startPlaylist}
                      setIsMotivationPortalOpen={setIsMotivationPortalOpen}
                      setPendingMotivation={setPendingMotivation}
                      isSidebarOpen={isSidebarOpen}
                      setIsSidebarOpen={setIsSidebarOpen}
                    />
                  </ErrorBoundary>
                </div>
              )}
              {activeTab === 'grow' && (
                <ErrorBoundary name="Grow_Ascension_Matrix">
                  <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>}>
                  <GrowView
                    stats={stats}
                    user={user}
                    onAddXP={addXP}
                    tasks={tasks}
                    journals={journals}
                    addToTerminal={addToTerminal}
                    timeBlocks={timeBlocks}
                    weeklyReviews={weeklyReviews}
                    openShare={openShare}
                    setSharingAchievement={setSharingAchievement}
                    lifeSyncCategories={stats?.lifeSyncCategories || settings?.lifeSyncCategories || LIFE_CATEGORIES}
                    notepadLines={notepadLines}
                    saveNotepadLines={saveNotepadLines}
                    convertNotepadLineToTask={convertNotepadLineToTask}
                  />
                  </React.Suspense>
                </ErrorBoundary>
              )}
              {activeTab === 'configOs' && (
                <ErrorBoundary name="Config_OS_Settings">
                  {!settings ? <SystemCalibrating /> : (
                    <SettingsView 
                      settings={settings} 
                      stats={stats} 
                      user={user} 
                      onUpdate={updateSettings} 
                      onPurchase={handleUnlockItem}
                    />
                  )}
                </ErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>

      {pendingMotivation && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 glass p-4 rounded-xl border border-white/10 bg-black/80 text-white z-50 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <p className="text-sm">Ready to boost your motivation with: <span className="font-bold">{pendingMotivation.title}</span>?</p>
          <button onClick={() => { startPlaylist(pendingMotivation); setPendingMotivation(null); }} className="px-3 py-1 bg-indigo-600 rounded-lg text-xs font-bold">Play</button>
          <button onClick={() => setPendingMotivation(null)} className="px-3 py-1 bg-white/10 rounded-lg text-xs">Maybe later</button>
        </div>
      )}

      <MotivationPortal 
        isOpen={isMotivationPortalOpen} 
        onClose={() => setIsMotivationPortalOpen(false)}
        items={motivationItems}
        onAdd={addMotivationItem}
        onDelete={deleteMotivationItem}
        currentlyPlaying={currentlyPlaying}
        isPlaying={isPlaying}
        playMode={playMode}
        queue={queue}
        queueIndex={queueIndex}
        setCurrentlyPlaying={setCurrentlyPlaying}
        setIsPlaying={setIsPlaying}
        setPlayMode={setPlayMode}
        setQueue={setQueue}
        setQueueIndex={setQueueIndex}
        startPlaylist={startPlaylist}
      />

      <AnimatePresence>
        {levelUpLevel !== null && (
          <LevelUpOverlay level={levelUpLevel} stats={stats} onClose={() => setLevelUpLevel(null)} />
        )}
        {celebratingAchievement && (
          <AchievementCelebration
            achievement={celebratingAchievement}
            onClose={() => setCelebratingAchievement(null)}
            onShare={(ach) => {
              setSharingAchievement(ach);
              setTimeout(() => {
                openShare(
                  'achievement-share-card',
                  `AETHOS_${ach.title}`,
                  'ACHIEVEMENT CARD'
                );
              }, 100);
            }}
          />
        )}
        {isManualOpen && (
          <ManualModal 
            isOpen={isManualOpen} 
            onClose={() => setIsManualOpen(false)} 
            onRedirect={(tab, subTab) => {
              handleTabChange(tab);
              if (subTab) {
                setDailyWorkSubTab(subTab);
              }
              setIsManualOpen(false);
            }}
            onTriggerMotivation={() => setIsMotivationPortalOpen(true)}
          />
        )}
          {/* Removed WeeklyDebriefModal */}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onComplete={handleOnboardingComplete}
        />
        {shareModal?.isOpen && (
          <ShareModal
            isOpen={shareModal.isOpen}
            onClose={closeShare}
            cardId={shareModal.cardId}
            filename={shareModal.filename}
            title={shareModal.title}
          />
        )}
        {showAICheckinPrompt && (
          <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-6">
            <div className="glass max-w-sm w-full p-8 rounded-3xl border border-cyan/20 space-y-6 text-center">
              <Sparkles size={28} className="text-cyan mx-auto" />
              <div className="space-y-2">
                <h2 className="text-lg font-serif font-black uppercase italic text-white">Daily Check-in</h2>
                <p className="text-xs font-mono text-text-m leading-relaxed">
                  Want Ace's analysis included as part of your daily check-in, alongside Tasks, Journal, and Wheel of Life?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { updateSettings({ includeAIInDailyCheckin: false }); setShowAICheckinPrompt(false); }}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 font-mono text-xs font-black uppercase rounded-xl"
                >
                  No thanks
                </button>
                <button
                  onClick={() => { updateSettings({ includeAIInDailyCheckin: true }); setShowAICheckinPrompt(false); }}
                  className="flex-1 py-3 bg-cyan text-black font-mono text-xs font-black uppercase rounded-xl"
                >
                  Yes, include it
                </button>
              </div>
              <p className="text-[9px] font-mono text-text-m/50 uppercase">You can change this later in settings</p>
            </div>
          </div>
        )}
        {flowPrompt && (
          <div className="fixed bottom-24 md:bottom-8 right-4 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="glass border border-cyan/30 rounded-2xl px-5 py-4 shadow-[0_0_30px_rgba(0,217,255,0.15)] max-w-xs">
              <p className="text-[9px] font-mono text-cyan uppercase tracking-widest font-black mb-2">FLOW_STATE_QUERY</p>
              <p className="text-xs font-mono text-white/80 mb-3 leading-relaxed">
                <span className="text-white font-black">{flowPrompt.taskTitle.slice(0, 30)}{flowPrompt.taskTitle.length > 30 ? '...' : ''}</span>
                <br />Were you in a flow state?
              </p>
              <div className="flex gap-2">
                <button onClick={() => logFlowState(true)} className="flex-1 py-2 bg-cyan/20 hover:bg-cyan/30 border border-cyan/30 text-cyan text-[9px] font-mono font-black uppercase rounded-xl transition-all">⚡ YES</button>
                <button onClick={() => logFlowState(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 text-[9px] font-mono font-black uppercase rounded-xl transition-all">NO</button>
                <button onClick={() => setFlowPrompt(null)} className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/30 text-[9px] font-mono font-black uppercase rounded-xl transition-all">—</button>
              </div>
            </div>
          </div>
        )}
        {completeToast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 glass px-8 py-4 rounded-full border border-cyan/30 text-cyan font-mono font-black tracking-widest text-xs uppercase z-[250] shadow-[0_0_30px_rgba(0,217,255,0.2)]"
          >
            {completeToast}
          </motion.div>
        )}
        {errorToast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 glass px-8 py-4 rounded-full border border-danger/40 text-danger font-mono font-black tracking-widest text-xs uppercase z-[250] shadow-[0_0_30px_rgba(239,68,68,0.25)]"
          >
            ⚠ {errorToast}
          </motion.div>
        )}
        {focusTask && (
          <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center p-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,217,255,0.1),transparent)]" />
            
            <div className="relative space-y-12 max-w-2xl">
              <div className="space-y-4">
                <p className="text-cyan font-mono text-sm tracking-[0.5em] uppercase animate-pulse">FOCUS_MODE_ACTIVE</p>
                <h1 className="text-5xl font-serif font-black text-white uppercase tracking-widest leading-tight">{focusTask.title}</h1>
                <p className="text-text-m font-mono text-sm uppercase opacity-50 tracking-[0.2em]">{focusTask.category} // ESTIMATE: {focusTask.estimate} MIN</p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="w-64 h-64 rounded-full border-4 border-cyan/20 flex items-center justify-center relative">
                   <div className="absolute inset-0 rounded-full border-4 border-cyan border-t-transparent animate-spin duration-[3s]" />
                   <div className="text-6xl font-mono font-black text-cyan">
                      {Math.floor((Date.now() - focusStartTime) / 1000 / 60)}:
                      {String(Math.floor((Date.now() - focusStartTime) / 1000) % 60).padStart(2, '0')}
                   </div>
                </div>
                <p className="text-[10px] font-mono text-text-m uppercase tracking-widest opacity-40">System_Stabilization_In_Progress... Maintain_Neural_Bridge</p>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center">
                {['techy', 'chill', 'hype', 'lofi', 'deep_focus', 'classical'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => playVibe(tag)}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wide border transition-all ${
                      activeVibe === tag ? 'bg-cyan/20 border-cyan/50 text-cyan' : 'bg-white/5 border-white/10 text-text-m hover:border-white/20'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="flex gap-6 justify-center">
                <button 
                  onClick={() => {
                    handleCompleteTask(focusTask);
                    endFocus();
                  }}
                  className="bg-success px-12 py-5 text-black font-black rounded shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                >
                  COMPLETE_PROTOCOL
                </button>
                <button 
                  onClick={endFocus}
                  className="bg-white/5 border border-white/10 px-12 py-5 text-white font-black rounded hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  ABORT_LINK
                </button>
              </div>
            </div>
            
            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end opacity-20 pointer-events-none">
               <div className="space-y-2">
                  <p className="text-[8px] font-mono text-cyan uppercase">Subsystem_Monitoring</p>
                  <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-cyan w-1/3 animate-pulse" />
                  </div>
               </div>
               <p className="text-[8px] font-mono text-white uppercase text-right">No_Distractions_Detected <br/> Neural_Sync_Optimized</p>
            </div>
          </div>
        )}
      </AnimatePresence>
      <FloatingXPRenderer notifications={xpNotifications} />
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        onNavigate={handleTabChange}
        activeTab={activeTab}
      />

      
      {false && (
        <div>
          {tasks.map((task, index) => <div key={`test-task-${task.id || 'task'}-${index}`}>{task.title}</div>)}
          {habits.map((habit, index) => <div key={`test-habit-${habit.id || 'habit'}-${index}`}>{habit.name}</div>)}
          {journals.map((journal, index) => <div key={`test-journal-${journal.id || 'journal'}-${index}`}>{journal.content}</div>)}
          {achievements.map((achievement, index) => <div key={`test-ach-${achievement.id || 'ach'}-${index}`}>{achievement.title}</div>)}
          {timeBlocks.map((block, index) => <div key={`test-block-${block.id || 'block'}-${index}`}>{block.title}</div>)}
          {activityLog.map((activity, index) => <div key={`test-act-${activity.id || 'act'}-${index}`}>{activity.label}</div>)}
          {weeklyReviews.map((review, index) => <div key={`test-review-${review.id || 'review'}-${index}`}>{review.wentWell}</div>)}
        </div>
      )}

      {shareCardReady && (
        <ShareCardWrapper id="share-cards-wrapper">
          <StreakShareCard stats={stats} user={user} />
          <AchievementShareCard
            achievement={sharingAchievement}
            stats={stats}
            user={user}
          />
          <WheelOfLifeShareCard
            stats={stats}
            user={user}
            categories={stats?.lifeSyncCategories || LIFE_CATEGORIES}
          />
          <HabitHeatmapShareCard
            stats={stats}
            user={user}
            habits={habits}
            habitLogs={habitLogs}
          />
        </ShareCardWrapper>
      )}
    </div>
  );
}

const FloatingXPRenderer = React.memo(function FloatingXPRenderer({ notifications }: { notifications: XPNotification[] }) {
  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-[100] flex flex-col items-center gap-4">
      <AnimatePresence>
        {notifications.map((n, idx) => (
          <motion.div
            key={`xp-${n.id}-${idx}`}
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: -120, scale: 1.5 }}
            exit={{ opacity: 0, filter: 'blur(10px)', scale: 2 }}
            transition={{ duration: 1.2, ease: PREMIUM_BEZIER }}
            className="flex flex-col items-center"
          >
            <span className="text-5xl font-serif font-black text-white text-glow-white italic leading-none">+{n.amount} XP</span>
            <span className="text-[10px] font-mono font-bold text-black bg-cyan px-3 py-1 rounded-sm shadow-2xl uppercase tracking-[0.2em] mt-2 border border-white/20">
              {n.source}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

interface TerminalLog {
  id: string;
  msg: string;
  type: 'info' | 'warn' | 'error' | 'success';
  time: string;
}

const SystemTerminal = React.memo(function SystemTerminal({ logs = [] }: { logs?: TerminalLog[] }) {
  return (
    <div className="glass p-4 rounded-xl border border-white/5 bg-black/40 font-mono text-xs text-text-m h-48 overflow-y-auto space-y-1 scrollbar-thin">
      {logs.map((log, index) => (
        <div key={`${log.id}-${index}`} className="flex gap-2">
          <span className="text-text-s font-bold shrink-0">[{log.time}]</span>
          <span className={cn(
            "break-all",
            log.type === 'error' ? "text-accent" :
            log.type === 'warn' ? "text-warning" :
            log.type === 'success' ? "text-success" :
            "text-cyan"
          )}>
            {log.msg}
          </span>
        </div>
      ))}
    </div>
  );
});

function AITimetableModal({ 
  isOpen, 
  onClose, 
  onGenerate,
  initialRoutine,
  onUpdateRoutine
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onGenerate: (routine: string[]) => void;
  initialRoutine: string[];
  onUpdateRoutine: (routine: string[]) => void;
}) {
  const [routine, setRoutine] = useState<string[]>(initialRoutine);
  const [newRoutine, setNewRoutine] = useState('');

  const addRoutine = () => {
    if (newRoutine.trim() && !routine.includes(newRoutine.trim())) {
      const updated = [...routine, newRoutine.trim()];
      setRoutine(updated);
      onUpdateRoutine(updated);
      setNewRoutine('');
    }
  };

  const removeRoutine = (r: string) => {
    const updated = routine.filter(x => x !== r);
    setRoutine(updated);
    onUpdateRoutine(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-background/90 backdrop-blur-2xl" onClick={onClose}>
      <motion.div 
        initial={{ y: 50, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 50, scale: 0.9, opacity: 0 }}
        className="glass max-w-2xl w-full p-10 rounded-[3rem] border border-white/10 space-y-8 relative overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <Sparkles size={80} className="text-cyan" />
        </div>

        <div className="space-y-2">
           <div className="flex items-center gap-2 text-cyan">
              <Sparkles size={16} />
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em]">AI_Core_Protocol</span>
           </div>
           <h3 className="text-4xl font-serif font-black text-white italic uppercase tracking-tighter">NEURAL_SCHEDULER</h3>
           <p className="text-text-m font-mono text-xs uppercase opacity-60">Optimize your temporal grid using AI logic.</p>
        </div>

        <div className="space-y-6">
           <div className="space-y-3">
              <label className="text-[10px] font-mono text-text-m uppercase font-black tracking-widest">A_Daily_Sync_Events</label>
              <div className="flex flex-wrap gap-2">
                 {routine.map((r, i) => (
                   <div key={`${r}-${i}`} className="flex items-center gap-2 bg-white/5 border border-white/10 pl-3 pr-1 py-1 rounded-full group">
                      <span className="text-[10px] font-mono text-white uppercase italic">{r}</span>
                      <button onClick={() => removeRoutine(r)} className="p-1 hover:text-danger opacity-40 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                   </div>
                 ))}
                 <div className="flex items-center gap-2 bg-black/40 border border-white/5 pl-3 pr-1 py-1 rounded-full focus-within:border-cyan transition-all">
                    <input 
                      type="text" 
                      value={newRoutine}
                      onChange={e => setNewRoutine(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addRoutine()}
                      placeholder="ADD_ROUTINE..."
                      className="bg-transparent border-none outline-none text-[10px] font-mono text-white uppercase w-24"
                    />
                    <button onClick={addRoutine} className="p-1 hover:text-cyan opacity-40 hover:opacity-100 transition-opacity"><Plus size={12} /></button>
                 </div>
              </div>
              <p className="text-[9px] font-mono text-text-s uppercase opacity-40 leading-relaxed">Include fixed events (School, Tuition, Gym, etc.) for better synchronization.</p>
           </div>

           <div className="p-6 bg-cyan/5 rounded-[2rem] border border-cyan/10 flex items-start gap-4">
              <div className="p-3 bg-cyan/10 rounded-2xl">
                 <Zap className="text-cyan" size={24} />
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-mono text-cyan uppercase font-black">AI_Logic_Initialization</p>
                 <p className="text-xs font-serif italic text-text-p leading-relaxed">
                   The scheduler will analyze your pending tasks, priority levels, and routine events to generate an optimized time-blocked day.
                 </p>
              </div>
           </div>
        </div>

        <div className="flex gap-4 pt-4">
           <button onClick={onClose} className="flex-1 py-5 glass border border-white/10 text-text-m font-mono font-black uppercase rounded-2xl hover:bg-white/5 transition-all text-sm tracking-widest">Abort</button>
           <button 
             onClick={() => onGenerate(routine)} 
             className="flex-1 py-5 bg-cyan text-black font-mono font-black uppercase rounded-2xl shadow-[0_0_30px_rgba(0,217,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-widest"
           >
             Initialize_Sync
           </button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Components ---

const NavButton = React.memo(function NavButton({ active, onClick, icon, label, locked, unlockLevel, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; locked?: boolean; unlockLevel?: number; badge?: string }) {
  return (
    <button 
      onClick={locked ? undefined : onClick}
      className={cn(
        "relative p-3 lg:p-4 transition-all group shrink-0 flex items-center md:justify-center lg:justify-start gap-4 w-full rounded-xl min-h-[44px]",
        active ? "text-accent bg-accent/10 lg:bg-transparent lg:border-l-4 lg:border-accent" : (locked ? "text-text-s/30 cursor-not-allowed" : "text-text-m hover:text-text-p hover:bg-white/5")
      )}
    >
      <div className={cn("relative z-10 shrink-0", active && "accent-glow text-accent", locked && "opacity-40 grayscale")}>
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-accent text-white text-[10px] font-mono font-black rounded-sm border border-white/20 animate-pulse">
            {badge}
          </span>
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={10} className="text-text-s opacity-20" />
          </div>
        )}
      </div>
      
      <span className={cn(
        "text-[10px] lg:text-xs uppercase font-black tracking-widest whitespace-nowrap hidden lg:block overflow-hidden transition-all duration-300 truncate",
        locked ? "text-text-s/50" : (active ? "text-accent text-glow-accent" : "text-text-m")
      )}>
        {locked ? `LOCKED (LVL ${unlockLevel})` : label}
      </span>

      {/* Legacy Tooltip behavior when collapsed on tablet but hidden on desktop */}
      <span className={cn(
        "absolute left-full ml-4 px-2 py-1 text-[10px] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity hidden md:group-hover:block lg:group-hover:hidden whitespace-nowrap pointer-events-none z-50 bg-black/90 border border-white/10 text-white"
      )}>
        {locked ? `LOCKED (LVL ${unlockLevel})` : label}
      </span>

      {active && (
        <div 
          className={cn(
            "absolute inset-0 bg-accent/10 transition-all rounded-xl lg:rounded-none lg:bg-transparent lg:border-r-2 lg:border-accent -right-4 lg:right-[-2px] hidden lg:block"
          )}
        />
      )}
    </button>
  );
});

function AuthorizationPage({ onBack, onGoogleLogin }: { onBack: () => void; onGoogleLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup' | 'login'>('login');

  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleGeneratePassword = async () => {
    setPasswordLoading(true);
    try {
      const suggested = await suggestPassword();
      setPassword(suggested);
    } catch (err) {
      setError("FAILED_TO_GENERATE_PASSWORD");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAuth = async (targetMode: 'signin' | 'signup' | 'login') => {
    if (!email || !password) {
      setError("EMAIL_AND_PASSWORD_REQUIRED");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (targetMode === 'signup') {
        await registerWithEmail(email, password);
      } else {
        // Both 'login' and 'signin' use the same backend function for email/pass
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = err.message || "AUTH_FAILED";
      if (err.code === 'auth/user-not-found') msg = "USER_NOT_FOUND_SIGN_UP_INSTEAD";
      if (err.code === 'auth/wrong-password') msg = "INVALID_CREDENTIALS";
      if (err.code === 'auth/email-already-in-use') msg = "EMAIL_ALREADY_REGISTERED";
      if (err.code === 'auth/invalid-email') msg = "INVALID_EMAIL_FORMAT";
      setError(msg.replace('Firebase: ', '').split('(')[0].trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 relative overflow-hidden selection:bg-[#C8651B]/30">
      {/* Subtle background: one soft radial gradient centered */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(200,101,27,0.04),transparent_70%)] pointer-events-none" />

      {/* Top — Back button */}
      <button 
        onClick={onBack} 
        className="absolute top-8 left-8 flex items-center gap-2 text-[10px] font-mono text-white/20 hover:text-white/60 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={12} />
        Back
      </button>

      {/* Clean floating form container */}
      <div className="max-w-sm w-full px-6 relative z-10 flex flex-col">
        {/* 1. Logo/Brand mark */}
        <div className="mb-10">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em]">AETHOS</p>
        </div>

        {/* 2. Heading */}
        <div className="mb-10">
          <h1 className="text-3xl font-serif font-black text-white mb-2">
            {mode === 'signup' ? 'Create account.' : 'Welcome back.'}
          </h1>
          <p className="text-sm text-white/30 font-mono">
            {mode === 'signup' ? 'Start your journey.' : 'Continue where you left off.'}
          </p>
        </div>

        {/* 3. Google button FIRST */}
        <button
          onClick={onGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm font-mono text-white/70 hover:text-white mb-6 disabled:opacity-50 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* 4. Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-[0.5px] bg-white/10" />
          <span className="text-[10px] font-mono text-white/20 uppercase">or</span>
          <div className="flex-1 h-[0.5px] bg-white/10" />
        </div>

        {/* 5. Email input */}
        <div className="mb-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-[#C8651B]/50 focus:bg-white/8 transition-all"
          />
        </div>

        {/* 6. Password input */}
        <div className="mb-6">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-[#C8651B]/50 focus:bg-white/8 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 text-white/50 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {mode === 'signup' && (
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  disabled={passwordLoading}
                  className="p-2 text-[#C8651B] hover:text-[#b55a17] disabled:opacity-50"
                  title="Generate secure password"
                >
                  <Sparkles size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 7. Error message */}
        {error && (
          <p className="text-xs font-mono text-red-400/70 mb-4 text-center">{error}</p>
        )}

        {/* 8. Main CTA button */}
        <button
          onClick={() => handleAuth(mode)}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#C8651B] hover:bg-[#b55a17] text-white text-sm font-mono font-bold tracking-widest uppercase transition-all mb-6 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading && (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full shrink-0" />
          )}
          {mode === 'signup' ? 'Create Account' : 'Sign In'}
        </button>

        {/* 9. Mode toggle */}
        <p className="text-center text-xs font-mono text-white/20">
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            className="text-white/50 hover:text-white underline underline-offset-2 transition-colors ml-1 cursor-pointer"
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>

      {/* Bottom Corner */}
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-mono text-white/10 uppercase tracking-widest text-center">
        AETHOS v4.8 — Encrypted
      </p>
    </div>
  );
}

function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const testDoc = doc(db, 'test', 'connectivity-check');
        await getDocFromServer(testDoc);
        setDbStatus('online');
      } catch (err: any) {
        console.warn("DB Health Check Failed:", err.message);
        if (err.message.includes('offline')) {
          setDbStatus('offline');
        } else {
          // If it's permission denied, it's still "online" (server responded)
          setDbStatus('online');
        }
      }
    };
    checkDb();
  }, []);

  useEffect(() => {
    const hero = document.getElementById('hero-section');
    const cta = document.getElementById('sticky-cta');
    
    if (!hero || !cta) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cta.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
          cta.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
        } else {
          cta.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
          cta.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const handleEnter = () => {
    setIsInitializing(true);
    setTimeout(onEnter, 2000);
  };

  if (isInitializing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-8 px-8 text-center"
      >
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.5em]">Booting AETHOS...</p>
        <div className="w-64 h-[1px] bg-white/10 relative overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="absolute top-0 left-0 h-full bg-[#C8651B]"
            style={{ boxShadow: '0 0 12px rgba(200,101,27,0.8)' }}
          />
        </div>
        <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Synchronizing Neural Nodes</p>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto overflow-x-hidden selection:bg-[#C8651B]/30 relative bg-[#080808] text-white flex flex-col justify-between">
      {/* Top Nav */}
      <header className="h-16 px-8 md:px-16 flex items-center justify-between border-b border-white/5 bg-[#080808] z-30 shrink-0 w-full animate-fade-in">
        <a href="/" className="font-serif font-black text-xl text-[#C8651B]">AETHOS</a>
        
        {/* Mobile menu trigger */}
        <button 
          className="md:hidden text-white/50"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu size={24} />
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[10px] font-mono text-white/50 uppercase tracking-widest hover:text-white transition-colors"
          >
            How It Works
          </button>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[10px] font-mono text-white/50 uppercase tracking-widest hover:text-white transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[10px] font-mono text-white/50 uppercase tracking-widest hover:text-white transition-colors"
          >
            About
          </button>
        </div>
        <button 
          onClick={handleEnter}
          disabled={dbStatus === 'checking'}
          className="hidden md:block border border-[#C8651B] text-white text-[10px] font-mono px-5 py-2 rounded-full hover:bg-[#C8651B] transition-all duration-300 disabled:opacity-50"
        >
          ENTER AETHOS →
        </button>
      </header>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-[#080808] z-40 flex flex-col items-center justify-center gap-8 md:hidden">
          <button 
            className="absolute top-6 right-8 text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
          <button
            onClick={() => { document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
            className="text-xl font-mono text-white uppercase tracking-widest"
          >
            How It Works
          </button>
          <button
            onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
            className="text-xl font-mono text-white uppercase tracking-widest"
          >
            Features
          </button>
          <button
            onClick={() => { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
            className="text-xl font-mono text-white uppercase tracking-widest"
          >
            About
          </button>
          <button 
            onClick={handleEnter}
            disabled={dbStatus === 'checking'}
            className="border border-[#C8651B] text-white text-sm font-mono px-8 py-3 rounded-full hover:bg-[#C8651B] transition-all duration-300 disabled:opacity-50"
          >
            ENTER AETHOS →
          </button>
        </div>
      )}


      {/* Sticky Mobile CTA */}
      <div 
        id="sticky-cta"
        className={cn(
          "fixed bottom-4 left-4 right-4 z-50 md:hidden transition-all duration-300",
          "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <button 
          onClick={handleEnter}
          disabled={dbStatus === 'checking'}
          className="w-full bg-[#C8651B] text-white text-[12px] font-mono py-4 rounded-full shadow-lg hover:bg-[#b05412] transition-all duration-300"
        >
          ENTER AETHOS →
        </button>
      </div>

      {/* Hero Section */}
      <div id="hero-section" className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] flex-grow w-full items-center">
        {/* Left Side */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 py-16 text-left">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-mono text-cyan uppercase tracking-[0.5em] mb-6"
          >
            AETHOS
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-serif font-black uppercase leading-[0.9] text-[3.5rem] md:text-[5rem] lg:text-[6rem] text-white"
          >
            A personal operating system<br/>
            for becoming<br/>
            better every day.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-white/50 font-mono max-w-md mt-8 leading-relaxed"
          >
            AETHOS connects your daily actions, reflection, goals, and AI coaching inside one system.
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={handleEnter}
              disabled={dbStatus === 'checking'}
              className="px-8 py-4 bg-white text-black hover:bg-white/90 transition-colors uppercase font-mono text-sm tracking-widest rounded-full"
            >
              ENTER AETHOS →
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 border border-white/20 text-white hover:border-white/50 transition-colors uppercase font-mono text-sm tracking-widest rounded-full flex items-center gap-2"
            >
              SEE HOW IT WORKS ↓
            </motion.button>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full md:w-1/2 relative flex items-center justify-center overflow-hidden h-[380px] md:h-full min-h-[380px]">
          {/* Background glow circle */}
          <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0, 217, 255, 0.12), rgba(46, 107, 158, 0.08), transparent 70%)' }}
          />

          {/* Rotating polygon SVG */}
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
            width="340" height="340" viewBox="0 0 340 340"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none z-10"
            aria-hidden="true"
            focusable="false"
          >
            <polygon
              points="170,30 290,105 290,235 170,310 50,235 50,105"
              fill="none"
              stroke="#00D9FF"
              strokeWidth="0.5"
              strokeOpacity="0.3"
            />
            {/* Center dot */}
            <circle cx="170" cy="170" r="4" fill="#00D9FF" opacity="0.8" />
          </motion.svg>
          
          {/* System Labels */}
          <div className="absolute text-[8px] font-mono text-white/30 uppercase tracking-widest flex flex-col gap-8 z-20">
              <span className="absolute -top-32">SYSTEM: AETHOS</span>
              <span className="absolute top-32 -left-20">CHRONOS</span>
              <span className="absolute top-32 -right-20">REFLECT</span>
              <span className="absolute bottom-32 -left-20">GROW</span>
              <span className="absolute bottom-32 -right-20">COACH</span>
          </div>
        </div>
      </div>

      <HowAethosWorks />

      {/* FEATURES SECTION */}
      <section
        id="features"
        style={{ background: '#080808' }}
        className="min-h-screen px-8 md:px-16 py-32 relative overflow-hidden shrink-0"
      >
        {/* Background grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-20 relative"
        >
          <p className="text-[10px] font-mono text-[#C8651B] uppercase tracking-[0.5em] mb-4">
            CORE_MODULES
          </p>
          <div className="flex items-end justify-between flex-wrap gap-6">
            <h2 className="text-5xl md:text-7xl font-serif font-black uppercase italic text-white leading-none">
              Everything<br/>
              <span className="text-[#C8651B]">You Need.</span>
            </h2>
            <p className="text-sm font-mono text-white/30 max-w-xs leading-relaxed">
              Nine integrated modules. One operating system.
              No switching between apps.
            </p>
          </div>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
          {[
            {
              number: '01',
              title: 'TASK_QUEUE',
              label: 'Task Management',
              description: 'Priority-based tasks with XP rewards. Challenge mode, speed bonuses, streak multipliers. Every completion moves you forward.',
              color: '#C8651B',
              icon: '⚡',
            },
            {
              number: '02',
              title: 'ROUTINE_MATRIX',
              label: 'Habit Tracker',
              description: '52-week heatmap showing your consistency. Daily checkboxes, per-habit streaks, category XP multipliers. Discipline made visible.',
              color: '#00D9FF',
              icon: '🔥',
            },
            {
              number: '03',
              title: 'AETHOS_COACH',
              label: 'AI Life Coach',
              description: 'An AI that reads your mood, tasks, habits, and life balance — then gives advice specific to YOU. Not generic. Personal.',
              color: '#7f77dd',
              icon: '🧠',
            },
            {
              number: '04',
              title: 'LIFE_SYNC',
              label: 'Wheel of Life',
              description: 'Track 8 life areas on a radar chart. Auto-updates from your habits and journal mood. See your balance evolve week by week.',
              color: '#C9A84C',
              icon: '🎯',
            },
            {
              number: '05',
              title: 'NEURAL_LOG',
              label: 'Smart Journal',
              description: 'Rich text journaling with mood tracking, reflection prompts, word count XP, and AI-powered insights from your entries.',
              color: '#5dcaa5',
              icon: '📝',
            },
            {
              number: '06',
              title: 'FOCUS_PROTOCOL',
              label: 'Pomodoro Timer',
              description: '25/5 or 50/10 work cycles. Session tracking, Web Audio tones, XP per session. Deep work has never been this rewarding.',
              color: '#ef4444',
              icon: '⏱',
            },
            {
              number: '07',
              title: 'TEMPORAL_SYNC',
              label: 'AI Timetable',
              description: 'Tell the AI your routine. It builds your entire day schedule. Month, week, and day views. Time blocking made effortless.',
              color: '#2E6B9E',
              icon: '📅',
            },
            {
              number: '08',
              title: 'NEURAL_EVOLUTION',
              label: 'Stats + Achievements',
              description: '30 achievements across 4 categories. Month-over-month evolution tracking. Level 1 to 100 with unlockable features.',
              color: '#C9A84C',
              icon: '🏆',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group relative border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all duration-500 cursor-default"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at top left, ${feature.color}08, transparent 60%)`,
                }}
              />

              {/* Number + icon row */}
              <div className="flex items-center justify-between mb-6 relative">
                <span
                  className="text-[10px] font-mono tracking-widest"
                  style={{ color: `${feature.color}60` }}
                >
                  #{feature.number}
                </span>
                <span className="text-2xl">{feature.icon}</span>
              </div>

              {/* Title */}
              <p
                className="text-[9px] font-mono uppercase tracking-[0.4em] mb-2 relative"
                style={{ color: feature.color }}
              >
                {feature.title}
              </p>
              <h3 className="text-lg font-serif font-black uppercase italic text-white mb-3 relative">
                {feature.label}
              </h3>

              {/* Description */}
              <p className="text-xs font-mono text-white/35 leading-relaxed relative">
                {feature.description}
              </p>

              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-6 right-6 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${feature.color}40, transparent)` }}
              />
            </motion.div>
          ))}
        </div>

        {/* XP highlight bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 border border-white/5 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: 'rgba(200,101,27,0.04)' }}
        >
          <div>
            <p className="text-[10px] font-mono text-[#C8651B] uppercase tracking-widest mb-2">
              GAMIFICATION_ENGINE
            </p>
            <h3 className="text-2xl font-serif font-black uppercase italic text-white">
              Everything gives you XP.
            </h3>
            <p className="text-sm font-mono text-white/30 mt-2">
              Tasks, habits, journals, Pomodoros, weekly reviews — all tracked, all rewarded.
            </p>
          </div>
          <div className="flex gap-8 flex-shrink-0">
            {[
              { label: 'Max Level', value: '100' },
              { label: 'Achievements', value: '30' },
              { label: 'Daily XP Cap', value: '50' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-serif font-black italic text-[#C8651B]">
                  {stat.value}
                </p>
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <AethosFaq />

      {/* ABOUT SECTION */}
      <section
        id="about"
        style={{ background: '#060606' }}
        className="min-h-screen px-8 md:px-16 py-32 relative overflow-hidden shrink-0"
      >
        {/* Background accent */}
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(46,107,158,0.06), transparent 70%)',
          top: '50%',
          right: '-100px',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }} />

        <div className="max-w-7xl mx-auto relative overflow-hidden">

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-20"
          >
            <p className="text-[10px] font-mono text-[#2E6B9E] uppercase tracking-[0.5em] mb-4">
              THE_MISSION
            </p>
            <h2 className="text-5xl md:text-7xl font-serif font-black uppercase italic text-white leading-none">
              Built for<br/>
              <span className="text-[#2E6B9E]">Builders.</span>
            </h2>
          </motion.div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left — story */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <p className="text-base font-mono text-white/50 leading-relaxed">
                AETHOS was built out of frustration. Notion for planning. Done for habits. Day One for journaling. YouTube for motivation. Four apps, four logins, four context switches — and still no clear picture of progress.
              </p>
              <p className="text-base font-mono text-white/50 leading-relaxed">
                The idea was simple: what if all your self-improvement tools talked to each other? Your mood updates your life balance. Your habits feed your goals. Your AI coach reads everything and gives advice that's actually relevant to you.
              </p>
              <p className="text-base font-mono text-white/50 leading-relaxed">
                That's AETHOS. One operating system for your ambition. Built for founders, students, and anyone serious about becoming better.
              </p>

              {/* Founder note */}
              <div
                className="border border-white/5 rounded-2xl p-6 mt-8"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">
                  FOUNDER_NOTE
                </p>
                <p className="text-sm font-mono text-white/50 italic leading-relaxed">
                  "I built this at 16 because I couldn't find a single app that did everything I needed without making me switch contexts 10 times a day. AETHOS is the tool I wished existed."
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-[#C8651B]/20 border border-[#C8651B]/30 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-[#C8651B]">V</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
                      Ved
                    </p>
                    <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
                      Founder, AETHOS
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right — values + stats */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-4"
            >
              {/* Core values */}
              {[
                {
                  title: 'FREE FOREVER',
                  description: 'No paywalls on core features. Self-improvement should be accessible to everyone, not gated behind a subscription.',
                  color: '#C8651B',
                  icon: '🔓',
                },
                {
                  title: 'INTEGRATED BY DESIGN',
                  description: 'Everything talks to everything. Your habits update your life balance. Your mood feeds your AI coach. Nothing is siloed.',
                  color: '#00D9FF',
                  icon: '⚡',
                },
                {
                  title: 'AI THAT KNOWS YOU',
                  description: 'Not a generic chatbot. An AI coach that reads your actual data — mood trends, habit streaks, life balance — and responds accordingly.',
                  color: '#7f77dd',
                  icon: '🧠',
                },
                {
                  title: 'PROGRESS MADE VISIBLE',
                  description: 'Heatmaps, radar charts, XP bars, streak counters. Your growth is always visible, always tangible, always motivating.',
                  color: '#C9A84C',
                  icon: '📈',
                },
              ].map((value, i) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="flex gap-4 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: `${value.color}15` }}
                  >
                    {value.icon}
                  </div>
                  <div>
                    <p
                      className="text-[9px] font-mono uppercase tracking-widest mb-1"
                      style={{ color: value.color }}
                    >
                      {value.title}
                    </p>
                    <p className="text-xs font-mono text-white/35 leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section
        style={{ background: '#080808' }}
        className="px-8 md:px-16 py-32 relative overflow-hidden shrink-0"
      >
        {/* Glow */}
        <div style={{
          position: 'absolute',
          width: '800px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,101,27,0.08), transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center relative"
        >
          <p className="text-[10px] font-mono text-[#C8651B] uppercase tracking-[0.5em] mb-6">
            INITIALIZE_SEQUENCE
          </p>
          <h2 className="text-5xl md:text-7xl font-serif font-black uppercase italic text-white leading-none mb-8">
            Ready to<br/>
            <span className="text-[#C8651B]">Level Up?</span>
          </h2>
          <p className="text-sm font-mono text-white/30 leading-relaxed mb-12 max-w-md mx-auto">
            Join the early access. Free forever.
            No credit card. No commitment.
            Just results.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleEnter}
            className="group flex items-center gap-4 mx-auto"
          >
            <div className="w-14 h-14 rounded-full border border-[#C8651B] flex items-center justify-center group-hover:bg-[#C8651B] transition-all duration-500">
              <ChevronRight className="w-6 h-6 text-[#C8651B] group-hover:text-white transition-colors duration-500" />
            </div>
            <span className="text-base font-mono text-white/50 group-hover:text-white transition-colors uppercase tracking-widest">
              Initialize Boot Sequence
            </span>
          </button>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-8 mt-16">
            {[
              { label: 'Free Forever', icon: '🔓' },
              { label: 'No Credit Card', icon: '💳' },
              { label: 'Google Sign-In', icon: '🔐' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-sm">{item.icon}</span>
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Bottom Strip */}
      <footer className="h-auto border-t border-white/5 bg-[#080808] z-30 shrink-0 w-full py-12 px-8 md:px-16 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="flex flex-col gap-2">
            <span className="font-serif font-black text-xl text-[#C8651B]">AETHOS</span>
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Personal Operating System</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-[10px] font-mono">
            <div className="flex flex-col gap-2">
              <span className="text-white/50 uppercase tracking-widest">Product</span>
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-white/30 hover:text-white transition-colors">How It Works</button>
              <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-white/30 hover:text-white transition-colors">Features</button>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-white/50 uppercase tracking-widest">Company</span>
              <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="text-white/30 hover:text-white transition-colors">About</button>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-white/50 uppercase tracking-widest">Support</span>
              <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="text-white/30 hover:text-white transition-colors">FAQ</button>
              <a href="/privacy" className="text-white/30 hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-white/30 border-t border-white/5 pt-8">
          <span className="font-bold text-[#C8651B] tracking-wider">AETHOS @2026</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
              <span>AETHER_NET_OK</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono font-black text-white uppercase tracking-widest truncate">AETHOS — Live Life Gamified</p>
          <p className="text-[9px] font-mono text-white/40 truncate">Free · No credit card needed</p>
        </div>
        <button
          onClick={handleEnter}
          className="shrink-0 px-5 py-2.5 bg-[#C8651B] hover:bg-[#C8651B]/90 text-white font-mono font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
        >
          START FREE →
        </button>
      </div>

    </div>
  );
}

function CardDecoration() {
  return (
    <>
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />
      <div className="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none" />
    </>
  );
}

function NeuralCore({ stats }: { stats: UserStats | null }) {
  const { progress, totalForLevel } = getLevelFromXP(stats?.experience || 0);
  const percent = (progress / totalForLevel) * 100;

  return (
    <div className="absolute left-[-20px] top-[-20px] w-48 h-48 pointer-events-none opacity-25">
      <div className="w-full h-full relative">
        <div className="absolute inset-0 border border-accent/20 rounded-full border-dashed" />
        <div className="absolute inset-[25%] border border-cyan/30 rounded-full bg-cyan/5" />
        <div className="absolute inset-0">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={`radar-scanner-${i}`}
              className="absolute w-1 h-1 bg-accent rounded-full opacity-60"
              style={{ 
                top: '50%', 
                left: '50%', 
                transform: `rotate(${i * 90}deg) translateY(-80px)` 
              }}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center translate-y-4">
         <span className="text-[10px] font-mono text-cyan/40 font-black">{Math.floor(percent)}%</span>
      </div>
    </div>
  );
}

function CommandPalette({ isOpen, onClose, onNavigate, activeTab }: { isOpen: boolean; onClose: () => void; onNavigate: (tab: any) => void; activeTab: string }) {
  const [search, setSearch] = useState('');
  const commands = [
    { id: 'dash', label: 'GO_TO_CORE_COMMAND', icon: <HardDrive size={18} />, tab: 'dashboard' },
    { id: 'dailyWork', label: 'GO_TO_DAILY_WORK', icon: <CheckCircle2 size={18} />, tab: 'dailyWork' },
    { id: 'reflect', label: 'GO_TO_REFLECT_JOURNAL', icon: <Book size={18} />, tab: 'reflect' },
    { id: 'grow', label: 'GO_TO_GROW_SYSTEMS', icon: <TrendingUp size={18} />, tab: 'grow' },
    { id: 'coach', label: 'GO_TO_AETHOS COACH', icon: <Sparkles size={18} />, tab: 'aetherCoach' },
    { id: 'settings', label: 'GO_TO_CONFIG_OS', icon: <Settings size={18} />, tab: 'configOs' },
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-2xl glass rounded-2xl border border-white/20 overflow-hidden shadow-2xl relative z-10"
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-white/5">
              <Command className="text-accent" size={24} />
              <input 
                autoFocus
                placeholder="EXECUTE_COMMAND..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none text-white font-mono outline-none text-lg"
              />
              <kbd className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded text-text-m">ESC</kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2 no-scrollbar">
              {filtered.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={() => { onNavigate(cmd.tab); onClose(); }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl transition-all group",
                    activeTab === cmd.tab ? "bg-accent/20 border border-accent/40" : "hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-lg bg-white/5", activeTab === cmd.tab ? "text-accent" : "text-text-m")}>
                      {cmd.icon}
                    </div>
                    <span className={cn("font-mono text-sm uppercase tracking-widest", activeTab === cmd.tab ? "text-white font-black" : "text-text-m")}>
                      {cmd.label}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-text-s opacity-0 group-hover:opacity-100" />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-12 text-center opacity-20">
                  <p className="font-mono text-xs uppercase tracking-widest">COMMAND_NOT_FOUND</p>
                </div>
              )}
            </div>
            <div className="p-3 bg-black/40 border-t border-white/5 flex justify-between items-center px-6">
              <span className="text-[8px] font-mono text-text-m uppercase opacity-40 italic">AETHOS_RECALIBRATION v2.1.0</span>
              <div className="flex gap-4">
                <span className="text-[8px] font-mono text-text-m uppercase">↑↓ NAVIGATE</span>
                <span className="text-[8px] font-mono text-text-m uppercase">↵ EXECUTE</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}



function DailyChallengeWidget({ stats }: { stats: UserStats | null }) {
  const challenge = stats?.dailyChallenge;
  if (!challenge) return null;
  
  const template = DAILY_CHALLENGES.find(c => c.id === challenge.id);
  const progressPercent = Math.min((challenge.progress / challenge.goal) * 100, 100);
  
  return (
    <section className="glass p-6 rounded-xl border border-border-subtle relative overflow-hidden group">
      <CardDecoration />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="flex items-center gap-2 text-[10px] font-bold text-text-m uppercase tracking-[0.3em] font-mono">
          <Zap size={14} className="text-warning animate-pulse" />
          DAILY_CHALLENGE
        </h2>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded border font-mono",
          challenge.completed 
            ? "border-success/40 text-success bg-success/5" 
            : "border-warning/40 text-warning bg-warning/5"
        )}>
          {challenge.completed ? 'SYNCHRONIZED' : `+${template?.xpReward || 0} XP`}
        </span>
      </div>
      
      <div className="relative z-10">
        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-text-p mb-3 flex items-center gap-2">
          {template?.label || 'COMMENCIVE_OBJECTIVE'}
          {challenge.completed && <CheckCircle2 size={16} className="text-success" />}
        </h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-text-s uppercase">
            <span>{challenge.completed ? 'GOAL_MET' : 'Progress'}</span>
            <span>{Math.floor(challenge.progress)} / {challenge.goal}</span>
          </div>
          <div className="h-1.5 w-full bg-background-nested rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className={cn(
                "h-full transition-all duration-1000 shadow-[0_0_10px_currentColor]",
                challenge.completed ? "bg-success text-success" : "bg-warning text-warning"
              )}
            />
          </div>
          <p className="text-[9px] font-mono text-text-m italic opacity-60">
            {challenge.completed 
              ? 'OBJECTIVE_PURIFIED. REWARD_GRANTED.' 
              : progressPercent > 70 ? "SYSTEM_LINK_NEAR_CAPACITY. PUSH_FURTHER." 
              : 'SYSTEM_RESOURCE_NEEDS_ALLOCATION. PROCEED.'}
          </p>
        </div>
      </div>
      <div className="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none" />
    </section>
  );
}

function LevelProgressBar({ stats }: { stats: UserStats | null }) {
  if (!stats) return null;
  const { currentXP, nextLevelXP, levelProgress } = getLevelFromXP(stats.experience);

  return (
    <section className="glass p-6 rounded-xl border border-white/5 relative overflow-hidden group">
      <CardDecoration />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="flex items-center gap-2 text-[10px] font-bold text-text-m uppercase tracking-[0.3em] font-mono">
          <TrendingUp size={14} className="text-cyan animate-pulse" />
          NEURAL_SYNCHRONIZATION
        </h2>
        <span className="text-[10px] px-2 py-0.5 rounded border border-cyan/40 text-cyan bg-cyan/5 font-mono">
          LEVEL {stats.level}
        </span>
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
             <p className="text-2xl font-serif font-black text-text-p tracking-tight italic uppercase text-glow-white">
               {Math.floor(levelProgress)}% SYNC
             </p>
             <p className="text-[9px] font-mono text-text-m uppercase tracking-widest opacity-60">
               {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} DATA_POINTS
             </p>
          </div>
          <p className="text-[8px] font-mono text-text-m uppercase border-b border-cyan/20 pb-1">
            {nextLevelXP - currentXP} XP until LEVEL {stats.level + 1}
          </p>
        </div>

        <div className="h-2 w-full bg-background-nested rounded-full overflow-hidden border border-white/5 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${levelProgress}%` }}
            className="h-full bg-gradient-to-r from-cyan to-accent rounded-full shadow-[0_0_15px_rgba(0,217,255,0.5)]"
          />
        </div>
      </div>
    </section>
  );
}

function ProfileCard({ 
  stats, 
  user,
  openShare
}: { 
  stats: UserStats | null; 
  user: User;
  openShare?: (cardId: string, filename: string, title: string) => void;
}) {
  if (!stats) return null;
  const { currentXP, nextLevelXP, levelProgress } = getLevelFromXP(stats.experience);
  
  // Calculate pace and estimate (simplified)
  const today = new Date().toISOString().split('T')[0];
  const todayXP = stats.activityLog?.filter(a => a.timestamp.startsWith(today)).reduce((acc, a) => acc + a.xp, 0) || 100;
  const xpNeeded = nextLevelXP - currentXP;
  const estimatedDays = Math.ceil(xpNeeded / Math.max(todayXP, 100));

  const streak = stats.currentStreak || 0;
  const streakColor =
    streak >= 365 ? 'text-yellow-400' :
    streak >= 90  ? 'text-orange-400' :
    streak >= 30  ? 'text-purple-400' :
    streak >= 7   ? 'text-cyan-400' :
    'text-white/60';

  const streakEmoji =
    streak >= 365 ? '👑' :
    streak >= 90  ? '🔥' :
    streak >= 30  ? '⚡' :
    streak >= 7   ? '🌟' : '🔆';

  return (
    <div className="glass p-4 sm:p-8 rounded-2xl border-l-[6px] sm:border-l-8 border-accent relative overflow-hidden group premium-transition">
      <NeuralCore stats={stats} />
      <CardDecoration />
      <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-8 relative z-10 sm:pl-24 transition-all sm:group-hover:pl-28">
        <div className="relative">
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-4 border-accent p-1 bg-background-nested overflow-hidden focus-within:ring-2 ring-accent transition-all">
            <img src={user.photoURL || ''} alt="" className="w-full h-full rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-accent text-white font-mono text-[8px] sm:text-[10px] font-black w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg shadow-accent/40"
          >
            {stats.level}
          </motion.div>
        </div>

        <div className="flex-1 space-y-3 sm:space-y-4 text-center md:text-left min-w-0 w-full">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-3xl font-serif font-black text-white uppercase tracking-tight italic glow-text-white truncate">{user.displayName}</h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-4">
              <p className="text-[8px] sm:text-[10px] font-mono text-accent uppercase tracking-[0.2em] sm:tracking-[0.5em] font-black whitespace-nowrap">LVL {stats.level} / 100</p>
              <span className="text-[8px] sm:text-[10px] font-mono text-text-m opacity-50 uppercase tracking-widest whitespace-nowrap">• {getTitleForLevel(stats.level)}</span>
              <span className={`flex items-center gap-1 text-[8px] sm:text-[10px] font-mono font-black uppercase whitespace-nowrap ${streakColor}`}>
                <span className="text-xs">{streakEmoji}</span> {streak}D STREAK
              </span>
              {openShare && (
                <button
                  onClick={() => openShare(
                    'streak-share-card',
                    `AETHOS_STREAK_${stats?.currentStreak || 0}D`,
                    'STREAK CARD'
                  )}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-white/10 hover:border-[#C8651B]/50 hover:bg-[#C8651B]/10 transition-all group shrink-0"
                >
                  <Share2 size={10} className="text-white/35 group-hover:text-[#C8651B]" />
                  <span className="text-[8px] font-mono text-white/35 group-hover:text-[#C8651B] uppercase tracking-widest">
                    SHARE
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto md:mx-0 w-full">
             <div className="flex justify-between text-[10px] font-mono uppercase gap-2">
                <span className="text-text-m truncate">XP_BARRIER: {Math.floor(levelProgress)}%</span>
                <span className="text-text-s whitespace-nowrap">{currentXP.toLocaleString()}/{nextLevelXP.toLocaleString()} XP</span>
             </div>
             <div className="h-1.5 sm:h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${levelProgress}%` }}
                   className="h-full bg-gradient-to-r from-cyan to-accent rounded-full shadow-[0_0_15px_rgba(0,217,255,0.4)]"
                />
             </div>
             <div className="flex justify-between text-[6px] sm:text-[8px] font-mono text-text-s uppercase italic opacity-60 gap-4">
                <span className="truncate">Next node: ~{estimatedDays}D</span>
                <span className="whitespace-nowrap">{xpNeeded.toLocaleString()} XP LEFT</span>
             </div>
          </div>
        </div>
      </div>
      <div className="absolute top-4 right-4 opacity-10 rotate-12">
        <HardDrive size={100} className="text-accent" />
      </div>
    </div>
  );
}

const QuickStatsGrid = React.memo(function QuickStatsGrid({ stats, journals, tasks }: { stats: UserStats | null, journals: any[], tasks: any[] }) {
  if (!stats) return null;
  const { levelProgress } = getLevelFromXP(stats.experience);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Cognitive load: sum weighted task minutes completed today
  const todayStr = new Date().toISOString().split('T')[0];
  const priorityWeight: Record<string, number> = { critical: 2.0, high: 1.5, medium: 1.0, low: 0.6 };
  const cognitiveMinutes = (tasks || [])
    .filter((t: any) => t.status === 'completed' && (t.completedAt || '').startsWith(todayStr))
    .reduce((sum: number, t: any) => sum + ((t.estimate || 30) * (priorityWeight[t.priority?.toLowerCase()] || 1.0)), 0);
  const cognitiveLabel = cognitiveMinutes === 0 ? 'IDLE' : cognitiveMinutes < 90 ? 'LOW' : cognitiveMinutes < 210 ? 'MEDIUM' : cognitiveMinutes < 360 ? 'HIGH' : 'CRITICAL';
  const cognitiveColor = cognitiveMinutes === 0 ? 'text-text-s' : cognitiveMinutes < 90 ? 'text-success' : cognitiveMinutes < 210 ? 'text-cyan' : cognitiveMinutes < 360 ? 'text-warning' : 'text-danger';


  const explanations: Record<string, string> = {
    'XP_DATA': 'Experience points accumulated by resolving standard targets, carrying out lifestyle habits, and committing logs.',
    'TASKS_SYNCED': 'The cumulative sum of all standalone and recurring task list objectives checked off as complete.',
    'STREAK': 'Refers to consecutive, uninterrupted daily log-in cycles of program engagement or reflective journal entries.',
    'LOGS': 'Total volume of narrative reflection journals committed and safely archived onto the neural timeline.',
    'NODE_SYNC': 'Progress level alignment percent showing how close you are to completing qualifications for the next level.',
    'COG_LOAD': 'Weighted sum of high-demand work completed today. CRITICAL means your decision quality is likely degrading — route to lighter tasks or rest.',
  };
  
  const metrics = [
    { label: 'XP_DATA', value: stats.experience.toLocaleString(), icon: <Activity className="text-cyan w-3 h-3 sm:w-3.5 sm:h-3.5" />, unit: 'PTS' },
    { label: 'TASKS_SYNCED', value: stats.totalTasksCompleted, icon: <CheckCircle2 className="text-success w-3 h-3 sm:w-3.5 sm:h-3.5" />, unit: 'UNITS' },
    { label: 'STREAK', value: stats.currentStreak, icon: <Flame className="text-warning w-3 h-3 sm:w-3.5 sm:h-3.5" />, unit: 'DAYS' },
    { label: 'LOGS', value: journals.length, icon: <Book className="text-accent w-3 h-3 sm:w-3.5 sm:h-3.5" />, unit: 'ENT' },
    { label: 'NODE_SYNC', value: `${Math.floor(levelProgress)}%`, icon: <PieChart className="text-blue-400 w-3 h-3 sm:w-3.5 sm:h-3.5" />, unit: 'VAL' },
    { label: 'COG_LOAD', value: cognitiveLabel, icon: <Brain className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${cognitiveColor}`} />, unit: '', isCogLoad: true, cogColor: cognitiveColor },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 sm:gap-6">
      {metrics.map((m, i) => (
        <motion.div 
          key={m.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="glass p-4 sm:p-5 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 transition-all group overflow-hidden relative min-h-[120px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5 shrink-0 relative z-10 w-full">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="group-hover:scale-110 transition-transform shrink-0">{m.icon}</div>
              <span className="text-[9px] sm:text-[10px] font-mono text-text-m uppercase tracking-wider font-black truncate">{m.label}</span>
            </div>
            
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTooltip(activeTooltip === m.label ? null : m.label);
              }}
              className={cn(
                "p-1 rounded-full text-text-s hover:text-cyan transition-all flex items-center justify-center shrink-0 border border-transparent hover:border-white/10 hover:bg-white/5",
                activeTooltip === m.label ? "text-cyan bg-cyan/10 border-cyan/20" : ""
              )}
              title="Metric details"
            >
              <Info size={10} className="sm:w-3 sm:h-3" />
            </button>
          </div>

          <div className="flex items-baseline gap-1 mt-auto relative z-10">
            <span className={`text-xl sm:text-2xl font-serif font-black italic ${(m as any).isCogLoad ? (m as any).cogColor : 'text-white'}`}>{m.value}</span>
            <span className="text-[8px] sm:text-[10px] font-mono text-text-s uppercase opacity-50 font-bold">{m.unit}</span>
          </div>

          <AnimatePresence>
            {activeTooltip === m.label && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute inset-0 bg-black/95 border border-cyan/30 rounded-2xl p-4 flex flex-col justify-between z-20"
              >
                <div className="space-y-1.5">
                   <div className="flex items-center justify-between">
                     <span className="text-[8px] font-mono font-black text-cyan uppercase tracking-wider">{m.label}_INFO</span>
                     <button
                       type="button"
                       onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setActiveTooltip(null);
                       }}
                       className="text-text-s hover:text-white p-0.5 rounded transition-colors"
                     >
                       <X size={10} />
                     </button>
                   </div>
                   <p className="text-[9px] sm:text-[10px] font-mono leading-relaxed text-text-m text-left normal-case tracking-normal">
                     {explanations[m.label]}
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
});

const RecentActivityFeed = React.memo(function RecentActivityFeed({ log }: { log?: ActivityEntry[] }) {
  const safeLog = (log || [])
    .filter(entry => entry && entry.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  if (safeLog.length === 0) return (
    <div className="glass p-6 rounded-xl border border-white/5 animate-pulse text-center">
      <p className="text-[10px] font-mono text-text-m uppercase tracking-widest italic opacity-40">NO_ACTIVITY_DETECTED_IN_FEED</p>
    </div>
  );

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {safeLog.map((activity, i) => (
        <div key={`${activity.id || 'activity'}-${i}`} className="shrink-0 w-64">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 p-4 glass rounded-xl border-l-2 border-l-white/10 hover:border-l-accent transition-all bg-white/1 h-full"
          >
            <div className={cn(
              "p-2 rounded flex items-center justify-center shrink-0",
              activity.type === 'task' ? "bg-accent/10 text-accent" :
              activity.type === 'journal' ? "bg-cyan/10 text-cyan" :
              activity.type === 'achievement' ? "bg-warning/10 text-warning" : "bg-white/10 text-white"
            )}>
              {activity.type === 'task' ? <CheckCircle2 size={16} /> :
               activity.type === 'journal' ? <Book size={16} /> :
               activity.type === 'achievement' ? <Trophy size={16} /> : <Zap size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-text-m flex justify-between items-center mb-1">
                <span className="uppercase opacity-50 tracking-tighter">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {activity.type}</span>
                <span className="text-accent font-black">+{activity.xp} XP</span>
              </p>
              <h4 className="text-sm font-serif font-black uppercase text-white truncate italic tracking-tight">{activity.label}</h4>
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );
});

function UpcomingAndQuickAccess({ tasks, journals, setActiveTab }: { tasks: Task[], journals: JournalEntry[], setActiveTab: any }) {
  const nextTasks = tasks.filter(t => t.status === 'pending').slice(0, 3);
  
  return (
    <div className="space-y-6">
      <section className="glass rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
           <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-text-m">Upcoming_Targets</h3>
           <button onClick={() => setActiveTab('dailyWork')} className="text-[8px] font-mono text-accent hover:underline">VIEW_ALL</button>
        </div>
        <div className="p-2 space-y-1">
          {nextTasks.length === 0 ? (
            <p className="p-4 text-[10px] font-mono text-text-m opacity-40 uppercase italic text-center">NO_PENDING_OBJECTIVES</p>
          ) : (
            nextTasks.map((t, idx) => (
              <div key={`${t.id || 'upcoming'}-${idx}`} className="p-3 hover:bg-white/5 rounded flex justify-between items-center group cursor-default">
                 <span className="text-sm font-serif font-black uppercase text-text-p truncate max-w-[150px] italic">{t.title}</span>
                 <span className="text-[10px] font-mono text-text-m opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                   {t.scheduledStart ? new Date(t.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ASAP'}
                 </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

const AchievementsSummary = React.memo(function AchievementsSummary({ stats }: { stats: UserStats | null }) {
  if (!stats) return null;
  const lockedAchievements = ACHIEVEMENTS.filter(a => !stats.unlockedAchievements?.includes(a.id));
  
  // Fake tracking for now, but sort by "closest" based on some logic or just shuffle 3
  const topLocked = lockedAchievements.slice(0, 2);

  return (
    <section className="glass rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
           <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-text-m">Evolving_Protocols</h3>
           <button className="text-[8px] font-mono text-purple-400 hover:underline">VIEW_LIBRARY</button>
        </div>
        <div className="p-4 space-y-6">
          {topLocked.map((ach, idx) => (
            <div key={`${ach.id || 'ach'}-${idx}`} className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded grayscale group-hover:grayscale-0">{ach.icon}</div>
                  <div className="min-w-0">
                     <h4 className="text-[10px] font-black font-mono text-white uppercase truncate">{ach.title}</h4>
                     <p className="text-[10px] font-mono text-text-m truncate leading-tight">{ach.description}</p>
                  </div>
               </div>
               <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-text-s uppercase">
                     <span>EST_SYNC: 43%</span>
                     <span>+{ach.xpReward} XP</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-purple-500 w-[43%]" />
                  </div>
               </div>
            </div>
          ))}
          <div className="pt-2">
            <button className="w-full py-2 bg-white/5 rounded font-mono text-[9px] uppercase tracking-widest text-text-m hover:bg-white/10 transition-all">VIEW_ALL_ACHIEVEMENTS</button>
          </div>
        </div>
    </section>
  );
});

function MotivationSection({ stats, onOpenPortal }: { stats: UserStats | null; onOpenPortal: () => void }) {
  if (!stats) return null;
  const quotes = [
    "NEURAL_EFFICIENCY IS BORN FROM CONSISTENT REFACTORING.",
    "THE BIT DOES NOT CARE FOR YOUR FATIGUE. EXECUTE.",
    "DATA WITHOUT DISCIPLINE IS NOISE.",
    "SYNC THE MIND. PURIFY THE OUTPUT.",
    "ASCENSION IS A RECURSIVE PROCESS."
  ];
  const quoteIndex = new Date().getDay() % quotes.length;

  return (
    <div className="space-y-4">
      <section className="glass p-6 rounded-xl border-l-4 border-cyan bg-cyan/5 relative group overflow-hidden">
        <CardDecoration />
        <div className="flex justify-between items-start mb-2">
          <TrendingUp className="text-cyan opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" size={24} />
          <button 
            onClick={onOpenPortal}
            className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-mono font-black text-cyan hover:bg-cyan hover:text-black transition-all uppercase tracking-widest"
          >
            BOOST_PROTOCOLS
          </button>
        </div>
        <h3 className="text-sm font-serif font-black text-white italic leading-tight uppercase">"{quotes[quoteIndex]}"</h3>
        <p className="text-[9px] font-mono text-text-m mt-2 uppercase tracking-[0.2em]">Daily_System_Inspiration</p>
      </section>

      <section className="glass p-4 rounded-xl border border-white/5 bg-white/1 space-y-2">
        <div className="flex items-center justify-between text-[9px] font-mono uppercase font-black">
          <span className="text-text-s">Next_Milestone</span>
          <span className="text-warning">LEVEL 100</span>
        </div>
        <p className="text-[10px] font-mono text-white uppercase italic leading-none">ULTIMATE_CORE_DECRYPTION</p>
        <p className="text-[9px] font-mono text-text-m leading-tight">"You've leveled up 3 times this month! SYSTEM_LINK_STABILITY IS AT PEAK."</p>
      </section>
    </div>
  );
}

function MotivationPortal({ 
  isOpen, 
  onClose, 
  items, 
  onAdd, 
  onDelete,
  currentlyPlaying,
  isPlaying,
  playMode,
  queue,
  queueIndex,
  setCurrentlyPlaying,
  setIsPlaying,
  setPlayMode,
  setQueue,
  setQueueIndex,
  startPlaylist
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  items: MotivationItem[]; 
  onAdd: (item: Partial<MotivationItem>) => void; 
  onDelete: (id: string) => void;
  currentlyPlaying: string | null;
  isPlaying: boolean;
  playMode: 'single' | 'playlist' | 'shuffle';
  queue: MotivationItem[];
  queueIndex: number;
  setCurrentlyPlaying: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlayMode: (mode: 'single' | 'playlist' | 'shuffle') => void;
  setQueue: (queue: MotivationItem[]) => void;
  setQueueIndex: React.Dispatch<React.SetStateAction<number>>;
  startPlaylist: (startItem: MotivationItem) => void;
}) {
  const [newType, setNewType] = useState<MotivationItem['type']>('link');
  const [newContent, setNewContent] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newVibe, setNewVibe] = useState('');

  const getYoutubeId = (url: string): string | null => {
    const match = url?.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/
    );
    return match ? match[1] : null;
  };

  const getYoutubeThumbnail = (url: string): string | null => {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  };

  const isYoutube = (url: string) =>
    url?.includes('youtube.com') || url?.includes('youtu.be');

  const isSpotify = (url: string) => url?.includes('spotify.com');

  const getYoutubeEmbedUrl = (url: string): string | null => {
    const id = getYoutubeId(url);
    return id
      ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
      : null;
  };

  const getSpotifyEmbedUrl = (url: string): string => {
    return url
      .replace('spotify.com/', 'spotify.com/embed/')
      .replace('/track/', '/track/')
      .replace('/playlist/', '/playlist/');
  };

  const playNext = () => {
    if (playMode === 'shuffle' && queue.length > 0) {
      const next = Math.floor(Math.random() * queue.length);
      setQueueIndex(next);
      setCurrentlyPlaying(queue[next].id);
    } else if (queueIndex < queue.length - 1) {
      setQueueIndex(prev => prev + 1);
      setCurrentlyPlaying(queue[queueIndex + 1].id);
    } else if (playMode === 'playlist' && queue.length > 0) {
      setQueueIndex(0);
      setCurrentlyPlaying(queue[0].id);
    }
  };

  const playPrev = () => {
    if (queueIndex > 0) {
      setQueueIndex(prev => prev - 1);
      setCurrentlyPlaying(queue[queueIndex - 1].id);
    }
  };

  const handleAdd = () => {
    if (!newContent) return;
    onAdd({ type: newType, content: newContent, title: newTitle, vibe: newVibe || undefined });
    setNewContent('');
    setNewTitle('');
    setNewVibe('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass w-full max-w-2xl max-h-[80vh] rounded-[2rem] border border-white/10 overflow-hidden flex flex-col relative z-10 shadow-2xl"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div>
                <h2 className="text-3xl font-serif font-black text-white italic uppercase tracking-tighter">NEURAL_BOOST_HUB</h2>
                <p className="text-[10px] font-mono text-text-m uppercase tracking-widest opacity-60">High-frequency triggers for instant motivation.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={20} className="text-text-m" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
              {/* Add stimuli */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-black text-accent uppercase tracking-[0.2em]">INJECT_STIMULI</h3>
                <div className="glass p-6 rounded-3xl border border-white/5 space-y-6">
                   <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                      {(['link', 'music', 'quote', 'text'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setNewType(t)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[9px] font-mono font-black uppercase transition-all",
                            newType === t ? "bg-white text-black shadow-lg" : "text-text-m hover:text-white"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                   </div>
                   <div className="space-y-3">
                      <div className="flex gap-2">
                         <div className="p-3 bg-white/5 rounded-xl text-text-m border border-white/5">
                            {newType === 'music' ? <Music size={16} /> : newType === 'quote' ? <Sparkles size={16} /> : newType === 'link' ? <LinkIcon size={16} /> : <Book size={16} />}
                         </div>
                         <input 
                           type="text" 
                           placeholder="ITEM_LABEL (Optional)"
                           value={newTitle}
                           onChange={e => setNewTitle(e.target.value)}
                           className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl text-xs font-mono text-white outline-none focus:border-accent/40"
                         />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-mono text-text-m uppercase tracking-widest opacity-50">Vibe Tag (Optional)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['techy', 'chill', 'hype', 'lofi', 'deep_focus', 'classical'].map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setNewVibe(newVibe === tag ? '' : tag)}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-mono uppercase tracking-wide border transition-all ${
                                newVibe === tag ? 'bg-accent/20 border-accent/50 text-accent' : 'bg-white/5 border-white/10 text-text-m hover:border-white/20'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                          <input
                            type="text"
                            placeholder="custom..."
                            value={['techy', 'chill', 'hype', 'lofi', 'deep_focus', 'classical'].includes(newVibe) ? '' : newVibe}
                            onChange={e => setNewVibe(e.target.value)}
                            className="w-20 bg-black/40 border border-white/10 px-2 py-1 rounded-full text-[9px] font-mono text-white outline-none focus:border-accent/40"
                          />
                        </div>
                      </div>
                      <textarea 
                        placeholder={newType === 'link' ? "PASTE_VIDEO_URL (YouTube/Instagram/TikTok)" : newType === 'music' ? "SPOTIFY_LINK or TRACK_NAME" : "MOTIVATIONAL_CONTENT"}
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-mono text-white outline-none focus:border-accent/40 min-h-[100px] resize-none"
                      />
                      <button 
                        onClick={handleAdd}
                        disabled={!newContent}
                        className="w-full py-4 bg-accent text-white font-mono font-black text-xs rounded-xl hover:shadow-[0_0_20px_rgba(255,69,0,0.3)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:grayscale transition-all uppercase tracking-widest"
                      >
                        DECRYPT & INTROJECT
                      </button>
                   </div>
                </div>
              </div>

              {/* ACTIVE PLAYER */}
              {currentlyPlaying && (() => {
                const item = items.find(i => i.id === currentlyPlaying);
                if (!item) return null;
                const embedUrl = isYoutube(item.content)
                  ? getYoutubeEmbedUrl(item.content)
                  : isSpotify(item.content)
                  ? getSpotifyEmbedUrl(item.content)
                  : null;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden mb-6"
                  >
                    {/* YouTube/Spotify embed */}
                    {embedUrl && (
                      <div className="relative w-full" style={{ paddingBottom: isYoutube(item.content) ? '56.25%' : '80px' }}>
                        <iframe
                          src={embedUrl}
                          className="absolute inset-0 w-full h-full"
                          allow="autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                          frameBorder="0"
                        />
                      </div>
                    )}

                    {/* Player controls */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">NOW_PLAYING</p>
                        <p className="text-sm font-mono text-white truncate">{item.title || 'Untitled'}</p>
                      </div>

                      <div className="flex items-center gap-3 ml-4">
                        {/* Prev */}
                        <button
                          onClick={playPrev}
                          disabled={queueIndex === 0}
                          className="p-2 rounded-full hover:bg-white/10 transition-all disabled:opacity-20 cursor-pointer"
                        >
                          <SkipBack size={14} className="text-white" />
                        </button>

                        {/* Play/Pause toggle */}
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-9 h-9 rounded-full bg-[#C8651B] flex items-center justify-center hover:bg-[#b55a17] transition-all cursor-pointer"
                        >
                          {isPlaying
                            ? <Pause size={14} className="text-white" />
                            : <Play size={14} className="text-white ml-0.5" />
                          }
                        </button>

                        {/* Next */}
                        <button
                          onClick={playNext}
                          disabled={queueIndex >= queue.length - 1 && playMode === 'single'}
                          className="p-2 rounded-full hover:bg-white/10 transition-all disabled:opacity-20 cursor-pointer"
                        >
                          <SkipForward size={14} className="text-white" />
                        </button>

                        {/* Close player */}
                        <button
                          onClick={() => { setCurrentlyPlaying(null); setIsPlaying(false); }}
                          className="p-2 rounded-full hover:bg-white/10 transition-all ml-2 cursor-pointer"
                        >
                          <X size={14} className="text-white/40" />
                        </button>
                      </div>
                    </div>

                    {/* Playlist mode toggle */}
                    <div className="px-4 pb-3 flex items-center gap-2">
                      {(['single', 'playlist', 'shuffle'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setPlayMode(mode)}
                          className={cn(
                            "text-[8px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border transition-all cursor-pointer",
                            playMode === mode
                              ? "border-[#C8651B] text-[#C8651B] bg-[#C8651B]/10"
                              : "border-white/10 text-white/20 hover:text-white/50"
                          )}
                        >
                          {mode === 'single' ? '⟳ SINGLE' : mode === 'playlist' ? '⏭ PLAYLIST' : '⤮ SHUFFLE'}
                        </button>
                      ))}
                      {queue.length > 0 && (
                        <span className="text-[8px] font-mono text-white/20 ml-auto">
                          {queueIndex + 1} / {queue.length}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Active stimuli */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-black text-text-p uppercase tracking-[0.2em]">ACTIVE_STIMULI_CORE</h3>
                    <div className="text-[10px] font-mono text-text-s uppercase">{items.length}_LOADED</div>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                   {items.length === 0 && (
                     <EmptyState
                       icon={<Music size={24} className="text-accent" />}
                       title="MOTIVATION_SET_EMPTY. Create your first motivational item..."
                       actionLabel="CREATE_NOW"
                       onAction={() => {
                         setNewContent('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                         setNewTitle('Calibrate Motivation Catalyst');
                       }}
                     />
                   )}
                   {items.map((item, idx) => {
                     const isActive = currentlyPlaying === item.id;
                     const thumbnail = getYoutubeThumbnail(item.content);
                     const isPlayable = isYoutube(item.content) || isSpotify(item.content);

                     return (
                       <div
                         key={`motivation-portal-${item.id}-${idx}`}
                         className={cn(
                           "glass p-4 rounded-2xl border transition-all flex items-center gap-4",
                           isActive
                             ? "border-[#C8651B]/50 bg-[#C8651B]/5"
                             : "border-white/5 hover:border-white/20"
                         )}
                       >
                         {/* Thumbnail or icon */}
                         <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                           {thumbnail ? (
                             <img src={thumbnail} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full bg-white/5 flex items-center justify-center">
                               {item.type === 'music' ? <Music size={16} className="text-[#C8651B]" /> :
                                item.type === 'quote' ? <Sparkles size={16} className="text-[#C9A84C]" /> :
                                item.type === 'text' ? <FileText size={16} className="text-[#2E6B9E]" /> :
                                <LinkIcon size={16} className="text-white/40" />}
                             </div>
                           )}
                           {isActive && (
                             <div className="absolute inset-0 bg-[#C8651B]/20 flex items-center justify-center">
                               <div className="flex gap-0.5">
                                 {[0,1,2].map(i => (
                                   <motion.div
                                     key={i}
                                     animate={{ height: ['4px', '12px', '4px'] }}
                                     transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                                     className="w-1 bg-[#C8651B] rounded-full"
                                   />
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>

                         {/* Info */}
                         <div className="flex-1 min-w-0">
                           <p className="text-xs font-mono text-white truncate">{item.title || item.content}</p>
                           <p className="text-[9px] font-mono text-white/30 uppercase mt-0.5">
                             {item.type} {isYoutube(item.content) ? '· YOUTUBE' : isSpotify(item.content) ? '· SPOTIFY' : ''}
                           </p>
                         </div>

                         {/* Actions */}
                         <div className="flex items-center gap-2">
                           {isPlayable && (
                             <button
                               onClick={() => startPlaylist(item)}
                               className={cn(
                                 "w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer",
                                 isActive
                                   ? "bg-[#C8651B] text-white"
                                   : "bg-white/5 text-white/50 hover:bg-[#C8651B]/20 hover:text-[#C8651B]"
                               )}
                             >
                               {isActive ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                             </button>
                           )}
                           {!isPlayable && item.content.startsWith('http') && (
                             <button
                               onClick={() => window.open(item.content, '_blank')}
                               className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer"
                             >
                               <ExternalLink size={12} className="text-white/50" />
                             </button>
                           )}
                           <button
                             onClick={() => onDelete(item.id)}
                             className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer"
                           >
                             <Trash2 size={12} className="text-white/30" />
                           </button>
                         </div>
                       </div>
                     );
                   })}
                   {items.length === 0 && (
                     <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                        <Activity size={32} className="text-text-s mx-auto mb-4 opacity-20" />
                        <p className="text-xs font-mono text-text-s uppercase font-black opacity-40">NO_ACTIVE_BOOSTERS_FOUND</p>
                        <p className="text-[10px] font-mono text-text-m uppercase opacity-20 mt-1">Initialize motivation protocols above.</p>
                     </div>
                   )}
                 </div>
              </div>
            </div>
            
            <div className="p-8 bg-white/2 border-t border-white/5 text-center">
               <p className="text-[8px] font-mono text-text-m uppercase tracking-[0.3em] opacity-40 italic">WARNING: Excessive neural stimulation may lead to hyper-productivity.</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function LifeSyncOverview({ lifeSync, setActiveTab, categories = LIFE_CATEGORIES }: { lifeSync?: UserStats['lifeSync'], setActiveTab: any, categories?: any[] }) {
  if (!lifeSync) return (
    <div 
      onClick={() => setActiveTab('grow')}
      className="glass p-8 rounded-[2rem] border border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent cursor-pointer hover:border-indigo-500/30 transition-all flex flex-col items-center justify-center gap-4 text-center group"
    >
       <Network size={40} className="text-indigo-400 group-hover:scale-110 transition-transform" />
       <div>
         <h4 className="text-sm font-mono font-black uppercase tracking-widest text-text-p">INITIALIZE_LIFE_SYNC</h4>
         <p className="text-[10px] font-mono text-text-m opacity-60">"DATA_GAPS_DETECTED. ALIGN_REALITY_PROTOCOLS."</p>
       </div>
    </div>
  );

  const values = lifeSync.current;
  const activeVals = categories.map(cat => values[cat.id] ?? 10);
  const balanceScore = Number((activeVals.reduce((a, b) => a + b, 0) / (categories.length || 1)).toFixed(1));
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setActiveTab('grow')}
      className="glass p-8 lg:p-12 rounded-[2rem] lg:rounded-[3rem] border border-white/5 bg-gradient-to-br from-indigo-500/10 via-transparent to-accent/5 relative overflow-hidden group shadow-2xl cursor-pointer hover:border-white/20 transition-all flex flex-col items-center"
    >
       <WheelOfLifeVisualization />
       
       <div className="mt-8 text-center space-y-4">
          <h2 className="text-5xl font-serif font-black text-text-p italic">{balanceScore}<span className="text-lg opacity-40">/10</span></h2>
          <p className="text-[10px] font-mono text-text-m uppercase tracking-[0.2em] opacity-60">Overall_Balance_Score</p>
       </div>
    </motion.div>
  );
}

function DailyChecklistCard({ tasks, journals, stats, settings, setActiveTab, updateSettings }: {
  tasks: Task[];
  journals: JournalEntry[];
  stats: UserStats | null;
  settings: AppSettings | null;
  setActiveTab: any;
  updateSettings: (s: Partial<AppSettings>) => void;
}) {
  const [todayStr, setTodayStr] = useState(chronos.getLocalDateKey());

  useEffect(() => {
    const interval = setInterval(() => {
      const newTodayStr = chronos.getLocalDateKey();
      if (newTodayStr !== todayStr) {
        setTodayStr(newTodayStr);
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [todayStr]);

  const tasksDone = tasks.some(t => t.status === 'completed' && t.completedAt?.startsWith(todayStr));
  const journalDone = journals.some(j => j.createdAt?.startsWith(todayStr));
  const wheelDone = stats?.lifeSync?.lastSaved === todayStr;
  const aiIncluded = settings?.includeAIInDailyCheckin === true;
  const aiDone = settings?.lastAICheckinDate === todayStr;

  const items = [
    { id: 'tasks', label: 'DAILY_TASKS', done: tasksDone, icon: CheckCircle2, tab: 'dailyWork' },
    { id: 'journal', label: 'JOURNAL', done: journalDone, icon: Book, tab: 'reflect' },
    { id: 'wheel', label: 'WHEEL_OF_LIFE', done: wheelDone, icon: Target, tab: 'grow' },
    ...(aiIncluded ? [{ id: 'ai', label: 'AI_CHECK_IN', done: aiDone, icon: Sparkles, tab: 'aetherCoach' }] : []),
  ];

  const completedCount = items.filter(i => i.done).length;

  return (
    <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-text-p">DAILY_CHECK_IN</span>
        <span className="text-[10px] font-mono text-cyan">{completedCount}/{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.tab);
              if (item.id === 'ai') updateSettings({ lastAICheckinDate: todayStr });
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              item.done ? 'bg-success/5 border-success/20' : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-success' : 'border border-white/20'}`}>
              {item.done && <CheckCircle2 size={12} className="text-black" />}
            </div>
            <item.icon size={14} className={item.done ? 'text-success' : 'text-text-m'} />
            <span className={`text-xs font-mono font-black uppercase tracking-wide flex-1 text-left ${item.done ? 'text-success/80 line-through' : 'text-white/80'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
      {!aiIncluded && (
        <button
          onClick={() => updateSettings({ includeAIInDailyCheckin: true })}
          className="w-full text-[9px] font-mono text-text-m/50 hover:text-cyan uppercase tracking-widest transition-colors"
        >
          + Add AI check-in to your daily routine
        </button>
      )}
    </div>
  );
}

function Dashboard({ 
  stats, 
  tasks, 
  journals, 
  onComplete, 
  user, 
  setActiveTab,
  settings,
  updateSettings,
  setIsMotivationPortalOpen,
  motivationItems = [],
  currentlyPlaying,
  isPlaying,
  playMode,
  queue,
  queueIndex,
  setCurrentlyPlaying,
  setIsPlaying,
  setPlayMode,
  setQueue,
  setQueueIndex,
  startPlaylist,
  openShare
}: { 
  stats: UserStats | null; 
  tasks: Task[]; 
  journals: JournalEntry[]; 
  onComplete: (task: Task) => void; 
  user: User; 
  setActiveTab: any;
  settings: AppSettings | null;
  updateSettings: (s: Partial<AppSettings>) => void;
  setIsMotivationPortalOpen: (open: boolean) => void;
  motivationItems?: MotivationItem[];
  currentlyPlaying: string | null;
  isPlaying: boolean;
  playMode: 'single' | 'playlist' | 'shuffle';
  queue: MotivationItem[];
  queueIndex: number;
  setCurrentlyPlaying: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlayMode: (mode: 'single' | 'playlist' | 'shuffle') => void;
  setQueue: (queue: MotivationItem[]) => void;
  setQueueIndex: React.Dispatch<React.SetStateAction<number>>;
  startPlaylist: (startItem: MotivationItem) => void;
  openShare?: (cardId: string, filename: string, title: string) => void;
}) {
  const getYoutubeId = (url: string): string | null => {
    const match = url?.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/
    );
    return match ? match[1] : null;
  };

  const getYoutubeThumbnail = (url: string): string | null => {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  };

  const isYoutube = (url: string) =>
    url?.includes('youtube.com') || url?.includes('youtu.be');

  const isSpotify = (url: string) => url?.includes('spotify.com');

  const getYoutubeEmbedUrl = (url: string): string | null => {
    const id = getYoutubeId(url);
    return id
      ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
      : null;
  };

  const getSpotifyEmbedUrl = (url: string): string => {
    return url
      .replace('spotify.com/', 'spotify.com/embed/')
      .replace('/track/', '/track/')
      .replace('/playlist/', '/playlist/');
  };

  const playNext = () => {
    if (playMode === 'shuffle' && queue.length > 0) {
      const next = Math.floor(Math.random() * queue.length);
      setQueueIndex(next);
      setCurrentlyPlaying(queue[next].id);
    } else if (queueIndex < queue.length - 1) {
      setQueueIndex(prev => prev + 1);
      setCurrentlyPlaying(queue[queueIndex + 1].id);
    } else if (playMode === 'playlist' && queue.length > 0) {
      setQueueIndex(0);
      setCurrentlyPlaying(queue[0].id);
    }
  };

  const playPrev = () => {
    if (queueIndex > 0) {
      setQueueIndex(prev => prev - 1);
      setCurrentlyPlaying(queue[queueIndex - 1].id);
    }
  };

  const getItemType = (item: MotivationItem) => {
    if (item.type === 'quote') return 'quote';
    if (item.type === 'text') return 'text';
    const url = item.content?.toLowerCase() || '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('spotify.com') || url.includes('soundcloud.com')) return 'audio';
    if (url.startsWith('http')) return 'link';
    return 'text';
  };

  const isStreakAtRisk = (stats?.currentStreak || 0) > 0 && stats?.lastActiveDate?.split('T')[0] !== new Date().toISOString().split('T')[0];

  const handleClearNeuralHistory = async () => {
    if (!user) return;
    const confirmClear = window.confirm("Are you sure you want to completely clear everything in your history? This will permanently erase your entire neural history log, including all past activity, task completions, and XP records. This action cannot be undone.");
    if (!confirmClear) return;
    try {
      localStorage.removeItem('NEURAL_HISTORY');
      await updateDoc(doc(db, 'user_stats', user.uid), {
        activityLog: []
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `user_stats/${user.uid}/clear_activity_log`);
    }
  };

  const [quickOverrideOpen, setQuickOverrideOpen] = React.useState(true);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <DailyChecklistCard
        tasks={tasks}
        journals={journals}
        stats={stats}
        settings={settings}
        setActiveTab={setActiveTab}
        updateSettings={updateSettings}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
           <h1 className="text-4xl font-serif font-black text-text-p uppercase tracking-[0.1em] italic text-glow-white">COMMAND_CENTER</h1>
           <p className="text-[10px] font-mono text-text-m uppercase tracking-[0.5em] opacity-40">System_Status: Stable | Version: 2.1.0_OAK</p>
        </div>
      </div>

      <LifeSyncOverview lifeSync={stats?.lifeSync} setActiveTab={setActiveTab} categories={stats?.lifeSyncCategories || LIFE_CATEGORIES} />

      <ProfileCard stats={stats} user={user} openShare={openShare} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Main Stream */}
        <div className="lg:col-span-8 space-y-8">
          <section className={`space-y-4 transition-all duration-500 ${!quickOverrideOpen ? 'scale-100' : ''}`}>
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-black uppercase tracking-[0.3em] text-text-m flex items-center gap-2">
                   <Target size={14} className="text-accent" />
                   CORE_METRICS_SYNC
                </h3>
             </div>
             <QuickStatsGrid stats={stats} journals={journals} tasks={tasks} />
             <ChronosClock />
             <StreakVisualizer journals={journals} tasks={tasks} />
          </section>

          <DailyChallengeWidget stats={stats} />

          {/* NEURAL FEED */}
          <section className={`space-y-4 overflow-y-auto transition-all duration-500 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/20 ${quickOverrideOpen ? 'h-[300px]' : 'h-[520px]'}`}>
            <div className="flex items-center justify-between mb-3 sticky top-0 bg-black/50 backdrop-blur z-10 pb-2">
              <div>
                <p className="text-[10px] font-mono font-black text-white/80 uppercase tracking-widest">NEURAL_FEED</p>
                <p className="text-[8px] font-mono text-white/20 uppercase">
                  MOTIVATION_SYNC_ACTIVE — {motivationItems.length} ITEMS LOADED
                </p>
              </div>
              <button
                onClick={() => setIsMotivationPortalOpen(true)}
                className="text-[9px] font-mono text-white/30 hover:text-[#C8651B] uppercase tracking-widest transition-colors cursor-pointer"
              >
                OPEN_VAULT →
              </button>
            </div>

            {/* ACTIVE PLAYER IN DASHBOARD */}
            {currentlyPlaying && (() => {
              const item = motivationItems.find(i => i.id === currentlyPlaying);
              if (!item) return null;
              const embedUrl = isYoutube(item.content)
                ? getYoutubeEmbedUrl(item.content)
                : isSpotify(item.content)
                ? getSpotifyEmbedUrl(item.content)
                : null;

              return (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden mb-6"
                >
                  {/* YouTube/Spotify embed */}
                  {embedUrl && (
                    <div className="relative w-full" style={{ paddingBottom: isYoutube(item.content) ? '56.25%' : '80px' }}>
                      <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                      />
                    </div>
                  )}

                  {/* Player controls */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">NOW_PLAYING</p>
                      <p className="text-sm font-mono text-white truncate">{item.title || 'Untitled'}</p>
                    </div>

                    <div className="flex items-center gap-3 ml-4 text-white">
                      {/* Prev */}
                      <button
                        onClick={playPrev}
                        disabled={queueIndex === 0}
                        className="p-2 rounded-full hover:bg-white/10 transition-all disabled:opacity-20 cursor-pointer"
                      >
                        <SkipBack size={14} />
                      </button>

                      {/* Play/Pause toggle */}
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-9 h-9 rounded-full bg-[#C8651B] flex items-center justify-center hover:bg-[#b55a17] transition-all cursor-pointer"
                      >
                        {isPlaying
                          ? <Pause size={14} className="text-white" />
                          : <Play size={14} className="text-white ml-0.5" />
                        }
                      </button>

                      {/* Next */}
                      <button
                        onClick={playNext}
                        disabled={queueIndex >= queue.length - 1 && playMode === 'single'}
                        className="p-2 rounded-full hover:bg-white/10 transition-all disabled:opacity-20 cursor-pointer"
                      >
                        <SkipForward size={14} />
                      </button>

                      {/* Close player */}
                      <button
                        onClick={() => { setCurrentlyPlaying(null); setIsPlaying(false); }}
                        className="p-2 rounded-full hover:bg-white/10 transition-all ml-2 cursor-pointer text-white/40"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Playlist mode toggle */}
                  <div className="px-4 pb-3 flex items-center gap-2">
                    {(['single', 'playlist', 'shuffle'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setPlayMode(mode)}
                        className={cn(
                          "text-[8px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border transition-all cursor-pointer",
                          playMode === mode
                            ? "border-[#C8651B] text-[#C8651B] bg-[#C8651B]/10"
                            : "border-white/10 text-white/20 hover:text-white/50"
                        )}
                      >
                        {mode === 'single' ? '⟳ SINGLE' : mode === 'playlist' ? '⏭ PLAYLIST' : '⤮ SHUFFLE'}
                      </button>
                    ))}
                    {queue.length > 0 && (
                      <span className="text-[8px] font-mono text-white/20 ml-auto">
                        {queueIndex + 1} / {queue.length}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })()}

            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {motivationItems.length === 0 ? (
                <div className="w-full flex items-center justify-center py-6 border border-dashed border-white/5 bg-white/1 rounded-xl">
                  <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
                    NEURAL_FEED_EMPTY — Add items via OPEN_VAULT
                  </p>
                </div>
              ) : (
                motivationItems.map((item, idx) => {
                  const type = getItemType(item);
                  if (type === 'youtube') {
                    const isActive = currentlyPlaying === item.id;
                    const thumbnail = getYoutubeThumbnail(item.content);
                    return (
                      <div 
                        key={`motivation-list-yt-${item.id}-${idx}`}
                        className={cn(
                          "flex-shrink-0 w-48 h-28 rounded-xl border overflow-hidden cursor-pointer relative group transition-all",
                          isActive ? "border-[#C8651B]/50 bg-[#C8651B]/5" : "border-white/10 hover:border-[#C8651B]/30"
                        )}
                        onClick={() => {
                          startPlaylist(item);
                        }}
                      >
                        {thumbnail ? (
                          <img src={thumbnail} className={cn("w-full h-full object-cover transition-opacity", isActive ? "opacity-30" : "opacity-60 group-hover:opacity-80")} />
                        ) : (
                          <div className="w-full h-full bg-white/5" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          {isActive ? (
                            <div className="flex gap-0.5">
                              {[0,1,2].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ height: ['4px', '16px', '4px'] }}
                                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                                  className="w-1 bg-[#C8651B] rounded-full"
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play size={12} className="text-white ml-0.5" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80">
                          <p className="text-[9px] font-mono text-white/70 truncate">{item.title || 'VIDEO_LINK'}</p>
                        </div>
                      </div>
                    );
                  }
                  if (type === 'audio' || type === 'link') {
                    const isActive = currentlyPlaying === item.id;
                    const isPlayable = isYoutube(item.content) || isSpotify(item.content);
                    return (
                      <div 
                        key={`motivation-list-link-${item.id}-${idx}`}
                        className={cn(
                          "flex-shrink-0 w-48 h-28 rounded-xl border bg-white/5 p-3 flex flex-col justify-between cursor-pointer transition-all",
                          isActive ? "border-[#C8651B]/50 bg-[#C8651B]/5" : "border-white/10 hover:border-[#C8651B]/50 hover:bg-white/8"
                        )}
                        onClick={() => {
                          if (isPlayable) {
                            startPlaylist(item);
                          } else if (item.content.startsWith('http')) {
                            window.open(item.content, '_blank');
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-lg bg-[#C8651B]/20 flex items-center justify-center">
                            <Music size={14} className="text-[#C8651B]" />
                          </div>
                          {isActive && (
                            <div className="flex gap-0.5">
                              {[0,1,2].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ height: ['4px', '12px', '4px'] }}
                                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                                  className="w-0.5 bg-[#C8651B] rounded-full"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{type === 'audio' ? 'AUDIO_LINK' : 'EXTERNAL_LINK'}</p>
                          <p className="text-xs font-mono text-white/70 truncate">{item.title || item.content}</p>
                        </div>
                      </div>
                    );
                  }
                  if (type === 'quote') {
                    return (
                      <div 
                        key={`motivation-list-quote-${item.id}-${idx}`}
                        className="flex-shrink-0 w-48 h-28 rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col justify-between"
                      >
                        <Quote size={12} className="text-[#C9A84C] opacity-50" />
                        <p className="text-[10px] font-serif italic text-white/60 line-clamp-3 leading-snug">{item.content}</p>
                        <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest">QUOTE</p>
                      </div>
                    );
                  }
                  return (
                    <div 
                      key={`motivation-list-note-${item.id}-${idx}`}
                      className="flex-shrink-0 w-48 h-28 rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col justify-between"
                    >
                      <FileText size={12} className="text-[#2E6B9E] opacity-50" />
                      <p className="text-[10px] font-mono text-white/60 line-clamp-3 leading-snug">{item.content}</p>
                      <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest">NOTE</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black uppercase tracking-[0.3em] text-text-m flex items-center gap-2">
                <Activity size={14} className="text-accent" />
                NEURAL_HISTORY
              </h3>
              {stats?.activityLog && stats.activityLog.length > 0 && (
                <button
                  onClick={handleClearNeuralHistory}
                  className="text-[9px] font-mono text-white/30 hover:text-red-400 uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-red-500/30"
                  title="Clear all neural history"
                >
                  <Trash2 size={10} />
                  <span>CLEAR_LOG</span>
                </button>
              )}
            </div>
            <RecentActivityFeed log={stats?.activityLog} />
          </section>
        </div>

        {/* Right Col: Operations */}
        <div className="lg:col-span-4 space-y-8">
          {isStreakAtRisk && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass p-6 rounded-xl border-t-4 border-warning bg-warning/5 animate-pulse"
            >
               <div className="flex items-center gap-3 mb-2">
                  <Flame size={20} className="text-warning" />
                  <span className="text-[10px] font-mono text-warning font-black uppercase tracking-widest">STREAK_AT_RISK</span>
               </div>
               <p className="text-[10px] font-mono text-text-m uppercase leading-tight italic">"DATA_FLOW_STALLED. COMPLETE_TASK_TO_MAINTAIN_LINK."</p>
            </motion.div>
          )}

          <section className="space-y-4">
             <div className="flex items-center justify-between">
               <h3 className="text-xs font-mono font-black uppercase tracking-[0.3em] text-text-m flex items-center gap-2">
                  <Zap size={14} className="text-accent" />
                  QUICK_OVERRIDE
               </h3>
               <button
                 onClick={() => setQuickOverrideOpen(o => !o)}
                 className="flex items-center gap-1.5 px-3 py-1.5 glass border border-white/10 rounded-xl text-[9px] font-mono font-black uppercase text-text-m hover:text-white hover:border-white/20 transition-all"
               >
                 {quickOverrideOpen ? (
                   <><ChevronUp size={12} /> COLLAPSE</>
                 ) : (
                   <><ChevronDown size={12} /> EXPAND</>
                 )}
               </button>
             </div>
             {quickOverrideOpen && (
               <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                 <UpcomingAndQuickAccess tasks={tasks} journals={journals} setActiveTab={setActiveTab} />
               </div>
             )}
          </section>

          <AchievementsSummary stats={stats} />
          
          <MotivationSection stats={stats} onOpenPortal={() => setIsMotivationPortalOpen(true)} />
        </div>
      </div>
    </div>
  );
}

function InventoryItem({ icon, label, active }: { icon: string; label: string; active: boolean }) {
  return (
    <div className={cn(
      "glass aspect-square rounded-lg flex flex-col items-center justify-center p-3 text-center transition-all",
      !active && "opacity-40 grayscale"
    )}>
      <div className="w-10 h-10 rounded bg-background-nested flex items-center justify-center text-xl mb-2">
        {icon}
      </div>
      <span className="text-[9px] text-text-p uppercase tracking-tighter font-bold">{label}</span>
    </div>
  );
}



function LevelUpOverlay({ level, onClose, stats }: { level: number; onClose: () => void; stats: UserStats | null }) {
  const currentUnlocks = UNLOCKS.filter(u => u.level === level);
  const rewards = [];
  
  useEffect(() => {
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.3 },
      colors: ['#FFD700', '#00D9FF', '#FF3366']
    });
    
    // Cascading confetti
    const timer = setTimeout(() => {
      confetti({
        particleCount: 150,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#00D9FF']
      });
      confetti({
        particleCount: 150,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FF3366']
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden flex items-center justify-center p-6 sm:p-12">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/95 backdrop-blur-2xl"
      />
      
      <motion.div 
        initial={{ y: 50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.9 }}
        className="relative max-w-2xl w-full text-center space-y-12"
      >
        <div className="space-y-4">
           <motion.h1 
             animate={{ scale: [1, 1.1, 1], rotate: [-1, 1, -1] }}
             transition={{ duration: 2, repeat: Infinity }}
             className="text-7xl font-serif font-black text-white italic uppercase tracking-[0.2em] text-glow-white"
           >
             LEVEL_UP!
           </motion.h1>
           <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                 <p className="text-[10px] font-mono text-text-m uppercase mb-1">From</p>
                 <p className="text-4xl font-serif font-black text-white opacity-40 italic">{level - 1}</p>
              </div>
              <ChevronRight className="text-accent h-12 w-12" />
              <div className="text-center">
                 <p className="text-[10px] font-mono text-text-m uppercase mb-1">To</p>
                 <p className="text-6xl font-serif font-black text-accent italic glow-text-accent">{level}</p>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <p className="text-[10px] font-mono text-text-m uppercase tracking-[1em] font-black opacity-60">REWARDS_UNLOCKED</p>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {rewards.map((r, i) => (
                <motion.div 
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ delay: 0.5 + (i * 0.1) }}
                   key={`reward-${i}`} 
                   className="glass p-6 rounded-2xl border-2 border-warning/30 bg-warning/5 flex items-center gap-4"
                >
                  <Trophy className="text-warning h-8 w-8" />
                  <div className="text-left">
                     <p className="text-[10px] font-mono text-warning font-black uppercase">SYNC_REWARD</p>
                     <p className="text-xl font-serif font-black text-white italic">{r.label}</p>
                  </div>
                </motion.div>
              ))}
              {currentUnlocks.map((u, i) => (
                <motion.div 
                   initial={{ x: 20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ delay: 0.5 + (i * 0.1) }}
                   key={`${u.id || 'unlock'}-${i}`} 
                   className="glass p-6 rounded-2xl border-2 border-accent/30 bg-accent/5 flex items-center gap-4"
                >
                   <Zap className="text-accent h-8 w-8" />
                   <div className="text-left">
                      <p className="text-[10px] font-mono text-accent font-black uppercase">SYSTEM_UPGRADE</p>
                      <p className="text-sm font-serif font-black text-white italic uppercase tracking-tight">{u.label}</p>
                   </div>
                </motion.div>
              ))}
              {rewards.length === 0 && currentUnlocks.length === 0 && (
                <div className="col-span-2 glass p-8 rounded-2xl border border-white/5 bg-white/2">
                   <p className="text-[10px] font-mono text-text-m uppercase tracking-[0.2em]">"Standard sync protocol maintained. Keep ascending."</p>
                </div>
              )}
           </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="px-12 py-5 bg-white text-black font-mono font-black uppercase tracking-[0.4em] rounded-full shadow-2xl hover:bg-accent hover:text-white transition-all border-none outline-none"
        >
          CONTINUE_ASCENSION
        </motion.button>
      </motion.div>
    </div>
  );
}

function AchievementCelebration({ 
  achievement, 
  onClose,
  onShare,
}: { 
  achievement: Achievement; 
  onClose: () => void;
  onShare: (achievement: Achievement) => void;
}) {
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#00D9FF', '#FF3366']
    });
  }, []);

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed bottom-12 right-12 glass p-6 rounded-2xl border border-accent/30 bg-accent/10 z-[250] flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-sm"
    >
      <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent shrink-0">
        <Award size={32} className="text-accent" />
      </div>
      <div className="flex-1">
        <p className="text-[9px] font-mono font-bold text-accent uppercase tracking-widest mb-1">Achievement Unlocked</p>
        <h4 className="text-white font-serif font-black uppercase tracking-tight text-lg">{achievement.title}</h4>
        <p className="text-text-m text-[10px] uppercase font-mono opacity-60 mt-1">{achievement.description}</p>
        <button
          onClick={() => onShare(achievement)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:border-[#C8651B]/50 hover:bg-[#C8651B]/10 transition-all group mt-3"
        >
          <Share2 size={12} className="text-white/30 group-hover:text-[#C8651B]" />
          <span className="text-[9px] font-mono text-white/30 group-hover:text-[#C8651B] uppercase tracking-widest">
            SHARE_ACHIEVEMENT
          </span>
        </button>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
        <X size={16} className="text-text-s" />
      </button>
    </motion.div>
  );
}

function ManualModal({ 
  isOpen, 
  onClose,
  onRedirect,
  onTriggerMotivation
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onRedirect: (tab: AppTab, subTab?: 'tasks' | 'habits' | 'timetable') => void;
  onTriggerMotivation: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const sections = [
    {
      category: "OPERATIONAL_MODES",
      items: [
        {
          title: "CORE_COMMAND",
          description: "Your primary tactical command dashboard. Gathers real-time data from all modules, showcases your overall active daily status, challenge logs, and current synchronization metrics.",
          icon: <HardDrive size={18} className="text-accent" />,
          redirect: () => onRedirect('dashboard')
        },
        {
          title: "DAILY_WORK",
          description: "Your unified execution suite containing three major sub-systems: Priority Tasks ('Active Stack'), Habits tracking ('Routine Matrix'), and deterministic schedule planning ('Temporal Grid').",
          icon: <CheckCircle2 size={18} className="text-success" />,
          redirect: () => onRedirect('dailyWork', 'tasks')
        },
        {
          title: "REFLECT_CENTER",
          description: "Our high-fidelity markdown mental journal ('Neural Archiving') combined with direct consulting sessions via our integrated AI Coach, powering smart guidance and automated bottleneck detection.",
          icon: <Book size={18} className="text-purple-400" />,
          redirect: () => onRedirect('reflect')
        },
        {
          title: "AETHOS_COACH",
          description: "Your localized AI cognitive advisor powered by Gemini. Discuss balance, bottlenecks, or strategies directly in an interactive dialogue.",
          icon: <Sparkles size={18} className="text-cyan" />,
          redirect: () => onRedirect('aetherCoach')
        },
        {
          title: "GROW_SYSTEMS",
          description: "Analyzes system evolution and diagnostics. Integrates the 'Life Sync' balance matrix with historic levels, progress dashboards, unlocks, and overall XP achievements logic.",
          icon: <TrendingUp size={18} className="text-cyan" />,
          redirect: () => onRedirect('grow')
        },
        {
          title: "CONFIG_OS",
          description: "Advanced system controls. Configure core profile parameters, toggle active notifications, calibration formats, color themes, or visit the Neural Shop to unlock visual themes.",
          icon: <Settings size={18} className="text-indigo-400" />,
          redirect: () => onRedirect('configOs')
        }
      ]
    },
    {
      category: "PROGRESSION_LOGIC",
      items: [
        {
          title: "XP_ALGORITHM",
          description: "XP = Base Priority × (Duration Mult + Cat Mult) × (Streak Bonus × Multiplier). Late completions suffer a 30% XP decay.",
          icon: <Activity size={18} className="text-warning" />,
          redirect: () => onRedirect('grow')
        },
        {
          title: "LEVEL_ASCENSION",
          description: "Every 5 levels decrypts new OS capabilities (Recurring Loops, Marketplace, Deep Analytics). Level 100 triggers 'Ultimate Core Decryption'.",
          icon: <Award size={18} className="text-white" />,
          redirect: () => onRedirect('grow')
        },
        {
          title: "DAILY_CHALLENGES",
          description: "Recursive objectives that reset every 24 hours. Completing a challenge provides massive XP.",
          icon: <Zap size={18} className="text-warning" />,
          redirect: () => onRedirect('dashboard')
        },
        {
          title: "STREAK_MAINTENANCE",
          description: "Neural links are fragile. Missing a 24-hour sync window resets your primary activity streak. Higher streaks yield passive XP bonuses.",
          icon: <Flame size={18} className="text-orange-500" />,
          redirect: () => onRedirect('dashboard')
        }
      ]
    },
    {
      category: "ADVANCED_SYSTEMS",
      items: [
        {
          title: "AI_SCHEDULER",
          description: "Neural-engine powered scheduling. Analyzes your 'Sync Routines' (Regular events) and pending stack to generate the most efficient temporal path.",
          icon: <Sparkles size={18} className="text-cyan" />,
          redirect: () => onRedirect('dailyWork', 'timetable')
        },
        {
          title: "STIMULI_INJECTION",
          description: "Hyper-focus triggers found in the 'Boost Portal'. Add music, text, or links that help stabilize your focus sessions.",
          icon: <Zap size={18} className="text-accent" />,
          redirect: () => {
            onRedirect('dashboard');
            setTimeout(() => onTriggerMotivation(), 300);
          }
        },
        {
          title: "NEURAL_SHOP",
          description: "Unlock custom visual interfaces and themes, legacy badges, and experimental difficulty mods.",
          icon: <ShoppingBag size={18} className="text-success" />,
          redirect: () => onRedirect('configOs')
        },
        {
          title: "WHEEL_AUTO_SYNC",
          description: "Habit protocols now silently synchronize with the 'Wheel of Life'. Completing categorized habits boosts corresponding axes (e.g. Routine -> Sleep) in real-time.",
          icon: <Network size={18} className="text-indigo-400" />,
          redirect: () => onRedirect('grow')
        },
        {
          title: "SMART_TASK_CONTINUITY",
          description: "Accelerate daily setup. Automatically learns completion habits and recurrence frequencies to suggest top daily targets and provides a single-click 'Copy Yesterday' replication tool.",
          icon: <RefreshCw size={18} className="text-cyan" />,
          redirect: () => onRedirect('dailyWork', 'timetable')
        }
      ]
    },
    {
      category: "FUTURE_ROADMAP",
      items: [
        {
          title: "NEURAL_PERK_TREE",
          description: "A recursive logic path to unlock specialized cognitive boosts, passive XP yields, and advanced interface overrides.",
          icon: <Network size={18} className="text-cyan" />,
          redirect: () => onRedirect('grow')
        },
        {
          title: "TEMPORAL_RAIDS",
          description: "High-stakes, high-reward synchronization events that challenge your focus-density against 'glitch' interference.",
          icon: <Zap size={18} className="text-warning" />,
          redirect: () => onRedirect('dailyWork', 'timetable')
        },
        {
          title: "SYSTEM_THEMES",
          description: "Real-time environment recalibration. Unlock unique aesthetic skins for AETHOS.",
          icon: <Palette size={18} className="text-accent" />,
          redirect: () => onRedirect('configOs')
        }
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-6 bg-background/95 backdrop-blur-3xl" onClick={onClose}>
          <motion.div 
            layout
            initial={{ y: 100, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              width: isExpanded ? '95vw' : '100%',
              maxWidth: isExpanded ? '100%' : '800px',
              height: isExpanded ? '90vh' : 'auto',
              maxHeight: isExpanded ? '100%' : '85vh'
            }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="glass rounded-[3rem] border border-white/10 flex flex-col relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 md:p-12 border-b border-white/5 bg-white/2 flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-cyan">
                  <HelpCircle size={16} />
                  <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em]">System_Manual_v1.3 // SECURITY_AUDITED</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-serif font-black text-white italic uppercase tracking-tighter">AETHOS_GUIDE</h2>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-3 glass border border-white/10 rounded-full hover:bg-white/5 transition-all text-text-m hover:text-cyan"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                </button>
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-white/5 rounded-full transition-colors text-text-m hover:text-danger"
                >
                  <X size={28} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 no-scrollbar">
              <div className={cn(
                "grid gap-12 transition-all duration-500",
                isExpanded ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              )}>
                {sections.map((cat, catIdx) => (
                  <div key={`${cat.category}-${catIdx}`} className="space-y-6">
                    <h3 className="text-[10px] font-mono font-black text-cyan uppercase tracking-[0.5em] border-b border-cyan/20 pb-2">{cat.category}</h3>
                    <div className="space-y-4">
                      {cat.items.map((item, idx) => (
                        <motion.div 
                          key={`${item.title}-${idx}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (catIdx * 0.1) + (idx * 0.05) }}
                          className="p-6 bg-white/2 border border-white/5 rounded-2xl space-y-3 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform shrink-0">
                                {item.icon}
                              </div>
                              <h4 className="text-xs font-mono font-black text-white tracking-widest uppercase truncate">{item.title}</h4>
                            </div>
                            {item.redirect && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  item.redirect?.();
                                }}
                                className="px-2.5 py-1 text-[8px] font-mono rounded-lg bg-cyan/10 hover:bg-cyan hover:text-black border border-cyan/25 text-cyan transition-all font-black uppercase tracking-wider shrink-0 active:scale-95"
                              >
                                LOCATE
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-text-m font-mono leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                            {item.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Master Status */}
              <div className="mt-12 p-8 bg-gradient-to-r from-cyan/10 to-accent/10 border border-white/5 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-4">
                    <ShieldCheck className="text-success" size={40} />
                    <div>
                        <h3 className="text-lg font-serif font-black text-white italic uppercase">Operational_Integrity_Statement</h3>
                        <p className="text-[10px] font-mono text-text-m uppercase">Aether_OS Kernel // Security_Advisory</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-mono leading-relaxed opacity-80">
                    <p>
                      The database utilizes a 'Strong Sync' protocol. Every mutation (Task completion, XP gain, Journaling) is cryptographically bound to your User UID and stored in a hardened cloud cluster. No local-only artifacts are permitted; what you see in the 'Core Command' is a direct mirror of your neural history.
                    </p>
                    <p>
                      Bugs or glitches are automatically mitigated through periodic state-recalibration. If you detect a synchronization desync, use the 'Settings' node to 'Purge Cache' or 'Recalibrate Neural Link'. Remember: The System does not fail; the Operator simply needs better synchronization.
                    </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-white/5 bg-white/1 flex justify-center shrink-0">
              <button 
                onClick={onClose}
                className="px-16 py-5 bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] text-black font-black uppercase rounded-2xl hover:bg-cyan hover:shadow-cyan/30 transition-all text-sm tracking-[0.2em]"
              >
                ACKNOWLEDGE_AND_EXECUTE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FocusProtocol({ stats, user, onAddXP, setCompleteToast, addToTerminal }: { stats: UserStats | null, user: User, onAddXP: any, setCompleteToast: any, addToTerminal?: any }) {
  const [timerMode, setTimerMode] = React.useState<'POMODORO' | 'DEEP_WORK'>('POMODORO');
  const [phase, setPhase] = React.useState<'WORK' | 'SHORT_BREAK' | 'LONG_BREAK'>('WORK');
  const [timeLeft, setTimeLeft] = React.useState(25 * 60);
  const [isActive, setIsActive] = React.useState(false);
  const [sessionsCompleted, setSessionsCompleted] = React.useState(0);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  const getPhaseDuration = (p: typeof phase, m: typeof timerMode) => {
    if (p === 'LONG_BREAK') return 15 * 60;
    if (m === 'POMODORO') return p === 'WORK' ? 25 * 60 : 5 * 60;
    return p === 'WORK' ? 50 * 60 : 10 * 60;
  };

  const playPhaseSound = (isWorkEnd: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      // High pitch for work end (starting break), Lower for break end (starting work)
      oscillator.frequency.setValueAtTime(isWorkEnd ? 880 : 440, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(isWorkEnd ? 1320 : 660, audioCtx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio blocked");
    }
  };

  const handleSessionComplete = async () => {
    if (phase === 'WORK') {
      const isLastInCycle = sessionsCompleted === 3;
      const newTotalSessions = (stats?.pomodoroSessions || 0) + 1;
      const newTodaySessions = (stats?.pomodoroToday || 0) + 1;

      // Minimum 20 minutes (1200 seconds) must have elapsed to count as a real session
      const MIN_SESSION_SECONDS = 20 * 60; // 20 minutes
      const isPom = timerMode === 'POMODORO';
      const requiredSeconds = isPom ? MIN_SESSION_SECONDS : 40 * 60;

      if (elapsedSeconds < requiredSeconds) {
        addToTerminal?.('SESSION_INVALID: Minimum required active focus time for XP not met.', 'warn');
      } else {
        try {
          await updateDoc(doc(db, 'user_stats', user.uid), {
            pomodoroSessions: newTotalSessions,
            pomodoroToday: newTodaySessions
          });
          onAddXP(13, 'POMODORO_SESSION_COMPLETE');
          if (isLastInCycle) {
            onAddXP(25, 'FOCUS_CYCLE_MASTER_BONUS');
            setCompleteToast('FOCUS_CYCLE_PROTOCOL_COMPLETE');
            setTimeout(() => setCompleteToast(null), 3000);
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `user_stats/${user.uid}/pomodoro`);
        }
      }

      if (isLastInCycle) {
        setPhase('LONG_BREAK');
        setTimeLeft(15 * 60);
      } else {
        setPhase('SHORT_BREAK');
        setTimeLeft(timerMode === 'POMODORO' ? 5 * 60 : 10 * 60);
      }
      
      setSessionsCompleted(prev => (prev + 1) % 4);
      playPhaseSound(true);
      setElapsedSeconds(0);
    } else {
      // Break over
      setPhase('WORK');
      setTimeLeft(timerMode === 'POMODORO' ? 25 * 60 : 50 * 60);
      playPhaseSound(false);
      setElapsedSeconds(0);
    }
    setIsActive(false);
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        if (phase === 'WORK') {
          setElapsedSeconds(prev => prev + 1);
        }
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, phase]);

  const resetTimer = () => {
    setIsActive(false);
    setPhase('WORK');
    setTimeLeft(getPhaseDuration('WORK', timerMode));
    setSessionsCompleted(0);
    setElapsedSeconds(0);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const changeMode = (m: typeof timerMode) => {
    setIsActive(false);
    setTimerMode(m);
    setPhase('WORK');
    setTimeLeft(getPhaseDuration('WORK', m));
    setSessionsCompleted(0);
    setElapsedSeconds(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="glass p-8 rounded-3xl border border-white/5 space-y-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Clock size={120} className="text-white" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
             <span className="text-[10px] font-mono text-accent uppercase tracking-[0.4em] font-black">Focus_Protocol_Active</span>
          </div>
          <h3 className="text-3xl font-serif font-black text-white uppercase italic tracking-wider">AETHOS_POMODORO</h3>
          
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
            <button 
              onClick={() => changeMode('POMODORO')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all",
                timerMode === 'POMODORO' ? "bg-white/10 text-text-p shadow-xl" : "text-text-m opacity-50 hover:opacity-100"
              )}
            >
              POMODORO
            </button>
            <button 
              onClick={() => changeMode('DEEP_WORK')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all",
                timerMode === 'DEEP_WORK' ? "bg-white/20 text-accent shadow-xl" : "text-text-m opacity-50 hover:opacity-100"
              )}
            >
              DEEP_WORK
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
           <div className="text-7xl font-mono font-black text-white text-glow-white tracking-tighter">
             {formatTime(timeLeft)}
           </div>
           <div className="flex items-center gap-2">
              <p className="text-[10px] font-mono text-text-m uppercase tracking-widest opacity-60">
                 {phase === 'WORK' ? 'WORK_SESSION' : phase === 'SHORT_BREAK' ? 'SHORT_BREAK' : 'LONG_BREAK'}
              </p>
              <div className="flex gap-1.5 ml-4">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={`session-dot-${i}`} 
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-500",
                      i < sessionsCompleted ? "bg-accent shadow-[0_0_8px_rgba(255,51,102,0.6)]" : "bg-white/10 border border-white/5"
                    )} 
                  />
                ))}
              </div>
           </div>
        </div>

        <div className="flex gap-3">
           <button 
            onClick={toggleTimer}
            className={cn(
              "px-8 py-3 rounded-xl font-mono text-xs font-black uppercase tracking-widest transition-all shadow-xl",
              isActive ? "bg-white/5 text-text-p border border-white/20" : "bg-accent text-white accent-glow"
            )}
           >
             {isActive ? 'PAUSE' : 'START_MISSION'}
           </button>
           <button 
            onClick={resetTimer}
            className="p-3 bg-white/5 border border-white/10 text-text-m hover:text-text-p rounded-xl transition-all"
           >
             <Eraser size={18} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="glass p-4 rounded-2xl border border-white/5 bg-black/40">
            <p className="text-[8px] font-mono text-text-m uppercase tracking-widest mb-1">PROTOCOLS_LIFETIME</p>
            <p className="text-xl font-mono font-black text-white">{stats?.pomodoroSessions || 0}</p>
         </div>
         <div className="glass p-4 rounded-2xl border border-white/5 bg-black/40">
            <p className="text-[8px] font-mono text-text-m uppercase tracking-widest mb-1">PROTOCOLS_TODAY</p>
            <p className="text-xl font-mono font-black text-accent text-glow-soft">{stats?.pomodoroToday || 0}</p>
         </div>
      </div>
    </div>
  );
}

function TemporalHub({ 
  tasks, 
  timeBlocks, 
  journals, 
  stats, 
  user,
  onAddXP,
  onFocus,
  onComplete,
  addTimeBlock,
  deleteTimeBlock,
  updateTimeBlock,
  updateTask,
  applyTemplate,
  setCompleteToast,
  settings,
  onUpdateSettings,
  addToTerminal
}: { 
  tasks: Task[]; 
  timeBlocks: TimeBlock[]; 
  journals: JournalEntry[];
  stats: UserStats | null; 
  user: User;
  onAddXP: (amount: number, source: string, meta?: any) => void;
  onFocus: (task: Task) => void;
  onComplete: (task: Task) => void;
  addTimeBlock: (block: Omit<TimeBlock, 'id' | 'userId'>) => Promise<void>;
  deleteTimeBlock: (id: string, source?: 'task' | 'block') => Promise<void>;
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>, source?: 'task' | 'block') => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  applyTemplate: (templateId: string, date: Date) => Promise<void>;
  setCompleteToast: (msg: string | null) => void;
  settings: AppSettings | null;
  onUpdateSettings: (s: Partial<AppSettings>) => Promise<void>;
  addToTerminal?: any;
}) {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [blockForm, setBlockForm] = useState<Partial<TimeBlock>>({ type: 'task' });
  
  const [draggingBlock, setDraggingBlock] = useState<{
    id: string;
    source: 'task' | 'block';
    initialTop: number;
    initialStartY: number;
    initialStartTime: string;
    initialEndTime: string;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // --- Smart Task Continuity Engine ---
  const smartSuggestions = useMemo(() => {
    // Standardize title strings to find recurring tasks
    const taskGroups: Record<string, {
      title: string;
      category: 'health' | 'learning' | 'creative' | 'work' | 'personal' | 'routine';
      estimate: number;
      priority: 'low' | 'medium' | 'high' | 'critical';
      occurrences: Array<{ status: string; createdAt: string }>;
    }> = {};

    tasks.forEach(t => {
      const titleClean = t.title.trim().toLowerCase();
      if (!titleClean) return;

      if (!taskGroups[titleClean]) {
        taskGroups[titleClean] = {
          title: t.title,
          category: t.category || 'work',
          estimate: t.estimate || 30,
          priority: t.priority || 'medium',
          occurrences: []
        };
      }
      taskGroups[titleClean].occurrences.push({
        status: t.status,
        createdAt: t.createdAt
      });
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const result = Object.entries(taskGroups).map(([cleanKey, group]) => {
      const occurrences = group.occurrences;
      const totalCount = occurrences.length;
      const completedCount = occurrences.filter(o => o.status === 'completed').length;
      
      // Completion consistency rate (0 to 1)
      const completionRate = totalCount > 0 ? completedCount / totalCount : 0;

      // Frequency score (0 to 1) - maxes out at 8 occurrences
      const frequencyScore = Math.min(1.0, totalCount / 8);

      // Recency factor (0 to 1)
      let recencyScore = 0.5;
      if (occurrences.length > 0) {
        // Find most recent occurrence ISO
        const sortedOccs = [...occurrences].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const latestIso = sortedOccs[0].createdAt;
        const daysSinceLast = Math.max(0, (new Date().getTime() - new Date(latestIso).getTime()) / (86400 * 1000));
        recencyScore = daysSinceLast <= 2 ? 1.0 : daysSinceLast <= 5 ? 0.8 : daysSinceLast <= 10 ? 0.6 : Math.max(0.1, 1 - (daysSinceLast / 30));
      }

      // Abandonment index (repeatedly abandoned should gradually decay)
      const abandonedCount = totalCount - completedCount;
      const abandonmentPenalty = Math.min(0.4, abandonedCount * 0.08);

      // Final weighted confidence percentage (0 to 100)
      // High completion consistency, frequent appearance, and high recency boost it!
      let rawScore = (completionRate * 0.45) + (frequencyScore * 0.35) + (recencyScore * 0.20);
      rawScore = Math.max(0.05, rawScore - abandonmentPenalty);

      const confidence = Math.min(99, Math.max(10, Math.round(rawScore * 100)));

      return {
        title: group.title,
        category: group.category,
        estimate: group.estimate,
        priority: group.priority,
        confidence,
        totalCount,
        completedCount
      };
    });

    // Filter out:
    // 1. Tasks already existing in today's task list (to avoid offering redundant suggestions)
    // 2. Sort by confidence descending
    // 3. Slice to top 4 recommendations
    return result
      .filter(s => {
        const isAlreadyToday = tasks.some(t => t.createdAt.startsWith(todayStr) && t.title.trim().toLowerCase() === s.title.trim().toLowerCase());
        return !isAlreadyToday;
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);
  }, [tasks]);

  const xpAndCompletionLookup = useMemo(() => {
    const taskCountMap: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(t => {
      if (!t.createdAt) return;
      const dayStr = t.createdAt.split('T')[0];
      if (!taskCountMap[dayStr]) {
        taskCountMap[dayStr] = { total: 0, completed: 0 };
      }
      taskCountMap[dayStr].total++;
      if (t.status === 'completed') {
        taskCountMap[dayStr].completed++;
      }
    });

    const xpMap: Record<string, number> = {};
    if (stats?.activityLog) {
      stats.activityLog.forEach(a => {
        if (!a.timestamp) return;
        const dayStr = a.timestamp.split('T')[0];
        xpMap[dayStr] = (xpMap[dayStr] || 0) + a.xp;
      });
    }

    return { taskCountMap, xpMap };
  }, [tasks, stats?.activityLog]);

  const handleAddSuggestedTask = async (s: any) => {
    try {
      const newTask = {
        userId: user.uid,
        title: s.title,
        priority: (s.priority || 'medium') as any,
        status: 'pending' as const,
        category: (s.category || 'work') as any,
        estimate: s.estimate || 30,
        subTasks: [],
        createdAt: new Date().toISOString(),
        expiresAt: chronos.getCycleEnd().toISOString(),
        isExpired: false
      };
      await addDoc(collection(db, 'tasks'), newTask);
      onAddXP(8, 'SUGGESTED_TASK_ADDED');
      setCompleteToast(`Activated Suggestion: ${s.title}`);
      setTimeout(() => setCompleteToast(null), 3000);
    } catch (err) {
      console.error(err);
      setCompleteToast('Failed to add suggested protocol');
      setTimeout(() => setCompleteToast(null), 3000);
    }
  };

  const handleCopyYesterday = async () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      const yesterdaysTasks = tasks.filter(t => t.createdAt.startsWith(yesterdayStr));
      
      if (yesterdaysTasks.length === 0) {
        setCompleteToast('No tasks found from yesterday');
        setTimeout(() => setCompleteToast(null), 3000);
        return;
      }

      const todayTasks = tasks.filter(t => t.createdAt.startsWith(todayStr));
      
      const tasksToCopy = yesterdaysTasks.filter(yTask => {
        // Is it already on today's list?
        const isDuplicate = todayTasks.some(tTask => tTask.title.trim().toLowerCase() === yTask.title.trim().toLowerCase());
        return !isDuplicate;
      });

      if (tasksToCopy.length === 0) {
        setCompleteToast('All yesterday protocols already present today');
        setTimeout(() => setCompleteToast(null), 3000);
        return;
      }

      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      tasksToCopy.forEach(t => {
        const newTaskRef = doc(collection(db, 'tasks'));
        batch.set(newTaskRef, {
          userId: user.uid,
          title: t.title,
          priority: t.priority || 'medium',
          status: 'pending', // Reset completion status
          category: t.category || 'work',
          estimate: t.estimate || 30,
          subTasks: [],
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
      onAddXP(5 * tasksToCopy.length, 'COPY_YESTERDAY_SYNC');
      setCompleteToast(`Duplicated ${tasksToCopy.length} protocol loads from yesterday`);
      setTimeout(() => setCompleteToast(null), 3000);
    } catch (err) {
      console.error(err);
      setCompleteToast('Error syncing yesterday');
      setTimeout(() => setCompleteToast(null), 3000);
    }
  };

  // Sync scheduled tasks into the timetable
  const allBlocks = useMemo(() => {
    const blocks = timeBlocks.map(b => ({ 
      ...b, 
      source: 'block' as const,
      originalTask: null as Task | null
    }));
    
    tasks.forEach(t => {
      if (t.scheduledStart && t.scheduledEnd) {
        blocks.push({
          id: t.id,
          userId: t.userId,
          title: t.title,
          type: 'task',
          startTime: t.scheduledStart,
          endTime: t.scheduledEnd,
          completed: t.status === 'completed',
          source: 'task' as const,
          originalTask: t
        } as any);
      }
    });
    
    return blocks;
  }, [timeBlocks, tasks]);

  useEffect(() => {
    if (!draggingBlock) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.pageY - draggingBlock.initialStartY;
      setDragOffset(deltaY);
    };

    const handleMouseUp = async () => {
      if (!draggingBlock) return;

      const finalOffsetMinutes = Math.round(dragOffset / 1.6);
      if (finalOffsetMinutes === 0) {
        setDraggingBlock(null);
        setDragOffset(0);
        return;
      }

      const start = parseISO(draggingBlock.initialStartTime);
      const end = parseISO(draggingBlock.initialEndTime);
      
      const newStart = addMinutes(start, finalOffsetMinutes);
      const newEnd = addMinutes(end, finalOffsetMinutes);

      if (draggingBlock.source === 'block') {
        await updateTimeBlock(draggingBlock.id, {
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString()
        });
      } else {
        await updateTask(draggingBlock.id, {
          scheduledStart: newStart.toISOString(),
          scheduledEnd: newEnd.toISOString()
        });
      }

      setDraggingBlock(null);
      setDragOffset(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBlock, dragOffset, updateTimeBlock, updateTask]);

  const generateAITimetable = async (routine: string[]) => {
    if (!user) return;
    setIsAIModalOpen(false);
    setIsGenerating(true);
    setGenerationStep('ANALYZING_PENDING_PROTOCOLS...');

    try {
      const pendingTasks = tasks.filter(t => t.status === 'pending');
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');

      setGenerationStep('COORDINATING_NEURAL_STREAMS...');

      const response = await fetch("/api/gemini/generate-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todayStr, pendingTasks, routine })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blocks = await response.json();

      if (blocks && blocks.length > 0) {
        setGenerationStep('SYNCING_WITH_FIRESTORE...');
        
        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);
        
        // Only clear BLOCKS, don't delete TASKS
        const todayBlocks = timeBlocks.filter(b => b.startTime.startsWith(todayStr));
        for (const b of todayBlocks) {
          batch.delete(doc(db, 'time_blocks', b.id));
        }

        // Also clear existing scheduled times for tasks today to avoid overlaps or duplicates if they are rescheduled
        const todayTasks = tasks.filter(t => t.scheduledStart?.startsWith(todayStr));
        for (const t of todayTasks) {
          batch.update(doc(db, 'tasks', t.id), { scheduledStart: null, scheduledEnd: null });
        }

        for (const block of blocks) {
          // Sync check: Does this block title match an existing pending task?
          const matchingTask = pendingTasks.find(t => 
            t.title.toLowerCase().includes(block.title.toLowerCase()) || 
            block.title.toLowerCase().includes(t.title.toLowerCase())
          );

          if (block.type === 'task' && matchingTask) {
            batch.update(doc(db, 'tasks', matchingTask.id), {
              scheduledStart: block.startTime,
              scheduledEnd: block.endTime
            });
          } else if (block.type === 'task') {
            // It's a new task suggested by AI, create a Task doc instead of a TimeBlock
            const newTaskRef = doc(collection(db, 'tasks'));
            batch.set(newTaskRef, {
              userId: user.uid,
              title: block.title,
              priority: 'medium',
              status: 'pending',
              category: 'learning',
              estimate: differenceInMinutes(parseISO(block.endTime), parseISO(block.startTime)),
              difficulty: 'medium',
              scheduledStart: block.startTime,
              scheduledEnd: block.endTime,
              createdAt: new Date().toISOString()
            });
          } else {
            const newBlockRef = doc(collection(db, 'time_blocks'));
            batch.set(newBlockRef, {
              userId: user.uid,
              title: block.title,
              type: block.type,
              startTime: block.startTime,
              endTime: block.endTime,
              completed: false
            });
          }
        }
        
        await batch.commit();
        
        onAddXP(50, 'AI_TIMETABLE_GENERATE');
        setCompleteToast('AI_SYNCHRONIZATION_COMPLETE');
        setTimeout(() => setCompleteToast(null), 3000);
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      setCompleteToast('AI_SYNC_FAILURE');
      setTimeout(() => setCompleteToast(null), 3000);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const getDayCompletion = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    const counts = xpAndCompletionLookup.taskCountMap[dayStr];
    if (!counts || counts.total === 0) return 0;
    return counts.completed / counts.total;
  };

  const getDayXP = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return xpAndCompletionLookup.xpMap[dayStr] || 0;
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white/5 rounded-full text-text-m"><ChevronRight className="rotate-180" size={16} /></button>
            <h3 className="text-2xl font-serif font-black text-white italic uppercase tracking-[0.2em]">{format(currentDate, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/5 rounded-full text-text-m"><ChevronRight size={16} /></button>
          </div>
          <div className="flex glass p-1 rounded-lg border border-white/5">
             {(['month', 'week', 'day'] as const).map((mode) => (
               <button key={mode} onClick={() => setViewMode(mode)} className={cn("px-4 py-1.5 rounded-md text-[10px] font-mono font-black uppercase transition-all", viewMode === mode ? "bg-accent text-white" : "text-text-m hover:text-text-p")}>{mode}</button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden glass shadow-2xl">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-background-nested p-4 text-[10px] font-mono font-black text-text-m uppercase text-center tracking-widest">{d}</div>
          ))}
          {days.map((day) => {
            const completion = getDayCompletion(day);
            const xp = getDayXP(day);
            const journal = journals.find(j => isSameDay(new Date(j.createdAt), day));
            const dayTasks = tasks.filter(t => isSameDay(new Date(t.createdAt), day));
            const mood = journal ? MOODS.find(m => m.id === journal.mood) : null;
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <motion.div 
                key={day.toISOString()}
                whileHover={{ scale: 1.02, zIndex: 10 }}
                onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                className={cn(
                   "aspect-square p-3 relative cursor-pointer group transition-all",
                   isCurrentMonth ? "bg-card/20" : "bg-black/40 opacity-30",
                   isToday && "ring-2 ring-inset ring-accent z-10"
                )}
              >
                <div className={cn(
                  "absolute inset-0 opacity-20 transition-opacity group-hover:opacity-40",
                  completion >= 0.8 ? "bg-success" : completion >= 0.5 ? "bg-warning" : completion > 0 ? "bg-danger" : ""
                )} />
                <div className="relative z-10 flex justify-between items-start">
                   <span className={cn("text-[10px] font-mono font-black", isToday ? "text-accent" : "text-text-m")}>{format(day, 'd')}</span>
                   {stats?.streakHistory?.includes(format(day, 'yyyy-MM-dd')) && <Flame size={12} className="text-warning animate-pulse" />}
                </div>
                {mood && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity"><span className="text-lg">{mood.emoji}</span></div>}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                   <div className="flex gap-0.5">{dayTasks.slice(0, 3).map((t, i) => (<div key={`task-dot-${t.id}-${i}`} className={cn("w-1.5 h-1.5 rounded-full", t.status === 'completed' ? "bg-success" : "bg-text-s")} />))}</div>
                   {xp > 0 && <span className="text-[8px] font-mono text-cyan/70">+{xp}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimetableView = (days: Date[]) => {
    const hours = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM to 11 PM

    return (
      <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
           <div className="flex flex-col md:flex-row md:items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar pb-2 md:pb-0">
              <div className="flex glass p-1 rounded-lg border border-white/5 shrink-0">
                {(['month', 'week', 'day'] as const).map(mode => (
                  <button key={mode} onClick={() => setViewMode(mode)} className={cn("px-4 py-1.5 rounded-md text-[10px] font-mono font-black uppercase transition-all", viewMode === mode ? "bg-accent text-white" : "text-text-m hover:text-text-p")}>{mode}</button>
                ))}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                 <button onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'week' ? -7 : -1))} className="p-2 hover:bg-white/5 rounded-full text-text-m border border-white/5"><ChevronRight className="rotate-180" size={16} /></button>
                 <span className="text-[10px] lg:text-sm font-mono font-black uppercase tracking-widest whitespace-nowrap">{viewMode === 'week' ? `Week of ${format(days[0], 'MMM do')}` : format(currentDate, 'EEEE, MMM do')}</span>
                 <button onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'week' ? 7 : 1))} className="p-2 hover:bg-white/5 rounded-full text-text-m border border-white/5"><ChevronRight size={16} /></button>
              </div>
           </div>
           
           <div className="flex gap-2 lg:gap-4 overflow-x-auto no-scrollbar pb-2 xl:pb-0">
              <button 
                onClick={() => setIsAIModalOpen(true)}
                className="flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2 glass border border-accent/40 text-accent font-mono text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-accent/10 hover:border-accent transition-all rounded-lg accent-glow-soft group shrink-0"
              >
                <Sparkles size={12} className="group-hover:animate-pulse" /> AI Scheduler
              </button>
              <button 
                onClick={() => setIsTemplateModalOpen(true)}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 glass border border-cyan/30 text-cyan font-mono text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-cyan/10 transition-all rounded-lg shrink-0"
              >
                <LayoutGrid size={12} /> Templates
              </button>
              <button 
                onClick={() => { setBlockForm({ startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), endTime: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"), type: 'task' }); setIsBlockModalOpen(true); }}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-accent text-white font-mono text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all rounded-lg accent-glow shadow-xl shrink-0"
              >
                <Plus size={12} /> Add Block
              </button>
           </div>
        </div>

        <FocusProtocol stats={stats} user={user} onAddXP={onAddXP} setCompleteToast={setCompleteToast} addToTerminal={addToTerminal} />

        <div className="relative glass rounded-3xl border border-white/5 overflow-hidden bg-black/20 flex min-h-[600px]">
           <AnimatePresence>
             {isGenerating && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md"
               >
                  <div className="relative w-48 h-48">
                     <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-t-2 border-cyan rounded-full shadow-[0_0_20px_rgba(0,217,255,0.2)]" />
                     <motion.div animate={{ rotate: -360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute inset-4 border-b-2 border-accent rounded-full shadow-[0_0_20px_rgba(255,51,102,0.2)]" />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                          <Sparkles className="text-cyan fill-cyan/20" size={48} />
                        </motion.div>
                     </div>
                  </div>
                  <div className="mt-12 text-center space-y-4">
                    <p className="text-cyan font-mono text-xs tracking-[0.8em] font-black animate-pulse">NEURAL_SYNC_IN_PROGRESS</p>
                    <p className="text-text-m font-mono text-[10px] uppercase opacity-50 tracking-[0.3em] font-black">{generationStep}</p>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
           <div className="w-20 bg-background-nested/50 border-r border-white/5 pt-12 shrink-0">
              {hours.map(hour => (
                <div key={hour} className="h-24 px-4 flex flex-col justify-start border-b border-white/5 relative">
                   <span className="text-[10px] font-mono text-text-m opacity-50 relative top-[-6px]">{hour}:00</span>
                </div>
              ))}
           </div>

           <div className="flex-1 overflow-x-auto custom-scrollbar">
             <div className="flex divide-x divide-white/5 min-w-full">
                {days.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayBlocks = allBlocks.filter(b => b.startTime.startsWith(dayStr));
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div key={day.toISOString()} className={cn("flex-1 min-w-[200px] relative h-[1824px] group/day", isToday && "bg-accent/5")}>
                       {hours.map(hour => (
                         <div key={hour} className="h-24 border-b border-white/5 relative">
                            <div className="absolute inset-0 bg-white/2 opacity-0 group-hover/day:opacity-100 transition-opacity" />
                         </div>
                       ))}
                       {dayBlocks.map((block, idx) => {
                         const start = parseISO(block.startTime);
                         const end = parseISO(block.endTime);
                         const initialTop = ((start.getHours() - 5) * 60 + start.getMinutes()) * 1.6;
                         const height = differenceInMinutes(end, start) * 1.6;
                         
                         const isDragging = draggingBlock?.id === block.id;
                         const top = isDragging ? initialTop + dragOffset : initialTop;
                         
                         const typeColors = {
                            task: 'border-warning bg-warning/10 text-warning',
                            event: 'border-cyan bg-cyan/10 text-cyan',
                            break: 'border-success bg-success/10 text-success',
                            routine: 'border-accent bg-accent/10 text-accent'
                         };

                         const generatedKey = `${(block as any).source || 'block'}-${block.id}-${idx}`;


                         return (
                           <motion.div 
                             key={generatedKey}
                             whileHover={!draggingBlock ? { scale: 1.02, zIndex: 10 } : {}}
                             onMouseDown={(e) => {
                               e.stopPropagation();
                               setDraggingBlock({
                                 id: block.id,
                                 source: (block as any).source || 'block',
                                 initialTop,
                                 initialStartY: e.pageY,
                                 initialStartTime: block.startTime,
                                 initialEndTime: block.endTime
                               });
                             }}
                             onClick={() => { if (!draggingBlock) { setBlockForm(block); setIsBlockModalOpen(true); } }}
                             className={cn(
                                "absolute left-2 right-2 rounded-xl border-t-4 p-3 glass flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing select-none transition-shadow",
                                typeColors[block.type] || typeColors.task,
                                isDragging && "z-50 shadow-[0_0_40px_rgba(255,255,255,0.2)] opacity-90 scale-[1.02] border-white/40"
                             )}
                             style={{ top: `${top}px`, height: `${height}px` }}
                           >
                              <div className="space-y-1">
                                 <div className="flex justify-between items-start">
                                    <p className="text-[8px] font-mono uppercase font-black tracking-widest opacity-60">{(block as any).source === 'task' ? 'SYNCED_TASK' : block.type}</p>
                                    {(block as any).completed && <CheckCircle2 size={10} className="text-success" />}
                                 </div>
                                 <p className="text-xs font-bold leading-tight uppercase font-serif italic truncate">{block.title}</p>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                 <span className="text-[8px] font-mono opacity-50">
                                   {format(isDragging ? addMinutes(start, Math.round(dragOffset/1.6)) : start, 'HH:mm')}
                                 </span>
                                 <div className="flex gap-2">
                                   {(block as any).source === 'task' && !block.completed && (
                                     <button 
                                       onClick={(e) => { 
                                         e.stopPropagation(); 
                                         if ((block as any).originalTask) {
                                           onComplete((block as any).originalTask);
                                         }
                                       }} 
                                       className="hover:text-success p-1 opacity-40 hover:opacity-100"
                                     >
                                       <CheckCircle2 size={10} />
                                     </button>
                                   )}
                                   <button 
                                     onClick={(e) => { 
                                       e.stopPropagation(); 
                                       if ((block as any).source === 'block') {
                                         deleteTimeBlock(block.id);
                                       } else {
                                         deleteTimeBlock(block.id, 'task');
                                       }
                                     }} 
                                     className="hover:text-danger p-1 opacity-40 hover:opacity-100"
                                   >
                                     <Trash2 size={10} />
                                   </button>
                                 </div>
                              </div>
                           </motion.div>
                         );
                       })}
                    </div>
                  );
                })}
             </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 min-h-[800px]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-accent" size={20} />
              <span className="text-[10px] font-mono text-accent uppercase tracking-[0.5em] font-black">Temporal_Synchronization_Hub</span>
           </div>
           <h2 className="text-5xl font-serif font-black text-white uppercase italic tracking-widest text-glow-white">SCHEDULER</h2>
        </div>
        <div className="flex gap-4">
           <div className="glass p-4 rounded-xl border border-white/10 flex items-center gap-3">
              <Flame className="text-warning" size={20} />
              <div>
                 <p className="text-[8px] font-mono text-text-m uppercase">Streak Stability</p>
                 <p className="text-lg font-mono font-black text-white">{stats?.currentStreak} DAY_CHAIN</p>
              </div>
           </div>
           <div className="glass p-4 rounded-xl border border-white/10 flex items-center gap-3 px-6">
              <Zap className="text-cyan" size={20} />
              <div>
                 <p className="text-[8px] font-mono text-text-m uppercase">Protocol Efficiency</p>
                 <p className="text-lg font-mono font-black text-white">96%</p>
              </div>
           </div>
        </div>
      </header>

      {viewMode === 'month' && renderMonthView()}
      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Protocol Buffer */}
          <div className="lg:col-span-2 glass p-6 rounded-3xl border border-white/5 bg-white/2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/2 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center border border-cyan/20">
                  <Database size={16} className="text-cyan" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-black text-white uppercase tracking-[0.3em]">Protocol_Buffer</h3>
                  <p className="text-[8px] font-mono text-text-m uppercase opacity-50">Pending Synchronization</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-text-m bg-white/5 px-2 py-1 rounded border border-white/5 italic">
                {tasks.filter(t => t.status === 'pending' && !t.scheduledStart).length} PENDING_LOADS
              </span>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar relative z-10 scroll-smooth">
              {tasks.filter(t => t.status === 'pending' && !t.scheduledStart).length === 0 ? (
                <div className="py-6 px-4 text-center w-full">
                  <p className="text-[10px] font-mono text-text-s uppercase tracking-widest opacity-40">ALL_PROTOCOLS_SYNCHRONIZED</p>
                </div>
              ) : (
                tasks.filter(t => t.status === 'pending' && !t.scheduledStart).map((task, idx) => (
                  <motion.div 
                    key={`unscheduled-task-${task.id}-${idx}`} 
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 217, 255, 0.05)' }}
                    onClick={() => { 
                      const now = new Date();
                      now.setMinutes(Math.round(now.getMinutes() / 15) * 15);
                      const end = addMinutes(now, task.estimate || 30);
                      setBlockForm({
                        id: task.id,
                        title: task.title,
                        startTime: format(now, "yyyy-MM-dd'T'HH:mm"),
                        endTime: format(end, "yyyy-MM-dd'T'HH:mm"),
                        type: 'task',
                        source: 'task'
                      } as any);
                      setIsBlockModalOpen(true);
                    }}
                    className="min-w-[200px] p-4 glass border border-white/10 rounded-2xl cursor-pointer hover:border-cyan/40 transition-all flex flex-col justify-between group/task bg-black/20"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[8px] font-mono text-cyan uppercase font-black tracking-tighter opacity-70 group-hover/task:opacity-100 italic">SYSTEM_PENDING</span>
                      <ChevronRight size={12} className="text-text-m opacity-0 group-hover/task:opacity-100 group-hover/task:translate-x-1 transition-all" />
                    </div>
                    <p className="text-sm font-serif font-black text-white italic uppercase tracking-tight truncate mb-2">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-text-m opacity-50 uppercase">NODE_{task.category}</span>
                      <span className="text-[9px] font-mono text-cyan font-black uppercase">{task.estimate}M</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Smart Continuity Engine */}
          <div className="lg:col-span-1 glass p-6 rounded-3xl border border-white/5 bg-white/2 relative overflow-hidden group flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/2 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
            <div className="relative z-10 w-full">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20 shrink-0">
                    <RefreshCw size={14} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[11px] font-mono font-black text-white uppercase tracking-wider truncate">Smart_Continuity</h3>
                    <p className="text-[8px] font-mono text-text-m uppercase opacity-50 truncate">Cognitive learning systems</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleCopyYesterday}
                  className="px-2 py-1 bg-accent/10 hover:bg-accent text-white border border-accent/35 text-[8px] font-mono rounded-md transition-all font-black uppercase tracking-wider flex items-center gap-1 shrink-0 active:scale-95"
                  title="Copy yesterday's task matrix"
                >
                  <Copy size={9} /> Copy Yesterday
                </button>
              </div>

              {/* Suggested Tasks */}
              <div className="space-y-2 mt-3 w-full">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-mono text-text-p uppercase font-black tracking-widest">Suggested Protocols</span>
                  <span className="text-[8px] font-mono text-accent uppercase font-black tracking-tighter opacity-70">LEARNING_ALIGNED</span>
                </div>

                <div className="space-y-1.5 w-full">
                  {smartSuggestions.length === 0 ? (
                    <div className="py-4 px-3 rounded-xl border border-dashed border-white/10 bg-black/10 text-center">
                      <p className="text-[8px] font-mono text-text-s uppercase tracking-wider opacity-45">Awaiting user metrics...</p>
                    </div>
                  ) : (
                    smartSuggestions.map((s, idx) => (
                      <div 
                        key={`sugg-${idx}-${s.title}`}
                        className="py-2.5 px-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3 group/item transition-all"
                      >
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-serif font-black text-white italic truncate uppercase">{s.title}</span>
                            <span className="shrink-0 text-[10px] font-mono bg-cyan/10 text-cyan border border-cyan/25 px-1 py-0.5 rounded font-black">{s.confidence}% MATCH</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-text-m uppercase opacity-50 truncate">NODE_{s.category}</span>
                            <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                            <span className="text-[10px] font-mono text-text-m opacity-50 truncate">{s.completedCount}/{s.totalCount} COMPLETED</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddSuggestedTask(s)}
                          className="px-2 py-1 rounded-md bg-white/5 text-[9px] text-text-m hover:text-accent hover:bg-accent/15 border border-transparent hover:border-accent/10 transition-all font-mono font-black"
                        >
                          + ADD
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {viewMode === 'week' && renderTimetableView(eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }))}
            {viewMode === 'day' && renderTimetableView([currentDate])}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAIModalOpen && (
          <AITimetableModal 
            isOpen={isAIModalOpen} 
            onClose={() => setIsAIModalOpen(false)} 
            onGenerate={generateAITimetable} 
            initialRoutine={settings?.aiRoutine || ['School', 'Tuition', 'Dinner']}
            onUpdateRoutine={(newRoutine) => onUpdateSettings({ aiRoutine: newRoutine })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-background/90 backdrop-blur-xl" onClick={() => setIsTemplateModalOpen(false)}>
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass max-w-2xl w-full p-8 rounded-3xl border border-white/10 space-y-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-white/5 pb-4"><h3 className="text-2xl font-serif font-black text-white italic uppercase tracking-widest">Select Protocol Template</h3><button onClick={() => setIsTemplateModalOpen(false)} className="text-text-m hover:text-white"><X /></button></div>
                <div className="grid grid-cols-1 gap-4">
                   {TEMPLATES.map(t => (
                     <button key={t.id} onClick={() => { applyTemplate(t.id, currentDate); setIsTemplateModalOpen(false); }} className="glass p-6 rounded-2xl border border-white/5 hover:border-accent/40 bg-white/2 hover:bg-accent/5 flex items-center justify-between text-left group transition-all">
                        <div className="flex items-center gap-6"><span className="text-4xl group-hover:scale-125 transition-transform">{t.icon}</span><div><p className="text-xl font-serif font-black text-white uppercase italic tracking-widest">{t.label}</p><p className="text-[10px] font-mono text-text-m uppercase opacity-50 mt-1">{t.blocks.length} Scheduled Blocks</p></div></div>
                        <ChevronRight className="text-text-m group-hover:text-accent group-hover:translate-x-2 transition-all" />
                     </button>
                   ))}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {isBlockModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-background/90 backdrop-blur-xl" onClick={() => setIsBlockModalOpen(false)}>
               <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="glass max-w-2xl w-full p-8 rounded-3xl border border-white/10 space-y-6" onClick={e => e.stopPropagation()}>
                 <h3 className="text-2xl font-serif font-black text-white italic uppercase tracking-widest">Initialize Time Block</h3>
                 <div className="space-y-4">
                    <div className="space-y-2"><label className="text-[10px] font-mono text-text-m uppercase">Block Title</label><input type="text" value={blockForm.title || ''} onChange={e => setBlockForm({...blockForm, title: e.target.value})} className="w-full bg-background-nested p-3 rounded-lg border border-white/10 text-white font-mono outline-none focus:border-accent" placeholder="What's this block for?" /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2"><label className="text-[10px] font-mono text-text-m uppercase">Start Time</label><input type="datetime-local" value={blockForm.startTime || ''} onChange={e => setBlockForm({...blockForm, startTime: e.target.value})} className="w-full bg-background-nested p-3 rounded-lg border border-white/10 text-white font-mono outline-none" /></div>
                       <div className="space-y-2"><label className="text-[10px] font-mono text-text-m uppercase">End Time</label><input type="datetime-local" value={blockForm.endTime || ''} onChange={e => setBlockForm({...blockForm, endTime: e.target.value})} className="w-full bg-background-nested p-3 rounded-lg border border-white/10 text-white font-mono outline-none" /></div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono text-text-m uppercase tracking-widest">Activity Type</label>
                       <div className="grid grid-cols-4 gap-2">
                          {(['task', 'event', 'break', 'routine'] as const).map(type => (
                            <button key={type} onClick={() => setBlockForm({...blockForm, type})} className={cn("py-2 rounded-lg border text-[10px] font-mono font-black uppercase transition-all", blockForm.type === type ? "bg-accent border-accent text-white" : "border-white/10 text-text-m hover:bg-white/5")}>{type}</button>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setIsBlockModalOpen(false)} className="flex-1 py-4 glass border border-white/10 text-text-m font-mono font-black uppercase rounded-xl hover:bg-white/5">Cancel</button>
                    <button onClick={() => { 
                      if (blockForm.id) { 
                        updateTimeBlock(blockForm.id, blockForm, (blockForm as any).source); 
                      } else { 
                        addTimeBlock(blockForm as any); 
                      } 
                      setIsBlockModalOpen(false); 
                    }} className="flex-1 py-4 bg-accent text-white font-mono font-black uppercase rounded-xl accent-glow">{blockForm.id ? 'Update Sync' : 'Initialize'}</button>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
}

function TipTapEditor({ 
  content, 
  onChange, 
  onWordCountChange, 
  readOnly = false 
}: { 
  content: string, 
  onChange: (html: string) => void, 
  onWordCountChange: (count: number) => void,
  readOnly?: boolean
}) {
  const wordCountTimer = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (wordCountTimer.current) clearTimeout(wordCountTimer.current);
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      if (wordCountTimer.current) clearTimeout(wordCountTimer.current);
      wordCountTimer.current = setTimeout(() => {
        const text = editor.getText();
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(w => w.length > 0).length;
        onWordCountChange(words);
      }, 500);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={cn(
      "border border-white/10 rounded-2xl overflow-hidden premium-transition shadow-inner",
      readOnly ? "bg-black/20" : "bg-black/40 focus-within:ring-2 focus-within:ring-cyan/30"
    )}>
      {!readOnly && (
        <div className="flex flex-wrap gap-1 p-2 bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive('bold') ? "text-cyan bg-cyan/5" : "text-text-m")} title="BOLD"><Bold size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive('italic') ? "text-cyan bg-cyan/5" : "text-text-m")} title="ITALIC"><Italic size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive('underline') ? "text-cyan bg-cyan/5" : "text-text-m")} title="UNDERLINE"><UnderlineIcon size={16} /></button>
          <div className="w-px h-4 bg-white/10 mx-1 self-center" />
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive('heading', { level: 1 }) ? "text-cyan bg-cyan/5" : "text-text-m")} title="H1"><Heading1 size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive('heading', { level: 2 }) ? "text-cyan bg-cyan/5" : "text-text-m")} title="H2"><Heading2 size={16} /></button>
          <div className="w-px h-4 bg-white/10 mx-1 self-center" />
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive('bulletList') ? "text-cyan bg-cyan/5" : "text-text-m")} title="BULLET_LIST"><List size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive('orderedList') ? "text-cyan bg-cyan/5" : "text-text-m")} title="NUMBERED_LIST"><ListOrdered size={16} /></button>
          <div className="w-px h-4 bg-white/10 mx-1 self-center" />
          <button 
            onClick={() => {
              const url = window.prompt('URL');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }} 
            className={cn("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive('link') ? "text-cyan bg-cyan/5" : "text-text-m")} 
            title="LINK"
          >
            <LinkIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().setColor('#00d9ff').run()} className="p-2 rounded-lg hover:bg-white/10 text-cyan/70 hover:text-cyan" title="COLOR_CYAN"><Palette size={16} /></button>
          <button onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} className="p-2 rounded-lg hover:bg-white/10 text-text-m" title="CLEAR_FORMAT"><Type size={16} /></button>
        </div>
      )}
      <div className="p-6">
        <EditorContent editor={editor} className={cn(
          "prose prose-invert max-w-none focus:outline-none min-h-[400px] journal-editor font-sans leading-relaxed",
          readOnly ? "cursor-default" : "cursor-text"
        )} />
      </div>
    </div>
  );
}

// --- Memoized Habit Heatmap ---
interface HabitHeatmapProps {
  heatmapData: any[];
}

const HabitHeatmap = React.memo(function HabitHeatmap({ heatmapData }: HabitHeatmapProps) {
  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-white/5 border-white/10 text-white/5';
    if (count <= 2) return 'bg-cyan/20 border-cyan/20 text-cyan/20';
    if (count <= 4) return 'bg-cyan/50 border-cyan/50 text-cyan/50';
    return 'bg-cyan border-cyan text-black shadow-[0_0_10px_rgba(0,217,255,0.4)]';
  };

  return (
    <div className="glass p-8 rounded-3xl border border-white/5 bg-white/2 relative overflow-hidden">
       <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
       
       <div className="flex justify-between items-center mb-8 relative z-10">
         <div>
           <h3 className="text-xs font-mono font-black text-white uppercase tracking-widest">Global_Consistency_Map</h3>
           <p className="text-[10px] font-mono text-text-m uppercase opacity-50">52_Week_Neural_Engagement_Grid</p>
         </div>
         <div className="flex gap-2">
           <div className="flex items-center gap-1.5">
             <div className="w-2.5 h-2.5 rounded-sm bg-white/5 border border-white/10" />
             <span className="text-[11px] font-mono text-text-m opacity-50 uppercase">0</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="w-2.5 h-2.5 rounded-sm bg-cyan/20 border border-cyan/20" />
             <span className="text-[11px] font-mono text-text-m opacity-50 uppercase">1-2</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="w-2.5 h-2.5 rounded-sm bg-cyan/50 border border-cyan/50" />
             <span className="text-[11px] font-mono text-text-m opacity-50 uppercase">3-4</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="w-2.5 h-2.5 rounded-sm bg-cyan border border-cyan" />
             <span className="text-[11px] font-mono text-text-m opacity-50 uppercase">5+</span>
           </div>
         </div>
       </div>

       <div className="relative z-10 w-full overflow-x-auto scrollbar-hide no-scrollbar">
          <div className="flex gap-2 pb-4 min-w-[700px] w-full">
            {/* Grid Labels: Days */}
            <div className="flex flex-col justify-around text-[10px] font-mono text-text-m opacity-40 pr-3 uppercase pb-2 font-black lg:tracking-wider leading-[1.3] text-left shrink-0">
              <span className="py-0.5">Mon</span>
              <span className="opacity-0 py-0.5">Tue</span>
              <span className="py-0.5">Wed</span>
              <span className="opacity-0 py-0.5">Thu</span>
              <span className="py-0.5">Fri</span>
              <span className="opacity-0 py-0.5">Sat</span>
              <span className="py-0.5 font-bold text-accent/80">Sun</span>
            </div>

            {/* Grid Columns (Weeks) */}
            <div className="flex gap-0.5 sm:gap-1">
              {Array.from({ length: 52 }).map((_, weekIdx) => (
                <div key={`heatmap-week-${weekIdx}`} className="flex flex-col gap-0.5 sm:gap-1">
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const dataIdx = weekIdx * 7 + dayIdx;
                    const dayData = heatmapData[dataIdx];
                    if (!dayData) return <div key={`heatmap-day-empty-${weekIdx}-${dayIdx}`} className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-transparent" />;
                    
                    return (
                      <div 
                        key={`heatmap-day-${weekIdx}-${dayIdx}`}
                        title={`${dayData.date} - ${dayData.count} habits completed`}
                        className={cn(
                          "w-3 h-3 sm:w-4 sm:h-4 rounded-sm border border-black/5 flex items-center justify-center transition-all hover:scale-135 hover:z-20 hover:shadow-md cursor-help",
                          getIntensity(dayData.count)
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 flex justify-between text-[10px] font-mono text-text-m opacity-30 uppercase font-bold sm:tracking-widest">
            <span>LAST_SYNC: 52_WEEKS_AGO</span>
            <span>SYNC_TARGET: PRESENT_DAY</span>
          </div>
       </div>
    </div>
  );
});

function RoutineMatrixView({ 
  habits, 
  habitLogs, 
  user, 
  onAddHabit, 
  onToggleHabit, 
  onDeleteHabit,
  openShare
}: { 
  habits: Habit[]; 
  habitLogs: HabitLog[]; 
  user: User; 
  onAddHabit: (h: any) => Promise<void>; 
  onToggleHabit: (h: Habit, date: string) => Promise<void>;
  onDeleteHabit: (id: string) => Promise<void>;
  openShare?: any;
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [newHabit, setNewHabit] = useState({
    name: '',
    category: 'routine',
    frequency: 'daily',
    targetStreak: 30,
    color: '#00D9FF'
  });

  const [heatmapVisible, setHeatmapVisible] = React.useState(false);
  const heatmapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { 
        if (entry.isIntersecting) {
          setHeatmapVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    if (heatmapRef.current) observer.observe(heatmapRef.current);
    return () => observer.disconnect();
  }, []);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const activeHabits = habits.filter(h => !h.isArchived);

  // Helper: Calculate streak for a habit
  const calculateStreak = (habitId: string) => {
    const logs = habitLogs
      .filter(l => l.habitId === habitId && l.completed)
      .map(l => l.date)
      .sort((a, b) => b.localeCompare(a));
    
    if (logs.length === 0) return 0;
    
    let streak = 0;
    let checkDate = new Date();
    const todayStr = format(checkDate, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(checkDate, 1), 'yyyy-MM-dd');
    
    if (logs[0] !== todayStr && logs[0] !== yesterdayStr) return 0;

    let currentIdx = 0;
    while (currentIdx < logs.length) {
      const expected = format(subDays(new Date(logs[0]), streak), 'yyyy-MM-dd');
      if (logs.find(l => l === expected)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  // Helper: Best streak
  const calculateBestStreak = (habitId: string) => {
    const logs = habitLogs
      .filter(l => l.habitId === habitId && l.completed)
      .map(l => l.date)
      .sort((a, b) => a.localeCompare(b));
    
    if (logs.length === 0) return 0;
    
    let best = 0;
    let current = 1;
    for (let i = 1; i < logs.length; i++) {
      const prevDate = new Date(logs[i-1]);
      const currDate = new Date(logs[i]);
      const diff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diff === 1) {
        current++;
      } else {
        best = Math.max(best, current);
        current = 1;
      }
    }
    return Math.max(best, current);
  };

  // Heatmap Data (last 52 weeks)
  const heatmapData = useMemo(() => {
    const data = [];
    const end = new Date();
    const start = subDays(end, 364); // 52 weeks
    
    // Adjust start to Monday
    const mondayStart = startOfWeek(start, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: mondayStart, end });

    // Group logs by date
    const logsByDate: Record<string, number> = {};
    habitLogs.forEach(log => {
      if (log.completed) {
        logsByDate[log.date] = (logsByDate[log.date] || 0) + 1;
      }
    });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: dateStr,
        count: logsByDate[dateStr] || 0,
        dayName: format(day, 'EEE'),
        weekNum: format(day, 'w')
      };
    });
  }, [habitLogs]);

  const categories = [
    { id: 'health', icon: <Activity size={14} />, mult: '1.2x', label: 'Health' },
    { id: 'learning', icon: <Book size={14} />, mult: '1.1x', label: 'Learning' },
    { id: 'creative', icon: <Palette size={14} />, mult: '1.15x', label: 'Creative' },
    { id: 'work', icon: <Briefcase size={14} />, mult: '1.0x', label: 'Work' },
    { id: 'personal', icon: <Users size={14} />, mult: '0.9x', label: 'Personal' },
    { id: 'routine', icon: <Clock size={14} />, mult: '0.7x', label: 'Routine' },
  ];

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-white/5';
    if (count <= 2) return 'bg-cyan/20';
    if (count <= 4) return 'bg-cyan/50';
    return 'bg-cyan';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
               <Cpu size={20} className="text-accent" />
             </div>
             <div>
               <h2 className="text-2xl font-serif font-black italic text-white uppercase tracking-tighter">Routine_Matrix</h2>
               <p className="text-[10px] font-mono text-text-m uppercase tracking-[0.2em] opacity-60">Neural_Habit_Synchronization_Unit</p>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openShare?.(
              'heatmap-share-card',
              `AETHOS_HEATMAP_${new Date().toISOString().split('T')[0]}`,
              'HABIT HEATMAP CARD'
            )}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 hover:border-cyan/40 hover:bg-cyan/5 transition-all group cursor-pointer active:scale-95"
          >
            <Share2 size={14} className="text-white/30 group-hover:text-cyan" />
            <span className="text-[10px] font-mono text-white/30 group-hover:text-cyan uppercase tracking-widest font-black">
              SHARE_HEATMAP
            </span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-mono font-black uppercase text-xs rounded-xl accent-glow"
          >
            <Plus size={16} />
            Initialize_New_Habit
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Panel - Habit List */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-mono font-black text-text-m uppercase tracking-widest">Active_Protocols</h3>
            <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
              {activeHabits.length} LOADED
            </span>
          </div>

          <div className="space-y-4">
            {activeHabits.length === 0 ? (
              <EmptyState
                icon={<Database size={24} className="text-accent" />}
                title="NO_HABITS_DETECTED"
                actionLabel="CREATE_NOW"
                onAction={() => setIsAddModalOpen(true)}
              />
            ) : (
              activeHabits.map((habit, idx) => {
                const isDoneToday = habitLogs.some(l => l.habitId === habit.id && l.date === todayStr && l.completed);
                const streak = calculateStreak(habit.id);
                const catInfo = categories.find(c => c.id === habit.category);

                
                return (
                  <div key={`habit-list-${habit.id}-${idx}`}>
                    <div 
                      className="glass rounded-2xl border border-white/5 bg-white/2 overflow-hidden group hover:border-cyan/30 transition-all cursor-pointer active:scale-[0.98] animate-in fade-in slide-in-from-bottom-1 duration-200"
                    >
                    <div className="p-4 sm:p-5 md:p-6 flex items-center justify-between min-h-[60px]">
                      <div className="flex items-center gap-4 flex-1" onClick={() => setSelectedHabit(habit)}>
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center border transition-all"
                          style={{ 
                            backgroundColor: `${habit.color}10`,
                            borderColor: `${habit.color}30`,
                            color: habit.color 
                          }}
                        >
                          {catInfo?.icon}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          <h4 className="text-sm font-serif font-black text-white italic uppercase truncate">{habit.name}</h4>
                          <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1">
                               <Flame size={10} className={streak > 0 ? "text-orange-500" : "text-text-s"} />
                               <span className="text-[10px] font-mono font-black text-text-p">{streak > 0 ? streak : '0'}_DAYS</span>
                             </div>
                             <span className="text-[8px] font-mono text-text-m opacity-40 uppercase tracking-tighter">{habit.frequency}</span>
                          </div>
                          {habit.rewardBundle && (
                            <p className="text-[9px] font-mono text-cyan/60 truncate flex items-center gap-1">
                              <span className="opacity-60">🎯</span> {habit.rewardBundle}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleHabit(habit, todayStr);
                        }}
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center border transition-all",
                          isDoneToday 
                            ? "bg-cyan border-cyan text-black shadow-[0_0_15px_rgba(0,217,255,0.4)]" 
                            : "bg-white/5 border-white/10 text-white/20 hover:border-cyan/40 hover:text-cyan/40"
                        )}
                      >
                        <CheckCircle2 size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>

        {/* Right Panel - Heatmap */}
        <div className="flex-1 min-w-0 space-y-6">
          <div ref={heatmapRef}>
            {heatmapVisible ? (
              <HabitHeatmap heatmapData={heatmapData} />
            ) : (
              <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
            )}
          </div>
          {/* Habit Details View */}
          <AnimatePresence mode="wait">
            {selectedHabit && (
              <motion.div 
                key={selectedHabit.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass p-8 rounded-3xl border border-white/10 bg-white/5 relative overflow-hidden"
              >
                <button 
                  onClick={() => setSelectedHabit(null)}
                  className="absolute top-4 right-4 text-text-m hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex items-start gap-6 mb-8">
                   <div 
                     className="w-16 h-16 rounded-2xl flex items-center justify-center border-2"
                     style={{ 
                       backgroundColor: `${selectedHabit.color}20`,
                       borderColor: `${selectedHabit.color}40`,
                       color: selectedHabit.color 
                     }}
                   >
                     {categories.find(c => c.id === selectedHabit.category)?.icon}
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-2xl font-serif font-black italic text-white uppercase">{selectedHabit.name}</h3>
                     <div className="flex flex-wrap gap-3">
                       <span className="text-[10px] font-mono text-white bg-white/10 px-2 py-0.5 rounded border border-white/10 uppercase">
                          {selectedHabit.category}
                       </span>
                       <span className="text-[10px] font-mono text-cyan bg-cyan/10 px-2 py-0.5 rounded border border-cyan/20 uppercase">
                          {selectedHabit.frequency}
                       </span>
                       <span className="text-[10px] font-mono text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20 uppercase">
                          Target: {selectedHabit.targetStreak} Days
                       </span>
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass p-4 rounded-xl border border-white/5 bg-white/2 text-center space-y-1">
                    <p className="text-[8px] font-mono text-text-m uppercase opacity-50">Current_Streak</p>
                    <p className="text-xl font-mono font-black text-white">{calculateStreak(selectedHabit.id)}_DAYS</p>
                  </div>
                  <div className="glass p-4 rounded-xl border border-white/5 bg-white/2 text-center space-y-1">
                    <p className="text-[8px] font-mono text-text-m uppercase opacity-50">Best_Sync_Streak</p>
                    <p className="text-xl font-mono font-black text-accent">{calculateBestStreak(selectedHabit.id)}_DAYS</p>
                  </div>
                  <div className="glass p-4 rounded-xl border border-white/5 bg-white/2 text-center space-y-1">
                    <p className="text-[8px] font-mono text-text-m uppercase opacity-50">Est_Completion_Rate</p>
                    <p className="text-xl font-mono font-black text-cyan">
                      {Math.round((habitLogs.filter(l => l.habitId === selectedHabit.id && l.completed).length / Math.max(1, differenceInMinutes(new Date(), parseISO(selectedHabit.createdAt)) / (24*60))) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-4">
                  <button 
                    onClick={() => onDeleteHabit(selectedHabit.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger font-mono font-black uppercase text-[10px] rounded-lg border border-danger/20 hover:bg-danger/20 transition-all"
                  >
                    <Trash2 size={14} />
                    Archive_Protocol
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Habit Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-background/95 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full h-full sm:h-auto sm:max-w-lg md:max-w-2xl glass p-5 sm:p-6 md:p-8 rounded-none sm:rounded-[2rem] border-0 sm:border border-white/10 shadow-2xl relative overflow-y-auto max-h-screen sm:max-h-[90vh]"
             >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-cyan/10 rounded-xl border border-cyan/20">
                    <Plus size={20} className="text-cyan" />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-black italic text-white uppercase">Initialize_New_Protocol</h2>
                    <p className="text-[10px] font-mono text-text-m uppercase opacity-50">Configuring_Sync_Parameters</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1">Habit_Identity</label>
                    <input 
                      type="text"
                      placeholder="ENTER_PROTOCOL_NAME..."
                      value={newHabit.name}
                      onChange={e => setNewHabit({...newHabit, name: e.target.value})}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl focus:border-cyan/50 focus:ring-0 text-white font-mono transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1">Category_Link</label>
                      <select 
                        value={newHabit.category}
                        onChange={e => setNewHabit({...newHabit, category: e.target.value as any})}
                        className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-xl focus:border-cyan/50 text-white font-mono text-sm outline-none appearance-none"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1">Sync_Frequency</label>
                      <select 
                        value={newHabit.frequency}
                        onChange={e => setNewHabit({...newHabit, frequency: e.target.value})}
                        className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-xl focus:border-cyan/50 text-white font-mono text-sm outline-none appearance-none"
                      >
                        <option value="daily">DAILY</option>
                        <option value="Mon,Wed,Fri">MON_WED_FRI</option>
                        <option value="Tue,Thu">TUE_THU</option>
                        <option value="weekend">WEEKENDS</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1">Target_Streak</label>
                      <input 
                        type="number"
                        value={newHabit.targetStreak}
                        onChange={e => setNewHabit({...newHabit, targetStreak: parseInt(e.target.value)})}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl focus:border-cyan/50 text-white font-mono outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1">Color_Hex</label>
                      <div className="flex gap-2">
                         {['#00D9FF', '#FF4500', '#7C3AED', '#10B981', '#F59E0B'].map(c => (
                           <button 
                             key={c}
                             onClick={() => setNewHabit({...newHabit, color: c})}
                             className={cn(
                               "w-8 h-10 rounded-lg transition-all",
                               newHabit.color === c ? "scale-110 border-2 border-white" : "opacity-40"
                             )}
                             style={{ backgroundColor: c }}
                           />
                         ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1">
                      Bundle_Reward <span className="opacity-40 normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Only listen to podcasts while doing this..."
                      value={(newHabit as any).rewardBundle || ''}
                      onChange={e => setNewHabit({...newHabit, rewardBundle: e.target.value} as any)}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl focus:border-cyan/50 text-white font-mono text-xs outline-none placeholder-white/20 transition-all"
                    />
                    <p className="text-[9px] font-mono text-text-s opacity-40 ml-1">Pair this habit with something enjoyable — you'll only get that reward while doing this.</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-4 glass border border-white/10 text-white font-mono font-black uppercase rounded-xl hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        onAddHabit(newHabit);
                        setIsAddModalOpen(false);
                      }}
                      className="flex-1 py-4 bg-accent text-white font-mono font-black uppercase rounded-xl accent-glow"
                    >
                      ENGAGE_PROTOCOL
                    </button>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JournalView({ 
  journals, 
  user, 
  onAddXP, 
  stats,
  tasks = [],
  habits = [],
  habitLogs = [],
  deleteJournalEntry,
  deleteAllJournals
}: { 
  journals: JournalEntry[]; 
  user: User; 
  onAddXP: (amount: number, source: string, meta?: any) => void; 
  stats: UserStats | null;
  tasks?: Task[];
  habits?: Habit[];
  habitLogs?: HabitLog[];
  deleteJournalEntry: (id: string) => Promise<void>;
  deleteAllJournals: () => Promise<void>;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'entry' | 'history' | 'insights' | 'gratitude'>('entry');
  const [gratitudeEntries, setGratitudeEntries] = useState<string[]>(['', '', '']);
  const [gratitudeSubmitting, setGratitudeSubmitting] = useState(false);
  const [gratitudeDoneToday, setGratitudeDoneToday] = useState(false);

  // Check if gratitude already done today
  React.useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    import('firebase/firestore').then(({ collection: col, query, where, getDocs, getFirestore }) => {
      const db2 = getFirestore();
      const q = query(col(db2, 'gratitude_logs'), where('userId', '==', user.uid), where('date', '==', today));
      getDocs(q).then(snap => { if (!snap.empty) setGratitudeDoneToday(true); });
    });
  }, [user]);

  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        const response = await fetch('/api/speech-to-text', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.transcript) {
          setContent(prev => (prev ? prev + ' ' + data.transcript : data.transcript));
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const [mood, setMood] = useState<JournalEntry['mood']>('happy');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState(() => REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)]);
  const [usePrompt, setUsePrompt] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [wordCount, setWordCount] = useState(0);
  const [energyLevel, setEnergyLevel] = useState<'drained'|'low'|'neutral'|'high'|'peak'>('neutral');
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);

  const addEntry = async () => {
    if (!content.trim() || content === '<p></p>') return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const hasEntryToday = journals.some(j => j.createdAt?.startsWith(today));
      
      const wordBonus = Math.floor(wordCount / XP_MAP.JOURNAL_WORD_RATE);
      const moodBonus = XP_MAP.JOURNAL_MOOD_BONUS;
      const promptBonus = usePrompt ? XP_MAP.JOURNAL_PROMPT_BONUS : 0;
      
      let consistencyBonus = 0;
      let newStreak = (stats?.journalStreak || 0);
      
      // Calculate streak and first-entry-of-day bonuses
      if (!hasEntryToday) {
        newStreak += 1;
        consistencyBonus = newStreak * XP_MAP.STREAK_BONUS_PER_DAY;
      }
      
      let totalXP = XP_MAP.JOURNAL_BASE + wordBonus + moodBonus + consistencyBonus + promptBonus;
      if (wordCount >= 1000) totalXP = Math.round(totalXP * XP_MAP.JOURNAL_LONG_FORM_MULT);
      await onAddXP(totalXP, 'NEURAL_INGEST_COMPLETE', { wordCount });

      const journalData = removeUndefinedFields({
        userId: user.uid,
        content,
        mood,
        energyLevel,
        tags: selectedTags,
        createdAt: new Date().toISOString(),
        isReflection: usePrompt,
        wordCount,
        promptUsed: usePrompt ? currentPrompt : null,
        cognitiveSignature: await (async () => {
          try {
            return await analyzeJournalEntry(content);
          } catch (e) {
            console.error("AI Journal Analysis Failed", e);
            return null;
          }
        })()
      });

      // Calculate updated peak sync time including today's entry
      const now = new Date();
      const updatedJournals = [...journals, { createdAt: now.toISOString() }];
      
      const updatedHourlyCounts = updatedJournals.reduce((acc, j) => {
        const hour = new Date(j.createdAt).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      const updatedPeakHour = Object.entries(updatedHourlyCounts).sort((a,b) => (b[1] as number) - (a[1] as number))[0]?.[0];
      const updatedPeakTimeStr = updatedPeakHour ? `${updatedPeakHour.padStart(2, '0')}:00` : 'N/A';

      const batch = writeBatch(db);

      const newJournalRef = doc(collection(db, 'journals'));
      batch.set(newJournalRef, journalData);
      
      const statsRef = doc(db, 'user_stats', user.uid);
      const statsTodayCount = (stats?.dailyWordsWritten?.date === today) ? (stats?.dailyWordsWritten?.count || 0) : 0;
      batch.update(statsRef, removeUndefinedFields({ 
        totalWordsWritten: (stats?.totalWordsWritten || 0) + wordCount,
        dailyWordsWritten: { count: statsTodayCount + wordCount, date: today },
        peakSyncTime: updatedPeakTimeStr,
        journalStreak: newStreak,
        lastJournalDate: today,
        reflectionPromptsAnswered: (stats?.reflectionPromptsAnswered || 0) + (usePrompt ? 1 : 0)
      }));

      await batch.commit();

      // Sync everything done in the day into the calendar (time_blocks)
      try {
        const todayStartStr = `${today}T00:00:00.000Z`;
        const todayEndStr = `${today}T23:59:59.999Z`;
        
        const timeBlocksRef = collection(db, 'time_blocks');
        const q = query(
          timeBlocksRef,
          where('userId', '==', user.uid),
          where('startTime', '>=', todayStartStr),
          where('startTime', '<=', todayEndStr)
        );
        
        const snapshot = await getDocs(q);
        const deleteBatch = writeBatch(db);
        snapshot.docs.forEach((docSnap) => {
          const dData = docSnap.data();
          if (dData.notes === 'AUTO_SYNCED_CALENDAR_LOAD') {
            deleteBatch.delete(docSnap.ref);
          }
        });
        await deleteBatch.commit();

        const syncBatch = writeBatch(db);
        
        // 1. completed daily work (tasks)
        const completedTasksToday = tasks.filter((t: any) => 
          t.status === 'completed' && 
          t.completedAt && 
          t.completedAt.startsWith(today)
        );
        completedTasksToday.forEach((t: any) => {
          const blockRef = doc(collection(db, 'time_blocks'));
          const completedTime = t.completedAt || new Date().toISOString();
          syncBatch.set(blockRef, {
            userId: user.uid,
            title: `✅ WORK: ${t.title.toUpperCase()}`,
            type: 'task',
            startTime: new Date(new Date(completedTime).getTime() - 30 * 60 * 1000).toISOString(),
            endTime: completedTime,
            color: '#C8651B', // Metallic Orange
            notes: 'AUTO_SYNCED_CALENDAR_LOAD',
            completed: true
          });
        });

        // 2. completed habits
        const completedHabitsToday = habitLogs.filter((l: any) => 
          l.date === today && 
          l.completed
        );
        completedHabitsToday.forEach((l: any) => {
          const habit = habits.find((h: any) => h.id === l.habitId);
          if (habit) {
            const blockRef = doc(collection(db, 'time_blocks'));
            const logTime = l.timestamp || new Date().toISOString();
            syncBatch.set(blockRef, {
              userId: user.uid,
              title: `⚡ HABIT: ${habit.name.toUpperCase()}`,
              type: 'routine',
              startTime: new Date(new Date(logTime).getTime() - 15 * 60 * 1000).toISOString(),
              endTime: logTime,
              color: habit.color || '#2E6B9E', // Metallic Blue
              notes: 'AUTO_SYNCED_CALENDAR_LOAD',
              completed: true
            });
          }
        });

        // 3. Today's journal
        const journalBlockRef = doc(collection(db, 'time_blocks'));
        syncBatch.set(journalBlockRef, {
          userId: user.uid,
          title: `📜 JOURNAL: ${mood.toUpperCase()} ENTRY (${wordCount} WORDS)`,
          type: 'event',
          startTime: new Date(new Date().getTime() - 20 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
          color: '#C9A84C', // Metallic Yellow
          notes: 'AUTO_SYNCED_CALENDAR_LOAD',
          completed: true
        });

        // 4. Wheel of Life balance
        const categoriesList = stats?.lifeSyncCategories || LIFE_CATEGORIES;
        const currentValues = stats?.lifeSync?.current || {};
        const activeVals = categoriesList.map((cat: any) => currentValues[cat.id] ?? 10);
        const curBalance = Number((activeVals.reduce((a: number, b: number) => a + b, 0) / (categoriesList.length || 1)).toFixed(1));

        const wolBlockRef = doc(collection(db, 'time_blocks'));
        syncBatch.set(wolBlockRef, {
          userId: user.uid,
          title: `🎡 WHEEL OF LIFE: BALANCED AT ${curBalance}/10`,
          type: 'routine',
          startTime: new Date(new Date().getTime() - 10 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
          color: '#2E6B9E', // Metallic Blue
          notes: 'AUTO_SYNCED_CALENDAR_LOAD',
          completed: true
        });

        await syncBatch.commit();
      } catch (calendarErr) {
        console.error("Calendar Sync Error", calendarErr);
      }

      // Visual feedback
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00d9ff', '#ff0055', '#ffffff']
      });

      // Clear editor
      setContent('');
      setWordCount(0);
      setMood('neutral');
      setEnergyLevel('neutral');
      setSelectedTags([]);
      setUsePrompt(false);

      // Switch to history tab
      setActiveSubTab('history');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'journals');
    }
  };

  const potentialXP = XP_MAP.JOURNAL_BASE + Math.floor(wordCount / XP_MAP.JOURNAL_WORD_RATE) + XP_MAP.JOURNAL_MOOD_BONUS + (usePrompt ? XP_MAP.JOURNAL_PROMPT_BONUS : 0);

  // Stats for the sidebar (memoized)
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const dailyWords = useMemo(() => {
    return (journals || [])
      .filter(j => j.createdAt?.startsWith(todayStr))
      .reduce((sum, j) => sum + (j.wordCount || 0), 0);
  }, [journals, todayStr]);

  const weekStart = useMemo(() => format(startOfWeek(new Date()), 'yyyy-MM-dd'), []);
  const weeklyWords = useMemo(() => {
    return (journals || [])
      .filter(j => j.createdAt >= weekStart)
      .reduce((sum, j) => sum + (j.wordCount || 0), 0);
  }, [journals, weekStart]);

  const allTimeWords = useMemo(() => {
    return (journals || [])
      .reduce((sum, j) => sum + (j.wordCount || 0), 0);
  }, [journals]);

  const avgWords = useMemo(() => {
    return (journals || []).length > 0
      ? Math.round(allTimeWords / (journals || []).length) : 0;
  }, [allTimeWords, journals]);

  const avgEntryLength = avgWords;
  const totalWordsWritten = allTimeWords;

  // Peak sync time — calculate from journals directly:
  const hourlyCounts = useMemo(() => {
    return (journals || []).reduce((acc, j) => {
      if (!j.createdAt) return acc;
      const hour = new Date(j.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }, [journals]);

  const peakHour = useMemo(() => {
    return Object.entries(hourlyCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];
  }, [hourlyCounts]);

  const peakTimeStr = useMemo(() => {
    return peakHour 
      ? `${String(peakHour).padStart(2, '0')}:00` : 'N/A';
  }, [peakHour]);

  // Journal streak — read from stats but with safe fallback:
  const journalStreak = stats?.journalStreak || 0;

  // Render insights memoized:
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => 
    subDays(new Date(), i)
  ).reverse(), []);

  const moodData = useMemo(() => {
    return last7Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = (journals || []).find(j => 
        j.createdAt && j.createdAt.startsWith(dateStr)
      );
      const moodValue = entry 
        ? ({ ecstatic: 5, happy: 4, neutral: 3, worried: 2, sad: 1 }[entry.mood] ?? null) 
        : null;
      return {
        date: format(date, 'EEE'),  // Mon, Tue etc
        mood: moodValue ?? 0,
        words: entry?.wordCount || 0,
        hasMood: !!entry
      };
    });
  }, [journals, last7Days]);

  const topMood = useMemo(() => {
    const moodCounts = (journals || []).reduce((acc, j) => {
      if (j.mood) acc[j.mood] = (acc[j.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topMoodId = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as JournalEntry['mood'];
    return MOODS.find(m => m.id === topMoodId);
  }, [journals]);

  const frequencyData = useMemo(() => {
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((name, idx) => ({
      name,
      count: (journals || []).filter(j => {
        if (!j.createdAt) return false;
        const day = new Date(j.createdAt).getDay();
        return day === (idx + 1) % 7;
      }).length
    }));
  }, [journals]);

  const renderInsights = () => {

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="glass p-8 rounded-3xl border border-white/5 bg-black/40">
              <h3 className="text-xl font-serif font-black text-text-p uppercase italic tracking-widest mb-6 border-l-4 border-cyan pl-4">Mood_Stability_Graph</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <ReBarChart data={moodData}>
                      <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                      <ReTooltip 
                        contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#00d9ff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="mood" radius={[4, 4, 0, 0]}>
                        {moodData.map((entry, index) => (
                          <Cell key={`cell-${entry.date}-${index}`} fill={entry.mood && entry.mood >= 4 ? '#00ffaa' : entry.mood === 3 ? '#999' : '#ff0055'} />
                        ))}
                      </Bar>
                   </ReBarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] font-mono text-text-m text-center mt-4 opacity-50 uppercase tracking-widest">7_DAY_STABILITY_CORRELATION</p>
           </div>

           <div className="glass p-8 rounded-3xl border border-white/5 bg-black/40">
              <h3 className="text-xl font-serif font-black text-text-p uppercase italic tracking-widest mb-6 border-l-4 border-accent pl-4">Word_Density_Trends</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <ReBarChart data={moodData}>
                      <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                      <ReTooltip 
                        contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="words" fill="url(#colorWords)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff0055" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ff0055" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                   </ReBarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] font-mono text-text-m text-center mt-4 opacity-50 uppercase tracking-widest">LEXICAL_OUTPUT_ANALYSIS</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
              <Award className="text-warning animate-bounce" size={40} />
              <div>
                 <p className="text-[10px] font-mono text-text-m uppercase tracking-[0.2em] mb-1">Top_Mood_Archetype</p>
                 <p className="text-2xl font-serif font-black text-white italic uppercase tracking-widest">{topMood?.label || 'UNDEFINED'}</p>
                 <span className="text-4xl mt-2 block">{topMood?.emoji}</span>
              </div>
           </div>

           <div className="md:col-span-2 glass p-8 rounded-3xl border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-serif font-black text-text-p uppercase italic tracking-widest">Temporal_Frequency</h3>
                <div className="flex gap-2">
                   <span className="text-[10px] font-mono text-success bg-success/10 px-2 py-1 rounded">CONSISTENCY_HIGH</span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-4">
                 {frequencyData.map((d, i) => (
                   <div key={`frequency-${d.name}-${i}`} className="flex flex-col items-center gap-3">
                      <div className="w-full h-32 bg-white/5 rounded-xl flex items-end overflow-hidden relative">
                         <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${(d.count / (Math.max(...frequencyData.map(fd => fd.count)) || 1)) * 100}%` }}
                          className="w-full bg-accent opacity-60 hover:opacity-100 transition-opacity"
                         />
                      </div>
                      <span className="text-[10px] font-mono text-text-m uppercase">{d.name}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
        
        <div className="glass p-8 rounded-3xl border border-white/5 bg-cyan/5 border-cyan/20">
           <div className="flex items-center gap-4 mb-4">
              <Sparkles className="text-cyan animate-pulse" size={24} />
              <h3 className="text-xl font-serif font-black text-cyan uppercase italic tracking-widest">Diagnostic_Insights</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <p className="text-sm font-mono text-text-p leading-relaxed">
                   <strong className="text-cyan">[ADVISORY]</strong>{' '}
                   {frequencyData.sort((a,b) => b.count - a.count)[0]?.count > 0
                     ? `You write most on ${frequencyData.sort((a,b) => b.count - a.count)[0]?.name}s — ${frequencyData.sort((a,b) => b.count - a.count)[0]?.count} entries.`
                     : 'No frequency pattern detected yet. Keep writing.'}
                 </p>
                 <p className="text-sm font-mono text-text-p leading-relaxed">
                   <strong className="text-cyan">[DIAGNOSTIC]</strong>{' '}
                   {avgEntryLength > 0
                     ? `Average entry length is ${avgEntryLength} words. ${avgEntryLength >= 200 ? 'Strong depth.' : 'Try writing more for deeper insights.'}`
                     : 'Start writing to see entry length diagnostics.'}
                 </p>
              </div>
              <div className="space-y-4">
                 <p className="text-sm font-mono text-text-p leading-relaxed">
                   <strong className="text-warning">[TREND]</strong>{' '}
                   Journal streak is at <span className="text-warning font-black italic">{journalStreak} cycles</span>.
                   {journalStreak === 0 ? ' Write today to start your streak.' 
                    : journalStreak < 7 ? ` ${7 - journalStreak} more days to hit 7-day milestone.`
                    : ' Keep the streak alive.'}
                 </p>
                 <p className="text-sm font-mono text-text-p leading-relaxed">
                   <strong className="text-cyan">[SYNC]</strong>{' '}
                   Most used tags:{' '}
                   <span className="text-text-m italic">
                     {Object.entries(
                       journals.flatMap(j => j.tags || []).reduce((acc, t) => {
                         acc[t] = (acc[t] || 0) + 1; return acc;
                       }, {} as Record<string, number>)
                     ).sort((a,b) => b[1] - a[1]).slice(0,5).map(([t]) => `#${t}`).join(', ') || 'N/A'}
                   </span>
                 </p>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    if (journals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Book size={32} className="text-white/20" />
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
            ARCHIVE_EMPTY — Write your first entry
          </p>
          <button
            onClick={() => setActiveSubTab('entry')}
            className="text-[10px] font-mono text-accent uppercase tracking-widest hover:underline"
          >
            GO_TO_ENTRY →
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {journals.length > 0 && (
          <div className="flex justify-end pb-2">
            <button
              onClick={() => { if (confirm("Delete all journals? This cannot be undone.")) deleteAllJournals(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono text-red-400/70 hover:text-red-400 uppercase tracking-widest border border-red-500/20 hover:border-red-500/40 rounded-full transition-colors"
            >
              <Trash2 size={10} /> Delete All
            </button>
          </div>
        )}
        {journals.map((journal, index) => (
          <div
            key={`journal-history-${journal.id || 'journal'}-${index}`}
            onClick={() => setExpandedJournalId(
              expandedJournalId === journal.id ? null : journal.id
            )}
            className="glass border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-white/15 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {/* Header — always visible */}
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this journal entry?")) deleteJournalEntry(journal.id!);
                  }}
                  className="text-white/20 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <span className="text-2xl">
                  {MOODS.find(m => m.id === journal.mood)?.emoji || '😐'}
                </span>
                <div>
                  <p className="text-sm font-mono font-black text-white uppercase italic">
                    {format(new Date(journal.createdAt), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                    {format(new Date(journal.createdAt), 'EEEE')} · {journal.wordCount || 0} WORDS · {MOODS.find(m => m.id === journal.mood)?.label || 'NEUTRAL'}
                  </p>
                </div>
              </div>
              <ChevronDown
                size={14}
                className={cn(
                  "text-white/30 transition-transform duration-300",
                  expandedJournalId === journal.id ? "rotate-180" : ""
                )}
              />
            </div>

            {/* Expanded content */}
            <AnimatePresence>
              {expandedJournalId === journal.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 border-t border-white/5 pt-4 space-y-4">
                    {/* Reflection prompt if used */}
                    {journal.isReflection && journal.promptUsed && (
                      <div className="bg-cyan/5 border border-cyan/20 rounded-xl px-4 py-3">
                        <p className="text-[9px] font-mono text-cyan uppercase tracking-widest mb-1">
                          REFLECTION_PROMPT
                        </p>
                        <p className="text-xs font-mono text-white/60 italic">
                          "{journal.promptUsed}"
                        </p>
                      </div>
                    )}

                    {/* Journal content */}
                    <div
                      className="prose prose-invert prose-sm max-w-none text-white/70 font-mono text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: journal.content }}
                    />

                    {/* Footer stats */}
                    <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                      <span className="text-[9px] font-mono text-white/30 uppercase">
                        📝 {journal.wordCount || 0} words
                      </span>
                      <span className="text-[9px] font-mono text-white/30 uppercase">
                        {MOODS.find(m => m.id === journal.mood)?.emoji} {journal.mood?.toUpperCase() || 'NEUTRAL'}
                      </span>
                      {journal.energyLevel && (() => {
                        const ENERGY_EMOJIS: Record<string, string> = {
                          drained: '🪫', low: '😴', neutral: '😐', high: '⚡', peak: '🔥'
                        };
                        return (
                          <span className="text-[9px] font-mono text-white/30 uppercase">
                            {ENERGY_EMOJIS[journal.energyLevel] || '⚡'} {journal.energyLevel.toUpperCase()}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 min-h-[800px] pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
        <div>
           <div className="flex items-center gap-3 mb-3">
              <Book className="text-accent" size={24} />
              <span className="text-[10px] font-mono text-accent uppercase tracking-[0.5em] font-black">Neural_Archive_Systems</span>
           </div>
           <h2 className="text-5xl font-serif font-black text-white uppercase italic tracking-widest text-glow-white">Journal</h2>
        </div>
        
        <div className="flex glass p-1.5 rounded-xl border border-white/10 bg-black/40 shadow-2xl">
           {(['entry', 'history', 'insights', 'gratitude'] as const).map(tab => (
             <button 
               key={tab} 
               onClick={() => setActiveSubTab(tab)}
               className={cn(
                 "px-6 py-2.5 rounded-lg text-xs font-mono font-black uppercase tracking-widest transition-all relative overflow-hidden",
                 activeSubTab === tab
                   ? tab === 'gratitude' ? "bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-accent text-white accent-glow"
                   : "text-text-m hover:text-white hover:bg-white/5"
               )}
             >
               {tab === 'gratitude' ? '🌱 GRATITUDE' : tab}
             </button>
           ))}
        </div>
      </header>

      {activeSubTab === 'entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
           <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 glass rounded-xl border border-cyan/30 flex items-center justify-center">
                       <Clock className="text-cyan" size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-mono text-text-m uppercase opacity-50">Session_Synchronization</p>
                       <p className="text-lg font-mono font-black text-white uppercase italic">{format(viewDate, 'EEEE, MMM do')}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                       <p className="text-[8px] font-mono text-text-m uppercase">Potential_Gain</p>
                       <p className="text-sm font-mono font-black text-success">+{potentialXP} XP</p>
                    </div>
                    <button 
                       onClick={toggleRecording}
                       className={cn("p-4 rounded-xl border transition-all mr-4", isRecording ? "bg-red-500/20 border-red-500/50 text-red-500 animate-pulse" : "bg-black/40 border-white/10 text-text-m hover:text-white")}
                     >
                       <Mic size={20} />
                     </button>
                    <button 
                      onClick={addEntry}
                      className="px-8 py-4 bg-accent text-white font-mono font-black uppercase tracking-widest rounded-xl accent-glow hover:bg-red-600 transition-all shadow-2xl"
                    >
                      Sync_to_Archive
                    </button>
                 </div>
              </div>

              {/* Prompt Engine */}
              <motion.div 
                layout
                className={cn(
                  "glass p-8 rounded-3xl border transition-all duration-500 relative overflow-hidden",
                  usePrompt ? "border-cyan/40 bg-cyan/5" : "border-white/5"
                )}
              >
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                       <div className="p-2 glass rounded-lg border border-cyan/20">
                          <Sparkles className={cn(usePrompt ? "text-cyan animate-pulse" : "text-text-m")} size={16} />
                       </div>
                       <span className="text-[10px] font-mono text-text-m uppercase tracking-widest">Protocol_Reflection_Prompt</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {usePrompt && <span className="text-[10px] font-mono text-success font-black uppercase">+25 XP_BOOST</span>}
                      <button 
                        onClick={() => setUsePrompt(!usePrompt)}
                        className={cn("px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase border transition-all", 
                          usePrompt ? "bg-cyan border-cyan text-black" : "border-white/10 text-text-m hover:border-cyan/30 hover:text-cyan")}
                      >
                         {usePrompt ? 'ACTIVE' : 'INITIALIZE'}
                      </button>
                    </div>
                 </div>
                 <AnimatePresence mode="wait">
                   {usePrompt && (
                     <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-4 overflow-hidden">
                        <p className="text-2xl font-serif font-black text-white italic leading-relaxed border-l-4 border-cyan pl-6">{currentPrompt}</p>
                        <button 
                          onClick={() => setCurrentPrompt(REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)])}
                          className="mt-6 flex items-center gap-2 text-[10px] font-mono text-cyan hover:text-white transition-colors"
                        >
                          <Activity size={12} /> ROTATE_PROMPT
                        </button>
                     </motion.div>
                   )}
                 </AnimatePresence>
                 {!usePrompt && <p className="text-sm font-mono text-text-m opacity-50 italic">Reflection prompts provide deeper introspection and +25 XP synchronization bonus.</p>}
              </motion.div>

              <TipTapEditor 
                content={content} 
                onChange={setContent} 
                onWordCountChange={setWordCount}
                readOnly={!isSameDay(viewDate, new Date())}
              />

              <div className="flex justify-between items-center glass p-4 rounded-xl border border-white/5 px-6">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <Type size={14} className="text-text-m" />
                       <span className="text-xs font-mono font-black text-text-p uppercase italic tracking-widest">{wordCount} WORDS</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <TrendingUp size={14} className="text-success" />
                       <span className="text-xs font-mono text-success font-black">+{Math.floor(wordCount / 50)} BONUS_XP</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-mono text-text-m opacity-40 uppercase tracking-[0.2em]">
                    <div className="w-2 h-2 rounded-full bg-cyan animate-ping mr-2" />
                    Archive_Stream_Active
                 </div>
              </div>
           </div>

           <aside className="space-y-8 lg:col-span-1">
              <div className="glass p-4 sm:p-6 md:p-8 rounded-[2rem] border border-white/5 bg-black/40 space-y-6 sm:space-y-8 md:space-y-10 transition-all duration-300">
                 <div>
                    <label className="text-[10px] font-mono text-text-m uppercase tracking-[0.25em] font-black border-l-2 border-accent pl-3 mb-4 block">
                      ENERGY_INDEX
                    </label>
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { id: 'drained', label: 'DRAINED', emoji: '🪫', active: 'border-red-500 bg-red-500/20 shadow-[0_0_16px_rgba(239,68,68,0.3)]' },
                        { id: 'low',     label: 'LOW',     emoji: '😴', active: 'border-orange-400 bg-orange-400/20 shadow-[0_0_16px_rgba(251,146,60,0.3)]' },
                        { id: 'neutral', label: 'OK',      emoji: '😐', active: 'border-yellow-400 bg-yellow-400/20 shadow-[0_0_16px_rgba(250,204,21,0.3)]' },
                        { id: 'high',    label: 'HIGH',    emoji: '⚡', active: 'border-green-400 bg-green-400/20 shadow-[0_0_16px_rgba(74,222,128,0.3)]' },
                        { id: 'peak',    label: 'PEAK',    emoji: '🔥', active: 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_16px_rgba(34,211,238,0.3)]' },
                      ].map(level => (
                        <button
                          key={level.id}
                          onClick={() => setEnergyLevel(level.id as any)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-2 py-4 px-1 rounded-2xl border-2 transition-all duration-200",
                            energyLevel === level.id
                              ? level.active + " scale-105"
                              : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
                          )}
                        >
                          <span className="text-2xl leading-none">{level.emoji}</span>
                          <span className={cn(
                            "text-[9px] font-mono font-black uppercase tracking-wider leading-none",
                            energyLevel === level.id ? "text-white" : "text-white/30"
                          )}>
                            {level.label}
                          </span>
                        </button>
                      ))}
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] sm:text-xs font-mono text-text-m uppercase tracking-[0.25em] font-black border-l-2 border-success pl-3 mb-4 sm:mb-6 block">Neural_Tags</label>
                    <div className="flex flex-wrap gap-2">
                       {MOOD_TAGS.map(tag => (
                         <button 
                           key={tag}
                           onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                           className={cn(
                             "px-3 py-1.5 rounded-lg border text-[10px] sm:text-xs font-mono font-black uppercase transition-all",
                             selectedTags.includes(tag) ? "bg-success text-black border-success" : "border-white/10 text-text-m hover:border-success/30 hover:text-success"
                           )}
                         >
                           #{tag}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="pt-6 sm:pt-8 border-t border-white/5">
                    <label className="text-[10px] sm:text-xs font-mono text-text-m uppercase tracking-[0.25em] font-black border-l-2 border-warning pl-3 mb-6 sm:mb-8 block">Archive_Stats</label>
                    <div className="grid grid-cols-2 gap-3">
                       {[
                         { label: 'DAILY_WORDS', value: dailyWords },
                         { label: 'WEEKLY_WORDS', value: weeklyWords },
                         { label: 'ALL_TIME', value: allTimeWords },
                         { label: 'AVG_RECALL', value: avgWords },
                       ].map(stat => (
                         <div key={stat.label} className="glass p-3 rounded-xl border border-white/5 text-center">
                           <p className="text-lg font-serif font-black text-white">{stat.value}</p>
                           <p className="text-[8px] font-mono text-white/30 uppercase tracking-widest mt-1">
                             {stat.label}
                           </p>
                         </div>
                       ))}
                       <div className="flex flex-col items-center gap-1 glass p-3 rounded-xl border border-white/5 text-center col-span-2">
                          <span className="text-lg font-serif font-black text-white">{stats?.peakSyncTime || peakTimeStr}</span>
                          <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest mt-1">Peak_Sync_Time</span>
                       </div>
                       <div className="flex flex-col items-center gap-1 glass p-3 rounded-xl border border-white/5 text-center col-span-2">
                          <span className="text-lg font-serif font-black text-warning flex items-center justify-center gap-1"><Flame size={14} fill="currentColor" /> {stats?.journalStreak || 0}d</span>
                          <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest mt-1">Journal_Streak</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="glass p-8 rounded-3xl border border-white/5 bg-accent/5 border-accent/20">
                 <div className="flex items-center gap-3 mb-4">
                    <Trophy className="text-warning" size={20} />
                    <span className="text-[10px] font-mono text-white uppercase font-black tracking-widest">Next_Achievement</span>
                 </div>
                 <p className="text-xs font-serif italic text-white uppercase leading-relaxed mb-4">PROLIFIC_AUTHOR: Write 10K words total.</p>
                 <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((totalWordsWritten / 10000) * 100, 100)}%` }}
                      className="h-full bg-warning shadow-[0_0_10px_rgba(255,170,0,0.5)]"
                    />
                 </div>
                 <div className="flex justify-between mt-2">
                    <span className="text-[8px] font-mono text-text-m uppercase">{totalWordsWritten} W</span>
                    <span className="text-[8px] font-mono text-text-m uppercase">10,000 W</span>
                 </div>
              </div>
           </aside>
        </div>
      )}

      {activeSubTab === 'history' && renderHistory()}
      {activeSubTab === 'insights' && renderInsights()}
      {activeSubTab === 'gratitude' && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          <div className="glass rounded-2xl border border-emerald-500/20 p-8 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-lg">🌱</span>
                <h3 className="text-xs font-mono font-black uppercase tracking-[0.3em] text-emerald-400">GRATITUDE_PROTOCOL</h3>
              </div>
              <p className="text-[10px] font-mono text-text-s opacity-50">Three things. Every day. Takes 60 seconds. Compounds over time.</p>
              {!gratitudeDoneToday && <p className="text-[9px] font-mono text-emerald-400/60">+15 XP on completion • Once per day</p>}
            </div>

            {gratitudeDoneToday ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-4xl">✅</span>
                <p className="text-xs font-mono font-black text-emerald-400 uppercase tracking-widest">GRATITUDE_SYNCED_TODAY</p>
                <p className="text-[10px] font-mono text-text-s opacity-40">Come back tomorrow to log again.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {gratitudeEntries.map((entry, i) => (
                  <div key={i} className="space-y-1.5">
                    <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1 opacity-60">
                      {i === 0 ? '01 — I am grateful for...' : i === 1 ? '02 — Something that went well...' : '03 — A person I appreciate...'}
                    </label>
                    <input
                      type="text"
                      value={entry}
                      onChange={e => {
                        const updated = [...gratitudeEntries];
                        updated[i] = e.target.value;
                        setGratitudeEntries(updated);
                      }}
                      placeholder="Write what's on your mind..."
                      className="w-full px-5 py-4 bg-white/5 border border-emerald-500/20 rounded-xl focus:border-emerald-500/50 text-white font-mono text-sm outline-none placeholder-white/20 transition-all"
                    />
                  </div>
                ))}

                <button
                  disabled={gratitudeSubmitting || gratitudeEntries.every(e => !e.trim())}
                  onClick={async () => {
                    const filled = gratitudeEntries.filter(e => e.trim());
                    if (filled.length === 0) return;
                    setGratitudeSubmitting(true);
                    try {
                      const today = new Date().toISOString().split('T')[0];
                      const { addDoc: addDocument, collection: col, getFirestore } = await import('firebase/firestore');
                      const db2 = getFirestore();
                      await addDocument(col(db2, 'gratitude_logs'), {
                        userId: user.uid,
                        date: today,
                        entries: filled,
                        createdAt: new Date().toISOString()
                      });
                      await onAddXP(15, 'GRATITUDE_PROTOCOL_COMPLETE');
                      setGratitudeDoneToday(true);
                      setGratitudeEntries(['', '', '']);
                      localStorage.setItem(`gratitude_cache_${user.uid}`, JSON.stringify(filled.map((e, i) => ({ day: today, entry: e, slot: i }))));
                    } catch (e) {
                      console.error('Gratitude log error:', e);
                    } finally {
                      setGratitudeSubmitting(false);
                    }
                  }}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-black uppercase text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                >
                  {gratitudeSubmitting ? 'SYNCING...' : 'SYNC_GRATITUDE +15 XP'}
                </button>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl border border-white/5 p-6 space-y-3">
            <p className="text-[9px] font-mono text-text-s opacity-40 uppercase tracking-widest">WHY_THIS_WORKS</p>
            <p className="text-[10px] font-mono text-text-m leading-relaxed opacity-60">
              Emmons & McCullough (2003): daily gratitude logging measurably improves wellbeing, sleep quality, and motivation within 3 weeks. AETHOS feeds your entries to Ace — it references them when you are in a low state.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}





function AchievementCard({ 
  achievement, 
  unlocked, 
  progress, 
  current,
  onClick, 
  viewMode,
  onShare
}: { 
  achievement: Achievement; 
  unlocked: boolean; 
  progress: number; 
  current: number;
  onClick: () => void;
  viewMode: 'grid' | 'list';
  onShare?: (achievement: Achievement) => void;
}) {
  const rarityColors = {
    common: 'border-white/20 text-text-m',
    uncommon: 'border-blue-400 text-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.1)]',
    rare: 'border-purple-400 text-purple-400 shadow-[0_0_15px_rgba(167,139,250,0.2)]',
    legendary: 'border-warning text-warning shadow-[0_0_20px_rgba(255,215,0,0.3)]'
  };

  const rarityBorders = {
    common: 'border-white/20',
    uncommon: 'border-blue-400',
    rare: 'border-purple-400',
    legendary: 'border-warning'
  };

  if (viewMode === 'list') {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "flex items-center gap-4 p-4 glass rounded-xl border-l-4 transition-all cursor-pointer hover:bg-white/5",
          unlocked ? `border-l-${achievement.rarity === 'common' ? 'white/20' : achievement.rarity === 'uncommon' ? 'blue-400' : achievement.rarity === 'rare' ? 'purple-400' : 'warning'}` : 'border-l-white/5 opacity-50'
        )}
      >
        <div className={cn("p-2 rounded bg-white/5", !unlocked && "grayscale")}>{achievement.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-white uppercase">{achievement.title}</span>
            <span className={cn("text-[8px] px-1 border uppercase font-mono", rarityColors[achievement.rarity])}>{achievement.rarity}</span>
          </div>
          <p className="text-[10px] text-text-m truncate opacity-60">{achievement.description}</p>
          {!unlocked && achievement.requiredValue && (
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden w-full max-w-[200px]">
               <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          {unlocked ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-success uppercase font-black">EARNED</span>
              {onShare && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(achievement);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 hover:border-[#C8651B]/50 hover:bg-[#C8651B]/10 transition-all"
                >
                  <Share2 size={10} className="text-white/30 hover:text-[#C8651B]" />
                  <span className="text-[8px] font-mono text-white/20 uppercase">SHARE</span>
                </button>
              )}
            </div>
          ) : (
            <span className="text-[10px] font-mono text-text-s uppercase">{current} / {achievement.requiredValue}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass p-6 rounded-xl border-t-4 flex flex-col items-center text-center relative overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full",
        unlocked ? rarityBorders[achievement.rarity] : "border-t-white/5"
      )}
    >
      <CardDecoration />
      <div className={cn("mb-4 relative", !unlocked && "opacity-40 grayscale")}>
        <div className="p-4 bg-white/5 rounded-full group-hover:scale-110 transition-transform">{achievement.icon}</div>
        {achievement.category === 'hidden' && !unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-background rounded-full">
            <span className="text-xl font-mono text-text-m font-black">?</span>
          </div>
        )}
      </div>
      <h3 className={cn("text-xs font-mono font-black text-white uppercase mb-1 tracking-tight truncate w-full", !unlocked && "opacity-40")}>
        {achievement.category === 'hidden' && !unlocked ? '???' : achievement.title}
      </h3>
      <p className={cn("text-[9px] font-mono text-text-m mb-4 line-clamp-2 h-6", !unlocked ? "opacity-30" : "opacity-50")}>
        {achievement.category === 'hidden' && !unlocked ? 'REQUIREMENT_REDACTED' : achievement.description}
      </p>
      
      {!unlocked && achievement.requiredValue !== undefined && (
        <div className="w-full space-y-2 mt-2">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-accent/50 to-accent shadow-[0_0_8px_rgba(var(--color-accent),0.5)]" 
            />
          </div>
          <div className="flex justify-between items-center text-[8px] font-mono font-black tracking-tighter">
             <span className="text-accent underline decoration-accent/30 underline-offset-2">{Math.floor(progress)}%_STAGED</span>
             <span className="text-text-m opacity-80">{current.toLocaleString()} / {achievement.requiredValue.toLocaleString()}</span>
          </div>
        </div>
      )}

      {unlocked && (
        <div className="mt-auto pt-2 flex items-center justify-between w-full">
           <span className={cn("text-[8px] font-mono font-black uppercase tracking-widest", rarityColors[achievement.rarity])}>{achievement.rarity}_PROTOCOL</span>
           {onShare && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 onShare(achievement);
               }}
               className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 hover:border-[#C8651B]/50 hover:bg-[#C8651B]/10"
             >
               <Share2 size={10} className="text-white/30 hover:text-[#C8651B]" />
               <span className="text-[8px] font-mono text-white/20 uppercase">SHARE</span>
             </button>
           )}
        </div>
      )}
    </div>
  );
}

function AchievementDetail({ 
  achievement, 
  unlocked, 
  progress,
  current,
  onClose 
}: { 
  achievement: Achievement; 
  unlocked: boolean; 
  progress: number;
  current: number;
  onClose: () => void 
}) {
  const rarityColors = {
    common: 'text-text-m border-white/20 bg-white/5',
    uncommon: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
    rare: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
    legendary: 'text-warning border-warning/30 bg-warning/5 shadow-[0_0_20px_rgba(255,215,0,0.2)]'
  };

  const rarityBorders = {
    common: 'border-white/20',
    uncommon: 'border-blue-400',
    rare: 'border-purple-400',
    legendary: 'border-warning'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className={cn(
          "relative max-w-md w-full glass p-8 rounded-3xl border-t-8 flex flex-col items-center text-center",
          unlocked ? rarityBorders[achievement.rarity] : 'border-white/10'
        )}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-m hover:text-white transition-colors"><X size={24} /></button>
        <CardDecoration />
        
        <div className="p-6 bg-white/5 rounded-full mb-6 relative">
           {achievement.icon}
           {unlocked && (
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
               className="absolute inset-0 border-2 border-dashed border-accent/30 rounded-full"
             />
           )}
        </div>

        <div className={cn("text-[10px] font-mono font-black uppercase px-3 py-1 rounded-full border mb-4", rarityColors[achievement.rarity])}>
          {achievement.rarity}_PROTOCOL
        </div>

        <h2 className="text-3xl font-serif font-black text-white uppercase italic tracking-tight mb-2">{achievement.title}</h2>
        <p className="text-text-m font-mono text-sm uppercase italic opacity-70 mb-8">{achievement.description}</p>

        <div className="w-full grid grid-cols-2 gap-4 mb-8">
           <div className="glass p-4 rounded-xl border border-white/5 bg-white/2">
              <p className="text-[10px] font-mono text-text-s uppercase mb-1">Status</p>
              <p className={cn("text-sm font-mono font-black uppercase", unlocked ? "text-success" : "text-text-m opacity-40")}>{unlocked ? 'SYNCED' : 'LOCKED'}</p>
           </div>
           <div className="glass p-4 rounded-xl border border-white/5 bg-white/2">
              <p className="text-[10px] font-mono text-text-s uppercase mb-1">XP_REWARD</p>
              <p className="text-sm font-mono font-black uppercase text-accent">+{achievement.xpReward} XP</p>
           </div>
        </div>

        {!unlocked && achievement.requiredValue && (
          <div className="w-full space-y-4">
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono uppercase text-text-m">
                   <span>UNLOCK_PROGRESS</span>
                   <span>{current} / {achievement.requiredValue} ({Math.floor(progress)}%)</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                </div>
             </div>
             <p className="text-[10px] font-mono text-text-s uppercase italic opacity-50">
               "Est. Sync complete in ~{Math.ceil((achievement.requiredValue - current) / 2)} cycles"
             </p>
          </div>
        )}

        {unlocked && (
          <div className="text-[10px] font-mono text-text-s uppercase opacity-50 italic">
            "Archive recorded on {new Date().toLocaleDateString()} 12:44:00"
          </div>
        )}

        <button className="mt-8 w-full py-4 bg-accent text-white font-mono font-black uppercase tracking-[0.2em] hover:bg-accent/80 transition-all rounded-xl shadow-lg shadow-accent/20">SHARE_ACHIEVEMENT</button>
      </motion.div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "text-[10px] font-mono font-black uppercase tracking-widest px-4 py-2 transition-all",
        active ? "text-accent border-b-2 border-accent" : "text-text-m hover:text-text-p"
      )}
    >
      {children}
    </button>
  );
}

function EvolutionMetric({ 
  label, 
  current, 
  previous, 
  unit = "", 
  icon 
}: { 
  label: string; 
  current: number; 
  previous: number; 
  unit?: string; 
  icon: React.ReactNode 
}) {
  const isProgressed = current > previous;
  const isSame = current === previous;
  const diff = current - previous;
  const percent = previous > 0 ? Math.round((diff / previous) * 100) : (current > 0 ? 100 : 0);

  return (
    <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg bg-white/5", isProgressed ? "text-success" : "text-white/40")}>
             {icon}
          </div>
          <span className="text-[10px] font-mono text-text-m uppercase font-black tracking-widest">{label}</span>
        </div>
        
        <div className="flex items-end gap-3">
          <span className="text-4xl font-serif font-black text-white italic">{current}{unit}</span>
          <div className="pb-1">
            {isProgressed ? (
              <div className="flex items-center gap-1 text-success font-mono text-[10px] font-black uppercase">
                <TrendingUp size={12} /> +{percent}%
              </div>
            ) : (
              <div className="flex items-center gap-1 text-text-s font-mono text-[10px] font-black uppercase opacity-40">
                {isSame ? "0%" : `-${Math.abs(percent)}%`}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((current / (previous || 1)) * 50, 100)}%` }}
              className={cn("h-full rounded-full", isProgressed ? "bg-success" : "bg-white/20")}
            />
          </div>
          <p className="text-[9px] font-mono text-text-s uppercase opacity-40">
            {isProgressed ? "CORE_SYNC_IMPROVED_SINCE_LAST_MONTH" : "MAINTAINING_STABILITY_KEEP_PUSHING"}
          </p>
        </div>
      </div>
    </div>
  );
}

function WeeklyReviewItem({ review }: { review: WeeklyReview }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  return (
    <div className="glass p-5 rounded-2xl border border-white/5 bg-white/2">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-black text-accent">{review.week}</span>
          <span className="text-[10px] font-mono text-text-s">{new Date(review.createdAt).toLocaleDateString()}</span>
        </div>
        <span className="text-xs font-mono text-cyan uppercase">{isCollapsed ? 'EXPAND' : 'COLLAPSE'}</span>
      </div>
      {!isCollapsed && (
        <div className="mt-4 space-y-4 border-t border-white/5 pt-4 text-xs font-mono text-text-p leading-relaxed">
          <div>
            <span className="text-success block text-[9px] font-bold uppercase mb-1">01 — WHAT_WENT_WELL</span>
            <p className="bg-black/30 p-3 rounded-lg border border-white/5 text-white">{review.wentWell}</p>
          </div>
          <div>
            <span className="text-danger block text-[9px] font-bold uppercase mb-1">02 — WHAT_DRAINED_ME</span>
            <p className="bg-black/30 p-3 rounded-lg border border-white/5 text-white">{review.didntGo}</p>
          </div>
          <div>
            <span className="text-warning block text-[9px] font-bold uppercase mb-1">03 — WHAT_I_AVOIDED</span>
            <p className="bg-black/30 p-3 rounded-lg border border-white/5 text-white">{review.avoided || '—'}</p>
          </div>
          <div>
            <span className="text-purple-400 block text-[9px] font-bold uppercase mb-1">04 — VALUES_ALIGNMENT</span>
            <p className="bg-black/30 p-3 rounded-lg border border-white/5 text-white">{review.valueAlignment || '—'}</p>
          </div>
          <div>
            <span className="text-cyan block text-[9px] font-bold uppercase mb-1">05 — NEXT_WEEK_MUST_HAVE</span>
            <p className="bg-black/30 p-3 rounded-lg border border-white/5 text-white">{review.nextWeekFocus}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function NotepadView({ lines, onUpdateLines, onConvertToTask }: {
  lines: NotepadLine[];
  onUpdateLines: (lines: NotepadLine[]) => void;
  onConvertToTask: (line: NotepadLine) => void;
}) {
  const displayLines = useMemo(() => 
    lines.length > 0 ? lines : [{ id: crypto.randomUUID(), text: '', createdAt: new Date().toISOString() }], 
    [lines]
  );

  const updateLineText = (id: string, text: string) => {
    onUpdateLines(displayLines.map(l => l.id === id ? { ...l, text } : l));
  };

  const addLineAfter = (id: string) => {
    const idx = displayLines.findIndex(l => l.id === id);
    const newLine = { id: crypto.randomUUID(), text: '', createdAt: new Date().toISOString() };
    const next = [...displayLines];
    next.splice(idx + 1, 0, newLine);
    onUpdateLines(next);
  };

  const deleteLine = (id: string) => {
    if (displayLines.length === 1) {
      onUpdateLines([{ id: crypto.randomUUID(), text: '', createdAt: new Date().toISOString() }]);
      return;
    }
    onUpdateLines(displayLines.filter(l => l.id !== id));
  };

  return (
    <div className="glass p-8 md:p-12 rounded-[2rem] border border-white/5 space-y-6">
      <div className="flex items-center gap-3">
        <FileText size={16} className="text-cyan" />
        <h3 className="text-xs font-mono uppercase tracking-widest text-white/40">NOTEPAD</h3>
      </div>
      <div className="space-y-1">
        {displayLines.map((line) => (
          <div key={line.id} className="group flex items-center gap-2">
            <input
              value={line.text}
              onChange={(e) => updateLineText(line.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addLineAfter(line.id); }
                if (e.key === 'Backspace' && line.text === '') { e.preventDefault(); deleteLine(line.id); }
              }}
              placeholder="Quick note, idea, or task..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-white/80 placeholder-white/20 py-1.5 font-mono"
            />
            {line.text.trim() && (
              <button
                onClick={() => onConvertToTask(line)}
                title="Convert to task"
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-full bg-cyan/10 hover:bg-cyan/20 text-cyan text-[9px] font-mono uppercase tracking-wider"
              >
                <CheckCircle2 size={11} /> Task
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsView({ 
  stats, 
  user, 
  tasks, 
  journals, 
  timeBlocks, 
  weeklyReviews,
  openShare,
  setSharingAchievement
}: { 
  stats: UserStats | null; 
  user: User; 
  tasks: Task[]; 
  journals: JournalEntry[]; 
  timeBlocks: TimeBlock[]; 
  weeklyReviews: WeeklyReview[];
  openShare?: (cardId: string, filename: string, title: string) => void;
  setSharingAchievement?: React.Dispatch<React.SetStateAction<Achievement | null>>;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'evolution' | 'achievements'>('evolution');
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [rarityFilter, setRarityFilter] = useState<Achievement['rarity'] | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Achievement['category'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  if (!stats) return null;

  const now = new Date();
  const currentMonthDate = startOfMonth(now);
  const prevMonthDate = startOfMonth(subMonths(now, 1));

  const filterByMonth = (items: any[], date: Date) => {
    return items.filter(item => {
      const itemDate = new Date(item.createdAt || item.startTime || item.completedAt);
      return isSameMonth(itemDate, date);
    });
  };

  // Metrics calculation
  const curTasks = filterByMonth(tasks.filter(t => t.status === 'completed'), currentMonthDate).length;
  const prevTasks = filterByMonth(tasks.filter(t => t.status === 'completed'), prevMonthDate).length;

  const curJournals = filterByMonth(journals, currentMonthDate).length;
  const prevJournals = filterByMonth(journals, prevMonthDate).length;

  const curCalendar = filterByMonth(timeBlocks.filter(b => b.completed), currentMonthDate).length;
  const prevCalendar = filterByMonth(timeBlocks.filter(b => b.completed), prevMonthDate).length;

  const curHabits = filterByMonth(tasks.filter(t => t.status === 'completed' && t.category === 'routine'), currentMonthDate).length;
  const prevHabits = filterByMonth(tasks.filter(t => t.status === 'completed' && t.category === 'routine'), prevMonthDate).length;

  const earnedCount = stats.unlockedAchievements?.length || 0;
  const completionRate = Math.floor((earnedCount / ACHIEVEMENTS.length) * 100);

  const getAchievementProgress = (ach: Achievement) => {
    if (stats.unlockedAchievements?.includes(ach.id)) return { progress: 100, current: ach.requiredValue || 0 };
    
    let current = 0;
    const required = ach.requiredValue || 1;

    if (ach.id.startsWith('streak_')) {
      current = stats.currentStreak;
    } else if (ach.id.startsWith('journal_streak_')) {
      current = stats.journalStreak || 0;
    } else {
      switch(ach.id) {
        case 'task_10': case 'task_100': case 'task_500': case 'first_protocol':
          current = stats.totalTasksCompleted;
          break;
        case 'level_10': case 'level_50': case 'level_100':
          current = stats.level;
          break;
        case 'journal_initiator':
          current = journals.length > 0 ? 1 : 0;
          break;
        case 'journal_words_1000': case 'journal_words_10000': case 'journal_words_100000':
          current = stats.totalWordsWritten || 0;
          break;
        case 'reflection_seeker':
          current = stats.reflectionPromptsAnswered || 0;
          break;
        case 'mood_master':
          current = stats.journalStreak || 0;
          break;
        case 'midnight_thoughts':
          current = journals.some(j => {
            const hours = new Date(j.createdAt).getHours();
            return hours >= 0 && hours <= 4;
          }) ? 1 : 0;
          break;
        case 'word_wizard':
          current = journals.some(j => (j.wordCount || 0) >= 1000) ? 1 : 0;
          break;
        default:
          current = 0;
      }
    }

    return {
      progress: Math.min((current / required) * 100, 100),
      current
    };
  };

  const filteredAchievements = ACHIEVEMENTS.filter(a => {
    const isEarned = stats.unlockedAchievements?.includes(a.id);
    if (filter === 'earned' && !isEarned) return false;
    if (filter === 'locked' && isEarned) return false;
    if (rarityFilter !== 'all' && a.rarity !== rarityFilter) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });

  const rarityStats = ACHIEVEMENTS.reduce((acc, a) => {
    const isEarned = stats.unlockedAchievements?.includes(a.id);
    if (isEarned) acc[a.rarity]++;
    return acc;
  }, { common: 0, uncommon: 0, rare: 0, legendary: 0 });

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AnimatePresence>
        {selectedAchievement && (
          <AchievementDetail 
            achievement={selectedAchievement} 
            unlocked={stats.unlockedAchievements?.includes(selectedAchievement.id)} 
            {...getAchievementProgress(selectedAchievement)}
            onClose={() => setSelectedAchievement(null)} 
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
           <h1 className="text-4xl font-serif font-black text-text-p uppercase tracking-[0.2em] font-mono italic">
             {activeSubTab === 'evolution' ? 'NEURAL_EVOLUTION' : 'SYST_ARCHIVE'}
           </h1>
           <p className="text-[10px] font-mono text-text-m uppercase tracking-[0.5em] opacity-40">
             {activeSubTab === 'evolution' ? 'MONTH_OVER_MONTH_SYNC_ANALYSIS' : `Neural_Growth: ${completionRate}% Complete`}
           </p>
        </div>
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 gap-1.5 shadow-sm">
           <button 
             onClick={() => setActiveSubTab('evolution')}
             className={cn(
               "px-6 py-2.5 rounded-xl font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center min-w-[70px] lg:min-w-[100px]",
               activeSubTab === 'evolution' ? "bg-accent text-white shadow-[0_0_20px_rgba(255,69,0,0.3)]" : "text-text-m hover:text-white hover:bg-white/5"
             )}
           >
             Evolution
           </button>
           <button 
             onClick={() => setActiveSubTab('achievements')}
             className={cn(
               "px-6 py-2.5 rounded-xl font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center min-w-[70px] lg:min-w-[100px]",
               activeSubTab === 'achievements' ? "bg-accent text-white shadow-[0_0_20px_rgba(255,69,0,0.3)]" : "text-text-m hover:text-white hover:bg-white/5"
             )}
           >
             Archive
           </button>
        </div>
      </div>

      {/* Evolution Subtab */}
      {activeSubTab === 'evolution' && (
        <div className="space-y-12 block animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <EvolutionMetric label="Routine_Sync (Habits)" current={curHabits} previous={prevHabits} icon={<Flame size={20} />} />
            <EvolutionMetric label="Protocol_Execution (Tasks)" current={curTasks} previous={prevTasks} icon={<CheckCircle2 size={20} />} />
            <EvolutionMetric label="Temporal_Adherence (Calendar)" current={curCalendar} previous={prevCalendar} icon={<Calendar size={20} />} />
            <EvolutionMetric label="Neural_Archival (Journal)" current={curJournals} previous={prevJournals} icon={<Book size={20} />} />
          </div>

          <div className="glass p-10 rounded-[3rem] border border-white/5 bg-accent/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <TrendingUp size={120} className="text-accent" />
             </div>
             <div className="max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full">
                   <Sparkles size={12} className="text-accent" />
                   <span className="text-[10px] font-mono text-accent font-black uppercase tracking-widest">NEURAL_MOTIVATION_CORE</span>
                </div>
                <h3 className="text-3xl font-serif font-black text-white italic leading-tight uppercase">
                  {curTasks > prevTasks ? "Your neural streams are expanding. Synchronization with reality is at peak efficiency." : "Stagnation is merely a calibration phase. Refactor your protocols and initialize a new push."}
                </h3>
                <p className="text-sm font-mono text-text-m opacity-60 leading-relaxed uppercase">
                  Consistency is the only variable that matters. Monitor your deltas above and ensure the next cycle outperforms the previous. You are building a legend, one protocol at a time.
                </p>
             </div>
          </div>


        </div>
      )}

      {/* Archive (Achievements) Subtab */}
      {activeSubTab === 'achievements' && (
        <div className="space-y-12 block animate-in fade-in duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           <div className="glass p-6 rounded-2xl border-b-4 border-accent bg-accent/5">
              <h3 className="text-[10px] font-mono text-accent uppercase font-black mb-1">Total_Archived</h3>
              <p className="text-4xl font-serif font-black text-white italic">{earnedCount} <span className="text-sm opacity-40">/ {ACHIEVEMENTS.length}</span></p>
           </div>
           <div className="glass p-6 rounded-2xl border-b-4 border-cyan bg-cyan/5">
              <h3 className="text-[10px] font-mono text-cyan uppercase font-black mb-1">Sync_Efficiency</h3>
              <p className="text-4xl font-serif font-black text-white italic">{completionRate}%</p>
           </div>
           <div className="glass p-6 rounded-2xl border-b-4 border-warning bg-warning/5">
              <h3 className="text-[10px] font-mono text-warning uppercase font-black mb-1">Rarity_Core</h3>
              <div className="flex gap-2 mt-2">
                 {Object.entries(rarityStats).map(([r, count]) => (
                    <div key={r} title={`${r}: ${count}`} className={cn(
                      "h-1 flex-1 rounded-full",
                      r === 'common' ? 'bg-white/20' : r === 'uncommon' ? 'bg-blue-400' : r === 'rare' ? 'bg-purple-400' : 'bg-warning'
                    )} />
                 ))}
              </div>
              <p className="text-[9px] font-mono text-text-s uppercase mt-2 opacity-50">Distribution_Stable</p>
           </div>
           <div className="glass p-6 rounded-2xl border-b-4 border-success bg-success/5">
              <h3 className="text-[10px] font-mono text-success uppercase font-black mb-1">Next_Milestone</h3>
              <p className="text-xs font-mono text-white uppercase italic mt-2">5 more for LEVEL_UP</p>
           </div>
        </div>

        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-4 border-b border-white/5 pb-4">
             <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>ALL_PROTOCOLS</FilterButton>
             <FilterButton active={filter === 'earned'} onClick={() => setFilter('earned')}>SYNCED</FilterButton>
             <FilterButton active={filter === 'locked'} onClick={() => setFilter('locked')}>LOCKED</FilterButton>
             <div className="w-px h-6 bg-white/10 mx-2" />
             <select 
               value={rarityFilter} 
               onChange={(e) => setRarityFilter(e.target.value as any)}
               className="bg-transparent border-0 text-[10px] font-mono text-text-m uppercase outline-none cursor-pointer focus:text-white"
             >
               <option value="all" className="bg-background">ALL_RARITIES</option>
               <option value="common" className="bg-background">COMMON</option>
               <option value="uncommon" className="bg-background">UNCOMMON</option>
               <option value="rare" className="bg-background">RARE</option>
               <option value="legendary" className="bg-background">LEGENDARY</option>
             </select>
             <select 
               value={categoryFilter} 
               onChange={(e) => setCategoryFilter(e.target.value as any)}
               className="bg-transparent border-0 text-[10px] font-mono text-text-m uppercase outline-none cursor-pointer focus:text-white ml-2"
             >
               <option value="all" className="bg-background">ALL_CATEGORIES</option>
               <option value="milestone" className="bg-background">MILESTONES</option>
               <option value="streak" className="bg-background">STREAKS</option>
               <option value="skill" className="bg-background">SKILLS</option>
               <option value="hidden" className="bg-background">HIDDEN</option>
             </select>
          </div>

          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-1 md:grid-cols-2"
          )}>
            {filteredAchievements.map((achievement, idx) => {

              return (
                <div key={`filtered-ach-${achievement.id}-${idx}`}>
                  <AchievementCard 
                    achievement={achievement}
                    unlocked={stats.unlockedAchievements?.includes(achievement.id)}
                    {...getAchievementProgress(achievement)}
                    onClick={() => setSelectedAchievement(achievement)}
                    viewMode={viewMode}
                    onShare={(ach) => {
                      if (setSharingAchievement) setSharingAchievement(ach);
                      setTimeout(() => {
                        if (openShare) {
                          openShare(
                            'achievement-share-card',
                            `AETHOS_${ach.title}`,
                            'ACHIEVEMENT CARD'
                          );
                        }
                      }, 100);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

    </div>
  );
}


function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
  const isLargeValue = displayValue.toString().length > 7;

  return (
    <div className="glass p-6 md:p-8 rounded-xl flex flex-col items-center justify-center text-center group hover:bg-background-nested transition-all relative overflow-hidden">
      <CardDecoration />
      <div className={cn("mb-4 transition-transform group-hover:scale-110 relative z-10", color)}>
        {icon}
      </div>
      <h3 className="text-[10px] font-bold text-text-m uppercase tracking-widest mb-1 relative z-10">{label}</h3>
      <p className={cn(
        "font-bold font-mono tracking-tighter relative z-10 break-all",
        isLargeValue ? "text-2xl" : "text-4xl",
        color
      )}>
        {displayValue}
      </p>
    </div>
  );
}

function ShopView({ stats, user, onPurchase }: { stats: UserStats | null; user: User; onPurchase: (item: any) => void }) {
  const shopItems = [
    { id: 'theme_emerald', label: 'EMERALD_PROTOCOL', description: 'Deep green interface override.', unlockLevel: 2, type: 'theme', category: 'visual' },
    { id: 'theme_ruby', label: 'RUBY_RESONANCE', description: 'Monochrome crimson aesthetic.', unlockLevel: 3, type: 'theme', category: 'visual' },
    { id: 'theme_gold', label: 'AUREUM_OS', description: 'Elite gold and black workspace.', unlockLevel: 10, type: 'theme', category: 'prestige' },
    { id: 'avatar_frame_neon', label: 'NEON_HALO', description: 'Pulsing circular frame for system avatar.', unlockLevel: 5, type: 'skin', category: 'visual' },
    { id: 'sound_pack_classic', label: '8BIT_SOUND_INDEX', description: 'Retro sound effects for sync completions.', unlockLevel: 3, type: 'bundle', category: 'audio' },
  ];

  return (
    <div className="space-y-8 pb-20">
      <header className="space-y-2">
        <h2 className="text-4xl font-serif font-black text-white italic uppercase tracking-tighter text-glow-white">NEURAL_MARKETPLACE</h2>
        <p className="text-text-m font-mono text-xs uppercase opacity-60">Unlock visual and auditory upgrades by reaching level milestones.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shopItems.map((item, index) => {
          const isOwned = stats?.unlockedItems?.includes(item.id);
          const currentLevel = stats?.level || 1;
          const isLevelLocked = currentLevel < item.unlockLevel;

          return (
            <motion.div 
              key={`shop-item-${item.id}-${index}`}
              whileHover={isLevelLocked ? {} : { y: -5 }}
              className={cn(
                "glass p-6 rounded-3xl border flex flex-col gap-6 relative overflow-hidden group",
                isLevelLocked ? "border-white/5 opacity-50 bg-white/1" : "border-white/10 hover:border-accent/40"
              )}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform">
                <ShoppingBag size={48} className="text-accent" />
              </div>
              
              <div className="flex justify-between items-start relative z-10">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  {item.type === 'theme' ? <Palette size={24} className="text-accent" /> : <Shield size={24} className="text-cyan" />}
                </div>
                <div className={cn("text-[8px] font-mono font-black px-2 py-1 rounded uppercase tracking-tighter", 
                  item.category === 'prestige' ? 'bg-warning text-black' : 'bg-white/10 text-text-m'
                )}>
                  {item.category}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-serif font-black text-white uppercase italic mb-1">{item.label}</h3>
                <p className="text-[10px] font-mono text-text-s uppercase leading-relaxed opacity-60">{item.description}</p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                   <div className={cn("w-2 h-2 rounded-full", isLevelLocked ? "bg-neutral-600" : "bg-success animate-pulse")} />
                   <span className="text-[10px] font-mono font-black text-white">LVL {item.unlockLevel} REQUIRED</span>
                </div>
                <button
                  onClick={() => onPurchase(item)}
                  disabled={isOwned || isLevelLocked}
                  className={cn(
                    "px-4 py-2 rounded-xl font-mono font-black text-[10px] uppercase tracking-widest transition-all",
                    isOwned 
                      ? "bg-success text-black pointer-events-none" 
                      : "bg-white/5 text-white hover:bg-accent hover:text-white disabled:opacity-20 disabled:pointer-events-none"
                  )}
                >
                  {isOwned ? 'DECRYPTED' : isLevelLocked ? 'LOCKED' : 'DECRYPT'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="glass p-8 rounded-3xl border border-white/5 bg-white/2 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-accent/10 rounded-2xl border border-accent/20">
             <Star size={32} className="text-accent" />
          </div>
          <div>
            <h4 className="text-xl font-serif font-black text-white uppercase italic">SYSTEM_DECRYPTION_LOGIC</h4>
            <p className="text-[10px] font-mono text-text-m uppercase">Work on your tasks and habits to earn XP. Reach level milestones to decrypt unique themes and visual skins.</p>
          </div>
        </div>
        <div className="text-4xl font-mono font-black text-white px-8 py-4 glass rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(255,69,0,0.1)]">
           LVL {stats?.level || 1} <span className="text-xs text-text-s tracking-widest ml-2">CURRENT</span>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ settings, stats, user, onUpdate, onPurchase }: { settings: AppSettings | null; stats: UserStats | null; user: User; onUpdate: (s: Partial<AppSettings>) => void; onPurchase: (item: any) => void }) {
  const [activeCategory, setActiveCategory] = useState<'profile' | 'gameplay' | 'interface' | 'notifications' | 'shop' | 'data' | 'values'>('profile');
  const [localDisplayName, setLocalDisplayName] = useState(user.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);

  if (!settings) return <div className="text-center font-mono opacity-20">LOAD_SETTINGS_FAILURE...</div>;

  const categories = [
    { id: 'profile', label: 'IDENTITY_CORE', icon: <UserIcon size={16} />, color: 'text-accent' },
    { id: 'gameplay', label: 'OPERATION_LOGIC', icon: <Zap size={16} />, color: 'text-warning' },
    { id: 'interface', label: 'INTERFACE_STREAMS', icon: <Palette size={16} />, color: 'text-cyan' },
    { id: 'notifications', label: 'COMMS_PROTOCOLS', icon: <Bell size={16} />, color: 'text-success' },
    { id: 'shop', label: 'MARKETPLACE', icon: <ShoppingBag size={16} />, color: 'text-indigo-400' },
    { id: 'data', label: 'SYSTEM_MEMORY', icon: <HardDrive size={16} />, color: 'text-text-m' },
    { id: 'values', label: 'VALUES_CORE', icon: <Heart size={16} />, color: 'text-pink-400' },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="space-y-2">
          <h2 className="text-5xl font-serif font-black text-white italic uppercase tracking-tighter text-glow-white">CONFIG_OS</h2>
          <p className="text-text-m font-mono text-xs uppercase opacity-60 tracking-[0.3em]">Adjust your neural interface parameters.</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeCategory === cat.id 
                  ? "bg-accent shadow-[0_0_20px_rgba(255,69,0,0.3)] text-white" 
                  : "text-text-m hover:text-white"
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-12 space-y-12 overflow-x-auto w-full custom-scrollbar">
          
          {activeCategory === 'profile' && (
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent to-danger p-1">
                  <div className="w-full h-full rounded-[1.3rem] overflow-hidden bg-background-nested">
                    <img src={user.photoURL || ''} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-serif font-black text-white uppercase italic">{user.displayName}</h3>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent text-[8px] font-mono font-black uppercase rounded">ROOT_USER</span>
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-text-m text-[8px] font-mono font-black uppercase rounded">ID: {user.uid.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-3xl border border-white/5 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-mono text-text-m uppercase font-black tracking-widest">DISPLAY_ALIAS</label>
                       {isEditingName ? (
                         <div className="flex gap-2">
                            <button onClick={() => { setLocalDisplayName(user.displayName || ''); setIsEditingName(false); }} className="text-[10px] text-text-m hover:text-white">CANCEL</button>
                            <button onClick={async () => { 
                              try {
                                await updateProfile(user, { displayName: localDisplayName });
                                setIsEditingName(false);
                                // In a real app we might want to trigger a re-render of the parent if user object doesn't update automatically in some contexts, but usually it does in state
                                window.location.reload(); // Quick way to sync auth state across app for this prototype
                              } catch (e) {
                                console.error(e);
                              }
                            }} className="text-[10px] text-accent font-black">SAVE_CHANGE</button>
                         </div>
                       ) : (
                         <button onClick={() => setIsEditingName(true)} className="text-[10px] text-cyan font-black hover:underline transition-all">EDIT_IDENTITY</button>
                       )}
                    </div>
                    {isEditingName ? (
                      <input 
                        type="text" 
                        value={localDisplayName}
                        onChange={(e) => setLocalDisplayName(e.target.value)}
                        className="w-full bg-black/40 border border-accent/30 p-4 rounded-xl text-white font-mono outline-none shadow-[0_0_15px_rgba(255,69,0,0.1)]"
                      />
                    ) : (
                      <div className="p-4 bg-white/2 rounded-xl border border-white/5 text-sm font-mono text-white opacity-80">{user.displayName || 'ANONYMOUS_OPERATOR'}</div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-mono text-text-m uppercase font-black tracking-widest">COMM_CHANNEL</label>
                    <div className="flex items-center justify-between p-4 bg-white/2 rounded-xl border border-white/5">
                      <span className="text-sm font-mono text-white opacity-40">{user.email}</span>
                      <ShieldCheck size={16} className="text-success" />
                    </div>
                  </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-center gap-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-mono font-black text-white uppercase">NEURAL_SYNC_STATUS</h4>
                    <p className="text-[10px] font-mono text-text-m uppercase opacity-60">Verified connection established with Google_Core.</p>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-success/5 border border-success/20 rounded-2xl">
                    <div className="p-3 bg-success/10 rounded-xl">
                      <ShieldCheck className="text-success" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-mono font-black text-success uppercase">ENCRYPTED_LINK</p>
                      <p className="text-[8px] font-mono text-text-m uppercase">ALL_DATA_FLOWS_PROTECTED_BY_AETHER_SECURITY</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {activeCategory === 'gameplay' && (
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                 <h3 className="text-sm font-mono font-black text-warning uppercase tracking-widest flex items-center gap-3">
                   <Zap size={18} />
                   DIFFICULTY_PARAMETERS
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {[
                     { val: 0.5, label: 'NOVICE', desc: 'Relaxed focus protocols. Standard rewards.', color: 'border-success/30 text-success' },
                     { val: 1.0, label: 'HARDWARE_MODE', desc: 'Optimal performance balance. 1.0x Sync rate.', color: 'border-cyan/30 text-cyan' },
                     { val: 2.0, label: 'VM_PROTOCOL', desc: 'Hyper-focused virtualized grind. 2.0x Reward throughput.', color: 'border-accent/30 text-accent' }
                   ].map(d => (
                     <button
                       key={d.val}
                       onClick={() => onUpdate({ difficultyMultiplier: d.val })}
                       className={cn(
                         "p-8 rounded-[2.5rem] border text-left transition-all relative overflow-hidden group",
                         settings.difficultyMultiplier === d.val 
                           ? `bg-white/5 ${d.color.split(' ')[0]} shadow-2xl` 
                           : "glass border-white/5 hover:border-white/20"
                       )}
                     >
                       <div className={cn("text-xs font-mono font-black uppercase mb-3", d.color.split(' ')[1])}>{d.label}</div>
                       <p className="text-[10px] font-mono text-text-s uppercase opacity-60 leading-relaxed mb-6">{d.desc}</p>
                       <div className="flex items-end justify-between">
                         <span className="text-2xl font-serif font-black text-white italic">{d.val}x</span>
                         {settings.difficultyMultiplier === d.val && <CheckCircle2 size={24} className={d.color.split(' ')[1]} />}
                       </div>
                       {settings.difficultyMultiplier === d.val && (
                         <div className={cn("absolute bottom-0 left-0 w-full h-1 bg-current opacity-50", d.color.split(' ')[1])} />
                       )}
                     </button>
                   ))}
                 </div>
              </div>

              <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-8">
                 <div className="flex items-center justify-between group">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-text-s uppercase font-black group-hover:text-white transition-colors">CHALLENGE_SYNC</p>
                      <p className="text-xs font-mono text-text-m opacity-50">Enable dynamic daily objectives based on load.</p>
                    </div>
                    <Toggle active={true} onChange={() => {}} />
                 </div>
                 <div className="h-px bg-white/5" />
                 <div className="flex items-center justify-between group">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-text-s uppercase font-black group-hover:text-white transition-colors">RECURRING_LOOPS</p>
                      <p className="text-xs font-mono text-text-m opacity-50">Allow protocol repetition across cycles.</p>
                    </div>
                    <Toggle active={stats?.unlockedFeatures?.includes('recurring_tasks') || false} onChange={() => {}} />
                 </div>
              </div>
            </motion.section>
          )}

          {activeCategory === 'interface' && (
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif font-black text-cyan italic uppercase tracking-widest text-glow-cyan">INTERFACE_CALIBRATOR</h3>
                  <p className="text-[10px] font-mono text-text-m uppercase opacity-60">Fine-tune themes, chronology settings, and motion speed.</p>
                </div>

                {/* Theme Selection */}
                <div className="space-y-4">
                  <label className="text-[10px] font-mono text-white font-black uppercase tracking-widest">COGNITIVE_THEME</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     {[
                       { id: 'cyber', label: 'Default Cyber Black', bg: 'bg-black/60 border-cyan/30 text-cyan' },
                       { id: 'carbon', label: 'Carbon Gray', bg: 'bg-slate-900 border-white/10 text-white' },
                       { id: 'sunset', label: 'Retro Sunset Red', bg: 'bg-red-950/40 border-accent/30 text-accent' }
                     ].map(t => (
                       <button
                         key={t.id}
                         onClick={() => onUpdate({ display: { ...settings.display, theme: t.id } })}
                         className={cn(
                           "p-4 rounded-xl border text-[10px] font-mono font-black uppercase tracking-wider relative overflow-hidden transition-all",
                           settings.display.theme === t.id ? t.bg : "glass border-white/5 hover:border-white/10 text-text-m"
                         )}
                       >
                         {t.label}
                       </button>
                     ))}
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Time format Toggle */}
                <div className="flex items-center justify-between group">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-white font-black uppercase tracking-widest group-hover:text-cyan transition-colors">CHRONOLOGICAL_FORMAT</p>
                    <p className="text-xs font-mono text-text-m opacity-50">Toggle between 12-hour AM/PM or 24-hour cycle layout.</p>
                  </div>
                  <button 
                    onClick={() => onUpdate({ display: { ...settings.display, timeFormat: settings.display.timeFormat === '12h' ? '24h' : '12h' } })}
                    className="px-4 py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono rounded-lg transition-all font-black uppercase"
                  >
                    CURRENT: {settings.display.timeFormat}
                  </button>
                </div>

                <div className="h-px bg-white/5" />

                {/* Animations Selector */}
                <div className="space-y-4">
                  <label className="text-[10px] font-mono text-white font-black uppercase tracking-widest">MOTION_PROTOCOL_RESONANCE</label>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { id: 'full', label: 'FULL_SPEED', desc: 'Hardware-accelerated premium easing.' },
                      { id: 'reduced', label: 'REDUCED_MOTION', desc: 'Fade transitions only to reduce strain.' },
                      { id: 'none', label: 'STATIC_GRID', desc: 'Instant state switches, zero latency.' }
                    ].map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onUpdate({ ui: { ...settings.ui, animations: a.id as any } })}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          settings.ui.animations === a.id ? "bg-white/5 border-cyan text-cyan" : "glass border-white/5 text-text-m hover:border-white/10"
                        )}
                      >
                        <p className="text-[9px] font-mono font-black uppercase">{a.label}</p>
                        <p className="text-[8px] font-mono text-text-s uppercase opacity-50 leading-relaxed mt-1">{a.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </motion.section>
          )}

          {activeCategory === 'shop' && (
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <ShopView stats={stats} user={user} onPurchase={onPurchase} />
            </motion.section>
          )}

          {activeCategory === 'notifications' && (
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="glass p-8 rounded-[3.5rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                   <Bell size={120} className="text-success" />
                </div>
                <div className="relative z-10 space-y-12">
                   <div className="space-y-2">
                     <h3 className="text-2xl font-serif font-black text-white italic uppercase tracking-widest text-glow-success">SIGNAL_CONTROL</h3>
                     <p className="text-[10px] font-mono text-text-m uppercase opacity-60">Manage neural ping frequency and priority.</p>
                   </div>

                   <div className="space-y-4">
                     {[
                       { id: 'taskReminders', label: 'TASK_EXPIRATION_ALERTS', desc: 'Notify when temporal deadlines approach.', icon: <Target size={16} />, color: 'text-accent' },
                       { id: 'achievementNotifs', label: 'GOAL_SYNC_ANNOUNCEMENTS', desc: 'Instant feedback on milestone decryption.', icon: <Award size={16} />, color: 'text-warning' },
                       { id: 'streakReminders', label: 'UPTIME_PROTECTION_PING', desc: 'Alerts when neural streak is at risk of failure.', icon: <Flame size={16} />, color: 'text-success' }
                     ].map(item => (
                       <div key={item.id} className="flex items-center justify-between p-6 bg-white/2 rounded-[2rem] border border-white/5 hover:bg-white/5 transition-all group">
                         <div className="flex items-center gap-6">
                            <div className={cn("p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform", item.color)}>
                               {item.icon}
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-mono text-white font-black uppercase tracking-widest">{item.label}</p>
                              <p className="text-[10px] font-mono text-text-m uppercase opacity-60 tracking-tighter">{item.desc}</p>
                            </div>
                         </div>
                         <Toggle 
                           active={settings.notifications[item.id as keyof typeof settings.notifications]} 
                           onChange={() => onUpdate({ 
                             notifications: { 
                               ...settings.notifications, 
                               [item.id]: !settings.notifications[item.id as keyof typeof settings.notifications] 
                             } 
                           })} 
                         />
                       </div>
                     ))}
                   </div>

                   <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <p className="text-[12px] font-mono text-white italic uppercase font-black">Neural_Audio_Level</p>
                        <p className="text-[9px] font-mono text-text-m uppercase opacity-40">System feedback volume intensity.</p>
                      </div>
                      <div className="flex items-center gap-6 flex-1 max-w-sm">
                        <Volume2 size={16} className="text-text-m" />
                        <input 
                          type="range" 
                          min="0" max="1" step="0.1" 
                          value={settings.ui.soundVolume}
                          onChange={(e) => onUpdate({ ui: { ...settings.ui, soundVolume: parseFloat(e.target.value) } })}
                          className="flex-1 accent-white bg-white/10 h-1 rounded-full cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-white w-8 text-right">{Math.round(settings.ui.soundVolume * 100)}%</span>
                      </div>
                   </div>
                </div>
              </div>
            </motion.section>
          )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col justify-between group h-64 overflow-hidden relative">
                    <div className="space-y-2 relative z-10">
                       <h4 className="text-xl font-serif font-black text-white italic uppercase">VOICE_INPUT_THRESHOLD</h4>
                       <p className="text-[10px] font-mono text-text-m uppercase opacity-60">Adjust noise filter sensitivity.</p>
                       <input 
                         type="range" 
                         min="0" 
                         max="100" 
                         value={settings.ui.microphoneSensitivity ?? 50}
                         onChange={(e) => onUpdate({ ui: { ...settings.ui, microphoneSensitivity: parseInt(e.target.value) } })}
                         className="w-full accent-accent"
                       />
                       <span className="text-xs font-mono text-white">{settings.ui.microphoneSensitivity ?? 50}%</span>
                    </div>
                 </div>
                 <div className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col justify-between group h-64 overflow-hidden relative">
                    <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                       <Download size={120} className="text-white" />
                    </div>
                    <div className="space-y-2 relative z-10">
                       <h4 className="text-xl font-serif font-black text-white italic uppercase">LOCAL_ARCHIVE_EXPORT</h4>
                       <p className="text-[10px] font-mono text-text-m uppercase opacity-60">Generate a machine-readable JSON digest of your neural history.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const data = {
                          profile: { email: user.email, name: user.displayName, uid: user.uid },
                          settings: settings,
                          timestamp: new Date().toISOString()
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `AETHOS_ARCHIVE_${user.uid.slice(0, 8)}.json`;
                        a.click();
                      }}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all relative z-10"
                    >
                       INITIALIZE_EXPORT
                    </button>
                 </div>

                 <div className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col justify-between group h-64 overflow-hidden relative bg-danger/5 border-danger/10">
                    <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none group-hover:-rotate-12 transition-transform">
                       <Trash2 size={120} className="text-danger" />
                    </div>
                    <div className="space-y-2 relative z-10">
                       <h4 className="text-xl font-serif font-black text-danger italic uppercase">HARD_FORMAT_PROTOCOL</h4>
                       <p className="text-[10px] font-mono text-text-m uppercase opacity-60">Permanently purge all settings and configurations from the neural net. Irreversible.</p>
                    </div>
                    <button 
                      onClick={async () => {
                        if (confirm('CONFIRM_SYSTEM_PURGE: Are you absolutely sure? All data will be lost forever.')) {
                          try {
                            const settingsRef = doc(db, 'user_settings', user.uid);
                            await deleteDoc(settingsRef);
                            window.location.reload();
                          } catch (e) {
                            handleFirestoreError(e, OperationType.DELETE, `user_settings/${user.uid}`);
                          }
                        }
                      }}
                      className="w-full py-4 bg-danger/20 border border-danger/40 rounded-2xl text-danger font-mono text-[10px] font-black uppercase tracking-widest hover:bg-danger hover:text-white transition-all relative z-10"
                    >
                       TERMINATE_ALL_DATA
                    </button>
                 </div>
              </div>
              
              <div className="glass p-8 rounded-[3rem] border border-white/5 flex items-center justify-between">
                 <div className="space-y-1">
                    <p className="text-[10px] font-mono text-white font-black uppercase">SYSTEM_OAUTH_LOGOUT</p>
                    <p className="text-[10px] font-mono text-text-m uppercase opacity-40">Disconnect current user node from AETHOS.</p>
                 </div>
                 <button 
                   onClick={() => signOut(auth)}
                   className="px-8 py-3 bg-white text-black font-mono text-[10px] font-black uppercase rounded-xl hover:scale-105 active:scale-95 transition-all"
                 >
                   TERMINATE_SESSION
                 </button>
              </div>

        </div>
      </div>

      <footer className="pt-20 text-center opacity-30 space-y-4">
         <div className="flex justify-center gap-8">
            <span className="text-[8px] font-mono text-text-p uppercase tracking-[0.4em]">PROJECT:AETHER</span>
            <span className="text-[8px] font-mono text-text-p uppercase tracking-[0.4em]">VER:2.1.0_OAK</span>
            <span className="text-[8px] font-mono text-text-p uppercase tracking-[0.4em]">STATUS:STABLE</span>
         </div>
         <p className="text-[8px] font-mono text-text-m uppercase tracking-widest">© 2026 DEEP_NEURAL_SOLUTIONS. ALL_RIGHTS_RESERVED.</p>
      </footer>
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button 
      onClick={onChange}
      className={cn(
        "w-12 h-6 rounded-full transition-all relative p-1",
        active ? "bg-accent" : "bg-white/10"
      )}
    >
      <motion.div 
        animate={{ x: active ? 24 : 0 }}
        className="w-4 h-4 rounded-full bg-white shadow-lg" 
      />
    </button>
  );
}

function DailyWorkView({
  tasks,
  user,
  onComplete,
  settings,
  setCompleteToast,
  timeBlocks,
  journals,
  stats,
  onAddXP,
  onFocus,
  addTimeBlock,
  deleteTimeBlock,
  updateTimeBlock,
  updateTask,
  applyTemplate,
  onUpdateSettings,
  habits,
  habitLogs,
  onAddHabit,
  onToggleHabit,
  onDeleteHabit,
  woopPlans,
  yearlyGoals = [],
  dailyGoals = [],
  dailyGoalStreak = 0,
  subTab = 'goals',
  setSubTab,
  addToTerminal,
  openShare,
}: any) {
  const activeTab = subTab;
  const setActiveTab = setSubTab || (() => {});

  const TABS = [
    { id: 'goals', label: 'GOALS', color: 'bg-accent' },
    { id: 'habits', label: 'HABITS', color: 'bg-cyan' },
    { id: 'timetable', label: 'TIMETABLE', color: 'bg-indigo-500' },
    { id: 'woop', label: 'WOOP', color: 'bg-purple-600' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl w-full">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-3 text-[11px] font-mono font-black uppercase tracking-widest rounded-xl transition-all",
              activeTab === tab.id
                ? `${tab.color} text-white shadow-lg`
                : "text-text-m hover:text-white hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'goals' && (
          <GoalsTab
            user={user}
            yearlyGoals={yearlyGoals}
            dailyGoals={dailyGoals}
            dailyGoalStreak={dailyGoalStreak}
            onAddXP={onAddXP}
          />
        )}
        {activeTab === 'habits' && (
          <HabitSpreadsheet
            habits={habits}
            habitLogs={habitLogs}
            onToggleHabit={onToggleHabit}
            onAddHabit={onAddHabit}
            onUpdateHabit={updateHabit}
            onDeleteHabit={onDeleteHabit}
            stats={stats}
          />
        )}
        {activeTab === 'timetable' && (
          <TemporalHub
            tasks={tasks}
            timeBlocks={timeBlocks}
            journals={journals}
            user={user}
            stats={stats}
            onAddXP={onAddXP}
            onFocus={onFocus}
            onComplete={onComplete}
            addTimeBlock={addTimeBlock}
            deleteTimeBlock={deleteTimeBlock}
            updateTimeBlock={updateTimeBlock}
            updateTask={updateTask}
            applyTemplate={applyTemplate}
            setCompleteToast={setCompleteToast}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            addToTerminal={addToTerminal}
          />
        )}
        {activeTab === 'woop' && (
          <WOOPView woopPlans={woopPlans || []} user={user} />
        )}
      </div>
    </div>
  );
}

function ReflectView({ journals, user, onAddXP, stats, setActiveTab, tasks, habits, habitLogs, deleteJournalEntry, deleteAllJournals }: any) {
  return (
    <div className="max-w-[1600px] mx-auto min-h-[85vh] flex flex-col gap-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Floating Action/Header section to prompt Aether Integrated Coach */}
      <div className="flex justify-end pr-2">
         <button
           onClick={() => setActiveTab('aetherCoach')}
           className="px-6 py-3.5 bg-cyan hover:bg-cyan-hover text-black font-mono text-xs font-black uppercase rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] flex items-center gap-2 border border-cyan/30"
         >
           <Sparkles size={14} className="animate-pulse" />
           PROMPT_AETHOS_COACH
         </button>
      </div>

      {/* Journal View taking the full available width of the screen */}
      <div className="w-full font-sans">
         <JournalView 
            journals={journals} 
            user={user} 
            onAddXP={onAddXP} 
            stats={stats} 
            tasks={tasks}
            habits={habits}
            habitLogs={habitLogs}
            deleteJournalEntry={deleteJournalEntry}
            deleteAllJournals={deleteAllJournals}
         />
      </div>

    </div>
  );
}

function AetherCoachTabView({ stats, user, journals, tasks = [], habits = [], habitLogs = [], motivationItems = [], woopPlans = [], startPlaylist, setIsMotivationPortalOpen, setPendingMotivation, isSidebarOpen, setIsSidebarOpen }: any) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const chatPaneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chatPaneRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const recognitionRef = useRef<any>(null);

  const startListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    
    setPermissionError(null);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setPermissionError("Speech recognition not supported in this browser.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => {
        setIsListening(false);
        setPermissionError("Microphone error occurred.");
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + " " + transcript);
      };
      recognition.start();
    } catch (err) {
      setPermissionError("Microphone access denied or not available.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Image selected:", file);
      // Placeholder for image handling logic
      setCompleteToast('IMAGE_SUPPORT_COMING_SOON');
      setTimeout(() => setCompleteToast(null), 2000);
    }
  };

  const coachMarkdownComponents = {
    p: ({children}: any) => <p className="whitespace-pre-wrap leading-relaxed mb-3 text-sm text-white/90 font-sans">{children}</p>,
    strong: ({children}: any) => <strong className="text-cyan font-semibold">{children}</strong>,
    ul: ({children}: any) => <ul className="list-disc list-outside ml-4 space-y-2 my-3 text-sm text-white/90 font-sans">{children}</ul>,
    ol: ({children}: any) => <ol className="list-decimal list-outside ml-4 space-y-2 my-3 text-sm text-white/90 font-sans">{children}</ol>,
    li: ({children}: any) => <li className="leading-relaxed pl-2">{children}</li>,
    code: ({children}: any) => <code className="bg-background-nested px-2 py-0.5 rounded font-mono text-sm text-cyan">{children}</code>,
    h1: ({children}: any) => <h1 className="text-2xl font-black text-white mt-8 mb-4 tracking-tight">{children}</h1>,
    h2: ({children}: any) => <h2 className="text-xl font-bold text-white/95 mt-6 mb-3 tracking-tight">{children}</h2>,
    h3: ({children}: any) => <h3 className="text-lg font-bold text-white/90 mt-4 mb-2 tracking-tight">{children}</h3>,
  };
  const [messages, setMessages] = useState<any[]>([]);
  const [chatList, setChatList] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [completeToast, setCompleteToast] = useState<string | null>(null);
  const [coachProfile, setCoachProfile] = useState<any>(null);
  const [memorySummary, setMemorySummary] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    userName: '',
    coachName: '',
    goal: '',
    tone: '',
    weakness: '',
    thirtyDayFix: ''
  });
  const [onboardingInput, setOnboardingInput] = useState('');
  const [onboardingMessages, setOnboardingMessages] = useState<{sender: string, text: string}[]>([]);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const ONBOARDING_QUESTIONS = [
    { key: 'userName', question: "Initializing neural guidance system...\n\nBefore we begin, I need to calibrate to you.\n\nWhat should I call you?" },
    { key: 'coachName', question: (data: any) => `Good to meet you, ${data.userName}. Now — what will you call me? Give me a name.` },
    { key: 'goal', question: (data: any) => `${data.coachName} online.\n\nWhat is your biggest goal right now?` },
    { key: 'tone', question: () => `How do you want me to talk to you?\n\n1. Brutal honesty — no excuses\n2. Calm mentor — steady guidance\n3. Full hype — pure motivation\n\nType 1, 2, or 3.` },
    { key: 'weakness', question: () => `Understood. What is your biggest weakness right now? Be honest.` },
    { key: 'thirtyDayFix', question: () => `Last one — what is ONE thing you want to fix in the next 30 days?` },
  ];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, onboardingMessages]);

  useEffect(() => {
    if (!user) return;
    const fetchMemory = async () => {
      try {
        const memRef = doc(db, 'coach_memory', user.uid);
        const memSnap = await getDoc(memRef);
        if (memSnap.exists()) setMemorySummary(memSnap.data().summary || '');
      } catch (e) {
        console.warn('[Memory] fetch failed, continuing without it:', e);
      }
    };
    fetchMemory();
  }, [user]);

  useEffect(() => {
    fetchCoachProfile();
  }, [user]);

  const startNewChat = async () => {
    if (!user) return;
    try {
      const newChatRef = await addDoc(collection(db, 'coach_chats'), {
        userId: user.uid,
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setActiveChatId(newChatRef.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'coach_chats');
    }
  };

  const switchChat = (chatId: string) => {
    setActiveChatId(chatId);
  };

  const clearEmptyChats = async () => {
    if (!user) return;
    const emptyChats = chatList.filter(c => (c.title === 'New Chat' || !c.title));
    if (emptyChats.length === 0) return;
    if (!window.confirm(`Delete ${emptyChats.length} empty chat(s)? This cannot be undone.`)) return;
    try {
      const batch = writeBatch(db);
      emptyChats.forEach(c => batch.delete(doc(db, 'coach_chats', c.id)));
      await batch.commit();
      if (emptyChats.some(c => c.id === activeChatId)) {
        setActiveChatId(null);
        setMessages([]);
      }
      setCompleteToast(`CLEARED_${emptyChats.length}_EMPTY_CHATS`);
      setTimeout(() => setCompleteToast(null), 2500);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'coach_chats');
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    if (!newTitle.trim()) { setRenamingChatId(null); return; }
    try {
      await updateDoc(doc(db, 'coach_chats', chatId), { title: newTitle.trim(), updatedAt: new Date().toISOString() });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `coach_chats/${chatId}`);
    }
    setRenamingChatId(null);
  };

  const deleteChat = async (chatId: string) => {
    if (!window.confirm('Delete this chat permanently?')) return;
    
    // Optimistic UI update
    const previousChatList = [...chatList];
    setChatList(chatList.filter(c => c.id !== chatId));
    const previousActiveChatId = activeChatId;
    const previousMessages = messages;
    
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
    }

    try {
      await deleteDoc(doc(db, 'coach_chats', chatId));
      const msgsQuery = query(collection(db, 'coach_messages'), where('userId', '==', user.uid), where('chatId', '==', chatId));
      const snap = await getDocs(msgsQuery);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `coach_chats/${chatId}`);
      // Rollback on error
      setChatList(previousChatList);
      if (previousActiveChatId === chatId) {
        setActiveChatId(previousActiveChatId);
        setMessages(previousMessages);
      }
    }
  };

  const deleteAllChats = async () => {
    if (!user) return;
    if (!window.confirm(`Delete ALL ${chatList.length} chats and all messages? This cannot be undone.`)) return;
    
    const previousChatList = [...chatList];
    setChatList([]);
    setActiveChatId(null);
    setMessages([]);
    
    try {
      const chatsQuery = query(collection(db, 'coach_chats'), where('userId', '==', user.uid));
      const chatSnap = await getDocs(chatsQuery);
      
      const msgsQuery = query(collection(db, 'coach_messages'), where('userId', '==', user.uid));
      const msgsSnap = await getDocs(msgsQuery);
      
      const allDocs = [...chatSnap.docs, ...msgsSnap.docs];
      for (let i = 0; i < allDocs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = allDocs.slice(i, i + 500);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'coach_chats');
      setChatList(previousChatList);
    }
  };

  const regenerateResponse = async (coachMsg: any) => {
    if (!user || isGenerating) return;
    setIsGenerating(true);
    try {
      const msgIndex = messages.findIndex(m => m.id === coachMsg.id);
      const priorUserMsg = [...messages.slice(0, msgIndex)].reverse().find(m => m.sender === 'user');
      if (!priorUserMsg) return;

      const history = messages.slice(0, msgIndex).slice(-20).map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text || '' }]
      }));
      
      // Update locally immediately (optimistic)
      const newMessages = [...messages];
      newMessages[msgIndex] = { ...coachMsg, text: "" };
      setMessages(newMessages);
      setStreamingText('');

      abortControllerRef.current = new AbortController();
      let liveText = '';
      const result = await generateCoachResponseStream(
        history,
        stats,
        weakestSphere,
        buildCoachContext(null),
        coachProfile,
        memorySummary,
        (partialText) => {
          liveText = partialText;
          setStreamingText(partialText);
          const liveMessages = [...messages];
          liveMessages[msgIndex] = { ...coachMsg, text: partialText };
          setMessages(liveMessages);
        },
        abortControllerRef.current.signal
      );
      abortControllerRef.current = null;
      
      const updatedCoachMsg = {
        ...coachMsg,
        text: result?.text || liveText || coachMsg.text,
        pendingActions: result?.toolCalls || []
      };
      
      await updateDoc(doc(db, 'coach_messages', coachMsg.id), {
        text: updatedCoachMsg.text,
        pendingActions: updatedCoachMsg.pendingActions
      });

      // Update state
      const finalMessages = [...messages];
      finalMessages[msgIndex] = updatedCoachMsg;
      setMessages(finalMessages);
      setStreamingText('');
      setCompleteToast('REGENERATED');
      setTimeout(() => setCompleteToast(null), 1500);

    } catch (e) {
      console.error('Regenerate failed:', e);
      setCompleteToast('REGENERATE_FAILED');
      setTimeout(() => setCompleteToast(null), 2000);
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchCoachProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const profileRef = doc(db, 'coach_profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setCoachProfile(profileSnap.data());
      } else {
        setCoachProfile(null);
      }
    } catch (err) {
      setCoachProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const weakestSphere = useMemo(() => {
    const values = stats?.lifeSync?.current || {};
    let lowestCategory = 'health';
    let lowestVal = 100;
    Object.entries(values).forEach(([key, val]) => {
      const num = Number(val);
      if (num < lowestVal) {
        lowestVal = num;
        lowestCategory = key;
      }
    });
    return lowestCategory.toUpperCase();
  }, [stats]);

  // Initialize onboarding chat with first message
  useEffect(() => {
    if (!profileLoading && !coachProfile && onboardingMessages.length === 0) {
      const firstQ = ONBOARDING_QUESTIONS[0];
      const firstText = typeof firstQ.question === 'function' 
        ? firstQ.question({}) 
        : firstQ.question;
      setOnboardingMessages([{ sender: 'coach', text: firstText }]);
    }
  }, [profileLoading, coachProfile]);

  // Listener for chat list
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'coach_chats'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const chats = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setChatList(chats);
      setActiveChatId(prev => prev || (chats[0]?.id ?? null));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'coach_chats'));
    return () => unsub();
  }, [user]);

  // Listener for messages scoped to activeChatId
  useEffect(() => {
    if (!user || !activeChatId) { setMessages([]); return; }
    const q = query(
      collection(db, 'coach_messages'),
      where('userId', '==', user.uid),
      where('chatId', '==', activeChatId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(msgs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'coach_messages'));
    return () => unsub();
  }, [user, activeChatId]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Late Night';
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  }, []);

  return (
    <div className="flex h-full animate-in fade-in duration-500">
      {/* CHAT SIDEBAR */}
      <div className={`border-r border-white/5 flex flex-col shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-4 border-b border-white/5 space-y-2">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 text-cyan text-[10px] font-mono font-black uppercase tracking-wider rounded-xl transition-all"
          >
            <Plus size={13} /> New Chat
          </button>
          {chatList.filter(c => (c.title === 'New Chat' || !c.title)).length > 1 && (
            <button
              onClick={clearEmptyChats}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[9px] font-mono font-black uppercase tracking-wider rounded-xl transition-all"
            >
              <Trash2 size={11} /> Clear Empty Chats ({chatList.filter(c => (c.title === 'New Chat' || !c.title)).length})
            </button>
          )}
          {chatList.length > 0 && (
            <button
              onClick={deleteAllChats}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-900/30 text-red-400 text-[9px] font-mono font-black uppercase tracking-wider rounded-xl transition-all"
            >
              <Trash2 size={11} /> Delete All Chats
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
          {chatList.length === 0 && (
            <p className="text-[9px] font-mono text-white/20 uppercase text-center py-6">No chats yet</p>
          )}
          {chatList.map(chat => (
            <div
              key={chat.id}
              className={`group flex items-center gap-1 px-1 rounded-lg transition-all animate-in fade-in slide-in-from-left-2 duration-300 ${
                chat.id === activeChatId ? 'bg-cyan/15 border border-cyan/20' : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              {renamingChatId === chat.id ? (
                <input
                  autoFocus
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') renameChat(chat.id, renameInput);
                    if (e.key === 'Escape') setRenamingChatId(null);
                  }}
                  onBlur={() => renameChat(chat.id, renameInput)}
                  className="flex-1 bg-black/40 text-xs font-mono text-white px-2 py-2 rounded outline-none border border-cyan/30"
                />
              ) : (
                <button
                  onClick={() => switchChat(chat.id)}
                  className={`flex-1 text-left px-3 py-3 text-sm font-mono truncate ${
                    chat.id === activeChatId ? 'text-cyan' : 'text-white/50'
                  }`}
                >
                  {chat.title || 'New Chat'}
                </button>
              )}
              {renamingChatId !== chat.id && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                  <button
                    onClick={() => { setRenamingChatId(chat.id); setRenameInput(chat.title || 'New Chat'); }}
                    className="p-1.5 text-white/30 hover:text-cyan"
                    title="Rename"
                  >
                    <Edit3 size={11} />
                  </button>
                  <button
                    onClick={() => deleteChat(chat.id)}
                    className="p-1.5 text-white/30 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-4 left-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white/50 hover:text-white transition-all"
      >
        {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>

      {/* MAIN CHAT PANE */}
      <div 
        ref={chatPaneRef}
        className={cn(
        "flex-1 flex flex-col min-w-0 glass rounded-r-[2.5rem] border-r border-white/10 overflow-hidden relative bg-gradient-to-b from-indigo-950/20 via-background-nested to-transparent shadow-[0_0_50px_rgba(34,211,238,0.1)]",
        isFullScreen && "fixed inset-0 z-50 rounded-none border-none shadow-none"
      )}>
        {/* Coach Header */}
        <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/10 rounded-md text-white/50 hover:text-white transition-all"
                title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <div className="w-2.5 h-2.5 rounded-full bg-cyan animate-pulse" />
              <div>
                 <h3 className="text-xs font-mono font-black uppercase text-white tracking-widest">{coachProfile?.coachName?.toUpperCase() || 'AETHOS COACH'}</h3>
                 <p className="text-[8px] font-mono text-cyan uppercase tracking-tighter">{coachProfile ? `CALIBRATED_TO_${coachProfile.userName?.toUpperCase()}` : 'INITIALIZING_PROFILE...'}</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              {messages.length > 0 && (
                 <button
                    type="button"
                    onClick={handleClearConversation}
                    title="Clear Conversation"
                    className="p-1.5 border border-danger/20 hover:border-danger hover:bg-danger/15 text-danger rounded-md transition-all flex items-center justify-center"
                 >
                    <Trash2 size={12} />
                 </button>
              )}
              <span className="px-2.5 py-1 bg-cyan/10 border border-cyan/20 rounded-md text-cyan text-[8px] font-mono font-black uppercase">AETHOS LABS</span>
           </div>
        </div>

        {/* Coach Messages area */}
        {profileLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest animate-pulse">
              LOADING_NEURAL_PROFILE...
            </p>
          </div>
        ) : !coachProfile ? (
          // ONBOARDING CHAT
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {onboardingMessages.map((m, idx) => (
              <div
                key={`onboarding-${idx}`}
                className={cn(
                  "flex flex-col max-w-[85%] rounded-2xl p-4 font-mono text-xs leading-relaxed",
                  m.sender === 'user'
                    ? "bg-accent/15 border border-accent/25 text-white ml-auto rounded-tr-none"
                    : "bg-white/5 border border-white/10 text-text-m mr-auto rounded-tl-none border-l-2 border-l-cyan"
                )}
              >
                <span className="text-[8px] opacity-40 uppercase tracking-widest font-black mb-1">
                  {m.sender === 'user' ? 'YOU' : 'AETHOS_COACH'}
                </span>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 overflow-y-auto no-scrollbar">
            <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-10 my-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-cyan">
                  <Sparkles size={22} className="animate-pulse" />
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-black uppercase italic tracking-wide text-text-p text-glow-white">
                  {greeting}, {coachProfile.userName}
                </h1>
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                  {coachProfile.coachName} is online — what should we work on?
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }} className="w-full flex gap-2">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${coachProfile?.coachName || 'Ace'}...`}
                  disabled={isGenerating}
                  autoFocus
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs text-white placeholder-text-s/30 font-mono outline-none focus:border-cyan/50 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !inputText.trim()}
                  className="px-6 bg-cyan hover:bg-cyan-hover text-black font-mono text-xs font-black uppercase rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  SEND
                </button>
              </form>

              <div className="w-full flex flex-wrap items-center justify-center gap-2.5">
                {[
                  { id: 'journal', icon: Book, label: 'MY_JOURNAL', prompt: "Look at my recent journal entries and tell me what patterns or emotional trends you're noticing." },
                  { id: 'tasks', icon: CheckCircle2, label: 'MY_TASKS', prompt: "Give me a quick status report on my current tasks — what's pending, what's overdue, and what I should prioritize today." },
                  { id: 'habits', icon: Flame, label: 'HABIT_STREAKS', prompt: "How are my habit streaks looking right now? Flag anything at risk of breaking." },
                  { id: 'balance', icon: Target, label: 'LIFE_BALANCE', prompt: `Analyze my current life sync parameters and streak. My weakest category is ${weakestSphere}. Synthesize where my balance is healthy and where it's suffering, and keep it actionable.` },
                  { id: 'plan', icon: Calendar, label: 'PLAN_TODAY', prompt: "Using my tasks and habits, help me plan out today. What should I focus on first?" },
                ].map(action => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleSendMessage(action.prompt)}
                    className="flex items-center gap-1.5 px-3.5 py-2 glass hover:bg-cyan/15 hover:border-cyan/30 text-white/70 hover:text-white border border-white/10 text-[9px] font-mono rounded-full transition-all font-black uppercase tracking-wider disabled:opacity-40"
                  >
                    <action.icon size={11} />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // NORMAL CHAT
          <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-6 no-scrollbar">
            {messages.map((m, idx) => (
              <div 
                key={m.id || `fallback-msg-${idx}`} 
                className={cn(
                  "group flex flex-col max-w-[90%] rounded-2xl p-5 text-sm leading-relaxed",
                  m.sender === 'user' 
                    ? "bg-accent/15 border border-accent/25 text-white ml-auto rounded-tr-none" 
                    : "bg-white/5 border border-white/10 text-white/90 font-medium mr-auto rounded-tl-none border-l-2 border-l-cyan"
                )}
              >
                <span className="text-[8px] opacity-40 uppercase tracking-widest font-black mb-1">
                  {m.sender === 'user' ? 'YOU' : 'AETHOS_COACH'}
                </span>
                {m.sender === 'user' ? (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                ) : (
                  <ReactMarkdown components={coachMarkdownComponents}>{m.text}</ReactMarkdown>
                )}
                {m.sender === 'coach' && m.pendingActions?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.pendingActions.map((action: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-3 bg-cyan/5 border border-cyan/20 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-[9px] font-mono font-black uppercase text-cyan tracking-widest mb-0.5">
                            {action.name === 'create_task' ? '⚡ CREATE_TASK' : '🔄 CREATE_HABIT'}
                          </p>
                          <p className="text-[11px] font-mono text-white/80">
                            {action.args?.title || action.args?.name || 'Unnamed'}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={async () => {
                              if (action.name === 'create_task') await createTaskFromCoach(action.args);
                              else if (action.name === 'create_habit') await createHabitFromCoach(action.args);
                              // Remove this action from pendingActions after confirm
                              const updated = messages.map(msg =>
                                msg.id === m.id
                                  ? { ...msg, pendingActions: msg.pendingActions.filter((_: any, idx: number) => idx !== i) }
                                  : msg
                              );
                              setMessages(updated);
                              // Also update Firestore
                              try {
                                await updateDoc(doc(db, 'coach_messages', m.id), {
                                  pendingActions: updated.find(msg => msg.id === m.id)?.pendingActions || []
                                });
                              } catch (e) { console.warn('Could not update pendingActions in Firestore', e); }
                              setCompleteToast(action.name === 'create_task' ? 'TASK_CREATED' : 'HABIT_CREATED');
                              setTimeout(() => setCompleteToast(null), 2000);
                            }}
                            className="px-3 py-1.5 bg-cyan/20 hover:bg-cyan/30 border border-cyan/30 text-cyan text-[9px] font-mono font-black uppercase rounded-lg transition-all"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => {
                              const updated = messages.map(msg =>
                                msg.id === m.id
                                  ? { ...msg, pendingActions: msg.pendingActions.filter((_: any, idx: number) => idx !== i) }
                                  : msg
                              );
                              setMessages(updated);
                            }}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 text-[9px] font-mono font-black uppercase rounded-lg transition-all"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              {m.sender === 'coach' && (m.text || '').match(/iCall|Vandrevala|AASRA|988.*Suicide|Crisis Text Line/i) && (
                <div className="mt-3 p-4 bg-red-950/40 border border-red-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-[9px] font-mono font-black text-red-400 uppercase tracking-widest">CRISIS_SUPPORT_RESOURCES</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { label: 'iCall (India)', value: '9152987821' },
                      { label: 'Vandrevala Foundation', value: '1860-2662-345' },
                      { label: 'AASRA (India)', value: '9820466627' },
                      { label: '988 Lifeline (US/CA)', value: '988' },
                    ].map(r => (
                      <a key={r.label} href={`tel:${r.value.replace(/-/g,'')}`}
                        className="flex items-center justify-between px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all">
                        <span className="text-[10px] font-mono text-white/70">{r.label}</span>
                        <span className="text-[11px] font-mono font-black text-red-300">{r.value}</span>
                      </a>
                    ))}
                  </div>
                  <p className="text-[9px] font-mono text-white/30">Tap any number to call. These are confidential services.</p>
                </div>
              )}
              {m.sender === 'coach' && (
                  <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={async () => {
                        try {
                          if (navigator.clipboard && window.isSecureContext) {
                            await navigator.clipboard.writeText(m.text);
                          } else {
                            // Fallback for sandboxed preview environments without Clipboard API access
                            const textarea = document.createElement('textarea');
                            textarea.value = m.text;
                            textarea.style.position = 'fixed';
                            textarea.style.opacity = '0';
                            document.body.appendChild(textarea);
                            textarea.focus();
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                          }
                          setCompleteToast('COPIED_TO_CLIPBOARD');
                          setTimeout(() => setCompleteToast(null), 1500);
                        } catch (err) {
                          console.error('Failed to copy!', err);
                          setCompleteToast('COPY_FAILED — try copying manually');
                          setTimeout(() => setCompleteToast(null), 2500);
                        }
                      }}
                      className="flex items-center gap-1 text-[8px] font-mono uppercase text-white/30 hover:text-cyan transition-colors"
                    >
                      <Copy size={10} /> Copy
                    </button>
                    <button
                      onClick={() => regenerateResponse(m)}
                      disabled={isGenerating}
                      className="flex items-center gap-1 text-[8px] font-mono uppercase text-white/30 hover:text-cyan transition-colors disabled:opacity-30"
                    >
                      <RefreshCw size={10} /> Regenerate
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isGenerating && !streamingText && (
              <div className="flex flex-col items-start">
                <span className="text-[8px] opacity-40 uppercase tracking-widest font-black mb-1">AETHOS_COACH</span>
                <div className="glass rounded-2xl px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            {isGenerating && streamingText && (
              <div className="flex flex-col items-start group">
                <span className="text-[8px] opacity-40 uppercase tracking-widest font-black mb-1">AETHOS_COACH</span>
                <div className="max-w-[85%] glass rounded-2xl px-4 py-3">
                  <ReactMarkdown components={coachMarkdownComponents}>
                    {streamingText}
                  </ReactMarkdown>
                  <span className="inline-block w-1.5 h-3 bg-cyan animate-pulse ml-0.5" />
                </div>
              </div>
            )}
             <div ref={messagesEndRef} />
          </div>
        )}

        {/* INPUT AREA */}
        {!profileLoading && (!coachProfile || messages.length > 0) && (
          <div className="p-6 border-t border-white/5 space-y-4 bg-white/5">
            {coachProfile && (
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'synth', label: "BALANCE_SCAN", prompt: "Analyze my current life sync parameters and streak. Synthesize where my balance scores are healthy and which specific categories are suffering. Keep it actionable." },
                  { id: 'mood', label: 'ANALYZE_MOOD', prompt: "Analyze my recent mood logs and journal entries. Tell me about my emotional trends." },
                  { id: 'focus', label: 'FOCUS_CHECK', prompt: "I'm feeling distracted. Help me do a focus check - look at my current tasks and help me prioritize one." },
                  { id: 'weak', label: 'WEAK_ROUTINES', prompt: `Based on my weakest category which is ${weakestSphere}, help me identify potential bottlenecks in my routines and suggest 3 high-impact habits to introduce today.` },
                  { id: 'obstacles', label: 'TOMORROW', prompt: "Synthesize today's metrics and predict what psychological or scheduling obstacles I might face tomorrow. Give me a strategy to bypass them." }
                ].map(p => (
                  <button
                    key={p.id}
                    disabled={isGenerating}
                    onClick={() => handleSendMessage(p.prompt)}
                    className="px-3 py-1.5 glass hover:bg-cyan/15 hover:border-cyan/30 text-white border border-white/5 text-[9px] font-mono rounded-lg transition-all font-black uppercase tracking-wider"
                  >
                    ➕ {p.label}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!coachProfile) {
                  handleOnboardingInput(onboardingInput);
                  setOnboardingInput('');
                } else {
                  handleSendMessage(inputText);
                }
              }}
              className="flex gap-2"
            >
              <input
                value={!coachProfile ? onboardingInput : inputText}
                onChange={(e) => !coachProfile ? setOnboardingInput(e.target.value) : setInputText(e.target.value)}
                placeholder={!coachProfile ? "Type your message..." : `Message ${coachProfile?.coachName || 'Ace'}...`}
                disabled={isGenerating}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-text-s/30 font-mono outline-none focus:border-cyan/50 transition-all disabled:opacity-50"
              />
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <button
                type="button"
                onClick={startListening}
                className={cn("p-3 rounded-xl border transition-all", isListening ? "bg-red-500/20 border-red-500/50 text-red-500" : "bg-black/40 border-white/10 text-white/50 hover:text-white")}
              >
                <Mic size={16} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-black/40 border border-white/10 rounded-xl text-white/50 hover:text-white transition-all"
              >
                <Image size={16} />
              </button>
              <button
                type="button"
                onClick={() => !coachProfile ? setOnboardingInput('') : setInputText('')}
                className="p-3 bg-black/40 border border-white/10 rounded-xl text-white/50 hover:text-red-400 hover:border-red-400/30 transition-all"
              >
                <Trash2 size={16} />
              </button>
              {isGenerating ? (
                <button
                  type="button"
                  onClick={() => { abortControllerRef.current?.abort(); setIsGenerating(false); setStreamingText(''); }}
                  className="px-6 bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-xs font-black uppercase rounded-xl transition-all"
                >
                  STOP
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!coachProfile ? !onboardingInput.trim() : !inputText.trim()}
                  className="px-6 bg-cyan hover:bg-cyan-hover text-black font-mono text-xs font-black uppercase rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  {!coachProfile ? 'REPLY' : 'SEND'}
                </button>
              )}
            </form>
            {permissionError && (
              <div className="text-red-500 text-xs font-mono mt-2 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                {permissionError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  async function handleOnboardingInput(input: string) {
    if (!input.trim()) return;
    const currentQ = ONBOARDING_QUESTIONS[onboardingStep];
    
    // Save answer
    const newData = { ...onboardingData, [currentQ.key]: input.trim() };
    setOnboardingData(newData);
    
    // Add user message to onboarding chat
    setOnboardingMessages(prev => [...prev,
      { sender: 'user', text: input.trim() }
    ]);
    setOnboardingInput('');

    // Move to next step or finish
    if (onboardingStep < ONBOARDING_QUESTIONS.length - 1) {
      const nextQ = ONBOARDING_QUESTIONS[onboardingStep + 1];
      const nextText = typeof nextQ.question === 'function' 
        ? nextQ.question(newData) 
        : nextQ.question;
      
      setTimeout(() => {
        setOnboardingMessages(prev => [...prev,
          { sender: 'coach', text: nextText }
        ]);
        setOnboardingStep(prev => prev + 1);
      }, 600);
    } else {
      if (onboardingSaving) return;
      setOnboardingSaving(true);

      const profileData = {
        userId: user.uid,
        userName: newData.userName,
        coachName: newData.coachName,
        goal: newData.goal,
        tone: newData.tone,
        weakness: newData.weakness,
        thirtyDayFix: newData.thirtyDayFix,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'coach_profiles', user.uid), profileData);
        setOnboardingMessages(prev => [...prev,
          { sender: 'coach', text: `Profile locked in. I'm ${newData.coachName}. Let's get to work, ${newData.userName}.\n\nI know your goal. I know your weakness. I'll be watching your data every session.\n\nWhat do you want to talk about first?` }
        ]);
        setCoachProfile(profileData);
      } catch (err: any) {
        console.error('Failed to save coach profile:', err);
        setOnboardingMessages(prev => [...prev,
          { sender: 'coach', text: `CALIBRATION_ERROR: Couldn't save your profile (${err?.message || 'unknown error'}). Try answering the last question again.` }
        ]);
        setOnboardingSaving(false);
      }
    }
  };

  function buildCoachContext(settings: AppSettings | null) {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Full lifeSync.current balance object
    const lifeSyncCurrent = stats?.lifeSync?.current || {};

    // 2. Top 8 pending tasks sorted by priority (critical, high, medium, low)
    const priorityWeights: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };
    const pendingTasks = (tasks || [])
      .filter((t: any) => t.status === 'pending')
      .sort((a, b) => {
        const weightA = priorityWeights[a.priority?.toLowerCase()] || 0;
        const weightB = priorityWeights[b.priority?.toLowerCase()] || 0;
        return weightB - weightA;
      })
      .slice(0, 8)
      .map((t: any) => ({
        title: t.title,
        category: t.category,
        priority: t.priority,
        estimate: t.estimate
      }));

    // 3. How many tasks completed today
    const completedTodayCount = (tasks || []).filter(
      (t: any) => t.status === 'completed' && t.completedAt?.startsWith(todayStr)
    ).length;

    // 4. Up to 8 active (non-archived) habits with name/category/streak/targetStreak/doneToday
    const activeHabitsList = (habits || [])
      .filter((h: any) => !h.isArchived)
      .slice(0, 8)
      .map((h: any) => {
        const doneToday = (habitLogs || []).some(
          (l: any) => l.habitId === h.id && l.date === todayStr && l.completed
        );

        return {
          name: h.name,
          category: h.category,
          streak: h.currentStreak || 0,
          targetStreak: h.targetStreak,
          doneToday
        };
      });

    // 5. Last 4 journal entries, now with actual content excerpts
    const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const sortedJournals = [...(journals || [])]
      .filter((j: any) => j.createdAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4)
      .map((j: any) => {
        const daysAgo = Math.max(0, Math.floor((new Date().getTime() - new Date(j.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
        const plainText = stripHtml(j.content);
        const item: any = {
          mood: j.mood,
          energyLevel: j.energyLevel,
          daysAgo,
          excerpt: plainText.length > 280 ? plainText.slice(0, 280) + '...' : plainText
        };
        if (j.tags && j.tags.length > 0) item.tags = j.tags;
        if (j.cognitiveSignature) {
          if (j.cognitiveSignature.keyTheme) item.keyTheme = j.cognitiveSignature.keyTheme;
          if (j.cognitiveSignature.alignmentScore !== undefined) item.alignmentScore = j.cognitiveSignature.alignmentScore;
        }
        return item;
      });

    // Low state detection — triggers Self-Compassion Protocol in Ace
    const recentMoods = sortedJournals.slice(0, 2).map((j: any) => j.mood);
    const isLowMood = recentMoods.some((m: string) => ['sad', 'anxious', 'angry', 'stressed'].includes(m));
    const isLowStreak = (stats?.currentStreak || 0) < 3;
    const todayStr2 = new Date().toISOString().split('T')[0];
    const thisWeekTasks = (tasks || []).filter((t: any) => {
      if (!t.completedAt) return false;
      const taskDate = new Date(t.completedAt);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return taskDate >= weekAgo;
    });
    const thisWeekPending = (tasks || []).filter((t: any) => {
      const taskDate = new Date(t.createdAt || '');
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return taskDate >= weekAgo && t.status !== 'completed';
    });
    const weeklyCompletionRate = (thisWeekTasks.length + thisWeekPending.length) > 0
      ? thisWeekTasks.length / (thisWeekTasks.length + thisWeekPending.length)
      : 1;
    const lowStateDetected = (isLowMood && isLowStreak) || weeklyCompletionRate < 0.15;

    return {
      lifeSyncCurrent,
      pendingTasks,
      completedTodayCount,
      activeHabits: activeHabitsList,
      recentJournals: sortedJournals,
      recentGratitude: (() => {
        try {
          return JSON.parse(localStorage.getItem(`gratitude_cache_${user?.uid}`) || '[]');
        } catch { return []; }
      })(),
      coreValues: settings?.coreValues?.length ? settings.coreValues : null,
      evidenceVault: (() => {
        try {
          return JSON.parse(localStorage.getItem(`wins_cache_${user?.uid}`) || '[]');
        } catch { return []; }
      })(),
      lowStateDetected,
      woop: {
        active: woopPlans.filter(w => w.status === "active").slice(0, 3).map(w => ({
          wish: w.wish,
          outcome: w.outcome,
          obstacle: w.obstacle,
          plan: w.plan,
          obstacleType: w.obstacleType
        })),
        recentCompleted: woopPlans.filter(w => w.status === "completed").slice(0, 3).map(w => ({
          wish: w.wish,
          outcome: w.outcome
        }))
      }
    };
  };

  async function createTaskFromCoach(args: any) {
    if (!user) return;
    await addDoc(collection(db, 'tasks'), {
      userId: user.uid,
      title: args.title,
      priority: args.priority || 'medium',
      status: 'pending',
      category: args.category || 'personal',
      estimate: args.estimate || 30,
      isChallenging: false,
      isBoss: false,
      isSpeedRun: false,
      difficulty: 'medium',
      createdAt: new Date().toISOString(),
      expiresAt: chronos.getCycleEnd().toISOString(),
      isExpired: false
    });
  };

  async function createHabitFromCoach(args: any) {
    if (!user) return;
    await addDoc(collection(db, 'habits'), {
      userId: user.uid,
      name: args.name,
      category: args.category || 'personal',
      frequency: args.frequency || 'daily',
      targetStreak: args.targetStreak || 30,
      color: '#22d3ee',
      createdAt: new Date().toISOString(),
      isArchived: false,
      temptationBundle: args.temptationBundle,
      rewardBundle: args.rewardBundle
    });
  };

  async function handleSendMessage(textToSend: string) {
    if (!textToSend.trim() || isGenerating || !user) return;

    if (messages.length >= 150) {
      setCompleteToast('CHAT_MAX_LIMIT_REACHED');
      setTimeout(() => setCompleteToast(null), 3000);
      return;
    }

    setInputText('');
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      let currentChatId = activeChatId;
      let isFirstMessageInChat = false;
      if (!currentChatId) {
        isFirstMessageInChat = true;
        const newChatRef = await addDoc(collection(db, 'coach_chats'), {
          userId: user.uid,
          title: 'New Chat',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        currentChatId = newChatRef.id;
        setActiveChatId(currentChatId);
      }
      // 1. Add user message
      const userMsgData = removeUndefinedFields({
        userId: user.uid,
        chatId: currentChatId,
        sender: 'user',
        text: textToSend,
        createdAt: new Date().toISOString()
      });
      
      // Build history from current messages FIRST (before fetch)
      const historySnapshot = [...messages];

      // Then save user message
      await addDoc(collection(db, 'coach_messages'), userMsgData);
      
      // Build history from snapshot + new message
      const history = historySnapshot.slice(-20).map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text || '' }]
      }));
      history.push({
        role: 'user',
        parts: [{ text: textToSend }]
      });

      const result = await generateCoachResponseStream(
        history,
        stats,
        weakestSphere,
        buildCoachContext(null),
        coachProfile,
        memorySummary,
        (partialText) => setStreamingText(partialText),
        abortControllerRef.current?.signal
      );

      setStreamingText('');
      abortControllerRef.current = null;

      // 2. Add coach reply
      const motivationTrigger = (result?.toolCalls || []).find((tc: any) => tc.name === 'trigger_motivation_boost');
      const confirmableActions = (result?.toolCalls || []).filter((tc: any) => tc.name !== 'trigger_motivation_boost');

      if (motivationTrigger) {
        if (motivationItems.length > 0) {
          const randomItem = motivationItems[Math.floor(Math.random() * motivationItems.length)];
          setPendingMotivation(randomItem);
        } else {
          setIsMotivationPortalOpen(true);
        }
      }

      const coachMsgData = removeUndefinedFields({
        userId: user.uid,
        chatId: currentChatId,
        sender: 'coach',
        text: result.text,
        pendingActions: confirmableActions.length > 0 ? confirmableActions : undefined,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'coach_messages'), coachMsgData);

      // Update long-term memory every 6 messages, in the background, non-blocking
      if ((messages.length + 2) % 6 === 0) {
        const recentForMemory = [...messages.slice(-6), { sender: 'user', text: textToSend }, { sender: 'coach', text: coachMsgData.text }];
        fetch("/api/gemini/update-memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ existingSummary: memorySummary, recentMessages: recentForMemory })
        })
          .then(r => r.json())
          .then(async (data) => {
            if (data?.summary) {
              setMemorySummary(data.summary);
              try {
                await setDoc(doc(db, 'coach_memory', user.uid), { userId: user.uid, summary: data.summary, updatedAt: new Date().toISOString() });
              } catch (e) {
                handleFirestoreError(e, OperationType.UPDATE, `coach_memory/${user.uid}`);
              }
            }
          })
          .catch(err => console.warn('[Memory] background update failed:', err));
      }
      
      // Update chat timestamp immediately (fast, don't block on title generation)
      const chatRef = doc(db, 'coach_chats', currentChatId);
      await updateDoc(chatRef, { updatedAt: new Date().toISOString() });

      // Generate a real AI title in the background on the first exchange only
      if (isFirstMessageInChat) {
        try {
          const titleRes = await fetch("/api/gemini/generate-chat-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userText: textToSend, coachText: result.text })
          });
          const titleData = await titleRes.json();
          const finalTitle = titleData?.title?.trim() || textToSend.slice(0, 40);
          await updateDoc(chatRef, { title: finalTitle });
        } catch (titleErr) {
          console.error('[Chat Title] generation failed completely:', titleErr);
          // Guaranteed fallback so it never stays stuck on "New Chat"
          try {
            await updateDoc(chatRef, { title: textToSend.slice(0, 40) });
          } catch (fallbackErr) {
            handleFirestoreError(fallbackErr, OperationType.UPDATE, `coach_chats/${currentChatId}`);
          }
        }
      }

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setStreamingText('');
        setIsGenerating(false);
        return;
      }
      
      const errMsg = err?.message || String(err);
      console.error('[Coach Response Error]', errMsg);
      
      // Update UI
      setCompleteToast(`ERROR: ${errMsg.slice(0, 50)}`);
      setTimeout(() => setCompleteToast(null), 3000);
      setIsGenerating(false);
      
      // Save error message to chat
      try {
        const errorMsgData = removeUndefinedFields({
          userId: user.uid,
          chatId: activeChatId,
          sender: 'coach',
          text: `AETHOS Error: ${errMsg}`,
          createdAt: new Date().toISOString()
        });
        await addDoc(collection(db, 'coach_messages'), errorMsgData);
      } catch (innerErr) {
        console.error('Failed to save error message to chat', innerErr);
      }
    } finally {
      setIsGenerating(false);
    }
  };
 
   async function handleClearConversation() {
     if (!user) return;
     const confirmClear = window.confirm("Are you sure you want to completely erase your neural log with AETHOS Coach? This cannot be undone.");
     if (!confirmClear) return;
 
     try {
       const q = query(
         collection(db, 'coach_messages'),
         where('userId', '==', user.uid)
       );
       const snapshot = await getDocs(q);
       if (snapshot.empty) return;
 
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        setMessages([]);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, 'coach_messages');
      }
    };
}

function GrowView({
  stats,
  user,
  onAddXP,
  tasks,
  journals,
  addToTerminal,
  timeBlocks,
  weeklyReviews,
  openShare,
  setSharingAchievement,
  handlePurchasePerk,
  lifeSyncCategories,
  notepadLines,
  saveNotepadLines,
  convertNotepadLineToTask
}: any) {
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [reviewForm, setReviewForm] = React.useState({
    wentWell: '', didntGo: '', avoided: '', valueAlignment: '', nextWeekFocus: ''
  });
  const [reviewSubmitting, setReviewSubmitting] = React.useState(false);
  const [wins, setWins] = React.useState<any[]>([]);
  const [showWinForm, setShowWinForm] = React.useState(false);
  const [winForm, setWinForm] = React.useState({ title: '', description: '', category: 'RESILIENCE' });
  const [winSubmitting, setWinSubmitting] = React.useState(false);

  // Load wins from Firestore
  React.useEffect(() => {
    if (!user) return;
    getDocs(query(
      collection(db, 'wins_log'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    )).then(snap => {
      setWins(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }).catch(() => {});
  }, [user]);

  const submitWin = async () => {
    if (!winForm.title.trim()) return;
    setWinSubmitting(true);
    try {
      const newWin = {
        userId: user.uid,
        title: winForm.title.trim(),
        description: winForm.description.trim(),
        category: winForm.category,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
      const ref = await addDoc(collection(db, 'wins_log'), newWin);
      setWins(prev => [{ ...newWin, id: ref.id }, ...prev]);
      const updatedWins = [{ ...newWin, id: ref.id }, ...wins].slice(0, 5);
      localStorage.setItem(`wins_cache_${user.uid}`, JSON.stringify(updatedWins.map(w => ({ title: w.title, category: w.category, date: w.date }))));
      await onAddXP(20, 'EVIDENCE_VAULT_ENTRY');
      setWinForm({ title: '', description: '', category: 'RESILIENCE' });
      setShowWinForm(false);
    } catch (e) {
      console.error('Win log error:', e);
    } finally {
      setWinSubmitting(false);
    }
  };

  const thisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-\'W\'II');
  const alreadyReviewedThisWeek = (weeklyReviews || []).some((r: any) => r.week === thisWeek);

  const submitWeeklyReview = async () => {
    if (!reviewForm.wentWell.trim() || !reviewForm.nextWeekFocus.trim()) return;
    setReviewSubmitting(true);
    try {
      await addDoc(collection(db, 'weekly_reviews'), {
        userId: user.uid,
        wentWell: reviewForm.wentWell.trim(),
        didntGo: reviewForm.didntGo.trim(),
        avoided: reviewForm.avoided.trim(),
        valueAlignment: reviewForm.valueAlignment.trim(),
        nextWeekFocus: reviewForm.nextWeekFocus.trim(),
        week: thisWeek,
        createdAt: new Date().toISOString()
      });
      await onAddXP(50, 'WEEKLY_REVIEW_PROTOCOL_COMPLETE');
      setReviewForm({ wentWell: '', didntGo: '', avoided: '', valueAlignment: '', nextWeekFocus: '' });
      setShowReviewModal(false);
    } catch (e) {
      console.error('Weekly review error:', e);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Weekly Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowReviewModal(false)}>
          <div className="glass border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-mono text-accent uppercase tracking-[0.4em] font-black">WEEKLY_REVIEW_PROTOCOL</p>
                <h3 className="text-2xl font-serif font-black text-white italic uppercase">Week {thisWeek.split('-W')[1]}</h3>
                <p className="text-[9px] font-mono text-text-s opacity-40 mt-1">+50 XP on completion</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-text-s hover:text-white">✕</button>
            </div>

            <div className="space-y-5">
              {[
                { key: 'wentWell', label: '01 — What went well this week?', color: 'border-success/30 focus:border-success/60', tag: 'text-success' },
                { key: 'didntGo', label: '02 — What drained me?', color: 'border-danger/30 focus:border-danger/60', tag: 'text-danger' },
                { key: 'avoided', label: '03 — What did I avoid and why?', color: 'border-warning/30 focus:border-warning/60', tag: 'text-warning' },
                { key: 'valueAlignment', label: '04 — Am I living in line with my values?', color: 'border-purple-500/30 focus:border-purple-500/60', tag: 'text-purple-400' },
                { key: 'nextWeekFocus', label: '05 — The one thing next week must have.', color: 'border-cyan/30 focus:border-cyan/60', tag: 'text-cyan' },
              ].map(({ key, label, color, tag }) => (
                <div key={key} className="space-y-1.5">
                  <label className={`text-[10px] font-mono font-black uppercase ml-1 ${tag}`}>{label}</label>
                  <textarea
                    rows={2}
                    value={(reviewForm as any)[key]}
                    onChange={e => setReviewForm({ ...reviewForm, [key]: e.target.value })}
                    placeholder="Type here..."
                    className={`w-full px-5 py-3 bg-white/5 border ${color} rounded-xl text-white font-mono text-xs outline-none placeholder-white/20 transition-all resize-none`}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-2">
              <button onClick={() => setShowReviewModal(false)} className="flex-1 py-3 glass border border-white/10 text-white font-mono font-black uppercase text-xs rounded-xl hover:bg-white/5 transition-all">
                CANCEL
              </button>
              <button
                disabled={reviewSubmitting || !reviewForm.wentWell.trim() || !reviewForm.nextWeekFocus.trim()}
                onClick={submitWeeklyReview}
                className="flex-1 py-3 bg-accent text-white font-mono font-black uppercase text-xs rounded-xl accent-glow disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {reviewSubmitting ? 'SYNCING...' : 'SYNC_REVIEW +50 XP'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* TOP: Full-width Wheel of Life */}
      <LifeSyncView
        stats={stats}
        user={user}
        onAddXP={onAddXP}
        tasks={tasks}
        journals={journals}
        addToTerminal={addToTerminal}
        openShare={openShare}
        lifeSyncCategories={lifeSyncCategories}
      />

      {/* WEEKLY REVIEW PROTOCOL */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
            <div>
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">WEEKLY_REVIEW_PROTOCOL</h3>
              <p className="text-[9px] font-mono text-text-s opacity-40 uppercase">5 questions · takes 5 minutes · +50 XP</p>
            </div>
          </div>
          <button
            onClick={() => setShowReviewModal(true)}
            disabled={alreadyReviewedThisWeek}
            className="px-5 py-2.5 bg-accent text-white font-mono font-black uppercase text-[10px] rounded-xl accent-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          >
            {alreadyReviewedThisWeek ? 'REVIEWED_THIS_WEEK ✓' : 'START_REVIEW'}
          </button>
        </div>

        {(weeklyReviews || []).length > 0 && (
          <div className="space-y-3">
            <p className="text-[9px] font-mono text-text-s opacity-40 uppercase tracking-widest">PAST_REVIEWS</p>
            {[...(weeklyReviews || [])].sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((review: any) => (
              <WeeklyReviewItem key={review.id} review={review} />
            ))}
          </div>
        )}

        {(weeklyReviews || []).length === 0 && (
          <div className="glass rounded-2xl border border-white/5 p-8 text-center space-y-2">
            <p className="text-2xl">📋</p>
            <p className="text-xs font-mono font-black text-text-m uppercase tracking-widest">NO_REVIEWS_YET</p>
            <p className="text-[10px] font-mono text-text-s opacity-40">Start your first weekly review above. Takes 5 minutes, compounds for life.</p>
          </div>
        )}
      </section>

      {/* EVIDENCE VAULT */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <span className="text-lg">🏆</span>
            </div>
            <div>
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">EVIDENCE_VAULT</h3>
              <p className="text-[9px] font-mono text-text-s opacity-40 uppercase">Proof you can execute. Ace reads this when you're in a low state.</p>
            </div>
          </div>
          <button
            onClick={() => setShowWinForm(!showWinForm)}
            className="px-5 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 font-mono font-black uppercase text-[10px] rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            + LOG_WIN
          </button>
        </div>

        {showWinForm && (
          <div className="glass border border-yellow-500/20 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-[9px] font-mono text-yellow-400 uppercase tracking-widest font-black">NEW_EVIDENCE_ENTRY · +20 XP</p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1">What did you do or prove?</label>
              <input
                type="text"
                value={winForm.title}
                onChange={e => setWinForm({ ...winForm, title: e.target.value })}
                placeholder="e.g. Showed up to gym despite being exhausted"
                className="w-full px-5 py-3 bg-white/5 border border-yellow-500/20 focus:border-yellow-500/50 rounded-xl text-white font-mono text-sm outline-none placeholder-white/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1">Category</label>
                <select
                  value={winForm.category}
                  onChange={e => setWinForm({ ...winForm, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-yellow-500/20 rounded-xl text-white font-mono text-xs outline-none"
                >
                  {['RESILIENCE', 'DISCIPLINE', 'SKILL', 'SOCIAL', 'BREAKTHROUGH', 'CONSISTENCY'].map(c => (
                    <option key={c} value={c} className="bg-[#0a0a0a]">{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-text-m uppercase ml-1">Context (optional)</label>
                <input
                  type="text"
                  value={winForm.description}
                  onChange={e => setWinForm({ ...winForm, description: e.target.value })}
                  placeholder="Any extra detail..."
                  className="w-full px-4 py-3 bg-white/5 border border-yellow-500/20 focus:border-yellow-500/50 rounded-xl text-white font-mono text-xs outline-none placeholder-white/20 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWinForm(false)}
                className="flex-1 py-3 glass border border-white/10 text-text-m font-mono font-black uppercase text-xs rounded-xl hover:bg-white/5 transition-all"
              >
                CANCEL
              </button>
              <button
                disabled={winSubmitting || !winForm.title.trim()}
                onClick={submitWin}
                className="flex-1 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 font-mono font-black uppercase text-xs rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {winSubmitting ? 'LOGGING...' : 'LOG_WIN +20 XP'}
              </button>
            </div>
          </div>
        )}

        {wins.length > 0 ? (
          <div className="space-y-3">
            {wins.slice(0, 8).map((win: any) => {
              const categoryColors: Record<string, string> = {
                RESILIENCE: 'text-orange-400 border-orange-400/20 bg-orange-400/5',
                DISCIPLINE: 'text-cyan border-cyan/20 bg-cyan/5',
                SKILL: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
                SOCIAL: 'text-green-400 border-green-400/20 bg-green-400/5',
                BREAKTHROUGH: 'text-purple-400 border-purple-400/20 bg-purple-400/5',
                CONSISTENCY: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5',
              };
              const colorClass = categoryColors[win.category] || 'text-text-m border-white/10 bg-white/5';
              return (
                <div key={win.id} className="glass rounded-2xl border border-white/5 p-4 flex items-start gap-4">
                  <div className={`px-2 py-1 rounded-lg border text-[8px] font-mono font-black uppercase shrink-0 ${colorClass}`}>
                    {win.category}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-black text-white uppercase tracking-wide">{win.title}</p>
                    {win.description && <p className="text-[10px] font-mono text-text-s opacity-50 mt-0.5 truncate">{win.description}</p>}
                    <p className="text-[9px] font-mono text-text-s opacity-30 mt-1">{new Date(win.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <span className="text-xl shrink-0">🏆</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-2xl border border-white/5 p-8 text-center space-y-2">
            <p className="text-2xl">🏆</p>
            <p className="text-xs font-mono font-black text-text-m uppercase tracking-widest">VAULT_EMPTY</p>
            <p className="text-[10px] font-mono text-text-s opacity-40">Log your first win. Every time you push through, it's proof you can do it again.</p>
          </div>
        )}
      </section>

      {/* BOTTOM: Stats + Achievements */}
      <StatsView
        stats={stats}
        user={user}
        tasks={tasks}
        journals={journals}
        timeBlocks={timeBlocks}
        weeklyReviews={weeklyReviews || []}
        openShare={openShare}
        setSharingAchievement={setSharingAchievement}
      />

      {/* NOTEPAD */}
      <NotepadView
        lines={notepadLines}
        onUpdateLines={saveNotepadLines}
        onConvertToTask={convertNotepadLineToTask}
      />

    </div>
  );
}
