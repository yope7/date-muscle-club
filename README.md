
# 【ネタ開発】筋トレ記録アプリ

## 概要

ベンチプレスの成長が嬉しい。記録したい。でもみんなに見せるようなもんでもないから自分専用で記録したい。

そんなあなたに筋トレ記録アプリ

## 対象ユーザー

- 自身のトレーニングを記録・振り返りたい方
- 知人やトレーナーと進捗を共有したい方
- トレーニングの継続を目指す方

## 主な機能

### 1. 認証機能
- Googleアカウントでのログイン
- 匿名ログイン（ゲストモード）#todo
- ユーザープロフィールの表示

### 2. トレーニング記録機能
- 日付ごとのトレーニング記録
- セットごとの重量と回数の記録
- 自由記述メモやタグ付け機能

### 3. カレンダー機能
- 月表示のカレンダーでトレーニング実施日を視覚的に表示
- 負荷スコアに応じた色分けやアイコン表示

### 4. 統計機能
- 総トレーニング回数、セット数、レップ数、最高重量の表示
- グラフでのデータ可視化

### 5. 友達機能
- 友達招待や承認機能
- 友達のトレーニング記録の共有

## 技術スタック

- **フロントエンド**: Next.js, React, TypeScript, Material-UI, Recharts
- **バックエンド**: Firebase (Authentication, Cloud Firestore, Hosting)

## データ構造

アプリはFirestoreを使用してデータを管理しています。以下は主要なデータ構造の一部です。

### ユーザー
```typescript
interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}
```

### トレーニング記録
```typescript
interface WorkoutRecord {
  id: string;
  userId: string;
  date: Timestamp;
  sets: WorkoutSet[];
  memo?: string;
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## セキュリティ

アプリはユーザー認証を使用し、各ユーザーは自分のデータのみアクセス可能です。共有されたデータは承認された友達のみがアクセスできます。

## 今後の拡張性

- トレーニングメニューの共有機能
- 目標設定と進捗管理機能
- プッシュ通知機能

## インストール方法

1. リポジトリをクローンします。
   ```bash
   git clone https://github.com/yourusername/date-muscle-club.git
   cd date-muscle-club
   ```

2. 依存関係をインストールします。
   ```bash
   npm install
   ```

3. 開発サーバーを起動します。
   ```bash
   npm run dev
   ```

4. ブラウザで `http://localhost:3000` にアクセスします。
