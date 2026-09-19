import React, { useState } from 'react';
import { WOOPPlan } from '../types';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface WOOPViewProps {
  woopPlans: WOOPPlan[];
  user: any;
}

export const WOOPView: React.FC<WOOPViewProps> = ({ woopPlans, user }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingWOOP, setEditingWOOP] = useState<WOOPPlan | null>(null);
  const [form, setForm] = useState({ wish: '', outcome: '', obstacle: '', plan: '', obstacleType: 'internal' as any });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeWOOP = woopPlans.find(w => w.status === 'active');

  const openEdit = (woop: WOOPPlan) => {
    setEditingWOOP(woop);
    setForm({ wish: woop.wish, outcome: woop.outcome, obstacle: woop.obstacle, plan: woop.plan, obstacleType: woop.obstacleType || 'internal' });
    setShowForm(true);
  };

  const saveWOOP = async () => {
    if (!form.wish || !form.outcome || !form.obstacle || !form.plan) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editingWOOP) {
        await updateDoc(doc(db, 'users', user.uid, 'woop', editingWOOP.id), {
          ...form,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'woop'), {
          ...form,
          userId: user.uid,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setForm({ wish: '', outcome: '', obstacle: '', plan: '', obstacleType: 'internal' });
      setShowForm(false);
      setEditingWOOP(null);
    } catch (e) {
      setError('Failed to save WOOP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: 'completed' | 'archived') => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'woop', id), {
        status,
        updatedAt: serverTimestamp(),
        ...(status === 'completed' ? { completedAt: serverTimestamp() } : {}),
      });
    } catch (e) {
      setError('Failed to update status.');
    }
  };

  return (
    <section className="glass rounded-2xl p-6 space-y-6 border border-white/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">WOOP_FRAMEWORK</h3>
        <button onClick={() => { setShowForm(!showForm); setEditingWOOP(null); }} className="text-xs font-mono text-cyan uppercase">
          {showForm ? 'CANCEL' : activeWOOP ? 'EDIT_WOOP' : '+_NEW_WOOP'}
        </button>
      </div>

      {showForm ? (
        <div className="space-y-3">
          <input placeholder="Wish..." value={form.wish} onChange={e => setForm({...form, wish: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm font-mono" />
          <input placeholder="Outcome..." value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm font-mono" />
          <input placeholder="Obstacle..." value={form.obstacle} onChange={e => setForm({...form, obstacle: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm font-mono" />
          <input placeholder="Plan (If... Then...)..." value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm font-mono" />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button onClick={saveWOOP} disabled={submitting} className="w-full bg-cyan/10 border border-cyan/20 p-3 rounded-xl text-cyan font-black uppercase text-xs tracking-widest hover:bg-cyan/20 transition-all">
            {submitting ? 'SAVING...' : 'SAVE_WOOP'}
          </button>
        </div>
      ) : activeWOOP ? (
        <div className="space-y-4 text-sm font-mono">
          <div><p className="text-text-s text-[10px] uppercase">Wish</p><p className="text-white">{activeWOOP.wish}</p></div>
          <div><p className="text-text-s text-[10px] uppercase">Outcome</p><p className="text-white">{activeWOOP.outcome}</p></div>
          <div><p className="text-text-s text-[10px] uppercase">Obstacle</p><p className="text-white">{activeWOOP.obstacle}</p></div>
          <div><p className="text-text-s text-[10px] uppercase">Plan</p><p className="text-white">{activeWOOP.plan}</p></div>
          <div className="flex gap-2">
            <button onClick={() => openEdit(activeWOOP)} className="text-xs text-cyan">EDIT</button>
            <button onClick={() => updateStatus(activeWOOP.id, 'completed')} className="text-xs text-green-500">COMPLETE</button>
            <button onClick={() => updateStatus(activeWOOP.id, 'archived')} className="text-xs text-red-500">ARCHIVE</button>
          </div>
        </div>
      ) : (
        <p className="text-text-s text-xs font-mono italic">No active WOOP. Define your focus.</p>
      )}
    </section>
  );
};
