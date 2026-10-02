import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Team, TeamMember, TeamInvite } from "@/types/team";
import { teamMemberDocId } from "./teamIds";
import { postApi } from "./apiClient";

// チーム作成
export const createTeam = async (
  team: Omit<Team, "id" | "createdAt" | "updatedAt">
): Promise<Team> => {
  const teamsRef = collection(db, "teams");
  const docRef = await addDoc(teamsRef, {
    ...team,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 作成者をオーナーとしてチームメンバーに追加
  await addTeamMember({
    userId: team.createdBy,
    teamId: docRef.id,
    role: "owner",
  });

  return {
    ...team,
    id: docRef.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// チーム取得
export const getTeam = async (teamId: string): Promise<Team | null> => {
  const teamDoc = await getDoc(doc(db, "teams", teamId));
  if (!teamDoc.exists()) return null;

  const data = teamDoc.data();
  return {
    id: teamDoc.id,
    name: data.name,
    description: data.description,
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
};

// ユーザーのチーム一覧取得
export const getUserTeams = async (userId: string): Promise<Team[]> => {
  // ユーザーが所属するチームIDを取得
  const membershipsRef = collection(db, "teamMembers");
  const membershipsQuery = query(membershipsRef, where("userId", "==", userId));
  const membershipsSnapshot = await getDocs(membershipsQuery);

  const teamIds = membershipsSnapshot.docs.map((doc) => doc.data().teamId);

  // チーム情報を並列で取得
  const teams = await Promise.all(teamIds.map((teamId) => getTeam(teamId)));
  return teams.filter((team): team is Team => team !== null);
};

// チームメンバー追加（ルール上、クライアントから追加できるのはチーム作成者のオーナー登録のみ）
export const addTeamMember = async (
  member: Omit<TeamMember, "joinedAt">
): Promise<void> => {
  await setDoc(
    doc(db, "teamMembers", teamMemberDocId(member.teamId, member.userId)),
    {
      ...member,
      joinedAt: serverTimestamp(),
    }
  );
};

// チームメンバー取得
export const getTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
  const membersRef = collection(db, "teamMembers");
  const membersQuery = query(
    membersRef,
    where("teamId", "==", teamId),
    orderBy("joinedAt", "asc")
  );

  const snapshot = await getDocs(membersQuery);
  return snapshot.docs.map((doc) => ({
    userId: doc.data().userId,
    teamId: doc.data().teamId,
    role: doc.data().role,
    joinedAt: doc.data().joinedAt?.toDate() || new Date(),
  }));
};

// チームメンバー削除
export const removeTeamMember = async (
  teamId: string,
  userId: string
): Promise<void> => {
  await deleteDoc(doc(db, "teamMembers", teamMemberDocId(teamId, userId)));
};

// チーム招待作成
export const createTeamInvite = async (
  invite: Omit<TeamInvite, "id" | "createdAt" | "updatedAt">
): Promise<TeamInvite> => {
  const invitesRef = collection(db, "teamInvites");
  const docRef = await addDoc(invitesRef, {
    ...invite,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    ...invite,
    id: docRef.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// チーム招待取得
export const getTeamInvites = async (userId: string): Promise<TeamInvite[]> => {
  const invitesRef = collection(db, "teamInvites");
  const invitesQuery = query(
    invitesRef,
    where("toUserId", "==", userId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(invitesQuery);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    teamId: doc.data().teamId,
    fromUserId: doc.data().fromUserId,
    toUserId: doc.data().toUserId,
    status: doc.data().status,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  }));
};

// チーム招待への返答（承諾はメンバー追加を伴うためサーバーで行う）
export const updateTeamInvite = async (
  inviteId: string,
  status: "accepted" | "rejected"
): Promise<void> => {
  if (status === "accepted") {
    await postApi("/api/teams/accept-invite", { inviteId });
    return;
  }
  await updateDoc(doc(db, "teamInvites", inviteId), {
    status,
    updatedAt: serverTimestamp(),
  });
};

// チーム削除
export const deleteTeam = async (
  teamId: string,
  userId: string
): Promise<void> => {
  const batch = writeBatch(db);

  // チームメンバーを削除
  const membersRef = collection(db, "teamMembers");
  const membersQuery = query(membersRef, where("teamId", "==", teamId));
  const membersSnapshot = await getDocs(membersQuery);
  membersSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // 自分が送ったチーム招待を削除（他人の招待はルール上読めない）
  const invitesRef = collection(db, "teamInvites");
  const invitesQuery = query(
    invitesRef,
    where("teamId", "==", teamId),
    where("fromUserId", "==", userId)
  );
  const invitesSnapshot = await getDocs(invitesQuery);
  invitesSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // チームを削除
  batch.delete(doc(db, "teams", teamId));

  await batch.commit();
};
