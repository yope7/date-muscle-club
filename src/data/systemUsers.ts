// フィードに自動コメントするシステムユーザー（コメントの投稿はサーバー側で行う）
export type SystemUser = {
  id: string;
  displayName: string;
  icon: string;
  messages: string[];
  newRecordMessage: string;
};

export const SYSTEM_USERS: SystemUser[] = [
  {
    id: "system_god",
    displayName: "GOD",
    icon: "🌟",
    messages: [
      "素晴らしい記録だ！",
      "その努力、認める！",
      "もっと上を目指せ！",
      "限界を超えていけ！",
      "君ならできる！",
    ],
    newRecordMessage: "最高新記録おめでとう！神の祝福がある！",
  },
  {
    id: "system_macho",
    displayName: "マッチョマン",
    icon: "💪",
    messages: [
      "ナイスワーク！その筋肉の成長が見えるぜ！💪",
      "お前の努力が実を結んでるな！",
      "その重量、素晴らしい！もっと上げられるぞ！",
      "筋肉の神が微笑んでいる！",
      "そのフォーム、完璧だ！",
    ],
    newRecordMessage: "最高新記録おめでとう！その筋肉、神がかってるぜ！",
  },
  {
    id: "system_ojosama",
    displayName: "お嬢様",
    icon: "🌸",
    messages: [
      "まぁ、素晴らしいわ！",
      "その努力、認めてあげるわ！",
      "私も見習わないといけないわね！",
      "素敵な記録ですわ！",
      "あなたの成長、楽しみですわ！",
      "お疲れ様ですわ！",
      "かっこいいですわ！",
    ],
    newRecordMessage: "まぁ、最高新記録ですわ！素晴らしいですわ！",
  },
  {
    id: "system_coach",
    displayName: "熱血コーチ",
    icon: "🏆",
    messages: [
      "いいぞ！その調子だ！",
      "限界を超えていけ！",
      "君ならできる！",
      "その努力、必ず報われる！",
      "もっと上を目指せ！",
    ],
    newRecordMessage: "最高新記録おめでとう！その努力が実を結んだな！",
  },
  {
    id: "system_otaku",
    displayName: "GOD",
    icon: "🎮",
    messages: ["やるのぉ", "力が欲しいか", "筋肉をやろう"],
    newRecordMessage: "最高新記録おめでとう！マジでヤバすぎる！",
  },
  {
    id: "system_yogini",
    displayName: "ヨガインストラクター",
    icon: "🧘‍♀️",
    messages: [
      "素晴らしい呼吸と共に、その努力を讃えましょう！",
      "心と体の調和が感じられます！",
      "その成長、心から祝福します！",
      "では私も...",
    ],
    newRecordMessage: "最高新記録おめでとう！心と体の調和が生み出した奇跡です！",
  },
];

export const findSystemUser = (userId: string) =>
  SYSTEM_USERS.find((u) => u.id === userId);
