/**
 * 고객 DB 수집 웹 폼
 * Google Apps Script 웹앱으로 데이터를 전송합니다.
 * 환경 설정은 config 객체를 수정하거나 .env 방식(번들러 사용 시)으로 관리하세요.
 */

// ── 설정 ──────────────────────────────────────────────
const APPS_SCRIPT_URL = (typeof process !== 'undefined' && process.env && process.env.APPS_SCRIPT_URL)
  ? process.env.APPS_SCRIPT_URL
  : 'YOUR_APPS_SCRIPT_WEB_APP_URL'; // ← 실제 URL로 교체

// ── UTM 파라미터 수집 ──────────────────────────────────
function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource:   params.get('utm_source')   || '',
    utmMedium:   params.get('utm_medium')   || '',
    utmCampaign: params.get('utm_campaign') || '',
  };
}

// ── 전화번호 자동 포맷 ─────────────────────────────────
function formatPhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

// ── 유효성 검사 ────────────────────────────────────────
const validators = {
  name(value) {
    if (!value.trim()) return '이름을 입력해 주세요.';
    if (value.trim().length < 2) return '이름은 2자 이상이어야 합니다.';
    return '';
  },
  phone(value) {
    if (!value.trim()) return '전화번호를 입력해 주세요.';
    const clean = value.replace(/\D/g, '');
    if (!/^010\d{8}$/.test(clean)) return '올바른 전화번호 형식이 아닙니다. (010-XXXX-XXXX)';
    return '';
  },
  email(value) {
    if (!value.trim()) return ''; // 선택 필드
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '올바른 이메일 주소를 입력해 주세요.';
    return '';
  },
  interest(value, customValue) {
    if (!value) return '관심 제품/수업을 선택해 주세요.';
    if (value === '직접 입력' && !customValue.trim()) return '관심 제품/수업명을 직접 입력해 주세요.';
    return '';
  },
  message(value) {
    if (value.length > 500) return '문의사항은 500자 이내로 입력해 주세요.';
    return '';
  },
  consent(checked) {
    if (!checked) return '개인정보 수집·이용에 동의해 주세요.';
    return '';
  },
};

// ── 개인정보 토글 ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn  = document.getElementById('privacy-toggle-btn');
  const toggleBody = document.getElementById('privacy-body');

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
    if (isExpanded) {
      toggleBody.hidden = true;
    } else {
      toggleBody.hidden = false;
    }
  });
});

// ── DOM 참조 ───────────────────────────────────────────
const form          = document.getElementById('contact-form');
const successMsg    = document.getElementById('success-message');
const resetBtn      = document.getElementById('reset-btn');
const submitBtn     = document.getElementById('submit-btn');
const btnText       = submitBtn.querySelector('.btn-text');
const btnSpinner    = submitBtn.querySelector('.btn-spinner');

const nameInput     = document.getElementById('name');
const phoneInput    = document.getElementById('phone');
const emailInput    = document.getElementById('email');
const interestSel   = document.getElementById('interest');
const interestCustom= document.getElementById('interest-custom');
const messageInput  = document.getElementById('message');
const consentInput  = document.getElementById('consent');
const charCurrent   = document.getElementById('char-current');
const honeypot      = form.querySelector('input[name="website"]');

// ── 에러 표시 헬퍼 ─────────────────────────────────────
function setError(groupId, message) {
  const group = document.getElementById(groupId);
  const errorEl = group.querySelector('.field-error');
  const inputs  = group.querySelectorAll('.field-input, .checkbox-custom');
  errorEl.textContent = message;
  inputs.forEach(el => {
    if (message) el.classList.add('is-error');
    else el.classList.remove('is-error');
  });
  // 체크박스 커스텀 요소 처리
  const custom = group.querySelector('.checkbox-custom');
  if (custom) {
    if (message) custom.classList.add('is-error');
    else custom.classList.remove('is-error');
  }
}

function clearError(groupId) {
  setError(groupId, '');
}

// ── 실시간 이벤트 ──────────────────────────────────────
phoneInput.addEventListener('input', (e) => {
  const formatted = formatPhone(e.target.value);
  e.target.value = formatted;
});

phoneInput.addEventListener('blur', () => {
  const err = validators.phone(phoneInput.value);
  setError('group-phone', err);
});

nameInput.addEventListener('blur', () => {
  setError('group-name', validators.name(nameInput.value));
});

emailInput.addEventListener('blur', () => {
  setError('group-email', validators.email(emailInput.value));
});

interestSel.addEventListener('change', () => {
  const isCustom = interestSel.value === '직접 입력';
  interestCustom.classList.toggle('hidden', !isCustom);
  interestCustom.style.marginTop = isCustom ? '8px' : '';
  clearError('group-interest');
});

interestCustom.addEventListener('blur', () => {
  const err = validators.interest(interestSel.value, interestCustom.value);
  setError('group-interest', err);
});

messageInput.addEventListener('input', () => {
  const len = messageInput.value.length;
  charCurrent.textContent = len;
  if (len > 500) {
    messageInput.value = messageInput.value.slice(0, 500);
    charCurrent.textContent = 500;
  }
  setError('group-message', validators.message(messageInput.value));
});

consentInput.addEventListener('change', () => {
  clearError('group-consent');
});

// ── 폼 전체 유효성 검사 ────────────────────────────────
function validateAll() {
  const errors = {};

  errors.name    = validators.name(nameInput.value);
  errors.phone   = validators.phone(phoneInput.value);
  errors.email   = validators.email(emailInput.value);
  errors.interest= validators.interest(interestSel.value, interestCustom.value);
  errors.message = validators.message(messageInput.value);
  errors.consent = validators.consent(consentInput.checked);

  setError('group-name',     errors.name);
  setError('group-phone',    errors.phone);
  setError('group-email',    errors.email);
  setError('group-interest', errors.interest);
  setError('group-message',  errors.message);
  setError('group-consent',  errors.consent);

  return Object.values(errors).every(e => e === '');
}

// ── 로딩 상태 ──────────────────────────────────────────
function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.textContent = loading ? '전송 중...' : '등록하기';
  btnSpinner.classList.toggle('hidden', !loading);
}

// ── 제출 ───────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 스팸 봇 차단
  if (honeypot.value) return;

  if (!validateAll()) {
    // 첫 번째 에러 필드로 스크롤
    const firstError = form.querySelector('.field-input.is-error, .checkbox-custom.is-error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  setLoading(true);

  const interestValue = interestSel.value === '직접 입력'
    ? interestCustom.value.trim()
    : interestSel.value;

  const payload = {
    timestamp:   new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    name:        nameInput.value.trim(),
    phone:       phoneInput.value.trim(),
    email:       emailInput.value.trim(),
    interest:    interestValue,
    message:     messageInput.value.trim(),
    consent:     consentInput.checked ? '동의' : '미동의',
    ...getUtmParams(),
  };

  try {
    // Google Apps Script는 CORS 때문에 no-cors로 전송
    await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    showSuccess();
  } catch (err) {
    console.error('제출 오류:', err);
    alert('전송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    setLoading(false);
  }
});

// ── 성공 화면 ──────────────────────────────────────────
function showSuccess() {
  form.classList.add('hidden');
  successMsg.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

resetBtn.addEventListener('click', () => {
  form.reset();
  charCurrent.textContent = '0';
  interestCustom.classList.add('hidden');

  // 모든 에러 초기화
  ['group-name','group-phone','group-email','group-interest','group-message','group-consent']
    .forEach(clearError);

  setLoading(false);
  successMsg.classList.add('hidden');
  form.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
