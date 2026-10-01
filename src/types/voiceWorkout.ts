// 音声入力の解析結果（/api/voice-workout のレスポンス）
export type ParsedExercise = {
  name: string;
  weight: number; // kg。有酸素運動は距離(km)
  reps: number; // 回数。有酸素運動は時間(分)
  sets: number;
};

export type ParsedWorkout = {
  date: string; // YYYY-MM-DD
  exercises: ParsedExercise[];
  memo: string;
  unrecognized: string[];
};

export const MAX_VOICE_TEXT_LENGTH = 1000;

// 音声入力機能の利用を許可されたユーザー（ドキュメントIDはuid）
export const AI_ALLOWED_USERS_COLLECTION = "aiAllowedUsers";
