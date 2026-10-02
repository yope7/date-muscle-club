import { workoutTypes } from "@/data/workoutTypes";
import { ParsedWorkout } from "@/types/voiceWorkout";

// 音声入力のテキストをワークアウトJSONに整形する（コスト優先で Flash-Lite を使用）
export const MODEL = "gemini-3.5-flash-lite";

const exerciseNames = workoutTypes.map((t) => t.name);

export const responseJsonSchema = {
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
          spokenName: {
            type: "string",
            description: "ユーザーが実際に言った種目名（聞き取ったまま）",
          },
          uncertain: {
            type: "boolean",
            description:
              "言った種目名が一覧の名前・別名と明確に一致せず、近い候補を推測した場合 true",
          },
        },
        required: ["name", "weight", "reps", "sets", "spokenName", "uncertain"],
      },
    },
    memo: { type: "string", description: "種目以外の感想など。なければ空文字" },
    unrecognized: {
      type: "array",
      description: "トレーニング種目ではない、または内容を読み取れなかった発言の断片",
      items: { type: "string" },
    },
  },
  required: ["date", "exercises", "memo", "unrecognized"],
};

export const systemInstruction = `あなたは筋トレ記録アプリの入力アシスタントです。
ユーザーが音声入力で話したトレーニング内容（音声認識の誤変換を含むことがあります）を、記録用のJSONに整形してください。

ルール:
- 種目名は必ず次のリストから選ぶ: ${exerciseNames.join("、")}
- 言った名前がリストと違っても、トレーニング種目であれば必ず意味・動きが最も近いものを選んで exercises に入れる。その場合は uncertain=true にする
- 次の別名・略称はそれぞれの種目として扱い、uncertain=false でよい:
  - ベンチ → ベンチプレス
  - ラッパル、ラットプル → ラットプルダウン
  - ローロウ、シーテッドロウ、ケーブルロウ、ロウイング → ローイングマシン
  - バックエクステンション、腰のマシン → ロウワーバック
  - チンニング、プルアップ → 懸垂
  - ペックフライ、バタフライ、チェストフライ → ペクトラルマシン
  - 腹筋、クランチ → アブドミナルクランチ
  - ショルダープレス（マシン） → ショルダープッシュ
  - ランニング、ジョギング、ウォーキング、バイク → 距離を言えば「有酸素運動（距離）」、時間だけなら「有酸素運動（時間）」
- spokenName にはユーザーが言った種目名をそのまま入れる
- unrecognized には、トレーニング種目ではない発言や、数値などを読み取れなかった断片だけを入れる
- 「60キロ10回3セット」なら weight=60, reps=10, sets=3 の1エントリにする
- 重量や回数がセットごとに違う場合はエントリを分ける
- 有酸素運動は weight=距離(km)、reps=時間(分)。距離なら「有酸素運動（距離）」、時間なら「有酸素運動（時間）」を選ぶ
- 日付は「今日」の日付を基準に「昨日」「おととい」などを解釈する。言及がなければ今日
- 数値は漢数字や音声認識の表記ゆれ（例: 「ろくじゅっきろ」）も解釈する`;

export function sanitize(parsed: ParsedWorkout, today: string): ParsedWorkout {
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
    ).map((e) => ({
      ...e,
      spokenName: typeof e.spokenName === "string" ? e.spokenName : e.name,
      uncertain: e.uncertain === true,
    })),
    memo: parsed.memo ?? "",
    unrecognized: parsed.unrecognized ?? [],
  };
}

export const buildUserPrompt = (text: string, today: string) =>
  `今日の日付: ${today}\n\n<transcript>\n${text}\n</transcript>`;
