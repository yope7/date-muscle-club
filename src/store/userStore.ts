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
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { WorkoutRecord } from "@/types/workout";

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
          displayName: data.displayName || "",
          username: data.displayName || "",
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
          
          // 友達のワークアウトデータを取得
          const workoutsQuery = query(
            collection(db, "users", friendId, "workouts"),
            orderBy("date", "desc"),
            limit(30)
          );
          const workoutsSnapshot = await getDocs(workoutsQuery);
          const workouts = workoutsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date,
          })) as WorkoutRecord[];

          // Googleアカウントの情報を取得
          const authDoc = await getDoc(doc(db, "auth", friendId));
          const authData = authDoc.exists() ? authDoc.data() : null;

          const profile: UserProfile = {
            id: friendId,
            displayName: authData?.displayName || friendData.displayName || "",
            username: authData?.displayName || friendData.displayName || "",
            email: friendData.email || "",
            photoURL: authData?.photoURL || friendData.photoURL,
            workouts,
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
