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
import {
  adminDb,
  handleRouteError,
  requireUser,
} from "@/lib/server/firebaseAdmin";

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

  let uid: string;
  try {
    uid = (await requireUser(req)).uid;
  } catch (error) {
    return handleRouteError(error, "voice-workout");
  }
  const allowed = await adminDb
    .collection(AI_ALLOWED_USERS_COLLECTION)
    .doc(uid)
    .get();
  if (!allowed.exists) {
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
