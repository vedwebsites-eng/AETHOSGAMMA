import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Sparkles, User, Lock, Mail, ArrowRight } from 'lucide-react';
import { registerWithEmail, signInWithGoogle, db, auth, loginWithEmail } from '../lib/firebase';
import { suggestPassword } from '../services/geminiService';
import { doc, getDoc } from 'firebase/firestore';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SignUpModal({ isOpen, onClose, onSuccess }: SignUpModalProps) {
  const [isSignIn, setIsSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGeneratePassword = async () => {
    setIsLoading(true);
    setError('');
    try {
      const suggested = await suggestPassword();
      setPassword(suggested);
    } catch (err) {
      setError('Failed to generate password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (isSignIn) {
        // Sign In Logic
        const userCredential = await loginWithEmail(email, password);
        
        // Small delay for Auth token propagation
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify user exists in database
        const userStatsRef = doc(db, 'user_stats', userCredential.user.uid);
        const userStatsSnap = await getDoc(userStatsRef);
        
        if (!userStatsSnap.exists()) {
            setError('Account not fully initialized - Please contact support.');
            return;
        }
      } else {
        // Sign Up Logic
        await registerWithEmail(email, password);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError('');
    try {
        const user = await signInWithGoogle();
        
        // Check if user exists in database
        const userStatsRef = doc(db, 'user_stats', user.uid);
        const userStatsSnap = await getDoc(userStatsRef);
        
        if (!isSignIn && userStatsSnap.exists()) {
            setError('Already existing account - Please sign in.');
            return;
        }

        if (isSignIn && !userStatsSnap.exists()) {
            setError('Gmail does not exist in our database.');
            return;
        }

        onSuccess();
        onClose();
    } catch (err: any) {
        setError(err.message || 'Failed to sign in with Google.');
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="glass w-full max-w-sm rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col relative z-20 shadow-2xl bg-background"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
              <h2 className="text-xl font-serif font-black text-white italic uppercase tracking-tighter">
                {isSignIn ? 'SIGN_IN' : 'NEW_ACCOUNT_SETUP'}
              </h2>
              <button 
                onClick={() => setIsSignIn(!isSignIn)} 
                className="text-[10px] font-mono font-black text-accent uppercase hover:underline"
              >
                {isSignIn ? 'CREATE_ACCOUNT' : 'SIGN_IN'}
              </button>
            </div>

            <div className="p-8 space-y-6">
                <button
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="w-full py-3 bg-white text-black font-mono font-black text-sm rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <User size={16} /> {isSignIn ? 'SIGN_IN WITH GOOGLE' : 'CONTINUE WITH GOOGLE'}
                </button>
                <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative bg-background px-2 text-text-m text-[10px] font-mono">OR</div>
                </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-text-m uppercase">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-m" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-4 pl-10 rounded-xl text-sm font-mono text-white outline-none focus:border-accent/40"
                    placeholder="OPERATOR@NEURAL.NET"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono font-black text-text-m uppercase">Password</label>
                    <button onClick={handleGeneratePassword} className="text-[10px] font-mono font-black text-accent uppercase flex items-center gap-1 hover:underline">
                        <Sparkles size={10} /> SUGGEST
                    </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-m" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-4 pl-10 pr-10 rounded-xl text-sm font-mono text-white outline-none focus:border-accent/40"
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-m hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
            </div>

            <div className="p-8 bg-white/2 border-t border-white/5">
              <button
                onClick={handleAuth}
                disabled={isLoading || !email || !password}
                className="w-full py-4 bg-accent text-white font-mono font-black text-sm rounded-xl hover:shadow-[0_0_20px_rgba(255,51,102,0.3)] transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? 'INITIALIZING...' : (isSignIn ? 'SIGN_IN' : 'CREATE_ACCOUNT')} <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
