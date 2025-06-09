import { create } from "zustand";
import { UserProfile } from "@/types/user";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface UserState {
  profile: UserProfile | null;
  friends: { id: string; displayName: string; photoURL?: string }[];
  isLoading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  fetchFriends: () => Promise<void>;
  addFriend: (friendId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  friends: [],
  isLoading: false,
  error: null,
  fetchProfile: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        set({
          profile: {
            id: docSnap.id,
            displayName: data.displayName,
            photoURL: data.photoURL,
            username: data.username,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          },
        });
      } else {
        set({ error: "プロフィールが見つかりません" });
      }
    } catch (error) {
      set({ error: "プロフィールの取得に失敗しました" });
    } finally {
      set({ isLoading: false });
    }
  },
  updateProfile: async (profile: Partial<UserProfile>) => {
    set({ isLoading: true, error: null });
    try {
      const docRef = doc(db, "users", profile.id!);
      await updateDoc(docRef, profile);
      set((state) => ({
        profile: state.profile ? { ...state.profile, ...profile } : null,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: "プロフィールの更新に失敗しました" });
    }
  },
  fetchFriends: async () => {
    try {
      set({ isLoading: true, error: null });
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (!user) {
        set({ error: "ユーザーが認証されていません" });
        return;
      }

      // 友達リストを取得
      const friendsQuery = query(
        collection(db, "friends"),
        where("userId", "==", user.uid)
      );

      const snapshot = await getDocs(friendsQuery);
      const friends = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.friendId,
          displayName: data.friendDisplayName || "不明なユーザー",
          photoURL: data.friendPhotoURL,
        };
      });

      set({ friends, isLoading: false });
    } catch (error) {
      console.error("Error fetching friends:", error);
      set({ error: "フレンドの取得に失敗しました" });
    }
  },
  addFriend: async (friendId: string) => {
    try {
      set({ isLoading: true, error: null });
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (!user) {
        set({ error: "ユーザーが認証されていません" });
        return;
      }
      const friendRef = doc(db, "users", friendId);
      const friendDoc = await getDoc(friendRef);
      if (!friendDoc.exists()) {
        set({ error: "フレンドが見つかりません" });
        return;
      }
      const friendData = friendDoc.data();
      const friendsRef = doc(db, "users", user.uid, "friends", friendId);
      await setDoc(friendsRef, {
        displayName: friendData.displayName,
        photoURL: friendData.photoURL,
      });
      set((state) => ({
        friends: [
          ...state.friends,
          {
            id: friendId,
            displayName: friendData.displayName,
            photoURL: friendData.photoURL,
          },
        ],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: "フレンドの追加に失敗しました" });
    }
  },
  removeFriend: async (friendId: string) => {
    try {
      set({ isLoading: true, error: null });
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (!user) {
        set({ error: "ユーザーが認証されていません" });
        return;
      }
      const friendsRef = doc(db, "users", user.uid, "friends", friendId);
      await deleteDoc(friendsRef);
      set((state) => ({
        friends: state.friends.filter((friend) => friend.id !== friendId),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: "フレンドの削除に失敗しました" });
    }
  },
}));
