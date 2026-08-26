# 앱인토스 WebView 배포

`배고프면 진수에게`의 공개 맛집 화면을 앱인토스 WebView 미니앱으로 패키징하는 설정이다. 관리자 화면은 기존 Next.js/Vercel 웹사이트에 남고, 앱인토스에는 공개 목록·검색·필터·지도·GPS·메뉴 추천·상세 공유만 제공한다.

## 구조

- `apps/in-toss/`: 앱인토스 전용 Vite 엔트리와 토스 브리지 어댑터
- `apps-in-toss.config.ts`: 앱 이름 `hungry-jinsu`, 위치 권한, WebView 설정
- `app/api/restaurants/route.ts`: 앱인토스가 호출하는 공개 목록 API
- `app/api/restaurants/[id]/route.ts`: 공개 상세 API
- `shared/lib/http/cors.ts`: 앱인토스 도메인과 로컬 개발 origin용 CORS
- `features/restaurant-explorer/model/platform.ts`: 브라우저/앱인토스 기능 차이를 추상화한 플랫폼 계약

앱인토스 엔트리는 Next.js 서버 코드를 직접 번들하지 않는다. 데이터는 Vercel의 공개 API에서 받아오고, Supabase·R2·Naver API 접근은 계속 Vercel 서버에서 처리한다.

## 환경변수

`.env.local` 또는 배포 환경에 다음 값을 설정한다.

```env
# Vercel 서버
APPS_IN_TOSS_APP_NAME=hungry-jinsu
APPS_IN_TOSS_ALLOWED_ORIGINS=https://hungry-jinsu.apps.tossmini.com,https://hungry-jinsu.private-apps.tossmini.com

# 앱인토스 Vite 빌드
VITE_API_BASE_URL=https://www.hungryjinsu.com
VITE_NAVER_MAP_CLIENT_ID=네이버_지도_Web_Dynamic_Map_Client_ID
VITE_GA_MEASUREMENT_ID=G-5J0SGMG80Q
```

`VITE_` 값은 앱 번들에 포함되므로 비밀키를 넣으면 안 된다. Naver API Hub secret, Supabase server 설정, R2 secret은 기존 Vercel 환경변수로만 유지한다.

## 빌드

```bash
# Vite 정적 번들만 생성
npm run toss:build:web

# Vite 번들 생성 후 hungry-jinsu.ait 패키지 생성
npm run toss:build
```

`dist/`와 `*.ait`는 배포 산출물이므로 Git에 커밋하지 않는다. 실제 배포는 앱인토스 콘솔에서 요구하는 API 키를 준비한 뒤 다음 명령으로 진행한다.

```bash
npm run toss:deploy
```

## 테스트

앱인토스 공식 샌드박스에서 `hungry-jinsu`를 대상으로 WebView를 열어 확인한다. 로컬 Vite 화면을 테스트할 때는 `npm run toss:web`을 실행하고, Vercel API의 CORS 허용 origin에 로컬 origin을 추가해야 한다. 지도는 앱인토스 WebView 도메인과 로컬 테스트 주소를 Naver Maps Web Dynamic Map 애플리케이션의 Web 서비스 URL에 등록해야 한다.

확인할 항목:

1. 목록 API가 로딩 화면 뒤에 정상적으로 표시되는지
2. 지도 타일과 맛집 마커가 표시되는지
3. 위치 권한을 허용했을 때 현재 위치 마커와 주변 거리 필터가 동작하는지
4. 상세 화면의 공유와 Naver 지도 외부 이동이 토스 브리지로 동작하는지
5. 권한 거부·API 오류·공유 취소 시 화면이 멈추지 않는지

## 참고

- [앱인토스 WebView 시작하기](https://developers-apps-in-toss.toss.im/tutorials/webview.html)
- [앱인토스 WebView 권한](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B6%8C%ED%95%9C/permission.html)
- [앱인토스 위치 정보](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EC%9C%84%EC%B9%98%20%EC%A0%95%EB%B3%B4/Location.html)
- [앱인토스 공유](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B3%B5%EC%9C%A0/share.html)
- [앱인토스 외부 URL 열기](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%9D%B4%EB%8F%99/openURL.html)
