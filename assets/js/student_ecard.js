// ============================================
// Student E-Card JS — FATA University Hostel
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
      showError(data2.message || 'Could not load E-card data.');
      return;
    }
    userData = data2.profile || data2.user;

    if (!userData.room_no || userData.room_no.trim() === '' || userData.room_no === 'Not Assigned') {
      showError('You have not assigned room please wait for approval.', 'Room Not Assigned');
      return;
    }

    renderECard(userData);
  } catch {
    userData = getDemoData();
    renderECard(userData);
  }
}

function getDemoData() {
  return {
    full_name: 'Asad Ullah', father_name: 'Muhammad Hanif',
    department: 'BS Computer Science', gender: 'Male', cnic: '12101-1234567-1',
    dob: '2003-03-16', phone: '03348761317', semester: '5th Semester',
    home_address: 'P/O Mishti mela Tesil Central District orakzai',
    profile_photo: '', registration_no: '2022-FU-1317',
    hostel_name: 'FAQIR IPI HOUSE', room_no: '53',
    joining_date: '2026-04-14'
  };
}

// ---- RENDER E-CARD ----
function renderECard(u) {
  const loading = document.getElementById('loadingState');
  const wrapper = document.getElementById('ecardWrapper');
  if (loading) loading.style.display = 'none';
  if (wrapper) wrapper.style.display = 'block';

  // Photo
  const photoEl = document.getElementById('cardPhoto');
  if (photoEl) {
    photoEl.src = u.profile_photo ? '../' + u.profile_photo : generateAvatarDataURL(u.full_name);
  }

  const expDate = calculateExpiryDate(u.joining_date, u.booking_duration);

  // Front Card fields
  setText('cardName', u.full_name || '—');
  setText('cardDept', u.department || 'Student');
  setText('cardRegNo', u.registration_no || '—');
  setText('cardHostel', u.hostel_name || '—');
  setText('cardRoom', u.room_no || '—');
  setText('cardSemester', u.semester || '—');
  setText('cardJoinDate', formatDate(u.joining_date));
  setText('cardExpiry', expDate);

  // Back Card fields
  setText('backFather', u.father_name || '—');
  setText('backCnic', u.cnic || '—');
  setText('backPhone', u.phone || '—');
  setText('backJoinDate', formatDate(u.joining_date));
  setText('backExpiry', expDate);

  generateQRCode(u);
}

function flipCard() {
  const card = document.getElementById('ecard');
  if (card) {
    card.classList.toggle('flipped');
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }
  return dateStr;
}

function calculateExpiryDate(joinDateStr, bookingDuration) {
  if (bookingDuration && bookingDuration.trim().match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return bookingDuration;
  }
  if (!joinDateStr) return '—';
  const joinDate = new Date(joinDateStr);
  if (isNaN(joinDate.getTime())) return '—';
  joinDate.setFullYear(joinDate.getFullYear() + 4);
  const dd = String(joinDate.getDate()).padStart(2, '0');
  const mm = String(joinDate.getMonth() + 1).padStart(2, '0');
  const yyyy = joinDate.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function generateQRCode(u) {
  const qrEl = document.getElementById('qrCode');
  if (!qrEl) return;
  qrEl.innerHTML = '';
  const host = window.location.origin;
  const verifyUrl = `${host}/hostel/verify_id.php?id=${u.id || 1}&role=Student`;
  new QRCode(qrEl, {
    text: verifyUrl,
    width: 90,
    height: 90,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

function generateAvatarDataURL(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2e7530';
  ctx.fillRect(0, 0, 120, 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S';
  ctx.fillText(initials, 60, 60);
  return canvas.toDataURL();
}

function showError(msg, title = 'Error') {
  const loading = document.getElementById('loadingState');
  if (loading) {
    loading.innerHTML = `
      <div style="max-width:320px;margin:0 auto;background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:12px;padding:24px;text-align:center">
        <i class="fas fa-exclamation-triangle" style="font-size:2.5rem;color:#ef4444;margin-bottom:12px"></i>
        <h4 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;color:#fff">${title}</h4>
        <p style="font-size:0.88rem;color:rgba(255,255,255,0.7);line-height:1.5;margin-bottom:18px">${msg}</p>
        <button class="action-btn secondary" onclick="window.history.back()">Go Back</button>
      </div>
    `;
  }
}
