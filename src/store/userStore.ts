import { create } from "zustand";
import { UserProfile } from "@/types/user";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface UserState {
  profile: UserProfile | null;
  friends: UserProfile[];
  profiles: { [key: string]: UserProfile };
  setProfile: (profile: UserProfile | null) => void;
  setFriends: (friends: UserProfile[]) => void;
  setProfileById: (id: string, profile: UserProfile) => void;
  fetchProfile: (userId: string) => Promise<void>;
  fetchFriends: (userId: string) => Promise<void>;
  addFriend: (userId: string, friendId: string) => Promise<void>;
  removeFriend: (userId: string, friendId: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  friends: [],
  profiles: {},
  setProfile: (profile) => set({ profile }),
  setFriends: (friends) => set({ friends }),
  setProfileById: (id, profile) =>
    set((state) => ({
      profiles: { ...state.profiles, [id]: profile },
    })),
  fetchProfile: async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const profile: UserProfile = {
          id: userId,
          username: data.username || "",
          email: data.email || "",
          photoURL: data.photoURL,
        };
        set({ profile });
        get().setProfileById(userId, profile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  },
  fetchFriends: async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        // ユーザードキュメントが存在しない場合は新規作成
        await setDoc(doc(db, "users", userId), {
          friends: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        set({ friends: [] });
        return;
      }

      const data = userDoc.data();
      const friendIds = data.friends || [];

      const friends: UserProfile[] = [];
      for (const friendId of friendIds) {
        const friendDoc = await getDoc(doc(db, "users", friendId));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          const profile: UserProfile = {
            id: friendId,
            username: friendData.username || "",
            email: friendData.email || "",
            photoURL: friendData.photoURL,
          };
          friends.push(profile);
          get().setProfileById(friendId, profile);
        }
      }

      set({ friends });
    } catch (error) {
      console.error("Error fetching friends:", error);
      set({ friends: [] });
    }
  },
  addFriend: async (userId: string, friendId: string) => {
    try {
      // 自分のドキュメントにフレンドを追加
      await updateDoc(doc(db, "users", userId), {
        friends: arrayUnion(friendId),
      });

      // 相手のドキュメントにも自分をフレンドとして追加
      await updateDoc(doc(db, "users", friendId), {
        friends: arrayUnion(userId),
      });

      // フレンドリストを再取得
      await get().fetchFriends(userId);
    } catch (error) {
      console.error("Error adding friend:", error);
      throw error;
    }
  },
  removeFriend: async (userId: string, friendId: string) => {
    try {
      // 自分のドキュメントからフレンドを削除
      await updateDoc(doc(db, "users", userId), {
        friends: arrayRemove(friendId),
      });

      // 相手のドキュメントからも自分を削除
      await updateDoc(doc(db, "users", friendId), {
        friends: arrayRemove(userId),
      });

      // フレンドリストを再取得
      await get().fetchFriends(userId);
    } catch (error) {
      console.error("Error removing friend:", error);
      throw error;
    }
  },
}));
