import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminDb,
  handleRouteError,
  HttpError,
  requireUser,
} from "@/lib/server/firebaseAdmin";

// フレンドを解除する（双方のフレンドリストから削除）
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { friendId } = await req.json().catch(() => ({}));
    if (typeof friendId !== "string" || !friendId || friendId === user.uid) {
      throw new HttpError(400, "friendId が不正です");
    }

    const batch = adminDb.batch();
    batch.set(
      adminDb.collection("users").doc(user.uid),
      { friends: FieldValue.arrayRemove(friendId) },
      { merge: true }
    );
    batch.set(
      adminDb.collection("users").doc(friendId),
      { friends: FieldValue.arrayRemove(user.uid) },
      { merge: true }
    );
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "friends/remove");
  }
}
