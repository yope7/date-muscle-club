import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminDb,
  handleRouteError,
  HttpError,
  requireUser,
} from "@/lib/server/firebaseAdmin";
import { teamMemberDocId } from "@/lib/teamIds";

// チーム招待を承諾し、メンバーとして追加する
// （メンバー追加は招待の正当性を確認してからサーバーで行う）
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { inviteId } = await req.json().catch(() => ({}));
    if (typeof inviteId !== "string" || !inviteId) {
      throw new HttpError(400, "inviteId が必要です");
    }

    const inviteRef = adminDb.collection("teamInvites").doc(inviteId);
    await adminDb.runTransaction(async (tx) => {
      const invite = await tx.get(inviteRef);
      const data = invite.data();
      if (!invite.exists || !data) throw new HttpError(404, "招待が見つかりません");
      if (data.toUserId !== user.uid) {
        throw new HttpError(403, "この招待を承諾する権限がありません");
      }
      if (data.status !== "pending") {
        throw new HttpError(409, "この招待はすでに処理されています");
      }
      const teamId = String(data.teamId);
      const team = await tx.get(adminDb.collection("teams").doc(teamId));
      if (!team.exists) throw new HttpError(404, "チームが見つかりません");

      const memberRef = adminDb
        .collection("teamMembers")
        .doc(teamMemberDocId(teamId, user.uid));
      const member = await tx.get(memberRef);

      tx.update(inviteRef, {
        status: "accepted",
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (!member.exists) {
        tx.set(memberRef, {
          teamId,
          userId: user.uid,
          role: "member",
          joinedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "teams/accept-invite");
  }
}
