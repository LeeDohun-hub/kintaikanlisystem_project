# 勤怠管理システム（kintai）

Java / Spring Boot バックエンドと React（Vite）フロントの勤怠管理 Web アプリです。

---

## 現在実装されている機能（概要）

### 認証・権限

- **セッション認証**（ログイン成功時にセッションへユーザー情報を保存）
- **ロール**: `ADMIN` / `EMPLOYEE`
  - `ADMIN`: 管理者メニュー・管理機能へアクセス
  - `EMPLOYEE`: 自分の勤怠/休暇/掲示板/メッセンジャー等

### 画面（フロントのルーティング）

`frontend/src/App.jsx` 基準:

- **共通**
  - `/login`: ログイン
  - `/board`, `/board/:postId`: 掲示板（投稿・閲覧・コメント）
  - `/messenger`: 社内メッセンジャー
  - `/vacation`: 休暇申請（自分の申請一覧）
- **従業員（EMPLOYEE）**
  - `/work-input`: 勤怠入力
  - `/work-history`: 勤務履歴
- **管理者（ADMIN）**
  - `/menu`: メインメニュー
  - `/employees`: 社員マスタ
  - `/login-check`: ログイン試行の確認
  - `/upload`: Excel アップロード（勤怠/勤務表の取込）
  - `/attendance-import`: 勤怠取込（管理者画面）
  - `/report`: 勤怠レポート／月次 PDF プレビュー
  - `/dashboard`: ダッシュボード
  - `/work-view`: 勤務照会
  - `/statistics`: 統計
  - `/vacation-manage`: 休暇申請の管理（承認/却下）

### バックエンド API（主要エンドポイント）

コントローラ実装（代表）:

- **認証**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **勤怠（WorkTime）**:
  - `GET /api/worktime?month=YYYY-MM[&employeeId=...]`（管理者は従業員指定可）
  - `POST /api/worktime`, `PUT /api/worktime/{id}`, `DELETE /api/worktime/{id}`
  - `POST /api/worktime/bulk`（月間の一括保存／上書き）
  - `POST /api/worktime/import-kintaihyo`（管理者のみ、勤務表 Excel 取込）
  - `POST /api/worktime/send-monthly-report`（従業員実行 → 管理者へ月次レポート送信）
- **社員マスタ（管理者）**: `/api/employees/*`
  - 登録/更新、招待メール、バッチ削除等
- **社員写真（プロフィール）**:
  - `POST /api/employees/{id}/photo`（管理者アップロード）
  - `GET /api/employees/{id}/photo`（ログイン中ユーザーなら取得可能）
- **掲示板**: `GET/POST /api/board`, `GET/PUT/DELETE /api/board/{postId}`, コメント `POST/DELETE /api/board/{postId}/comments/*`
- **メッセンジャー**: `GET /api/messenger/conversations`, `GET /api/messenger/conversation/{partnerId}`, `POST /api/messenger/send`, `GET /api/messenger/unread-count`
- **休暇**: `/api/vacations/*`
  - 従業員: `GET /api/vacations/my`, `POST /api/vacations`, `DELETE /api/vacations/{requestId}`
  - 管理者: `GET /api/vacations?status=...`, `PUT /api/vacations/{requestId}/approve`, `PUT /api/vacations/{requestId}/reject`

## ローカル開発の実行方法

### 事前準備

- **Java 17**（JDK）
- **MySQL** — データベース `kintai_db`（接続は `backend/src/main/resources/application.properties` を参照）
- Windows PowerShell ではコマンドの区切りに `;` を使ってください（`&&` はバージョンによって動作しないことがあります）。

### バックエンド（Spring Boot、既定ポート 8080）

`backend/` ディレクトリで:

```powershell
.\gradlew.bat bootRun
```

（Mac / Linux の場合は `./gradlew bootRun`）

- DB の URL・ユーザー・パスワードは **`application.properties`** に記載されています。
- 任意で上書きする場合は **`application-local.properties`**（gitignore 対象）を用意すると、`spring.config.import` により読み込まれます。サンプルは `application-local.example.properties` を参照。

**開発用プロファイル（`dev`）** — 詳細エラー表示、SQL ログ、Flyway に `db/migration-dev`（開発シード等）を追加する場合:

```powershell
$env:SPRING_PROFILES_ACTIVE="dev"
.\gradlew.bat bootRun
```

**本番向けプロファイル（`prod`）** — SQL ログオフ、エラー本文をクライアントに返さない設定は `application-prod.properties` を参照。

### フロントエンド（Vite、既定ポート 5173）

`frontend/` ディレクトリで:

```powershell
npm install
npm run dev
```

ブラウザで `http://localhost:5173` にアクセス。

### バックエンドのビルド（Gradle）

- コンパイル（Windows）: `backend\gradlew.bat compileJava`
- コンパイル（Mac / Linux）: `./gradlew compileJava`
- 実行: `gradlew.bat bootRun` または `./gradlew bootRun`

### テスト（単位・結合の痕跡）

**ローカル**

```powershell
Set-Location backend; .\gradlew.bat test
```

```powershell
Set-Location frontend; npm test
```

（Mac / Linux: `cd backend && ./gradlew test`, `cd frontend && npm test`）

**CI:** GitHub へ push すると [`.github/workflows/tests.yml`](.github/workflows/tests.yml) がバックエンド JUnit（`@SpringBootTest` 等）とフロント Vitest を実行します。Actions タブで実行履歴・ログを確認でき、バックエンドの **JUnit XML** はワークフロー成果物（`junit-backend`）として保存されます。

現在のテスト範囲（例）:

| 領域 | ファイル |
|------|----------|
| バックエンド | `backend/src/test/java/.../WorkTimeServiceTest.java`（同一勤務日の重複など） |
| フロント | `frontend/src/utils/timeFormat.test.js` |

---

## リポジトリ構成（概要）

| パス | 内容 |
|------|------|
| `backend/` | Spring Boot API |
| `frontend/` | React SPA |
| `sql/schema.sql` | 手動適用用 DDL・シード例 |
| `docs/` | 設計・デバッグメモなど |

---

## 1. トレーニング用システム概要

### 1.1 目的

新入社員が実務に近い業務システムを設計・実装・運用する経験を通じて、Java ベースの業務システム開発を基礎から応用まで習得することを目的とします。対象は、現場で勤務する従業員の勤務表（勤怠）を管理するシステムです。

### 1.2 シナリオ（業務概要）

**ユーザー区分**

- **従業員** — PC / モバイル / Excel 等から勤務情報を入力
- **管理者** — 月次の勤務状況集計、稼働率・売上・損益・キャッシュフローの把握

**業務フロー（概念）**

- 従業員が勤務開始・終了、休憩、業務内容を入力
- データがサーバーに保存
- 管理者が月次 / 従業員別 / プロジェクト別に集計を確認

### 1.3 システム構成（概念）

- **バックエンド:** Java, Spring / Spring Boot, Tomcat
- **フロントエンド:** JavaScript, React
- **DB:** MySQL
- **API:** REST（JSON）、認証はセッション（将来 JWT 等も検討可）

### 1.4 機能概要（概念）

**従業員**

- 勤務入力、勤務日、開始/終了時刻、休憩、区分、コメント
- 自分の月次勤務履歴・総勤務時間の確認

**管理者**

- 全従業員一覧、日次・月次・従業員別検索
- 集計・分析、売上/損益、キャッシュフロー関連（要件により拡張）

### 1.5 画面構成（概念）

- **従業員:** ログイン、勤務入力、勤務履歴
- **管理者:** ダッシュボード、勤務照会、統計、Excel 取込など

---

## 2. 要件定義書ベースの要約

- **目的:** 勤怠・稼働・損益管理の要件を文書化し、設計・実装の基準とする。
- **対象読者:** 新入開発者、講師・レビュアー、開発リーダー。
- **非機能（例）:** 同時ユーザー規模、応答時間、パスワードハッシュ、運用・ログ方針。
- **成果物（例）:** 要件定義書、設計書、ソース、マニュアル。

---

## 言語について

画面文言・API メッセージ等は主に **日本語** で統一されています。韓国語版の説明は **`README_kr.md`** を参照してください。

---

## 最近の変更（ハイライト）

### 外出（複数回）の記録

- **同一勤務日に対して複数回保存し、外出開始/終了を複数区間として記録**できるようになりました。（勤務時間内）
- 外出区間は `work_time_outing` テーブルに保存されます。（Flyway: `V18__work_time_outing_segments.sql`）
- 既存の **「外出が2時間超の場合は退勤扱い（終業＝外出復帰）」ルールは廃止**しました。

### メッセンジャー未読件数の表示

- `GET /api/messenger/unread-count` を用いて、メニューの **メッセンジャーに未読件数バッジ**を表示します。

### 月次指標の注意喚起メッセージ

- 月次指標（残業・休日労働など）が一定の閾値を超えた場合に、画面上で **注意/警告メッセージ**を表示します。

---

## 付録 A — 要件定義書スタイルの詳細リスト（参考）

### A.1 概要

- **目的:** 勤怠 + 稼働 + 損益管理システム開発のための要件を定義する。
- **以降の設計/実装の基準となる。**
- **対象:** 新入開発者、講師およびレビュアー、開発リーダー。
- **開発条件（例）:** 期間 1 か月、人数 3 名、目的は教育用。

### A.2 システム概要

- 従業員勤怠の一元管理、管理者による稼働率/売上/損益の確認、Java/Spring/React の実習。
- **環境:** 従業員はモバイル/PC/Excel、管理者は PC、サーバーは Spring Boot + Tomcat。

### A.3 業務要件

- 全従業員の勤怠管理、事務所での集計業務。
- **フロー:** 従業員入力 → システム保存 → 管理者確認 → 指標計算。

### A.4 ユーザー要件

- 従業員: 自分のデータのみ。管理者: 全データ。

### A.5 機能要件

- **認証:** ログイン/ログアウト、ID/パスワード。
- **従業員:** 勤務日、開始/終了、休憩、コメント、履歴照会。
- **管理者:** 全体照会、従業員/月別検索。
- **集計:** 月次勤務時間、稼働率。
- **売上/損益:** 単価管理、売上計算、コスト入力、利益計算。
- **キャッシュフロー:** 入金予定日、月次入金額。

### A.6 非機能要件

- **性能:** 同時ユーザー例 10 名、応答時間例 3 秒以内。
- **セキュリティ:** パスワードハッシュ、URL 直接アクセスの防止。
- **運用:** Tomcat 再起動による復旧、ログに基づく障害確認。

### A.7 技術・データ・制約・成果物・目標

- **技術:** Java/JavaScript、Spring/React、MySQL、Tomcat。
- **データ:** 従業員、勤怠、単価、入金予定（概念）。
- **制約:** 教育用のため機能最小化、短期完了、外部連動なし（概念）。
- **成果物:** 要件定義書、設計書、ソースコード、マニュアル。
- **目標:** 勤怠入力から集計まで動作、Spring の構造理解、実務開発フローの理解。
