import { create } from "zustand";
import { UserProfile } from "@/types/user";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { postApi } from "@/lib/apiClient";
import { toWorkoutRecord } from "@/lib/workoutConverter";

interface UserState {
  profile: UserProfile | null;
  friends: UserProfile[];
  profiles: { [key: string]: UserProfile };
  friendsLoadedFor: string | null;
  setProfile: (profile: UserProfile | null) => void;
  setFriends: (friends: UserProfile[]) => void;
  setProfileById: (id: string, profile: UserProfile) => void;
  fetchProfile: (userId: string) => Promise<void>;
  // 複数の画面から呼ばれるため、取得済みなら force しない限り再取得しない
  fetchFriends: (userId: string, options?: { force?: boolean }) => Promise<void>;
  loadFriendWorkouts: (friendId: string) => Promise<void>;
  acceptFriendInvite: (userId: string, inviteId: string) => Promise<void>;
  removeFriend: (userId: string, friendId: string) => Promise<void>;
}

const toProfile = (id: string, data: DocumentData): UserProfile => ({
  id,
  displayName: data.displayName || "",
  username: data.displayName || "",
  email: data.email || "",
  photoURL: data.photoURL,
});

// 同じユーザーのフレンド取得が同時に走らないようにする
let friendsRequest: { userId: string; promise: Promise<void> } | null = null;

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  friends: [],
  profiles: {},
  friendsLoadedFor: null,
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
        const profile = toProfile(userId, userDoc.data());
        set({ profile });
        get().setProfileById(userId, profile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  },
  fetchFriends: async (userId: string, options) => {
    if (!options?.force && get().friendsLoadedFor === userId) return;
    if (friendsRequest?.userId === userId) return friendsRequest.promise;

    const promise = (async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
          // ユーザードキュメントが存在しない場合は新規作成
          await setDoc(doc(db, "users", userId), {
            friends: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          set({ friends: [], friendsLoadedFor: userId });
          return;
        }

        const friendIds: string[] = userDoc.data().friends || [];
        // 相手が自分をフレンドから外している場合は読めないので除外する
        const results = await Promise.all(
          friendIds.map(async (friendId) => {
            try {
              const friendDoc = await getDoc(doc(db, "users", friendId));
              return friendDoc.exists()
                ? toProfile(friendId, friendDoc.data())
                : null;
            } catch (error) {
              console.error(`Error fetching friend ${friendId}:`, error);
              return null;
            }
          })
        );
        const friends = results.filter((f): f is UserProfile => f !== null);

        set((state) => ({
          friends,
          friendsLoadedFor: userId,
          profiles: {
            ...state.profiles,
            ...Object.fromEntries(
              friends.map((f) => [
                f.id,
                { ...state.profiles[f.id], ...f },
              ])
            ),
          },
        }));
      } catch (error) {
        console.error("Error fetching friends:", error);
        set({ friends: [] });
      }
    })();

    friendsRequest = { userId, promise };
    try {
      await promise;
    } finally {
      friendsRequest = null;
    }
  },
  // フレンドのプロフィール表示用に直近のワークアウトを取得する
  loadFriendWorkouts: async (friendId: string) => {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "users", friendId, "workouts"),
          orderBy("date", "desc"),
          limit(30)
        )
      );
      const workouts = snapshot.docs.map((d) =>
        toWorkoutRecord(d.id, d.data(), friendId)
      );
      set((state) => ({
        profiles: {
          ...state.profiles,
          [friendId]: { ...state.profiles[friendId], workouts },
        },
      }));
    } catch (error) {
      console.error("Error fetching friend workouts:", error);
    }
  },
  acceptFriendInvite: async (userId: string, inviteId: string) => {
    await postApi("/api/friends/accept", { inviteId });
    await get().fetchFriends(userId, { force: true });
  },
  removeFriend: async (userId: string, friendId: string) => {
    await postApi("/api/friends/remove", { friendId });
    await get().fetchFriends(userId, { force: true });
  },
}));
