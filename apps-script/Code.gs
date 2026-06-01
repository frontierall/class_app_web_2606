/**
 * Google Apps Script - 고객 DB 수집 웹앱
 *
 * 배포 방법:
 * 1. script.google.com → 새 프로젝트
 * 2. 이 코드 붙여넣기
 * 3. SHEET_ID, ADMIN_EMAIL을 본인 값으로 교체
 * 4. 배포 → 새 배포 → 웹앱
 *    - 실행 계정: 나
 *    - 액세스 권한: 모든 사용자 (익명)
 * 5. 배포 URL을 script.js의 APPS_SCRIPT_URL에 입력
 */

const SHEET_ID   = 'YOUR_GOOGLE_SHEET_ID'; // ← 교체 필요
const SHEET_NAME = '고객DB';
const ADMIN_EMAIL = 'YOUR_ADMIN_EMAIL@gmail.com'; // ← 알림 받을 이메일로 교체

// 헤더 컬럼 순서
const HEADERS = [
  '제출일시', '이름', '전화번호', '이메일',
  '관심 제품/수업', '문의사항', '동의여부',
  'UTM Source', 'UTM Medium', 'UTM Campaign',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const ss    = SpreadsheetApp.openById(SHEET_ID);
    let   sheet = ss.getSheetByName(SHEET_NAME);

    // 시트 없으면 생성 + 헤더 추가
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground('#1a73e8');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // 데이터 추가
    sheet.appendRow([
      data.timestamp    || new Date().toLocaleString('ko-KR'),
      data.name         || '',
      data.phone        || '',
      data.email        || '',
      data.interest     || '',
      data.message      || '',
      data.consent      || '',
      data.utmSource    || '',
      data.utmMedium    || '',
      data.utmCampaign  || '',
    ]);

    // 관리자 이메일 알림 발송
    sendAdminAlert(data);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendAdminAlert(data) {
  const utmInfo = [data.utmSource, data.utmMedium, data.utmCampaign]
    .filter(Boolean).join(' / ');

  const body = `
새로운 관심 고객이 등록되었습니다.

■ 제출일시 : ${data.timestamp}
■ 이름     : ${data.name}
■ 전화번호 : ${data.phone}
■ 이메일   : ${data.email || '(미입력)'}
■ 관심 항목: ${data.interest}
■ 문의사항 : ${data.message || '(없음)'}
■ 유입 경로: ${utmInfo || '(직접 접속)'}

Google Sheets에서 전체 목록을 확인하세요.
https://docs.google.com/spreadsheets/d/${SHEET_ID}
`.trim();

  GmailApp.sendEmail(
    ADMIN_EMAIL,
    `[관심고객 등록] ${data.name} (${data.phone})`,
    body
  );
}

// GET 요청 테스트용
function doGet() {
  return ContentService
    .createTextOutput('Apps Script 웹앱이 정상 동작 중입니다.')
    .setMimeType(ContentService.MimeType.TEXT);
}
