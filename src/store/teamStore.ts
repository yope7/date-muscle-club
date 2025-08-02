import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Team, TeamMember, TeamInvite } from "@/types/team";
import { useAuth } from "@/hooks/useAuth";
import {
  createTeam,
  getTeam,
  getUserTeams,
  addTeamMember,
  getTeamMembers,
  removeTeamMember,
  createTeamInvite,
  getTeamInvites,
  updateTeamInvite,
  deleteTeam,
} from "@/lib/teamFirestore";

interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  teamInvites: TeamInvite[];
  isLoading: boolean;
  error: string | null;

  // チーム管理
  createTeam: (name: string, description?: string) => Promise<void>;
  fetchUserTeams: (userId: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  deleteTeam: (teamId: string) => Promise<void>;

  // メンバー管理
  fetchTeamMembers: (teamId: string) => Promise<void>;
  inviteMember: (teamId: string, toUserId: string) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;

  // 招待管理
  fetchTeamInvites: (userId: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  rejectInvite: (inviteId: string) => Promise<void>;

  // エラー管理
  clearError: () => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      teams: [],
      currentTeam: null,
      teamMembers: [],
      teamInvites: [],
      isLoading: false,
      error: null,

      createTeam: async (name: string, description?: string) => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          const newTeam = await createTeam({
            name,
            description,
            createdBy: user.uid,
          });

          set((state) => ({
            teams: [...state.teams, newTeam],
            currentTeam: newTeam,
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error creating team:", error);
          set({
            error: "チームの作成中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      fetchUserTeams: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const teams = await getUserTeams(userId);
          set({
            teams,
            currentTeam: teams.length > 0 ? teams[0] : null, // 最初のチームを現在のチームに設定
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching user teams:", error);
          set({
            error: "チームの取得中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      setCurrentTeam: (team: Team | null) => {
        set({ currentTeam: team });
      },

      deleteTeam: async (teamId: string) => {
        set({ isLoading: true, error: null });
        try {
          await deleteTeam(teamId);
          set((state) => ({
            teams: state.teams.filter((team) => team.id !== teamId),
            currentTeam:
              state.currentTeam?.id === teamId ? null : state.currentTeam,
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error deleting team:", error);
          set({
            error: "チームの削除中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      fetchTeamMembers: async (teamId: string) => {
        set({ isLoading: true, error: null });
        try {
          const members = await getTeamMembers(teamId);
          set({
            teamMembers: members,
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching team members:", error);
          set({
            error: "メンバーの取得中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      inviteMember: async (teamId: string, toUserId: string) => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          await createTeamInvite({
            teamId,
            fromUserId: user.uid,
            toUserId,
            status: "pending",
          });
          set({ isLoading: false });
        } catch (error) {
          console.error("Error inviting member:", error);
          set({
            error: "メンバーの招待中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      removeMember: async (teamId: string, userId: string) => {
        set({ isLoading: true, error: null });
        try {
          await removeTeamMember(teamId, userId);
          set((state) => ({
            teamMembers: state.teamMembers.filter(
              (member) => member.userId !== userId
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error removing member:", error);
          set({
            error: "メンバーの削除中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      fetchTeamInvites: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const invites = await getTeamInvites(userId);
          set({
            teamInvites: invites,
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching team invites:", error);
          set({
            error: "招待の取得中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      acceptInvite: async (inviteId: string) => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          // 招待情報を取得（チームIDを取得するため）
          const invite = get().teamInvites.find((inv) => inv.id === inviteId);
          if (!invite) {
            throw new Error("招待が見つかりません");
          }

          await updateTeamInvite(inviteId, "accepted");

          // 招待を削除し、チーム一覧を再取得
          set((state) => ({
            teamInvites: state.teamInvites.filter(
              (invite) => invite.id !== inviteId
            ),
            isLoading: false,
          }));

          // チーム一覧を再取得
          await get().fetchUserTeams(user.uid);

          // 現在のチームが招待されたチームの場合、メンバー情報も更新
          if (get().currentTeam?.id === invite.teamId) {
            await get().fetchTeamMembers(invite.teamId);
          }
        } catch (error) {
          console.error("Error accepting invite:", error);
          set({
            error: "招待の承認中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      rejectInvite: async (inviteId: string) => {
        set({ isLoading: true, error: null });
        try {
          await updateTeamInvite(inviteId, "rejected");
          set((state) => ({
            teamInvites: state.teamInvites.filter(
              (invite) => invite.id !== inviteId
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error rejecting invite:", error);
          set({
            error: "招待の拒否中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "team-storage",
      partialize: (state) => ({
        currentTeam: state.currentTeam,
      }),
    }
  )
);
