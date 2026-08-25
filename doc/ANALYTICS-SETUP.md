# Google Analytics 설정

## 환경변수

Google Analytics 4 웹 스트림의 측정 ID를 아래 환경변수에 입력합니다.

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

- 로컬: `.env.local`
- Vercel: Project Settings → Environment Variables
- 측정 ID는 Google Analytics의 관리 → 데이터 스트림 → 웹 스트림에서 확인합니다.

## 적용 범위

- 공개 메인 화면(`/`)에만 GA를 로드합니다.
- 관리자 화면 트래픽은 공개 서비스 통계에 섞이지 않습니다.
- 측정 ID가 비어 있으면 GA 스크립트를 로드하지 않습니다.

배포 후 Google Analytics의 실시간 보고서 또는 Tag Assistant에서 수신 여부를 확인합니다.
