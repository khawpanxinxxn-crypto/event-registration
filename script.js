/**
 * script.js — Event Registration Form
 * ─────────────────────────────────────────────────────────────
 * หน้าที่:
 *  1. Validate ฟอร์ม (ชื่อ-นามสกุล + อีเมล)
 *  2. ป้องกัน duplicate ด้วย localStorage
 *  3. ส่งข้อมูลไปยัง Google Apps Script (fetch POST)
 *  4. แสดง success modal / error toast
 *  5. เคลียร์ฟอร์มหลังลงทะเบียนสำเร็จ
 *
 * ⚠️  ให้แทนที่ค่า APPS_SCRIPT_URL ด้วย URL ที่ได้จากการ deploy
 *     Google Apps Script ของคุณ (ดูคู่มือใน SETUP.md)
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

// ── 🔧 CONFIG ────────────────────────────────────────────────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzNS6peXjJfj6ilxaDQzu2z7juLnRaPoZcoEIKgc4jEhg2rArkAhjTmGE_zIyOY9y5X/exec';
const MAX_SEATS = 500; // จำนวนที่นั่งสูงสุด
// ─────────────────────────────────────────────────────────────

// localStorage key สำหรับเก็บอีเมลที่เคยลงทะเบียนแล้ว
const STORAGE_KEY = 'techsummit2026_registered_emails';

// ── DOM REFS ─────────────────────────────────────────────────
const form         = document.getElementById('registrationForm');
const submitBtn    = document.getElementById('submitBtn');
const successModal = document.getElementById('successModal');
const modalCloseBtn= document.getElementById('modalCloseBtn');
const errorToast   = document.getElementById('errorToast');
const toastMessage = document.getElementById('toastMessage');

// ── UTILITY FUNCTIONS ────────────────────────────────────────

/** อ่านรายการอีเมลที่เคยลงทะเบียนจาก localStorage */
function getRegisteredEmails() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/** บันทึกอีเมลลง localStorage หลังลงทะเบียนสำเร็จ */
function saveRegisteredEmail(email) {
  const emails = getRegisteredEmails();
  if (!emails.includes(email.toLowerCase())) {
    emails.push(email.toLowerCase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
  }
}

/** ตรวจสอบว่าอีเมลนี้ลงทะเบียนแล้วในเครื่องนี้หรือยัง */
function isAlreadyRegistered(email) {
  return getRegisteredEmails().includes(email.toLowerCase());
}

/** Validate รูปแบบอีเมลด้วย regex */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ── FORM VALIDATION ──────────────────────────────────────────

/**
 * แสดง/ซ่อน error ให้กับ field
 * @param {string} fieldId   - id ของ input
 * @param {string} errorId   - id ของ p.form-error
 * @param {string} groupId   - id ของ .form-group
 * @param {string} message   - ข้อความ error (ว่าง = ไม่มี error)
 * @returns {boolean} true = valid
 */
function setFieldState(fieldId, errorId, groupId, message) {
  const input  = document.getElementById(fieldId);
  const error  = document.getElementById(errorId);
  const group  = document.getElementById(groupId);

  if (message) {
    error.textContent = message;
    group.classList.add('form-group--error');
    group.classList.remove('form-group--valid');
    input.setAttribute('aria-invalid', 'true');
    return false;
  } else {
    error.textContent = '';
    group.classList.remove('form-group--error');
    group.classList.add('form-group--valid');
    input.setAttribute('aria-invalid', 'false');
    return true;
  }
}

/** validate ฟิลด์ชื่อ-นามสกุล */
function validateName(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'กรุณากรอกชื่อ-นามสกุล';
  if (trimmed.length < 3) return 'ชื่อ-นามสกุลต้องมีอย่างน้อย 3 ตัวอักษร';
  return '';
}

/** validate ฟิลด์อีเมล */
function validateEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'กรุณากรอกอีเมล';
  if (!isValidEmail(trimmed)) return 'รูปแบบอีเมลไม่ถูกต้อง เช่น example@email.com';
  if (isAlreadyRegistered(trimmed)) return 'อีเมลนี้ได้ลงทะเบียนในอุปกรณ์นี้ไปแล้ว';
  return '';
}

/** validate ฟอร์มทั้งหมด แล้วคืนค่า { valid, name, email } */
function validateForm() {
  const name  = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;

  const nameOk  = setFieldState('fullName', 'error-name',  'group-name',  validateName(name));
  const emailOk = setFieldState('email',    'error-email', 'group-email', validateEmail(email));

  return {
    valid: nameOk && emailOk,
    name:  name.trim(),
    email: email.trim(),
  };
}

// ── INLINE VALIDATION ON BLUR ─────────────────────────────────
document.getElementById('fullName').addEventListener('blur', function () {
  setFieldState('fullName', 'error-name', 'group-name', validateName(this.value));
});

document.getElementById('email').addEventListener('blur', function () {
  setFieldState('email', 'error-email', 'group-email', validateEmail(this.value));
});

// ล้าง error เมื่อเริ่มพิมพ์ใหม่
document.getElementById('fullName').addEventListener('input', function () {
  if (document.getElementById('group-name').classList.contains('form-group--error')) {
    document.getElementById('error-name').textContent = '';
    document.getElementById('group-name').classList.remove('form-group--error');
  }
});

document.getElementById('email').addEventListener('input', function () {
  if (document.getElementById('group-email').classList.contains('form-group--error')) {
    document.getElementById('error-email').textContent = '';
    document.getElementById('group-email').classList.remove('form-group--error');
  }
});

// ── TOAST ────────────────────────────────────────────────────

let toastTimer = null;

/**
 * แสดง toast notification
 * @param {string} message - ข้อความ
 * @param {number} [duration=5000] - เวลาแสดง (ms)
 */
function showToast(message, duration = 5000) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.textContent = message;
  errorToast.classList.add('is-visible');
  toastTimer = setTimeout(() => {
    errorToast.classList.remove('is-visible');
  }, duration);
}

// ── MODAL ────────────────────────────────────────────────────

function openModal(data) {
  // ชื่อ
  document.getElementById('modal-name').textContent = data.name;
  // อีเมล
  document.getElementById('modal-email').textContent = data.email;
  // timestamp — ถ้า server ส่งมาใช้ของ server, ถ้าไม่มีใช้ client time
  const ts = data.timestamp || getClientTimestamp();
  document.getElementById('modal-timestamp').textContent = ts;
  // ลำดับ
  const order = data.order ? `#${data.order}` : '—';
  document.getElementById('modal-order').textContent = order;

  successModal.classList.add('is-open');
  successModal.setAttribute('aria-hidden', 'false');
  modalCloseBtn.focus();
}

/** สร้าง timestamp ฝั่ง client (fallback) */
function getClientTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()+543} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function closeModal() {
  successModal.classList.remove('is-open');
  successModal.setAttribute('aria-hidden', 'true');
  document.getElementById('fullName').focus();
}

modalCloseBtn.addEventListener('click', closeModal);

// ปิด modal เมื่อคลิก overlay (นอก modal box)
successModal.addEventListener('click', function (e) {
  if (e.target === successModal) closeModal();
});

// ปิด modal ด้วย Escape
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && successModal.classList.contains('is-open')) {
    closeModal();
  }
});

// ── SEND TO GOOGLE SHEETS ─────────────────────────────────────

/**
 * ส่งข้อมูลไปยัง Google Apps Script
 * @param {{ name: string, email: string }} data
 * @returns {Promise<object>}
 */
async function sendToGoogleSheets(data) {
  // ตรวจสอบว่าตั้ง URL แล้ว
  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
    console.warn('[Dev Mode] Apps Script URL ยังไม่ได้ตั้งค่า — จำลองการส่งข้อมูลสำเร็จ');
    await new Promise(r => setTimeout(r, 1000));
    return { timestamp: getClientTimestamp(), order: 1 };
  }

  const response = await fetch(APPS_SCRIPT_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify({ name: data.name, email: data.email }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
  }
  return result.data || {};
}

// ── PROGRESS BAR ──────────────────────────────────────────────

/**
 * อัปเดต progress bar และตัวเลขจำนวนคน
 * @param {number} count - จำนวนคนที่ลงทะเบียนแล้ว
 */
function updateProgress(count) {
  currentCount = count;
  const pct = Math.min((count / MAX_SEATS) * 100, 100);

  // progress bar fill
  const fill = document.getElementById('progressFill');
  if (fill) {
    fill.style.width = pct + '%';
    fill.closest('[role="progressbar"]').setAttribute('aria-valuenow', count);
  }

  // ตัวเลขจำนวนคน
  const countEl = document.getElementById('registeredCount');
  if (countEl) countEl.textContent = count.toLocaleString('th-TH');

  // topbar seats remaining
  const topbarSeats = document.getElementById('topbarSeats');
  if (topbarSeats) {
    const remaining = Math.max(MAX_SEATS - count, 0);
    topbarSeats.textContent = `เหลืออีก ${remaining.toLocaleString('th-TH')} ที่นั่ง`;
  }
}

/**
 * ดึงจำนวนผู้ลงทะเบียนจาก Apps Script (GET request)
 */
async function fetchRegisteredCount() {
  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
    updateProgress(47);
    return;
  }

  try {
    const res  = await fetch(`${APPS_SCRIPT_URL}?action=count`);
    const data = await res.json();
    if (typeof data.count === 'number') {
      updateProgress(data.count);
    }
  } catch (err) {
    console.warn('[Progress] ดึงข้อมูลไม่สำเร็จ:', err.message);
    // ถ้า GET ล้มเหลว ลองใช้ค่าจาก localStorage แทน
    const saved = parseInt(localStorage.getItem('ts2026_count') || '0', 10);
    if (saved > 0) updateProgress(saved);
  }
}

// โหลด progress ตอนเปิดหน้าเว็บ
fetchRegisteredCount();

// เก็บจำนวนปัจจุบันไว้ใน memory เพื่ออัปเดต client-side ได้ทันที
let currentCount = 0;

// ── SUBMIT HANDLER ────────────────────────────────────────────

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const { valid, name, email } = validateForm();
  if (!valid) return;

  // ตั้ง loading state
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.setAttribute('aria-busy', 'true');

  try {
    const result = await sendToGoogleSheets({ name, email });

    // บันทึกอีเมลลง localStorage
    saveRegisteredEmail(email);

    // เคลียร์ฟอร์ม
    form.reset();
    document.getElementById('group-name').classList.remove('form-group--valid');
    document.getElementById('group-email').classList.remove('form-group--valid');

    // แสดง success modal พร้อมข้อมูล
    openModal({
      name,
      email,
      timestamp: result.timestamp || getClientTimestamp(),
      order:     result.order    || null,
    });

    // อัปเดต progress bar ทันทีหลังลงทะเบียนสำเร็จ
    if (result.order) {
      updateProgress(result.order);
      localStorage.setItem('ts2026_count', result.order);
    } else {
      // ถ้า server ไม่ส่ง order กลับมา นับเพิ่ม client-side ไปก่อน
      const next = currentCount + 1;
      updateProgress(next);
      localStorage.setItem('ts2026_count', next);
    }

  } catch (err) {
    console.error('[Registration Error]', err);

    let userMessage = 'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง';

    if (err instanceof TypeError || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      userMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่';
    } else if (err.message.includes('HTTP 4') || err.message.includes('HTTP 5')) {
      userMessage = `เซิร์ฟเวอร์ไม่ตอบสนอง (${err.message}) กรุณาลองใหม่ภายหลัง`;
    }

    showToast(userMessage, 6000);

  } finally {
    // คืน button state
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.removeAttribute('aria-busy');
  }
});
