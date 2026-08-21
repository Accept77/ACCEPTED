# 내 맛집 지도

관리자만 맛집을 등록하고, 방문자는 공개 링크에서 맛집을 검색해 볼 수 있는 Next.js MVP입니다.

## 로컬 실행

```bash
npm run dev
```

Supabase를 연결하지 않은 상태에서는 공개 페이지에 데모 맛집이 표시됩니다. 실제 데이터를 사용하려면 `.env.example`을 `.env.local`로 복사하고 값을 채워 주세요.

## Supabase 설정

1. Supabase 프로젝트를 생성합니다.
2. `supabase/schema.sql`을 SQL Editor에서 실행합니다.
3. Supabase Auth에서 이메일/비밀번호 관리자 계정을 생성합니다.
4. 생성된 사용자 UUID를 `public.admin_users`에 추가합니다.
5. Supabase Project URL과 Publishable Key를 `.env.local`에 입력합니다.

## 네이버 장소 검색 설정

NAVER Cloud Platform의 NAVER API HUB에서 지역 검색 API를 활성화하고 다음 값을 `.env.local`에 입력합니다.

```env
NAVER_API_HUB_CLIENT_ID=
NAVER_API_HUB_CLIENT_SECRET=
```

네이버 API 키는 서버에서만 사용되며 브라우저 번들에 포함되지 않습니다.

저장 리스트에서 가져온 장소는 네이버 장소에 등록된 공식 썸네일을 최대 3개 확인한 뒤 첫 번째 사진부터 Supabase Storage에 자동 복사합니다. 자동 저장에 실패한 장소는 관리자 수정 화면에서 공식 후보를 다시 선택할 수 있습니다. 직접 등록 화면에서는 이미지를 최대 3장 업로드하거나 장소 선택 후 자동으로 표시되는 네이버 추천 이미지 후보를 선택할 수 있습니다. 공개 상세 화면에는 저장된 이미지 3장까지 갤러리로 표시합니다.

이미지 기능을 기존 Supabase 프로젝트에 추가할 때는 변경된 `supabase/schema.sql`을 SQL Editor에서 다시 실행해 `image_paths`, `image_source_url`, `image_credit`, `image_candidates` 컬럼을 추가해 주세요. 기존 장소 사진을 보완하려면 관리자에서 같은 저장 리스트 링크를 다시 읽은 뒤 `기존 사진 보완`을 누르면 됩니다. 기존에 직접 업로드한 사진은 덮어쓰지 않습니다.

## 네이버 지도 표시 설정

검색 API와 네이버 지도는 별도 Application입니다. 네이버 클라우드 플랫폼의 Maps에서 `Web Dynamic Map`을 선택해 Application을 만들고 Client ID를 발급받습니다. 개발 중에는 Web 서비스 URL에 `http://localhost`를 등록합니다. 포트(`:3000`)와 경로는 넣지 말고, `127.0.0.1`로 접속한다면 `http://127.0.0.1`도 별도로 등록해야 합니다.

발급받은 지도 Client ID는 브라우저에서 사용되므로 `.env.local`에 다음처럼 입력합니다.

```env
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=
```

환경변수를 추가한 뒤에는 개발 서버를 재시작해야 합니다.

## 네이버 저장 리스트 가져오기

관리자로 로그인한 뒤 `네이버 리스트 가져오기` 메뉴에서 네이버 지도 저장 리스트의 공유 링크를 붙여넣습니다. 리스트는 네이버에서 `일부 공개` 또는 `전체 공개`로 공유되어 있어야 하며, 장소를 확인한 뒤 선택한 항목을 한 번에 등록할 수 있습니다.
