# 筋トレ記録アプリ 仕様書（v1.0）

## 1. 概要

本アプリは、ユーザーが筋トレのトレーニング内容を日々記録・可視化できるスマートフォン対応のWebアプリケーションです。Firebaseをバックエンドとし、UIはシンプルかつシックなデザインを採用します。

### 1.1 対象ユーザー
- 自身のトレーニングを記録・振り返りたいユーザー
- 知人やトレーナーと進捗を共有したいユーザー
- トレーニングの継続を目指すユーザー

## 2. 機能要件

### 2.1 認証機能
- Googleアカウントでのログイン
- 匿名ログイン（ゲストモード）
- ログアウト機能
- ユーザープロフィール表示
  - プロフィール画像（Google認証から取得）
  - 表示名（Google認証から取得）
  - メールアドレス（Google認証から取得）

### 2.2 トレーニング記録機能
- 日付ごとのトレーニング記録
- セットごとの重量と回数の記録
- 自由記述メモ（その日の体調や所感）
- 任意のタグ付け（例：「フォーム意識」「軽め」など）
- 入力形式：フォームベース（スマホ対応）

### 2.3 カレンダー機能
- 月表示のカレンダー
- トレーニング実施日の視覚的表示
  - 1-2セット: 緑色の線
  - 3セット以上: 炎アイコン
- 表示モード切替機能：
  - カラー表示：負荷スコアに応じた色分け
  - フレーム表示：負荷スコアに応じた炎アイコンのサイズ変更
- 日付選択機能

### 2.4 統計機能
- 総トレーニング回数
- 総セット数
- 総レップ数
- 最高重量
- 最終トレーニング日
- グラフ表示
  - 最高重量の推移
  - 総挙上量の推移
  - セット数と平均回数の推移
  - 期間選択（1週間、1ヶ月、3ヶ月）
- グラフ表示機能：
  - レスポンシブ対応（画面サイズに応じて自動調整）
  - グリッド線表示
  - ツールチップ（ホバー時に詳細表示）
  - 軸ラベル表示
  - 日付順にデータを表示

### 2.5 友達機能
- 友達招待
  - メールアドレスによる招待
  - 招待の承認/拒否
- 友達リスト
  - 保留中の招待表示
  - 友達一覧表示
  - 友達の統計情報表示
    - 総トレーニング回数
    - 総セット数
    - 総レップ数
    - 最高重量
    - 最終トレーニング日
- トレーニング記録の共有
  - 友達のトレーニング記録の閲覧
  - 直近30件のトレーニング記録を表示
  - 共有相手の記録は別の「閲覧専用の一覧画面」から確認可能
  - 自分のカレンダーと混在させない設計

### 2.6 データ管理
- データのリセット機能
- データの永続化（Firestore）
- 匿名ログイン時もデータをクラウドに保持し、後から引き継ぎ可能

### 2.7 モチベーション演出
- 継続日数表示
- 「最高重量更新時」の祝賀アニメーション・バッジ表示
- 月間総挙上量や記録日数の集計表示

## 3. 技術要件

### 3.1 フロントエンド
- Next.js 14
- React 18
- TypeScript
- Material-UI
- Recharts（グラフ表示）
- date-fns（日付操作）
- Zustand（状態管理）

### 3.2 バックエンド
- Firebase
  - Authentication
  - Firestore
  - Hosting
  - Cloud Messaging（将来的な通知機能用）

### 3.3 データ構造

#### 3.3.1 ユーザー
```typescript
interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}
```

#### 3.3.2 トレーニング記録
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

interface WorkoutSet {
  weight: number;
  reps: number;
}
```

#### 3.3.3 招待
```typescript
interface Invite {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 3.3.4 共有
```typescript
interface Share {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserEmail: string;
  toUserEmail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 3.3.5 ユーザー設定
```typescript
interface Settings {
  userId: string;
  displayMode: 'color' | 'flame';
  theme: 'light' | 'dark';
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.4 データベース構造
```
/users/{userId}/
  /workouts/{workoutId}/
    - id: string
    - userId: string
    - date: timestamp
    - sets: array
    - memo: string
    - tags: array
    - createdAt: timestamp
    - updatedAt: timestamp

/invites/{inviteId}/
  - id: string
  - fromUserId: string
  - fromUserEmail: string
  - toEmail: string
  - status: string
  - createdAt: timestamp
  - updatedAt: timestamp

/shares/{shareId}/
  - id: string
  - fromUserId: string
  - toUserId: string
  - fromUserEmail: string
  - toUserEmail: string
  - createdAt: timestamp
  - updatedAt: timestamp

/settings/{userId}/
  - userId: string
  - displayMode: string
  - theme: string
  - createdAt: timestamp
  - updatedAt: timestamp
```

## 4. セキュリティ要件

### 4.1 認証
- Google認証の使用
- 匿名認証のサポート

### 4.2 データアクセス制御
- ユーザーは自分のデータのみアクセス可能
- 共有されたデータは承認された友達のみアクセス可能

### 4.3 Firestoreセキュリティルール
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー認証チェック
    function isAuthenticated() {
      return request.auth != null;
    }

    // ユーザー自身のデータチェック
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // 共有されたデータのチェック
    function isSharedWith(userId) {
      return exists(/databases/$(database)/documents/shares/$(request.auth.uid))
        && get(/databases/$(database)/documents/shares/$(request.auth.uid)).data.toUserId == userId;
    }

    // ユーザーのワークアウトデータ
    match /users/{userId}/workouts/{workoutId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isSharedWith(userId));
      allow write: if isAuthenticated() && isOwner(userId);
    }

    // 招待データ
    match /invites/{inviteId} {
      allow read: if isAuthenticated() && (
        resource.data.fromUserId == request.auth.uid ||
        resource.data.toEmail == request.auth.token.email
      );
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        resource.data.fromUserId == request.auth.uid ||
        resource.data.toEmail == request.auth.token.email
      );
    }

    // 共有データ
    match /shares/{shareId} {
      allow read: if isAuthenticated() && (
        resource.data.fromUserId == request.auth.uid ||
        resource.data.toUserId == request.auth.uid
      );
      allow create: if isAuthenticated();
      allow delete: if isAuthenticated() && (
        resource.data.fromUserId == request.auth.uid ||
        resource.data.toUserId == request.auth.uid
      );
    }

    // ユーザー設定
    match /settings/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);
    }
  }
}
```

## 5. 非機能要件

### 5.1 パフォーマンス
- ページロード時間: 2秒以内
- データ取得時間: 1秒以内
- グラフデータの計算に`useMemo`を使用
- コンポーネントの適切な分割
- レスポンシブデザインの実装
- 画像の最適化（プロフィール画像など）

### 5.2 可用性
- 24時間365日の稼働
- メンテナンス時間の最小化

### 5.3 スケーラビリティ
- ユーザー数の増加に対応
- データ量の増加に対応

### 5.4 保守性
- コードの可読性
- 適切なコメント
- エラーハンドリング

## 6. 制約事項

### 6.1 技術的制約
- モダンブラウザのサポート
- レスポンシブデザイン
- オフライン対応

### 6.2 ビジネス制約
- 無料プランの制限
- データの保持期間

## 7. 開発フェーズ構成

1. ✅ Firebase構成・ユーザー認証
2. ✅ カレンダーUIと記録機能（MVP）
3. ✅ 記録詳細と履歴一覧の整備
4. ✅ グラフ表示と負荷スコア算出
5. ✅ ダーク/ライトテーマ切替
6. ✅ 共有相手閲覧機能の追加
7. ⏳ 拡張機能の段階的追加

## 8. 今後の拡張性

### 8.1 予定されている機能
- トレーニングメニューの共有
- 目標設定と進捗管理
- ソーシャル機能の強化
- プッシュ通知
- 毎日定時リマインド通知
- 共有相手の更新通知
- 記録データをCSVで出力可能に（Google Drive連携等）
- 共有相手との比較グラフ表示
- 他種目対応（スクワット、デッドリフトなど）
- タグ・期間・負荷スコアなどで絞り込み表示
- SNS連携（X/Instagramなど）

### 8.2 検討中の機能
- トレーニング動画の共有
- 栄養管理機能
- コミュニティ機能
- トレーナー機能 