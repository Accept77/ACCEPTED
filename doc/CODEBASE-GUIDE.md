# 코드베이스 가이드

이 문서는 `배고프면 진수에게`의 현재 구조와 변경 규칙을 기록합니다. 기능을 추가하거나 기존 모듈을 옮길 때 이 문서를 기준으로 라우팅, 의존성, 여백 규칙을 함께 확인합니다.

## 구조

Next.js 라우트 규칙 때문에 `app/`는 라우트 진입점으로 유지합니다. 화면 구현과 도메인 로직은 루트의 FSD 계층에 둡니다.

```text
app/                                      # Next.js route, layout, error, API route
  api/                                    # Route Handler 진입점
entities/restaurant/
  model/                                  # Restaurant 타입, 필터, 지역·분류 규칙
  api/                                    # 맛집 조회·관리 데이터 접근 모듈
shared/lib/                               # 설정, 상수, Supabase·R2·Naver adapter
features/
  auth/                                   # 관리자 인증 UI와 server action
  naver-import/                           # 네이버 저장 리스트 가져오기 UI
  restaurant-explorer/                   # 공개 탐색, 지도, 추천 모달
  restaurant-management/                 # 등록·수정 폼과 관리 server action
widgets/admin-dashboard/                  # 관리자 대시보드 조합 화면
doc/                                      # 프로젝트 운영·구조 문서
```

## 의존성 방향

구조의 기본 방향은 아래와 같습니다.

```text
shared → entities → features → widgets → app
```

- `shared`는 특정 화면이나 도메인에 의존하지 않습니다.
- `entities/restaurant`는 `shared`만 사용할 수 있습니다.
- `features`는 `shared`와 `entities`를 사용합니다. 다른 feature의 내부 파일을 직접 참조하지 않고, 필요한 책임을 자신의 API/UI 모듈에 둡니다.
- `widgets`는 화면을 조합하며 `features`, `entities`, `shared`를 사용할 수 있습니다.
- `app`의 `page`, `layout`, `route`, `error` 등 Next.js 진입점은 하위 계층을 호출할 수 있지만 구현을 품지 않습니다.

서버 전용 코드는 `shared/lib/r2/server.ts`, `shared/lib/supabase/server.ts`처럼 서버 경계를 유지합니다. Client Component에서 서버 전용 모듈이나 비공개 환경변수를 import하지 않습니다. Server Action은 인증 확인과 입력 검증을 계속 수행해야 합니다.

## 주요 모듈 위치

- 맛집 타입과 Supabase 매핑 타입: `entities/restaurant/model/types.ts`
- 공개·관리자 맛집 조회: `entities/restaurant/api/restaurants.ts`
- 필터·방문 태그·화면 태그: `entities/restaurant/model/restaurant-filters.ts`
- Supabase client/server/auth: `shared/lib/supabase/`
- R2 adapter: `shared/lib/r2/server.ts`
- 공개 탐색과 지도: `features/restaurant-explorer/ui/`
- 등록·수정과 이미지 처리: `features/restaurant-management/`
- 관리자 대시보드: `widgets/admin-dashboard/ui/admin-dashboard.tsx`

새 모듈은 먼저 어느 slice의 책임인지 정한 뒤 추가합니다. 단순히 import 경로를 감추기 위한 큰 barrel 파일은 만들지 않고, 외부에서 사용할 작은 인터페이스를 가진 깊은 모듈을 우선합니다.

## Tailwind 여백 규칙

- 컴포넌트 사이의 수직·수평 간격은 부모의 `gap-*`, `grid gap-*`, `flex` 정렬로 표현합니다.
- 컴포넌트 내부 여백은 `p-*`, `px-*`, `py-*`를 사용합니다.
- `m-*`, `mt-*`, `mr-*`, `mb-*`, `ml-*`, `mx-*`, `my-*`, `ms-*`, `me-*`를 새 코드에 사용하지 않습니다.
- `space-x-*`, `space-y-*`도 margin 기반이므로 사용하지 않습니다.
- `mx-auto` 대신 부모의 `justify-center`, `items-center`, `place-items-center` 또는 `w-full max-w-*` 조합을 사용합니다.
- Tailwind arbitrary value는 `dvh`, `dvw`, `clamp`, 복잡한 색상·그라디언트처럼 의미가 있는 경우에만 사용합니다. 단순한 1px 여백은 arbitrary value로 만들지 않습니다.

## 라우트·서버 작업 규칙

- Next.js 라우트 파일은 `app/`에 둡니다. 실제 UI·데이터 구현은 해당 FSD slice로 이동합니다.
- 서버 액션은 `"use server"` 경계를 유지하고, 호출마다 관리자 권한과 입력을 검증합니다.
- R2 비밀 키와 Supabase server client는 브라우저 번들에 포함되지 않아야 합니다.
- 로컬 개발 서버는 사용자 동의 없이 자동으로 실행하지 않습니다. 검증을 위해 실행했다면 작업 종료 전에 해당 프로세스와 포트를 확인하고 종료합니다.

## 검증 체크리스트

PowerShell에서는 실행 정책에 따라 `npm` 대신 `npm.cmd`를 사용합니다.

```powershell
npm.cmd run lint
npm.cmd exec tsc -- --noEmit
npm.cmd run build
rg --pcre2 -n '(?<![A-Za-z0-9_-])(?:m|mt|mb|mx|my|ml|mr|ms|me)-|space-[xy]-' app entities shared features widgets
rg -n '@/(lib|app/_components|app/actions)' app entities shared features widgets proxy.ts
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object LocalPort -in 3000,3001,3002,4173,5173
```

마지막 두 검색 결과는 각각 legacy import와 margin 기반 spacing이 없어야 합니다. `Get-NetTCPConnection` 결과가 있으면 작업 중 실행한 서버인지 확인하고, 사용자 프로세스는 임의로 종료하지 않습니다.
