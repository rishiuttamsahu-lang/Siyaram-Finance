'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, LogOut, X, Loader2, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isAdmin: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  isAdmin,
  onSignIn,
  onSignOut,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await onSignIn();
      onClose();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled.');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        setError('Another sign-in popup is already open.');
      } else {
        setError(err?.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await onSignOut();
      onClose();
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setError('Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 relative space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition active:scale-95"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-xs">
            {isAdmin ? <ShieldCheck size={26} /> : <UserIcon size={24} />}
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {user ? 'Google Account' : 'Admin Authentication'}
          </h3>
          <p className="text-xs text-slate-500">
            {user ? 'Siyaram Mandal Financial Portal' : 'Sign in to access admin privileges & cloud controls'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content depending on login state */}
        {user ? (
          <div className="space-y-4">
            {/* User Profile Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Admin'}
                    className="w-10 h-10 rounded-full border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                    {(user.displayName || user.email || 'A')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {user.displayName || 'Google User'}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {user.email}
                  </span>
                </div>
              </div>

              {/* Role Pill */}
              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">Access Level:</span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck size={11} />
                    Verified Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    Standard Viewer
                  </span>
                )}
              </div>
            </div>

            {isAdmin ? (
              <p className="text-[11px] text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100/80 leading-relaxed">
                ✓ Admin panel unlocked in bottom navigation dock. You have full access to edit ledger, dues, wings, and cloud data.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                This Google account is signed in as a viewer. Admin controls are restricted to authorized administrators (<span className="font-semibold text-slate-700">rishiuttamsahu@gmail.com</span>).
              </p>
            )}

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 border border-rose-200/80 active:scale-95 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Google Sign In CTA */}
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2.5 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.54 0 2.93.57 4.02 1.51l3.01-3.01C17.21 1.76 14.77 1 12 1 7.42 1 3.55 3.63 1.66 7.46l3.66 2.84C6.2 7.47 8.86 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.28c0-.79-.07-1.54-.19-2.28H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.69 2.86c2.16-1.99 3.42-4.92 3.42-8.67z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.32 14.7c-.24-.72-.37-1.49-.37-2.28 0-.79.13-1.56.37-2.28L1.66 7.3C.6 9.4 0 11.63 0 14.01s.6 4.61 1.66 6.71l3.66-2.84z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.69-2.86c-1.07.72-2.44 1.15-4.24 1.15-3.14 0-5.8-2.47-6.68-5.8L1.66 15.42C3.55 19.25 7.42 23 12 23z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] text-slate-500 leading-tight block">
                Only verified administrator accounts (<strong className="text-slate-700">rishiuttamsahu@gmail.com</strong>) unlock the Admin panel.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
