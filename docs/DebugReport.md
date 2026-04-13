# Debug Report — work-history 勤務履歴照会 500 エラー

| 項目 | 内容 |
|------|------|
| **発生日** | 2026-04-07 |
| **症状** | `/work-history` 画面で「データを読み込めませんでした。」メッセージ表示 |
| **エンドポイント** | `GET /api/attendance?month=YYYY-MM` |
| **HTTP 状態** | 500 Internal Server Error |
| **影響範囲** | 一般従業員（EMPLOYEE）・管理者（ADMIN）とも勤務履歴照会不可 |

---

## 1. 症状

- `WorkInput`（勤務入力、`POST /api/attendance`）→ **正常動作**、DB への保存を確認
- `WorkHistory`（勤務履歴、`GET /api/attendance?month=2026-04`）→ **500 エラー**
- ブラウザコンソール: `GET http://localhost:5173/api/attendance?month=2026-04 500 (Internal Server Error)`
- エラー発生箇所: `useAttendanceByMonth.js:14`

---

## 2. デバッグ過程

### 2-1. 初期仮説の検討

| 仮説 | 検討結果 |
|------|-----------|
| セッション期限切れ（401） | axios インターセプターが `/login` にリダイレクト — ユーザーが画面に留まっているため除外 |
| `LocalTime` シリアライズエラー | `AttendanceResponse` の `startTime` / `endTime` に `@JsonFormat` 欠落 — 別途修正適用、ただし 500 の原因ではない |
| DB クエリエラー | `findForEmployeeMonth` JPQL 文の検討 — 異常なし |
| `memo` 列の不一致 | エンティティフィールド `comment → memo` リファクタ後 `AttendanceMapper` を反映 — スキーマ自動更新（`ddl-auto=update`）で処理 |

### 2-2. エラーメッセージ露出設定の追加

Spring Boot の既定エラー応答には原因メッセージが含まれないため、`application.properties` に以下を追加して実際のメッセージを確認:

```properties
server.error.include-message=always
server.error.include-exception=true
```

### 2-3. 実際のエラーメッセージの確認

バックエンド再起動後、Network タブの Response で確認されたメッセージ:

```json
{
  "error": "[IllegalArgumentException] Name for argument of type [java.lang.String] not specified,
            and parameter name information not available via reflection.
            Ensure that the compiler uses the '-parameters' flag."
}
```

---

## 3. 根本原因

### Spring Boot 3.x（Spring 6）におけるパラメータ名バインディング方針の変更

`AttendanceController` の GET ハンドラ:

```java
// 修正前 — パラメータ名未指定
@GetMapping
public ResponseEntity<?> list(@RequestParam String month, HttpSession session) { ... }
```

**Spring Boot 2.x** では `LocalVariableTableParameterNameDiscoverer` によりバイトコードからパラメータ名を自動取得できました。

**Spring Boot 3.x（Spring 6）** からはこの方式が削除され、次のいずれかを満たす必要があります:

| 方法 | 説明 |
|------|------|
| `@RequestParam("month")` | アノテーションに名前を直接指定 |
| コンパイルオプション `-parameters` | `javac` / Gradle にフラグ追加 |

`POST /api/attendance` は `@RequestBody` を使用するためパラメータ名バインディングが不要で正常動作しましたが、GET ハンドラは `@RequestParam String month` がパラメータ名リフレクションに依存し 500 が発生しました。

---

## 4. 修正内容

### 4-1. 主修正 — `AttendanceController.java`

```java
// 修正後 — パラメータ名を明示
@GetMapping
public ResponseEntity<?> list(@RequestParam("month") String month, HttpSession session) { ... }
```

### 4-2. あわせて修正した内容

| ファイル | 修正内容 |
|------|-----------|
| `AttendanceResponse.java` | `startTime` / `endTime` フィールドに `@JsonFormat(pattern = "HH:mm")` を追加 |
| `application.properties` | `spring.jackson.serialization.write-dates-as-timestamps=false` を追加（LocalDate/Time シリアライズの標準化） |
| `application.properties` | `spring.jackson.deserialization.fail-on-unknown-properties=false` を追加 |
| `ApiExceptionHandler.java` | 例外のルート原因メッセージを応答に含める（デバッグ用） |

---

## 5. 再発防止

### オプション A — すべての `@RequestParam` に名前を明示（推奨）

```java
@RequestParam("month") String month
@RequestParam("page")  int page
```

### オプション B — Gradle コンパイルオプションの追加

`build.gradle` に以下を追加すると、名前未指定の `@RequestParam` も自動で動作します:

```groovy
tasks.withType(JavaCompile).configureEach {
    options.compilerArgs << '-parameters'
}
```

---

## 6. 教訓

1. **Spring Boot 2.x → 3.x マイグレーション** 時は `@RequestParam` / `@PathVariable` には必ず名前を明示するか、`-parameters` フラグを設定する必要がある。
2. `POST`（RequestBody）は問題なく動いても `GET`（RequestParam）で同様の問題が潜むことがある。
3. `server.error.include-message=always` 設定は開発環境でエラー原因を早く把握するのに有用。**本番デプロイ前には必ず削除または無効化**する。
