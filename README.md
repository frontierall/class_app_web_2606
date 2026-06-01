# 고객 DB 수집 웹 프로그램

관심 고객의 연락처를 수집하여 Google Sheets에 자동으로 기록하는 웹 폼입니다.

---

## 📁 파일 구조

```
project/
├── index.html              # 메인 폼 페이지
├── style.css               # 반응형 스타일시트
├── script.js               # 폼 로직 + Google Sheets 연동
├── apps-script/
│   └── Code.gs             # Google Apps Script 코드
├── .env.example            # 환경변수 예시
├── .gitignore
└── README.md
```

---

## 🚀 설정 방법

### 1단계 — Google Sheets 준비

1. [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
2. URL에서 시트 ID 복사  
   예: `https://docs.google.com/spreadsheets/d/**[이 부분이 SHEET_ID]**/edit`

### 2단계 — Google Apps Script 배포

1. [script.google.com](https://script.google.com) → **새 프로젝트**
2. `apps-script/Code.gs` 내용을 붙여넣기
3. `SHEET_ID` 변수를 1단계에서 복사한 ID로 교체
4. **배포** → **새 배포** 클릭
   - 유형: **웹앱**
   - 실행 계정: **나**
   - 액세스 권한: **모든 사용자 (익명 포함)**
5. **배포** 버튼 클릭 → 생성된 **웹앱 URL** 복사

### 3단계 — 웹 폼에 URL 연결

`script.js` 상단의 `APPS_SCRIPT_URL`을 배포 URL로 교체:

```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

### 4단계 — 커스터마이징

| 항목 | 위치 |
|------|------|
| 회사명 변경 | `index.html` → `<footer>`, `#privacy-contact` |
| 관심 제품/수업 목록 변경 | `index.html` → `<select id="interest">` 내 `<option>` |
| 시트 이름 변경 | `apps-script/Code.gs` → `SHEET_NAME` |

---

## 🌐 배포 방법 (무료 호스팅)

### GitHub Pages

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/[유저명]/[레포명].git
git push -u origin main
```

이후 GitHub 레포 → **Settings → Pages → Branch: main** 선택 → 저장

### Netlify

1. [netlify.com](https://netlify.com) 로그인
2. **Add new site → Deploy manually** → 폴더 드래그 앤 드롭

---

## 📊 Google Sheets 컬럼 구조

| 제출일시 | 이름 | 전화번호 | 이메일 | 관심 제품/수업 | 문의사항 | 동의여부 |
|----------|------|----------|--------|----------------|----------|----------|

---

## ⚠️ 보안 주의사항

- `.env` 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 포함됨)
- Apps Script URL은 공개되어도 무방하지만, 시트 접근 권한은 소유자만 유지하세요
- 스팸 방지: honeypot 필드가 기본 적용되어 있습니다

---

## 📝 개인정보 처리방침 템플릿

별도 개인정보 처리방침 페이지가 필요한 경우:

- **수집 항목**: 이름, 전화번호, 이메일(선택)
- **수집 목적**: 제품/수업 안내, 마케팅 발송
- **보유 및 이용기간**: 수집일로부터 1년
- **파기 절차**: 보유기간 만료 시 즉시 파기, 동의 철회 시 지체 없이 파기
- **제3자 제공**: 원칙적으로 제3자에게 제공하지 않음
- **이용자 권리**: 개인정보 열람·정정·삭제·처리정지 요구 가능
- **문의처**: [담당자명] / [연락처] / [이메일]
