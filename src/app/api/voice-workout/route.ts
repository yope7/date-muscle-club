import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import {
  AI_ALLOWED_USERS_COLLECTION,
  MAX_VOICE_TEXT_LENGTH,
  ParsedWorkout,
} from "@/types/voiceWorkout";
import {
  MODEL,
  buildUserPrompt,
  responseJsonSchema,
  sanitize,
  systemInstruction,
} from "@/lib/voiceWorkoutPrompt";

// Firebase の IDトークンを検証して uid を返す
async function verifyIdToken(idToken: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.users?.[0]?.localId ?? null;
}

// 許可リストはユーザー本人の権限で読む（セキュリティルールで本人のドキュメントのみ読み取り可）
async function isAllowedUser(uid: string, idToken: string): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${AI_ALLOWED_USERS_COLLECTION}/${uid}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  return res.ok;
}

function todayInJapan(): string {
  // サーバーはUTCで動くため、日本時間の日付を明示的に求める
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date()
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  const idToken = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const uid = idToken ? await verifyIdToken(idToken) : null;
  if (!idToken || !uid) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!(await isAllowedUser(uid, idToken))) {
    return NextResponse.json(
      { error: "この機能を使う権限がありません" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "テキストが空です" }, { status: 400 });
  }
  if (text.length > MAX_VOICE_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `${MAX_VOICE_TEXT_LENGTH}文字以内で入力してください` },
      { status: 400 }
    );
  }

  const today = todayInJapan();
  try {
    const genai = new GoogleGenAI({ apiKey });
    const response = await genai.models.generateContent({
      model: MODEL,
      contents: buildUserPrompt(text, today),
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema,
        temperature: 0,
        maxOutputTokens: 2048,
      },
    });

    if (!response.text) {
      return NextResponse.json(
        { error: "内容を解析できませんでした。言い方を変えて試してください" },
        { status: 422 }
      );
    }
    const parsed = JSON.parse(response.text) as ParsedWorkout;
    return NextResponse.json({ workout: sanitize(parsed, today) });
  } catch (error) {
    console.error("voice-workout error:", error);
    return NextResponse.json(
      { error: "解析中にエラーが発生しました" },
      { status: 502 }
    );
  }
}
