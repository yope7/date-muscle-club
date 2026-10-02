import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

// Cloud Functions 上では実行用サービスアカウント、ローカルでは
// `gcloud auth application-default login` の認証情報が使われる
const app =
  getApps()[0] ??
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Authorization: Bearer <Firebase IDトークン> を検証する
export async function requireUser(req: Request): Promise<DecodedIdToken> {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!idToken) throw new HttpError(401, "認証が必要です");
  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch {
    throw new HttpError(401, "認証が必要です");
  }
}

// ルートハンドラ共通のエラーレスポンス変換
export function handleRouteError(error: unknown, label: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`${label} error:`, error);
  return NextResponse.json(
    { error: "サーバーでエラーが発生しました" },
    { status: 500 }
  );
}
