import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { workoutTypes } from "@/data/workoutTypes";
import {
  AI_ALLOWED_USERS_COLLECTION,
  MAX_VOICE_TEXT_LENGTH,
  ParsedWorkout,
} from "@/types/voiceWorkout";

// 音声入力のテキストをワークアウトJSONに整形する（コスト優先で Flash-Lite を使用）
const MODEL = "gemini-3.5-flash-lite";

const exerciseNames = workoutTypes.map((t) => t.name);

const responseJsonSchema = {
  type: "object",
  properties: {
    date: { type: "string", description: "トレーニングした日付 (YYYY-MM-DD)" },
    exercises: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: exerciseNames },
          weight: {
            type: "number",
            description:
              "重量(kg)。自重は0。有酸素運動の場合は距離(km)、不明なら0",
          },
          reps: {
            type: "number",
            description: "1セットあたりの回数。有酸素運動の場合は時間(分)",
          },
          sets: { type: "integer", description: "同じ重量・回数で行ったセット数" },
        },
        required: ["name", "weight", "reps", "sets"],
      },
    },
    memo: { type: "string", description: "種目以外の感想など。なければ空文字" },
    unrecognized: {
      type: "array",
      description: "種目リストに当てはめられなかった発言の断片",
      items: { type: "string" },
    },
  },
  required: ["date", "exercises", "memo", "unrecognized"],
};

const systemInstruction = `あなたは筋トレ記録アプリの入力アシスタントです。
ユーザーが音声入力で話したトレーニング内容（音声認識の誤変換を含むことがあります）を、記録用のJSONに整形してください。

ルール:
- 種目名は必ず次のリストから最も近いものを選ぶ: ${exerciseNames.join("、")}
- リストのどれにも当てはまらない種目は exercises に入れず unrecognized に入れる
- 「60キロ10回3セット」なら weight=60, reps=10, sets=3 の1エントリにする
- 重量や回数がセットごとに違う場合はエントリを分ける
- 有酸素運動は weight=距離(km)、reps=時間(分)。距離なら「有酸素運動（距離）」、時間なら「有酸素運動（時間）」を選ぶ
- 日付は「今日」の日付を基準に「昨日」「おととい」などを解釈する。言及がなければ今日
- 数値は漢数字や音声認識の表記ゆれ（例: 「ろくじゅっきろ」）も解釈する`;

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

function sanitize(parsed: ParsedWorkout, today: string): ParsedWorkout {
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : today,
    exercises: (parsed.exercises ?? []).filter(
      (e) =>
        exerciseNames.includes(e.name) &&
        Number.isFinite(e.weight) &&
        Number.isFinite(e.reps) &&
        Number.isInteger(e.sets) &&
        e.sets > 0 &&
        e.sets <= 20
    ),
    memo: parsed.memo ?? "",
    unrecognized: parsed.unrecognized ?? [],
  };
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
      contents: `今日の日付: ${today}\n\n<transcript>\n${text}\n</transcript>`,
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
