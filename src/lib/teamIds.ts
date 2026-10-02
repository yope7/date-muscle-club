// teamMembers のドキュメントIDは「チームID_ユーザーID」に固定する
// （セキュリティルールから所属確認を exists() で行うため）
export const teamMemberDocId = (teamId: string, userId: string) =>
  `${teamId}_${userId}`;
