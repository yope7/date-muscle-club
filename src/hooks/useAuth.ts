'use client';

import { useState, useEffect } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: () => Promise<void>;
  clearError: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        set({ error: 'ログインがキャンセルされました' });
      } else if (error.code === 'auth/popup-blocked') {
        set({ error: 'ポップアップがブロックされています。ブラウザの設定を確認してください' });
      } else {
        set({ error: 'ログインに失敗しました。もう一度お試しください' });
      }
    } finally {
      set({ loading: false });
    }
  },
  signInAsGuest: async () => {
    set({ loading: true, error: null });
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Error signing in as guest:', error);
      set({ error: 'ゲストログインに失敗しました' });
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      set({ error: 'ログアウトに失敗しました' });
    } finally {
      set({ loading: false });
    }
  },
  signIn: async () => {
    set({ loading: true, error: null });
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Error signing in:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        set({ error: 'ログインがキャンセルされました' });
      } else if (error.code === 'auth/popup-blocked') {
        set({ error: 'ポップアップがブロックされています。ブラウザの設定を確認してください' });
      } else {
        set({ error: 'ログインに失敗しました。もう一度お試しください' });
      }
    } finally {
      set({ loading: false });
    }
  },
  clearError: () => set({ error: null })
}));

export const useAuth = () => {
  const [state, setState] = useState<AuthState>(useAuthStore.getState());

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(setState);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      useAuthStore.setState({ user, loading: false });
    });
    return () => unsubscribe();
  }, []);

  return state;
};

// getStateメソッドを追加
useAuth.getState = useAuthStore.getState; 