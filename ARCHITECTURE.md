# PCA-HIJAB 기술 아키텍처

**최종 수정일**: 2025-02-16  
**버전**: 3.1  
**담당**: 플랫폼팀 (frontend/backend/AI)

## 1. 시스템 레이어 개요

```
┌──────────────┐   HTTPS   ┌───────────────────┐
│ 모바일/웹 SPA│ ───────▶ │ Vercel CDN (정적) │
└──────┬───────┘          └────────┬──────────┘
       │                             │
       │  API (HTTPS)                │ 에셋
       ▼                             ▼
┌───────────────────────────────────────────────┐
│ Render Web Service (Express, port 5001)       │
│  • Helmet / CSRF / Rate limiting               │
│  • Routes: auth, sessions, recommendations,    │
│    products, contents, admin, debug            │
│  • DB Adapter: InMemory ↔ PostgreSQL           │
└────────┬──────────────────────────────────────┘
         │ REST / POST
         ▼
┌───────────────────────────────────────────────┐
│ ShowMeTheColor FastAPI (port 8000)            │
│  • 이미지 업로드 & 임시 저장                   │
│  • personal_color.analysis -> JSON 결과       │
└───────────────────────────────────────────────┘
```

## 2. 프론트엔드 아키텍처 (React 18 + Vite)

| 구분          | 경로                                                                             | 설명                                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 라우팅        | `frontend/src/routes/index.tsx`                                                  | Lazy + Suspense 기반 라우트, `ProtectedAdminRoute`를 통해 관리자 영역 제어(현재 우회).                                                   |
| 페이지        | `frontend/src/pages/*`                                                           | 분석 플로우(`UploadPage`, `AnalyzingPage`, `ResultPageV2`, `CompletionPage`), 인증/정책, 마이페이지, 관리자 등.                          |
| 상태 관리     | `frontend/src/store/useAppStore.ts`, `useAuthStore.ts`, `useAdminStore.ts`       | `zustand` + `persist`로 세션/인증/필터 상태 보관. Instagram 인앱 환경 대비 `instagramPersistence.ts` 포함.                               |
| API 레이어    | `frontend/src/services/api`                                                      | Axios 기반 `apiClient` + 서비스별 래퍼(auth/products/contents/recommendation). CSRF 토큰 자동 첨부(`frontend/src/services/api/csrf.ts`). |
| 디자인 시스템 | `frontend/src/design-system` + `components/ui`                                   | 토큰(`tokens`), 공통 컴포넌트(Button, Card, Text 등). Tailwind 유틸과 조합.                                                              |
| 분석 도구     | `frontend/src/utils/resultCardGeneratorV3.ts`, `frontend/src/utils/analytics.ts` | 캔버스 기반 결과 카드 생성 및 GA 이벤트 트래킹.                                                                                          |
| 테스트        | `frontend/src/test`, `frontend/src/utils/__tests__`                              | Vitest + RTL + MSW.                                                                                                                      |

### 주요 UX 흐름

1. `UploadPage`에서 파일 선택/카메라 캡처(`frontend/src/components/camera`)
2. `useAppStore`에 이미지를 저장하고 `/analyzing`으로 이동
3. `AnalyzingPage`에서 단계별 진행률 렌더링 (`frontend/src/utils/constants.ts` 단계 정의)
4. 백엔드 `/api/sessions/:id`에 분석 결과 업로드 → 결과 페이지 → 카드 생성
5. 마이페이지는 저장 데이터(로컬) 기반으로 렌더링하며 현재 인증 미들웨어는 코멘트 처리된 상태

## 3. 백엔드 아키텍처 (Express + TypeScript)

| 블록     | 경로                                                                                           | 설명                                                                                                                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 엔트리   | `backend/src/index.ts`                                                                         | dotenv 로드 → 환경 검증(`config/environment.ts`) → Helmet/CORS/Compression/Cookie → 정적 업로드 → 라우트 등록 → 에러 핸들러.                                                                                                     |
| 미들웨어 | `backend/src/middleware`                                                                       | `auth.ts`(JWT/optional/admin key), `csrf.ts`(csurf 기반 토큰 발급), `authorization.ts`(세션/추천 소유권), `validation.ts`(express-validator), `rateLimiter.ts`.                                                                  |
| 라우트   | `backend/src/routes`                                                                           | `auth`, `sessions`, `recommendations`, `products`, `contents`, `admin`, `debug`, `auth.stub`. 각 라우트는 `db/index.ts` 인터페이스를 통해 저장소 접근.                                                                           |
| 서비스   | `backend/src/services/emailService.ts`, `tokenCleanupService.ts`                               | 이메일 전송(Nodemailer+Resend), 토큰 정리(스케줄러는 `shouldStartScheduler()`에서 `false`).                                                                                                                                      |
| DB 계층  | `backend/src/db`                                                                               | `index.ts`에서 `process.env.DATABASE_URL` 유무에 따라 Postgres ↔ InMemory 구현 선택. Postgres 모듈은 `pg` 풀 + SSL 설정(`postgres.ts`). 스키마 SSOT는 `init.sql` 단일 파일이며, 이후 변경은 `migrations/00X_*.sql` 로 누적 관리. |
| 타입     | `backend/src/types/index.ts`                                                                   | User/Session/Recommendation/Product/Content 등 도메인 모델 정의.                                                                                                                                                                 |
| 유틸     | `backend/src/utils/auth.ts`(비스상 토큰, bcrypt), `backend/src/utils/logging.ts`(PII masking). |

### 요청 파이프라인 예시

1. `/api/products?personalColor=winter_cool` → `index.ts` CORS/CSRF 체크 → `routes/products.ts`
2. 라우트에서 `db.getAllProducts()` 호출 → 인메모리/DB 모두 `isActive` 필터 후 페이징
3. 응답 객체는 `{ success: true, data: Product[] }` 형식을 유지하여 프론트 `ProductAPI`와 호환

### 관리자 API 보안

- `/api/admin/*`는 `authenticateAdmin` 미들웨어에서 JWT(access) + 관리자 롤(`admin`/`content_manager`)을 검증하고, `admin_actions` 테이블에 감사 로그를 남깁니다.

## 4. AI 서비스 (ShowMeTheColor)

- `ShowMeTheColor/src/api.py` : FastAPI 앱, `/analyze` `POST` 업로드, `/health` 체크. 허용 Origin은 리스트 + 와일드카드(`*`)로 구성되어 있으므로 필요 시 축소 권장.
- `personal_color_analysis/personal_color.py` : OpenCV/dlib 기반 얼굴 감지 및 색상 계산. 반환값은 `personal_color`, `personal_color_en`, `best_colors`, `worst_colors` 등.
- Docker 배포는 `ShowMeTheColor/Dockerfile.render`를 사용하며 Render 런타임은 `CMD python src/api.py` 로 실행.

## 5. 데이터베이스 모델

### 인메모리 ↔ PostgreSQL

- `db/index.ts`는 동일 인터페이스(`createSession`, `getAllProducts`, `createContent` 등)를 제공하여 런타임에 구현을 스위칭합니다.
- PostgreSQL 사용 시 스키마 초기화: `backend/src/db/init.sql` (canonical SSOT) + `backend/src/db/migrations/00X_*.sql` 순차 적용.
- `products` 테이블 `category` 체크 제약에는 `tint`가 포함되어 있지 않습니다. 타입(`ProductCategory`)에는 `tint`가 정의되어 있으므로 필요하면 스키마 수정 필요.
- `refresh_tokens`, `verification_token_expires`, `reset_password_expires` 컬럼이 크론 정리 서비스(`tokenCleanupService`)와 연동됩니다.

### 엔티티 요약

| 테이블            | 필드 하이라이트                                                  | 설명                                                       |
| ----------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `users`           | id, email, password_hash, verification/reset 토큰, timestamps    | 이메일 인증 · 비밀번호 재설정 토큰 관리                    |
| `sessions`        | id, instagram_id, user_id?, analysis_result JSONB                | 분석 세션 저장. 비로그인 사용자의 경우 `user_id` 비어 있음 |
| `recommendations` | session_id, personal_color_result JSON, user_preferences, status | DM 큐레이션 진행 상태 추적                                 |
| `products`        | category, personal_colors(TEXT[]), is_active                     | Shopee 링크 포함. 관리자 UI CRUD                           |
| `contents`        | slug, category, status(`draft/published`), view_count            | 블로그/컬러 가이드 컨텐츠                                  |
| `refresh_tokens`  | token, expires_at                                                | refresh token 로테이션 저장                                |

## 6. 보안 아키텍처

- **Helmet 설정** (`backend/src/index.ts`)
  - `contentSecurityPolicy`: `defaultSrc 'self'`, `scriptSrc 'self' 'unsafe-inline'`, `styleSrc 'self' 'unsafe-inline'`, 외부 도메인이 기본적으로 차단되므로 GA/폰트 추가 시 수동 허용 필요.
  - `hsts`, `frameguard`, `referrerPolicy`, `crossOrigin*` 옵션 적용.
- **CORS**: 허용 Origin은 환경 변수(`CLIENT_URL`) + 코드 상 화이트리스트(Set) + Vercel Preview 패턴. 미일치 시 403 응답.
- **CSRF**: `csurf` 미들웨어로 `GET /api/csrf-token` → `x-csrf-token` 헤더로 전달해야 POST/DELETE 가능. 로그인/로그아웃/회원가입 모두 CSRF 보호.
- **JWT + Refresh**: Access token은 `15m`, Refresh token은 `7d`. 모든 토큰은 HttpOnly 쿠키 + Bearer 헤더 병행 지원.
- **Rate Limiting**: `loginLimiter`, `signupLimiter`, `passwordResetLimiter` 등 분리된 제한치 적용 (`middleware/rateLimiter.ts`).
- **로깅**: `maskUserId`, `maskInstagramId`로 PII 최소화. 오류 로그는 stdout에 남음(향후 Log service 연동 고려).

## 7. 배포/운영 토폴로지

- **프론트엔드**: Vercel에 정적 배포(`frontend/Dockerfile`은 Nginx 이미지, Vercel 환경에서는 Framework 빌드 사용). `VITE_API_BASE_URL`, `VITE_AI_API_URL`을 환경 변수로 등록.
- **백엔드**: Render Docker(Runtime `backend/Dockerfile`). `render.yaml`에 환경 변수 포함. `Render` Free Plan은 슬립 → `MONITORING_SETUP.md` 기반 keep-alive 권장.
- **AI API**: Render Docker(`ShowMeTheColor/Dockerfile.render`). `PORT=8000` 환경 변수 필수. 필요 시 Cloud Run 등으로 이전 가능.
- **Docker Compose**: `docker-compose.yml` (개발), `docker-compose.prod.yml` (이미지 기반). 현재 `frontend` 서비스의 `VITE_BACKEND_URL` 환경 변수는 빌드 시 반영되지 않으므로 `.env`/빌드 아규먼트로 조정 필요.

## 8. 모니터링 & SLO

- `backend/src/index.ts` → `GET /api/health`: DB 연결 여부 확인 (DB 미연결 시 `status: degraded`).
- `ShowMeTheColor/src/api.py` → `GET /health`: FastAPI 헬스 체크.
- 외부 모니터링: `MONITORING_SETUP.md`에 UptimeRobot/BetterUptime/cron-job.org/Actions 예제 제공. 최소 5분 간격으로 ping 권장.
- 로그 관리: Render/Vercel 기본 로그 사용. 별도 스택 미구축.

## 9. 알려진 리스크 & 후속 작업

1. **관리자 롤 운영**: `/admin/login`이 롤 기반으로 전환되었으므로 운영팀과 협력해 계정/롤 발급 및 감사 로그 점검 프로세스를 수립해야 함.
2. **토큰 정리 서비스 비활성화**: DB 사용 시 `ENABLE_TOKEN_CLEANUP=true`로 전환 + 스케줄 주기 점검.
3. **자산 미구현**: `frontend/public/images/characters`, `speech-bubbles`의 실제 이미지를 채워야 분석 단계 일러스트가 표시됩니다.
4. **Related Content API 미구현**: 프론트는 `/api/contents/related/:id`를 호출하지만 백엔드에 해당 라우트가 없어 예외 처리만 수행 중. 라우트 추가 필요.
5. **CSP/폰트**: Google Fonts 등 외부 자산 추가 시 CSP 업데이트 필요.
6. **Docker 프런트 환경 변수**: `VITE_BACKEND_URL` 등과 실제 코드(`VITE_API_BASE_URL`) 불일치. 문서/compose 정비 필요.

---

이 문서는 코드베이스와 1:1로 매핑되는 실체적 아키텍처 정보를 제공합니다. 변경 시 반드시 본 문서를 함께 업데이트하고, 관련 PR/이슈에 3줄 요약 + 링크를 남겨주세요.
