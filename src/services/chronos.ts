import { doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addDays, differenceInMilliseconds, isBefore } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export interface ClockSettings {
  lastResetAt: Timestamp;
  timezone: string; // e.g., "America/Los_Angeles"
}

class ChronosCore {
  private settings: ClockSettings | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    const docRef = doc(db, 'system_settings', 'global_clock');
    
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      this.settings = snap.data() as ClockSettings;
      this.notifyListeners();
    }

    onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        this.settings = snap.data() as ClockSettings;
        this.notifyListeners();
      }
    });
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  private getTZ(): string {
    return this.settings?.timezone || 'UTC';
  }

  private getBaseDate(): Date {
    if (!this.settings) return new Date();
    return this.settings.lastResetAt.toDate();
  }

  public getCycleStart(): Date {
    const base = this.getBaseDate();
    const now = new Date();
    
    // Calculate how many 24h periods have passed since base
    const diffMs = differenceInMilliseconds(now, base);
    const periods = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    
    // The start of the current cycle
    const startOfCurrentCycle = addDays(base, periods);
    
    return startOfCurrentCycle;
  }

  public getCycleEnd(): Date {
    return addDays(this.getCycleStart(), 1);
  }

  public getCurrentCycle(): { start: Date; end: Date } {
    return { start: this.getCycleStart(), end: this.getCycleEnd() };
  }

  public getRemainingMs(): number {
    return Math.max(0, differenceInMilliseconds(this.getCycleEnd(), new Date()));
  }

  public getCycleId(): string {
    return formatInTimeZone(this.getCycleStart(), this.getTZ(), 'yyyy-MM-dd-HH:mm');
  }

  public isExpired(timestamp: Timestamp | Date): boolean {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return isBefore(date, this.getCycleStart());
  }

  public isCurrentCycle(date: Date): boolean {
    return !isBefore(date, this.getCycleStart()) && isBefore(date, this.getCycleEnd());
  }

  public getNextCycleStart(): Date {
    return addDays(this.getCycleStart(), 1);
  }

  public getLocalDateKey(date: Date = new Date()): string {
    return formatInTimeZone(date, this.getTZ(), 'yyyy-MM-dd');
  }
}

export const chronos = new ChronosCore();
