// teamMembers のドキュメントIDを「チームID_ユーザーID」に揃える一回限りの移行スクリプト
// 使い方: node scripts/migrate-team-member-ids.mjs [--apply]
// gcloud にログイン中のアカウント（プロジェクトのオーナー）の権限で Firestore REST API を呼ぶ。
// --apply なしはドライラン
import { execSync } from "node:child_process";

const apply = process.argv.includes("--apply");
const token = execSync("gcloud auth print-access-token").toString().trim();
const base =
  "https://firestore.googleapis.com/v1/projects/date-muscle-club/databases/(default)/documents";

const call = async (method, path, body) => {
  const res = await fetch(`${base}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  }
  return res.json();
};

const { documents = [] } = await call("GET", "teamMembers?pageSize=300");
for (const doc of documents) {
  const id = doc.name.split("/").pop();
  const teamId = doc.fields.teamId.stringValue;
  const userId = doc.fields.userId.stringValue;
  const targetId = `${teamId}_${userId}`;
  if (id === targetId) continue;

  const exists = (await call("GET", `teamMembers/${targetId}`)) !== null;
  console.log(
    `${id} -> ${targetId}: ${exists ? "重複のため削除" : "新IDへ移動"}`
  );
  if (!apply) continue;

  if (!exists) {
    await call("PATCH", `teamMembers/${targetId}`, { fields: doc.fields });
  }
  await call("DELETE", `teamMembers/${id}`);
}
console.log(apply ? "移行が完了しました" : "ドライランです（--apply で実行）");
