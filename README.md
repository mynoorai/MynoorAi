# 🧕 PCA-HIJAB: AI 기반 퍼스널 컬러 분석 & 히잡 추천

AI로 얼굴 이미지를 분석해 계절 퍼스널 컬러를 진단하고, 어울리는 히잡/뷰티 제품과 콘텐츠를 제안하는 모바일 최적화 웹 서비스입니다. 프론트엔드는 React SPA, 백엔드는 Express.js API, AI 엔진은 FastAPI(`ShowMeTheColor`)로 구성되어 있습니다.

## 🚀 라이브 데모

- **프론트엔드**: https://pca-hijab.vercel.app
- **백엔드 API**: https://pca-hijab-backend-unified.onrender.com
- **AI API**: Render 배포(`showmethecolor-api`) 혹은 로컬(`python src/api.py`)

> ℹ️ AI API가 슬립 상태일 경우 첫 호출이 느릴 수 있습니다. `ShowMeTheColor/DEPLOYMENT.md`와 `MONITORING_SETUP.md`를 참고해 사전 웜업 또는 외부 모니터링을 설정하세요.

## 🗂 문서 네비게이션

- 아키텍처 개요: `ARCHITECTURE.md`
- 제품/디자인 사양: `docs/PRD_문서.md`, `docs/IA_문서.md`, `docs/UserFlow_문서.md`, `docs/DESIGN_IMPLEMENTATION_REPORT.md`
- 운영 가이드: `DOCKER_DEPLOYMENT.md`, `RENDER_ENV_SETUP.md`, `EMAIL_SETUP.md`, `MONITORING_SETUP.md`, `ShowMeTheColor/DEPLOYMENT.md`
- 협업/커뮤니케이션: `AGENTS.md`, `CLAUDE.md`, `CLAUDE.local.md`
- 실행 스크립트: `scripts/` 디렉터리 (`setup_render_env.py`, `setup-render-env.sh`, `deploy-ai-api.sh` 등)

## 🎯 구현 범위 & 현재 상태

- **퍼스널 컬러 분석 플로우** (`frontend/src/pages/UploadPage.tsx`, `ResultPageV2.tsx`, `CompletionPage.tsx`): 사진 업로드 → AI 분석(프로그레스 UI) → 결과 카드 생성(`frontend/src/utils/resultCardGeneratorV3.ts`). 분석 데이터는 `ShowMeTheColor/src/api.py`에서 반환되는 `personal_color_result`를 그대로 이용합니다.
- **세션 & 추천 요청** (`backend/src/routes/sessions.ts`, `backend/src/routes/recommendations.ts`): 세션 생성은 인증 선택(`optionalAuth`), 세션 조회는 인증 필수. 추천 요청은 사용자 세션 소유권 검증을 거칩니다.
- **상품/콘텐츠 카탈로그** (`backend/src/routes/products.ts`, `backend/src/routes/contents.ts` + `frontend/src/pages/ProductsCatalogPage.tsx`, `ContentDetailPage.tsx`): 퍼스널 컬러/카테고리 필터, 인기/최신 콘텐츠 조회. 현재 백엔드 ERD는 PostgreSQL 기준으로 구성돼 있으며 개발 모드에서는 인메모리 DB를 사용합니다.
- **인증 시스템** (`backend/src/routes/auth.ts`, `frontend/src/store/useAuthStore.ts`): 이메일 인증, 비밀번호 재설정, refresh token 로테이션을 포함합니다. 프론트엔드에서는 `zustand` 스토어와 HttpOnly 쿠키로 세션을 유지합니다.
- **마이페이지 & 저장 기능** (`frontend/src/pages/MyPage.tsx`): 저장한 상품/최근 본 상품은 로컬 저장소(`useAppStore`) 기반으로 동작하며, 현재 인증 미들웨어는 데모 목적으로 비활성화되어 있습니다.
- **관리자 대시보드** (`frontend/src/pages/admin/AdminDashboard.tsx`, `frontend/src/components/admin/*`, `backend/src/routes/admin.ts`): 상품/콘텐츠 CRUD와 이미지 업로드를 제공합니다. `/admin/login`에서 이메일/비밀번호 기반으로 로그인하고, `ProtectedAdminRoute` + JWT 세션/롤(`admin`·`content_manager`)을 검증해 접근을 제어합니다. 모든 관리자 요청은 `authenticateAdmin`에서 감사 로그가 자동 적재됩니다.
- **보조 유틸리티**: 이메일 전송(`backend/src/services/emailService.ts`), 토큰 정리 서비스(`backend/src/services/tokenCleanupService.ts` – 현재 스케줄러 비활성화), CSRF 토큰 발급(`backend/src/middleware/csrf.ts`).

## 🛠 기술 스택

- **프론트엔드**: React 18, TypeScript, Vite, Tailwind CSS, Zustand(persist), TanStack Query v5, React Router v6, TipTap, Vitest + Testing Library, MSW.
- **백엔드**: Express.js + TypeScript, PostgreSQL/인메모리 DB, Helmet, express-validator, Multer, Nodemailer(Resend 연동), node-cron, CSRF, JWT(access/refresh).
- **AI 서비스**: FastAPI, Pillow, NumPy, dlib/MediaPipe 기반 색상 분석(`ShowMeTheColor/src/personal_color_analysis`).
- **DevOps/도구**: Docker, Render/Vercel, Husky + lint-staged, ESLint/Prettier, GitHub Actions(keep-alive 예시).

## 📦 코드 지도

| 레이어         | 핵심 경로                                                                 | 설명                                     |
| -------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| 프론트엔드 SPA | `frontend/src/routes/index.tsx`                                           | Lazy 로딩 라우트 구성 및 에러 바운더리   |
| 글로벌 상태    | `frontend/src/store/useAppStore.ts`, `frontend/src/store/useAuthStore.ts` | 세션/인증/UX 상태 관리                   |
| API 클라이언트 | `frontend/src/services/api/client.ts`                                     | Axios 래퍼, CSRF 포함                    |
| 백엔드 진입점  | `backend/src/index.ts`                                                    | 보안 미들웨어, CORS, 라우트 마운트       |
| 라우트 계층    | `backend/src/routes/*.ts`                                                 | 인증/세션/상품/콘텐츠/관리자/추천/디버그 |
| DB 어댑터      | `backend/src/db/index.ts`, `backend/src/db/postgres.ts`                   | 인메모리 ↔ PostgreSQL 인터페이스         |
| 타입 & 유틸    | `backend/src/types`, `backend/src/utils/auth.ts`                          | 도메인 타입, 토큰/패스워드 유틸          |
| AI API         | `ShowMeTheColor/src/api.py`                                               | `/analyze` 엔드포인트 및 CORS 설정       |

## 🧑‍💻 로컬 개발 절차

1. **루트 의존성 설치 (선택)**
   ```bash
   npm install   # Husky, lint-staged 세팅용
   ```
2. **프론트엔드**
   ```bash
   cd frontend
   npm install
   cp .env.production .env.local  # 필요 시 직접 작성 (예시 파일 없음)
   npm run dev
   ```
3. **백엔드**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

   - CSRF 보호가 활성화되어 있으므로 클라이언트에서 `GET /api/csrf-token` 호출 후 헤더에 `x-csrf-token`을 포함해야 합니다.
4. **AI API**
   ```bash
   cd ShowMeTheColor
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   cd src && python api.py  # 필요 시 uvicorn 사용
   ```
5. **PostgreSQL 사용 시** `backend/src/db/init.sql` (canonical SSOT) 적용 후 `backend/src/db/migrations/00X_*.sql` 을 번호 순으로 적용하고 (`node backend/src/db/run_migration.js` 또는 `bash backend/scripts/init-database.sh`), `.env`의 `DATABASE_URL`을 설정합니다. 새 스키마 변경은 `migrations/` 에 새 번호로 추가합니다.

## 🔧 환경 변수 요약

### 프론트엔드 (`frontend/.env.local` 예시)

```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_AI_API_URL=http://localhost:8000
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=false
VITE_GA_MEASUREMENT_ID=
VITE_VERCEL_ANALYTICS_ID=
```

- 프로덕션 빌드 시 HTTPS URL 필수 (`frontend/src/config/environment.ts`).

### 백엔드 (`backend/.env`)

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/pca_hijab  # 선택
CLIENT_URL=http://localhost:5173,http://localhost:3000
JWT_SECRET=dev-jwt-secret-not-for-production
JWT_REFRESH_SECRET=dev-refresh-secret-not-for-production
EMAIL_ENABLED=true
RESEND_API_KEY=re_xxx  # Resend 사용 시
EMAIL_FROM="PCA-HIJAB <noreply@pca-hijab.com>"
# SMTP 대체 시: SMTP_HOST, SMTP_PORT(기본 587), SMTP_SECURE, SMTP_USER, SMTP_PASS
USE_AUTH_STUB=false            # 개발용 auth stub 선택
ENABLE_TOKEN_CLEANUP=false     # 스케줄링 비활성화 유지
ADMIN_SEED_EMAIL=admin@example.com      # 옵션: 기본 관리자 계정 자동 생성
ADMIN_SEED_PASSWORD=super-secure-pass   # 옵션: 위 이메일 비밀번호
ADMIN_SEED_NAME="Seed Admin"            # 옵션
```

- `SESSION_SECRET`는 현재 코드에서 사용하지 않습니다.
- `ADMIN_SEED_*` 값을 모두 지정하면 서버 부팅 시 해당 계정이 없을 경우 자동으로 role='admin' 계정이 생성됩니다(이미 존재하면 역할만 승격).

### AI API (`ShowMeTheColor`)

별도 필수 환경 변수 없음. 필요 시 `PORT`만 주입하면 됩니다.

## 🔗 API 레퍼런스 요약

- **인증** (`backend/src/routes/auth.ts`)
  - `POST /api/auth/signup` · `POST /api/auth/login`
  - `POST /api/auth/refresh` (refresh token 쿠키 필요)
  - `POST /api/auth/logout` (CSRF 토큰 필요)
  - `GET /api/auth/me`, `POST /api/auth/verify-email`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- **세션/추천** (`backend/src/routes/sessions.ts`, `backend/src/routes/recommendations.ts`)
  - `POST /api/sessions` (optional auth)
  - `PATCH /api/sessions/:sessionId` (session 소유자만)
  - `POST /api/recommendations` & `GET /api/recommendations/:id`
  - `GET /api/recommendations` 및 `PATCH /api/recommendations/:id/status`는 관리자 전용
- **상품/콘텐츠** (`backend/src/routes/products.ts`, `backend/src/routes/contents.ts`)
  - `/api/products`, `/api/products/random`, `/api/products/batch`, `/category/:category`, `/personal-color/:color`
  - `/api/contents`, `/popular`, `/recent`, `/category/:category`, `/slug/:slug`
- **관리자** (`backend/src/routes/admin.ts`)
  - JWT + 관리자 롤(`admin`/`content_manager`) 요구 (`authenticateAdmin`)
  - `/api/admin/products`, `/api/admin/contents`, `/api/admin/upload/*`, `/api/admin/recommendations/*`
- **기타**
  - `GET /api/csrf-token`: CSRF 토큰 발급
  - `GET /api/debug/*`: 개발 모드 전용 이메일/토큰 클린업 확인

## ✅ 품질 점검 & 스크립트

- 프론트엔드: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`
- 백엔드: `npm run lint`, `npm run typecheck` (`npm test`는 placeholder)
- 루트: `npm run lint` (eslint --ext)
- 보안 점검: 각 `package.json`의 `npm run security:check`

## 🚢 운영/배포 참고

- Docker 전반: `DOCKER_DEPLOYMENT.md`
- Render 환경 변수 & 자동 스크립트: `RENDER_ENV_SETUP.md`, `QUICK_SETUP.md`
- 이메일/Resend 연결: `EMAIL_SETUP.md`
- 모니터링 & 워밍 전략: `MONITORING_SETUP.md`
- AI 서비스 배포: `ShowMeTheColor/DEPLOYMENT.md`

## 🔒 보안 및 운영 메모

- Helmet CSP는 `backend/src/index.ts`에 정의(`defaultSrc 'self'`, `connectSrc 'self'`)되어 있어 외부 스크립트 추가 시 반드시 업데이트해야 합니다.
- CORS 허용 목록은 `CLIENT_URL` 또는 코드 내 화이트리스트(Set, Vercel preview 패턴)로 관리됩니다.
- 개발 중 인증을 우회하는 플래그(`USE_AUTH_STUB`, `ProtectedAdminRoute`)가 있으므로 프로덕션 전 반드시 비활성화/삭제하세요.
- 토큰 정리 서비스는 스케줄이 꺼져 있습니다. PostgreSQL 사용 시 `ENABLE_TOKEN_CLEANUP=true`와 스키마 컬럼(`verification_token_expires`, `reset_password_expires`)을 확인하세요.
- `frontend/public/images/characters`, `frontend/public/images/speech-bubbles` 폴더는 자리 표시자 README만 존재합니다. 실제 에셋을 추가하지 않으면 결과 페이지 일부 일러스트가 비어 있습니다.

## 🤝 기여 & 라이선스

1. 리포지토리 포크 → 브랜치 생성 → 변경 → `docs/` 업데이트 → PR 작성
2. 커밋 규칙: Conventional Commits (`feat:`, `fix:`, `docs:` ...), 한글 메시지 권장 (`AGENTS.md` 참고)
3. PR/리뷰 시 3줄 이내 결정 요약 + 관련 문서 링크 첨부

라이선스: MIT (LICENSE 파일 참조)

## 🙏 감사의 말

- **ShowMeTheColor** 오픈소스 프로젝트
- React/Tailwind/Express/FastAPI 등 OSS 커뮤니티
- 디자인 영감: 한국 뷰티 & 쇼핑 앱 UX

---

히잡 커뮤니티를 위해 ❤️로 빚어낸 프로젝트입니다. 프라이버시 우선 · AI 기반 · 커뮤니티 중심이라는 원칙을 잊지 말고 유지해주세요.
