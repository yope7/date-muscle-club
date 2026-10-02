import { auth } from "@/lib/firebase";

// ログイン中ユーザーのIDトークンを付けて自前のAPIを呼ぶ
export async function postApi<T = unknown>(
  path: string,
  body: unknown
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("ログインが必要です");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `リクエストに失敗しました (${res.status})`);
  }
  return data as T;
}

// 自分のワークアウト保存後の処理（最高記録判定・システムコメント）。
// 失敗しても保存自体には影響しないので待たずにエラーだけ記録する
export function notifyWorkoutSaved(workoutId: string) {
  if (!workoutId || workoutId.startsWith("temp_")) return;
  postApi("/api/workouts/saved", { workoutId }).catch((error) =>
    console.error("Error in post-save processing:", error)
  );
}
