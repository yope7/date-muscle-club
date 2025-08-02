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
  Timestamp,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Team, TeamMember, TeamInvite } from "@/types/team";

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

  if (teamIds.length === 0) return [];

  // チーム情報を取得
  const teams: Team[] = [];
  for (const teamId of teamIds) {
    const team = await getTeam(teamId);
    if (team) teams.push(team);
  }

  return teams;
};

// チームメンバー追加
export const addTeamMember = async (
  member: Omit<TeamMember, "joinedAt">
): Promise<void> => {
  const membersRef = collection(db, "teamMembers");
  await addDoc(membersRef, {
    ...member,
    joinedAt: serverTimestamp(),
  });
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
  const membersRef = collection(db, "teamMembers");
  const memberQuery = query(
    membersRef,
    where("teamId", "==", teamId),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(memberQuery);
  if (!snapshot.empty) {
    await deleteDoc(doc(db, "teamMembers", snapshot.docs[0].id));
  }
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

// チーム招待更新
export const updateTeamInvite = async (
  inviteId: string,
  status: "accepted" | "rejected"
): Promise<void> => {
  // 招待情報を取得
  const inviteDoc = await getDoc(doc(db, "teamInvites", inviteId));
  if (!inviteDoc.exists()) {
    throw new Error("招待が見つかりません");
  }

  const inviteData = inviteDoc.data();
  const { teamId, toUserId } = inviteData;

  // 招待のステータスを更新
  await updateDoc(doc(db, "teamInvites", inviteId), {
    status,
    updatedAt: serverTimestamp(),
  });

  // 招待が承認された場合、チームメンバーとして追加
  if (status === "accepted") {
    console.log("Adding team member:", {
      userId: toUserId,
      teamId: teamId,
      role: "member",
    });
    await addTeamMember({
      userId: toUserId,
      teamId: teamId,
      role: "member",
    });
    console.log("Team member added successfully");
  }
};

// チーム削除
export const deleteTeam = async (teamId: string): Promise<void> => {
  const batch = writeBatch(db);

  // チームメンバーを削除
  const membersRef = collection(db, "teamMembers");
  const membersQuery = query(membersRef, where("teamId", "==", teamId));
  const membersSnapshot = await getDocs(membersQuery);
  membersSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // チーム招待を削除
  const invitesRef = collection(db, "teamInvites");
  const invitesQuery = query(invitesRef, where("teamId", "==", teamId));
  const invitesSnapshot = await getDocs(invitesQuery);
  invitesSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // チームを削除
  batch.delete(doc(db, "teams", teamId));

  await batch.commit();
};
