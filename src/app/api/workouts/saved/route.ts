import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  adminDb,
  handleRouteError,
  HttpError,
  requireUser,
} from "@/lib/server/firebaseAdmin";
import { SYSTEM_USERS } from "@/data/systemUsers";
import { isCardioWorkoutType } from "@/lib/workoutTypeInfo";
import { WorkoutSet } from "@/types/workout";

// 有酸素運動のセットは weight が距離(km)なので重量の記録から除外する
const maxStrengthWeight = (sets: WorkoutSet[] | undefined) =>
  (sets ?? [])
    .filter((s) => !isCardioWorkoutType(s.workoutType))
    .reduce((max, s) => Math.max(max, Number(s.weight) || 0), 0);

const pick = <T,>(array: T[]) => array[Math.floor(Math.random() * array.length)];

// 自分のワークアウト保存後に呼ばれ、最高記録の判定とシステムコメントの投稿を行う。
// 以前は閲覧者全員のブラウザで実行していたため、重複投稿や他人のデータへの書き込みが起きていた
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { workoutId } = await req.json().catch(() => ({}));
    if (typeof workoutId !== "string" || !workoutId) {
      throw new HttpError(400, "workoutId が必要です");
    }

    const workoutsRef = adminDb
      .collection("users")
      .doc(user.uid)
      .collection("workouts");
    const workoutSnap = await workoutsRef.doc(workoutId).get();
    const workout = workoutSnap.data();
    if (!workoutSnap.exists || !workout) {
      throw new HttpError(404, "ワークアウトが見つかりません");
    }

    // 最高記録の判定（過去の記録の重量のみ取得）
    const maxWeight = maxStrengthWeight(workout.sets);
    const previous = await workoutsRef
      .where("date", "<", workout.date)
      .select("sets")
      .get();
    const previousMax = previous.docs.reduce(
      (max, d) => Math.max(max, maxStrengthWeight(d.get("sets"))),
      0
    );
    const isNewRecord = maxWeight > 0 && maxWeight > previousMax;
    if (Boolean(workout.isNewRecord) !== isNewRecord) {
      await workoutSnap.ref.update({ isNewRecord });
    }

    // システムコメントはワークアウトごとに1件だけ（既にコメントがあれば投稿しない）
    const existingComments = await adminDb
      .collection("comments")
      .where("workoutId", "==", workoutId)
      .limit(1)
      .get();
    let commented = false;
    if (existingComments.empty) {
      const systemUser = pick(SYSTEM_USERS);
      try {
        // ドキュメントIDを固定し、同時に呼ばれても二重投稿しない
        await adminDb
          .collection("comments")
          .doc(`system_${workoutId}`)
          .create({
            workoutId,
            userId: systemUser.id,
            content: isNewRecord
              ? systemUser.newRecordMessage
              : pick(systemUser.messages),
            createdAt: Timestamp.now(),
            user: {
              displayName: systemUser.displayName,
              isSystemUser: true,
              systemUserId: systemUser.id,
            },
          });
        commented = true;
      } catch (error) {
        // ALREADY_EXISTS(6) は別リクエストが先に投稿済み
        if ((error as { code?: number }).code !== 6) throw error;
      }
    }

    return NextResponse.json({ isNewRecord, commented });
  } catch (error) {
    return handleRouteError(error, "workouts/saved");
  }
}
