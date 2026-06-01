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
 *
 * 대시보드 자동 갱신 설정 (선택):
 * - 트리거 → 새 트리거 추가 → updateDashboard → 시간 기반 → 매시간
 */

const SHEET_ID    = 'YOUR_GOOGLE_SHEET_ID';       // ← 교체 필요
const SHEET_NAME  = '고객DB';
const DASH_NAME   = '📊 대시보드';
const ADMIN_EMAIL = 'YOUR_ADMIN_EMAIL@gmail.com'; // ← 교체 필요

// 헤더 컬럼 순서
const HEADERS = [
  '제출일시', '이름', '전화번호', '이메일',
  '관심 제품/수업', '문의사항', '동의여부',
  'UTM Source', 'UTM Medium', 'UTM Campaign',
];

// 컬럼 인덱스 (0-based)
const COL = {
  TIMESTAMP: 0,
  NAME:      1,
  INTEREST:  4,
  UTM_SRC:   7,
};

// ── 웹앱 엔드포인트 ────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.openById(SHEET_ID);
    const sheet = getOrCreateDataSheet(ss);

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

    sendAdminAlert(data);
    updateDashboard(); // 등록마다 대시보드 갱신

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Apps Script 웹앱이 정상 동작 중입니다.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── 데이터 시트 ────────────────────────────────────────

function getOrCreateDataSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    const hRange = sheet.getRange(1, 1, 1, HEADERS.length);
    hRange.setBackground('#1a73e8');
    hRange.setFontColor('#ffffff');
    hRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── 이메일 알림 ────────────────────────────────────────

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

// ── 대시보드 갱신 (트리거 또는 doPost에서 호출) ───────────

function updateDashboard() {
  const ss        = SpreadsheetApp.openById(SHEET_ID);
  const dataSheet = getOrCreateDataSheet(ss);
  const rows      = dataSheet.getDataRange().getValues();

  if (rows.length < 2) return; // 데이터 없으면 종료

  const dataRows = rows.slice(1); // 헤더 제외
  const today    = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');

  // 대시보드 시트 초기화
  let dash = ss.getSheetByName(DASH_NAME);
  if (!dash) {
    dash = ss.insertSheet(DASH_NAME, 0); // 첫 번째 탭으로
  } else {
    dash.clearContents();
    // 기존 차트 삭제
    dash.getCharts().forEach(c => dash.removeChart(c));
  }

  // ── 요약 카드 ────────────────────────────────────────
  writeSummaryCards(dash, dataRows, today);

  // ── 일별 등록 수 집계 ─────────────────────────────────
  const dailyData = buildDailyData(dataRows);
  writeDailyTable(dash, dailyData);

  // ── 관심 제품별 집계 ──────────────────────────────────
  const interestData = buildInterestData(dataRows);
  writeInterestTable(dash, interestData);

  // ── UTM 소스별 집계 ───────────────────────────────────
  const utmData = buildUtmData(dataRows);
  writeUtmTable(dash, utmData);

  // ── 갱신 시각 ─────────────────────────────────────────
  const updatedAt = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  dash.getRange('A1').setValue('📊 관심 고객 대시보드');
  dash.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#1a73e8');
  dash.getRange('A2').setValue('마지막 갱신: ' + updatedAt).setFontColor('#6b7280').setFontSize(10);

  // 차트 생성
  buildDailyChart(dash, dailyData.length);
  buildInterestChart(dash, interestData.length);

  SpreadsheetApp.flush();
}

// ── 요약 카드 (전체·오늘·이번 달 등록 수) ────────────────

function writeSummaryCards(dash, rows, today) {
  const thisMonth = today.slice(0, 7); // 'yyyy-MM'

  const total   = rows.length;
  const todayN  = rows.filter(r => String(r[COL.TIMESTAMP]).startsWith(today)).length;
  const monthN  = rows.filter(r => String(r[COL.TIMESTAMP]).includes(thisMonth)).length;

  const labels = ['전체 등록', '오늘 등록', '이번 달 등록'];
  const values = [total, todayN, monthN];

  // A4:C5 영역에 카드 표시
  dash.getRange('A4').setValue('[ 요약 ]').setFontWeight('bold');
  labels.forEach((label, i) => {
    const col = i + 1; // 1=A, 2=B, 3=C
    dash.getRange(5, col).setValue(label).setFontWeight('bold').setHorizontalAlignment('center');
    dash.getRange(6, col).setValue(values[i]).setFontSize(20).setFontWeight('bold')
      .setFontColor('#1a73e8').setHorizontalAlignment('center');
  });

  // 카드 배경색
  dash.getRange('A5:C6').setBackground('#e8f0fe');
  dash.getRange('A5:C5').setBackground('#1a73e8').setFontColor('#ffffff');
  dash.setColumnWidth(1, 130);
  dash.setColumnWidth(2, 130);
  dash.setColumnWidth(3, 130);
}

// ── 일별 등록 수 ──────────────────────────────────────

function buildDailyData(rows) {
  const map = {};
  rows.forEach(r => {
    const ts = String(r[COL.TIMESTAMP]);
    // 'yyyy. mm. dd.' 또는 'yyyy-mm-dd' 형식 모두 처리
    const dateMatch = ts.match(/(\d{4})[.\-][\s]?(\d{1,2})[.\-][\s]?(\d{1,2})/);
    if (!dateMatch) return;
    const date = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[3]).padStart(2,'0')}`;
    map[date] = (map[date] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
}

function writeDailyTable(dash, dailyData) {
  const startRow = 9;
  dash.getRange(startRow, 1).setValue('[ 일별 등록 수 ]').setFontWeight('bold');

  const header = dash.getRange(startRow + 1, 1, 1, 2);
  header.setValues([['날짜', '등록 수']]);
  header.setBackground('#1a73e8').setFontColor('#ffffff').setFontWeight('bold');

  if (dailyData.length === 0) {
    dash.getRange(startRow + 2, 1).setValue('(데이터 없음)');
    return;
  }

  const tableData = dailyData.map(([date, count]) => [date, count]);
  dash.getRange(startRow + 2, 1, tableData.length, 2).setValues(tableData);

  // 짝수 행 배경
  tableData.forEach((_, i) => {
    if (i % 2 === 1) {
      dash.getRange(startRow + 2 + i, 1, 1, 2).setBackground('#f0f4ff');
    }
  });
}

// ── 관심 제품별 집계 ──────────────────────────────────

function buildInterestData(rows) {
  const map = {};
  rows.forEach(r => {
    const val = String(r[COL.INTEREST]).trim() || '(미선택)';
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function writeInterestTable(dash, interestData) {
  const startRow = 9;
  const startCol = 5; // E열

  dash.getRange(startRow, startCol).setValue('[ 관심 제품/수업별 등록 수 ]').setFontWeight('bold');

  const header = dash.getRange(startRow + 1, startCol, 1, 2);
  header.setValues([['관심 항목', '등록 수']]);
  header.setBackground('#1a73e8').setFontColor('#ffffff').setFontWeight('bold');

  if (interestData.length === 0) {
    dash.getRange(startRow + 2, startCol).setValue('(데이터 없음)');
    return;
  }

  const tableData = interestData.map(([name, count]) => [name, count]);
  dash.getRange(startRow + 2, startCol, tableData.length, 2).setValues(tableData);
  dash.setColumnWidth(startCol, 200);

  tableData.forEach((_, i) => {
    if (i % 2 === 1) {
      dash.getRange(startRow + 2 + i, startCol, 1, 2).setBackground('#f0f4ff');
    }
  });
}

// ── UTM 소스별 집계 ───────────────────────────────────

function buildUtmData(rows) {
  const map = {};
  rows.forEach(r => {
    const src = String(r[COL.UTM_SRC]).trim() || '직접 접속';
    map[src] = (map[src] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function writeUtmTable(dash, utmData) {
  const startRow = 9;
  const startCol = 8; // H열

  dash.getRange(startRow, startCol).setValue('[ 유입 경로(UTM Source)별 등록 수 ]').setFontWeight('bold');

  const header = dash.getRange(startRow + 1, startCol, 1, 2);
  header.setValues([['유입 경로', '등록 수']]);
  header.setBackground('#1a73e8').setFontColor('#ffffff').setFontWeight('bold');

  if (utmData.length === 0) {
    dash.getRange(startRow + 2, startCol).setValue('(데이터 없음)');
    return;
  }

  const tableData = utmData.map(([src, count]) => [src, count]);
  dash.getRange(startRow + 2, startCol, tableData.length, 2).setValues(tableData);
  dash.setColumnWidth(startCol, 160);

  tableData.forEach((_, i) => {
    if (i % 2 === 1) {
      dash.getRange(startRow + 2 + i, startCol, 1, 2).setBackground('#f0f4ff');
    }
  });
}

// ── 차트 생성 ─────────────────────────────────────────

function buildDailyChart(dash, rowCount) {
  if (rowCount === 0) return;

  const dataRange  = dash.getRange(10, 1, rowCount + 1, 2); // 헤더 포함
  const chartBuilder = dash.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(dataRange)
    .setOption('title', '일별 등록 수')
    .setOption('colors', ['#1a73e8'])
    .setOption('legend', { position: 'none' })
    .setOption('hAxis', { title: '날짜', slantedText: true, slantedTextAngle: 45 })
    .setOption('vAxis', { title: '등록 수', minValue: 0, format: '#' })
    .setPosition(rowCount + 13, 1, 0, 0)
    .setNumRows(12)
    .setNumColumns(5);

  dash.insertChart(chartBuilder.build());
}

function buildInterestChart(dash, rowCount) {
  if (rowCount === 0) return;

  const dataRange    = dash.getRange(10, 5, rowCount + 1, 2); // E열, 헤더 포함
  const chartBuilder = dash.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dataRange)
    .setOption('title', '관심 제품/수업 비율')
    .setOption('pieHole', 0.4)
    .setOption('legend', { position: 'right' })
    .setPosition(rowCount + 13, 5, 0, 0)
    .setNumRows(12)
    .setNumColumns(5);

  dash.insertChart(chartBuilder.build());
}
