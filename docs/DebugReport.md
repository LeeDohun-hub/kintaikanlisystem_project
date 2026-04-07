# Debug Report — work-history 근무이력 조회 500 오류

| 항목 | 내용 |
|------|------|
| **발생일** | 2026-04-07 |
| **증상** | `/work-history` 화면에서 "데이터를 불러오지 못했습니다." 메시지 표시 |
| **엔드포인트** | `GET /api/attendance?month=YYYY-MM` |
| **HTTP 상태** | 500 Internal Server Error |
| **영향 범위** | 일반 직원(EMPLOYEE) · 관리자(ADMIN) 모두 근무이력 조회 불가 |

---

## 1. 증상

- `WorkInput`(근무 입력, `POST /api/attendance`) → **정상 동작**, DB에 데이터 저장 확인
- `WorkHistory`(근무 이력, `GET /api/attendance?month=2026-04`) → **500 에러**
- 브라우저 콘솔: `GET http://localhost:5173/api/attendance?month=2026-04 500 (Internal Server Error)`
- 오류 발생 위치: `useAttendanceByMonth.js:14`

---

## 2. 디버깅 과정

### 2-1. 초기 가설 검토

| 가설 | 검토 결과 |
|------|-----------|
| 세션 만료(401) | axios 인터셉터가 `/login` 으로 리디렉션 — 사용자가 화면에 남아 있으므로 제외 |
| `LocalTime` 직렬화 오류 | `AttendanceResponse`의 `startTime` / `endTime` 에 `@JsonFormat` 누락 — 별도 수정 적용, 그러나 500 원인은 아님 |
| DB 쿼리 오류 | `findForEmployeeMonth` JPQL 구문 검토 — 이상 없음 |
| `memo` 컬럼 불일치 | 엔티티 필드 `comment → memo` 리팩토링 후 `AttendanceMapper` 반영 — 스키마 자동 업데이트(`ddl-auto=update`)로 처리 |

### 2-2. 오류 메시지 노출 설정 추가

Spring Boot 기본 오류 응답에는 원인 메시지가 포함되지 않아, `application.properties`에 아래 설정을 추가하여 실제 메시지를 확인:

```properties
server.error.include-message=always
server.error.include-exception=true
```

### 2-3. 실제 오류 메시지 확인

백엔드 재시작 후 Network 탭 Response에서 확인된 메시지:

```json
{
  "error": "[IllegalArgumentException] Name for argument of type [java.lang.String] not specified,
            and parameter name information not available via reflection.
            Ensure that the compiler uses the '-parameters' flag."
}
```

---

## 3. 근본 원인

### Spring Boot 3.x (Spring 6) 의 파라미터명 바인딩 정책 변경

`AttendanceController`의 GET 핸들러:

```java
// 수정 전 — 파라미터명 미명시
@GetMapping
public ResponseEntity<?> list(@RequestParam String month, HttpSession session) { ... }
```

**Spring Boot 2.x**에서는 `LocalVariableTableParameterNameDiscoverer`를 통해 바이트코드에서 파라미터명을 자동으로 읽을 수 있었습니다.

**Spring Boot 3.x (Spring 6)** 부터는 이 방식이 제거되었고, 아래 두 조건 중 하나를 충족해야 합니다:

| 방법 | 설명 |
|------|------|
| `@RequestParam("month")` | 어노테이션에 이름 직접 명시 |
| 컴파일 옵션 `-parameters` | `javac` / Gradle에 플래그 추가 |

`POST /api/attendance`는 `@RequestBody`를 사용하므로 파라미터명 바인딩이 필요 없어 정상 동작했지만, `GET` 핸들러는 `@RequestParam String month`가 파라미터명 리플렉션에 의존하여 500 에러가 발생했습니다.

---

## 4. 수정 내용

### 4-1. 핵심 수정 — `AttendanceController.java`

```java
// 수정 후 — 파라미터명 명시
@GetMapping
public ResponseEntity<?> list(@RequestParam("month") String month, HttpSession session) { ... }
```

### 4-2. 함께 수정한 내용

| 파일 | 수정 내용 |
|------|-----------|
| `AttendanceResponse.java` | `startTime` / `endTime` 필드에 `@JsonFormat(pattern = "HH:mm")` 추가 |
| `application.properties` | `spring.jackson.serialization.write-dates-as-timestamps=false` 추가 (LocalDate/Time 직렬화 표준화) |
| `application.properties` | `spring.jackson.deserialization.fail-on-unknown-properties=false` 추가 |
| `ApiExceptionHandler.java` | 예외의 루트 원인 메시지를 응답에 포함 (디버깅용) |

---

## 5. 재발 방지

### 옵션 A — 모든 `@RequestParam` 에 이름 명시 (권장)

```java
@RequestParam("month") String month
@RequestParam("page")  int page
```

### 옵션 B — Gradle 컴파일 옵션 추가

`build.gradle`에 아래를 추가하면 이름 미명시 `@RequestParam`도 자동으로 동작:

```groovy
tasks.withType(JavaCompile).configureEach {
    options.compilerArgs << '-parameters'
}
```

---

## 6. 교훈

1. **Spring Boot 2.x → 3.x 마이그레이션** 시 `@RequestParam` / `@PathVariable` 에는 반드시 이름을 명시하거나 `-parameters` 플래그를 설정해야 한다.
2. `POST`(RequestBody)는 문제없이 동작하더라도 `GET`(RequestParam)에서 동일한 이슈가 잠재할 수 있다.
3. `server.error.include-message=always` 설정은 개발 환경에서 오류 원인을 빠르게 파악하는 데 유용하다. **운영 배포 전에는 반드시 제거 또는 비활성화**해야 한다.
