import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminDb,
  handleRouteError,
  HttpError,
  requireUser,
} from "@/lib/server/firebaseAdmin";

// フレンド招待を承諾し、双方のフレンドリストに追加する
// （相手のユーザードキュメントへの書き込みが必要なためサーバーで行う）
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { inviteId } = await req.json().catch(() => ({}));
    if (typeof inviteId !== "string" || !inviteId) {
      throw new HttpError(400, "inviteId が必要です");
    }

    const inviteRef = adminDb.collection("invites").doc(inviteId);
    await adminDb.runTransaction(async (tx) => {
      const invite = await tx.get(inviteRef);
      const data = invite.data();
      if (!invite.exists || !data) throw new HttpError(404, "招待が見つかりません");
      if (
        !user.email ||
        String(data.toEmail).toLowerCase() !== user.email.toLowerCase()
      ) {
        throw new HttpError(403, "この招待を承諾する権限がありません");
      }
      if (data.status !== "pending") {
        throw new HttpError(409, "この招待はすでに処理されています");
      }
      const fromUserId = String(data.fromUserId);
      if (fromUserId === user.uid) {
        throw new HttpError(400, "自分自身はフレンドに追加できません");
      }

      tx.update(inviteRef, {
        status: "accepted",
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(
        adminDb.collection("users").doc(user.uid),
        { friends: FieldValue.arrayUnion(fromUserId) },
        { merge: true }
      );
      tx.set(
        adminDb.collection("users").doc(fromUserId),
        { friends: FieldValue.arrayUnion(user.uid) },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "friends/accept");
  }
}
