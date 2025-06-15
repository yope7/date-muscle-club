"use client";

import { useState, useEffect } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { create } from "zustand";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isGuest: boolean;
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
  isGuest: false,
  signInWithGoogle: async () => {
    set({ loading: true, error: null, isGuest: false });
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Firestoreにユーザー情報を保存
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // 新規ユーザーの場合
        await setDoc(userRef, {
          id: user.uid,
          displayName: user.displayName,
          username: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          friends: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // 既存ユーザーの場合、プロフィール情報を更新
        await updateDoc(userRef, {
          displayName: user.displayName,
          username: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      if (error.code === "auth/popup-closed-by-user") {
        set({ error: "ログインがキャンセルされました" });
      } else if (error.code === "auth/popup-blocked") {
        set({
          error:
            "ポップアップがブロックされています。ブラウザの設定を確認してください",
        });
      } else {
        set({ error: "ログインに失敗しました。もう一度お試しください" });
      }
    } finally {
      set({ loading: false });
    }
  },
  signInAsGuest: async () => {
    set({ loading: true, error: null, isGuest: true });
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in as guest:", error);
      set({ error: "ゲストログインに失敗しました" });
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      set({ error: "ログアウトに失敗しました" });
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
      console.error("Error signing in:", error);
      if (error.code === "auth/popup-closed-by-user") {
        set({ error: "ログインがキャンセルされました" });
      } else if (error.code === "auth/popup-blocked") {
        set({
          error:
            "ポップアップがブロックされています。ブラウザの設定を確認してください",
        });
      } else {
        set({ error: "ログインに失敗しました。もう一度お試しください" });
      }
    } finally {
      set({ loading: false });
    }
  },
  clearError: () => set({ error: null }),
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
