// ============================================
// Student ID Card JS — FATA University Hostel
// ============================================

const userRole = 'Student';
let userData = null;

document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
});

// ---- LOAD USER DATA ----
async function loadUserData() {
  try {
    const res = await fetch('../api/auth.php?action=check_session');
    const data = await res.json();
    if (!data.logged_in) { window.location.href = '../login.html'; return; }
    if (data.user_role !== 'Student') {
      window.location.href = data.user_role === 'Admin'
        ? '../admin/dashboard.html'
        : '../faculty/dashboard.html';
      return;
    }
    const res2 = await fetch(`../api/user.php?action=get_id_card_data&uid=${data.user_id}&role=Student`);
    const data2 = await res2.json();
    if (!data2.success) {
      showError(data2.message || 'Could not load ID card data.');
      return;
    }
    userData = data2.profile || data2.user;

    if (!userData.room_no || userData.room_no.trim() === '' || userData.room_no === 'Not Assigned') {
      showError('You have not assigned room please wait for approval.', 'Room Not Assigned');
      return;
    }

    renderIDCard(userData);
  } catch {
    userData = getDemoData();
    renderIDCard(userData);
  }
}

function getDemoData() {
  return {
    full_name: 'Asad Ullah', father_name: 'Muhammad Hanif',
    department: 'BS Computer Science', gender: 'Male',
    dob: '2003-03-16', phone: '03348761317',
    home_address: 'P/O Mishti mela Tesil Central District orakzai',
    profile_photo: '', registration_no: '2022-FU-1317',
    hostel_name: 'FAQIR IPI HOUSE', room_no: '53',
    joining_date: '2026-04-14'
  };
}

// ---- RENDER ID CARD ----
function renderIDCard(u) {
  renderFrontCard(u);
  renderBackCard(u);
  generateQRCode(u);
}

function renderFrontCard(u) {
  const loading = document.getElementById('loadingState');
  const container = document.getElementById('idCardContainer');
  if (loading) loading.style.display = 'none';
  if (container) container.style.display = 'block';

  const photoEl = document.getElementById('cardPhoto');
  if (photoEl) {
    photoEl.src = u.profile_photo ? '../' + u.profile_photo : generateAvatarDataURL(u.full_name);
  }

  const expDate = calculateExpiryDate(u.joining_date, u.booking_duration);

  setText('cardName', u.full_name || '—');
  setText('cardDept', u.department || 'Student');
  setText('cardFather', u.father_name || '—');
  setText('cardGender', u.gender || '—');
  setText('cardHostel', u.hostel_name || 'Not Assigned');
  setText('cardRoom', u.room_no || 'Not Assigned');
  setText('cardSemester', u.semester || '—');
  setText('cardAddress', u.home_address || '—');
  setText('cardJoinDate', formatDate(u.joining_date));
  setText('cardExpiry', expDate);
}

function renderBackCard(u) {
  const expDate = calculateExpiryDate(u.joining_date, u.booking_duration);
  setText('backName', u.full_name || '—');
  setText('backRegNo', u.registration_no || '—');
  setText('backDept', u.department || '—');
  setText('backSemester', u.semester || '—');
  setText('backContact', u.phone || '—');
  setText('backDob', formatDate(u.dob));
  setText('backJoinDate', formatDate(u.joining_date));
  setText('backExpiry', expDate);
}

function calculateExpiryDate(joinDateStr, bookingDuration) {
  if (!joinDateStr) return '—';
  try {
    const d = new Date(joinDateStr);
    let durationStr = (bookingDuration || '').toLowerCase().trim();
    if (bookingDuration && bookingDuration.trim().match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return bookingDuration.trim();
    }
    
    if (!durationStr || durationStr === '—' || durationStr === 'not assigned') {
      d.setFullYear(d.getFullYear() + 4); // default 4 years for students
    } else if (durationStr.includes('month')) {
      const match = durationStr.match(/(\d+)\s*month/);
      const months = match ? parseInt(match[1]) : 1;
      d.setMonth(d.getMonth() + months);
    } else if (durationStr.includes('year')) {
      const match = durationStr.match(/(\d+)\s*year/);
      const years = match ? parseInt(match[1]) : 1;
      d.setFullYear(d.getFullYear() + years);
    } else if (durationStr.includes('semester')) {
      if (durationStr.includes('spring') || durationStr.includes('summer')) {
        d.setMonth(d.getMonth() + 4);
      } else {
        const match = durationStr.match(/(\d+)\s*semester/);
        const semesters = match ? parseInt(match[1]) : 1;
        d.setMonth(d.getMonth() + (semesters * 6));
      }
    } else {
      const matchMonth = durationStr.match(/(\d+)\s*m/);
      const matchYear = durationStr.match(/(\d+)\s*y/);
      if (matchMonth) {
        d.setMonth(d.getMonth() + parseInt(matchMonth[1]));
      } else if (matchYear) {
        d.setFullYear(d.getFullYear() + parseInt(matchYear[1]));
      } else {
        d.setFullYear(d.getFullYear() + 4);
      }
    }
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

// ---- QR CODE ----
function generateQRCode(u) {
  const qrContainer = document.getElementById('qrCode');
  if (!qrContainer) return;

  const qrData = JSON.stringify({
    name: u.full_name,
    id: u.registration_no,
    dept: u.department,
    hostel: u.hostel_name,
    room: u.room_no,
    phone: u.phone
  });

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  script.onload = () => {
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: qrData,
      width: 90, height: 90,
      colorDark: '#1C2331', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  };
  script.onerror = () => {
    qrContainer.innerHTML = `<div style="width:90px;height:90px;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#999;text-align:center">QR Code<br>${u.registration_no}</div>`;
  };
  document.head.appendChild(script);
}

// ---- HELPERS ----
function generateAvatarDataURL(name) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#326a33';
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  ctx.fillText(initials, 100, 100);
  return canvas.toDataURL();
}

function setText(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }
function formatDate(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return str; }
}

function showError(msg, title = 'Error Loading ID Card') {
  const isNotice = title !== 'Error Loading ID Card';
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:DM Sans,sans-serif;background:#f0f2f5">
      <div style="text-align:center;padding:40px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.1);max-width:400px">
        <i class="fas ${isNotice ? 'fa-info-circle' : 'fa-exclamation-triangle'}" style="font-size:3rem;color:${isNotice ? '#f39c12' : '#dc3545'};margin-bottom:16px"></i>
        <h3 style="margin-bottom:10px">${title}</h3>
        <p style="color:#6c757d">${msg}</p>
        <button onclick="window.history.back()" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#326a33;color:#fff;border-radius:8px;text-decoration:none;border:none;cursor:pointer;font-family:inherit;font-size:16px;">Go Back</button>
      </div>
    </div>`;
}
