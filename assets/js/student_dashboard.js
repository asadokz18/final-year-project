// ============================================
// Student Dashboard JS
// ============================================

const API = '../api/user.php';
const AUTH = '../api/auth.php';
let userProfile = null;
let loggedInUser = null;
let hasAssignedRoom = false;
let allNoticesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setDate();
  loadOverview();
});

async function checkAuth() {
  const fd = new FormData(); fd.append('action', 'check_session');
  const res = await fetch(AUTH, { method: 'POST', body: fd, credentials: 'include' });
  const data = await res.json();
  if (!data.logged_in || data.user_role === 'Admin') { window.location.href = '../login.html'; return; }
  const initials = data.user_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('sidebarName').textContent = data.user_name;
  document.getElementById('sidebarInitials').textContent = initials;
  document.getElementById('userChipName').textContent = data.user_name;
  document.getElementById('userChipAvatar').textContent = initials;
  document.getElementById('topbarWelcome').innerHTML = `Welcome, ${data.user_name.split(' ')[0]}! <span class="wave">👋</span>`;
  if (data.user_photo) {
    const img = `<img src="../${data.user_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    document.getElementById('sidebarAvatarImg').innerHTML = img;
    document.getElementById('userChipAvatar').innerHTML = img;
  }
  loggedInUser = data;
}

function setDate() {
  const el = document.getElementById('topbarDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.classList.toggle('active');

  // Toggle icon
  const icon = document.getElementById('hamIcon');
  if (icon) {
    if (sidebar.classList.contains('open')) {
      icon.classList.remove('fa-bars');
      icon.classList.add('fa-times');
    } else {
      icon.classList.remove('fa-times');
      icon.classList.add('fa-bars');
    }
  }
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 992) {
    document.getElementById('sidebar').classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.remove('active');
  }
}

function showSection(id, el) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.style.display = 'block';
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (el) el.classList.add('active');
  closeSidebarOnMobile();
  if (id === 'profile') loadMyProfile();
  if (id === 'myroom') loadMyRoom();
  if (id === 'applications') { loadMyRooms(); loadMyApplications(); }
  if (id === 'fees') loadMyFees();
  if (id === 'complaints') loadMyComplaints();
  if (id === 'gallery') { loadMyGallery(); loadCommunityGallery(); }
  if (id === 'settings') loadSettingsData();
}

async function loadOverview() {
  const roomData = await apiFetch('get_my_room', 'GET');
  if (roomData.room) {
    hasAssignedRoom = true;
    document.getElementById('ovRoom').textContent = 'Room ' + roomData.room.room_no;
    document.getElementById('ovHostel').textContent = roomData.room.hostel_name;
    document.getElementById('idReadyBanner').style.display = 'flex';
    document.getElementById('overviewRoom').innerHTML = `<div class="room-info-box">
      <img class="room-info-img" src="${roomData.room.room_image ? '../' + roomData.room.room_image : '../assets/images/FAQIR_IPI_HOUSE.jpg'}" alt="Room"/>
      <div class="room-info-details">
        <h4>Room ${roomData.room.room_no}</h4>
        <p>${roomData.room.description || 'Your assigned room.'}</p>
        <span class="room-badge"><i class="fas fa-home"></i> ${roomData.room.hostel_name}</span>
        <div class="roommates-preview" style="margin-top:12px;border-top:1px solid #f0f0f0;padding-top:10px">
          <p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Roommates</p>
          ${roomData.room.roommates?.length ? `
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${roomData.room.roommates.map(rm => `
                <div title="${rm.full_name}" style="width:30px;height:30px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.1)">
                  ${rm.profile_photo ? `<img src="../${rm.profile_photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : rm.full_name[0]}
                </div>
              `).join('')}
            </div>
          ` : '<p style="font-size:0.8rem;color:var(--text-muted)">No roommates yet.</p>'}
        </div>
      </div></div>`;
  } else {
    document.getElementById('overviewRoom').innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem">No room assigned yet. <a href="#" onclick="showSection('applications')" style="color:var(--primary);font-weight:600">Apply for a room</a></p>`;
  }
  const feeData = await apiFetch('get_my_fees', 'GET');
  if (feeData.success) {
    document.getElementById('ovPaid').textContent = 'Rs. ' + parseFloat(feeData.total_paid || 0).toFixed(0);
    document.getElementById('ovDue').textContent = 'Rs. ' + parseFloat(feeData.total_due || 0).toFixed(0);
  }
  const noticeData = await apiFetch('get_notices', 'GET');
  const nd = document.getElementById('overviewNotices');
  if (noticeData.notices?.length) {
    allNoticesCache = noticeData.notices;
    const topThree = noticeData.notices.slice(0, 3);
    const itemsHTML = topThree.map(n => `<div class="notice-item" style="margin-bottom:15px;padding:12px;background:#f8f9fa;border-left:4px solid var(--primary);border-radius:6px;box-shadow:0 2px 5px rgba(0,0,0,0.02);"><div style="display:flex;gap:8px;margin-bottom:6px"><span class="badge-status badge-${n.priority.toLowerCase()}">${n.priority}</span><span style="font-size:0.76rem;color:var(--text-muted)">${new Date(n.created_at).toLocaleDateString()}</span></div><h4 style="margin-bottom:6px;font-size:0.95rem;">${n.title}</h4><p style="font-size:0.85rem;color:#555;margin:0;line-height:1.4;">${n.message}</p></div>`).join('');
    nd.innerHTML = `<marquee behavior="scroll" direction="up" scrollamount="3" onmouseover="this.stop();" onmouseout="this.start();" style="height:250px; padding:4px;">${itemsHTML}</marquee>`;
    document.getElementById('noticeCount').innerHTML = `${noticeData.notices.length} notices <a href="#" onclick="showAllNotices(event)" style="margin-left:10px;color:var(--primary);text-decoration:underline;font-weight:600;">View All</a>`;
  } else nd.innerHTML = '<p style="color:var(--text-muted)">No active notices.</p>';

  try {
    const gRes = await fetch('../api/public.php?action=get_gallery&limit=3');
    const gData = await gRes.json();
    const og = document.getElementById('overviewGallery');
    if (gData.gallery && gData.gallery.length) {
      og.innerHTML = gData.gallery.map(g => `<div class="gallery-preview-img"><img src="../${g.image_path}" alt="Gallery" /></div>`).join('');
    } else {
      og.innerHTML = `
        <div class="gallery-preview-img"><img src="../assets/images/hero-image3.jpg" alt="Campus" /></div>
        <div class="gallery-preview-img"><img src="../assets/images/hero-image4.jpg" alt="Campus" /></div>
        <div class="gallery-preview-img"><img src="../assets/images/hero-image1.jpeg" alt="Campus" /></div>
      `;
    }
  } catch (e) { }
}

async function loadMyProfile() {
  const data = await apiFetch('get_profile', 'GET');
  if (!data.success) return;
  const p = data.profile; userProfile = p;
  const initials = p.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const photoEl = document.getElementById('profilePhotoDisplay');
  if (p.profile_photo) photoEl.innerHTML = `<img src="../${p.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  else photoEl.textContent = initials;
  document.getElementById('profileNameDisplay').textContent = p.full_name;
  const fields = [['Full Name', p.full_name], ['Father Name', p.father_name], ['Email', p.email], ['Phone', p.phone], ['Gender', p.gender], ['Department', p.department], ['Semester', p.semester], ['Reg. No', p.registration_no || p.employee_id], ['Home Address', p.home_address]];
  document.getElementById('profileDetails').innerHTML = fields.map(([k, v]) => `<div class="profile-detail-item"><label>${k}</label><p>${v || '—'}</p></div>`).join('');
}

async function loadMyRoom() {
  const div = document.getElementById('myRoomContent');
  const data = await apiFetch('get_my_room', 'GET');
  if (!data.room) { div.innerHTML = `<div style="background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.06)"><div style="font-size:3rem;margin-bottom:16px">🚪</div><h3>No Room Assigned Yet</h3><p style="color:var(--text-muted);margin:10px 0 20px">Apply for a room from the Applications section.</p><a href="#" class="btn btn-primary" onclick="showSection('applications')"><i class="fas fa-plus"></i> Apply for Room</a></div>`; return; }
  const r = data.room;
  div.innerHTML = `<div style="background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.06);overflow:hidden;max-width:700px"><div style="padding:20px;border-bottom:1px solid #f0f0f0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px"><div><div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Room Number</div><div style="font-size:2rem;font-weight:800;color:var(--primary)">${r.room_no}</div></div><div><div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Capacity</div><div style="font-size:1.8rem;font-weight:800">${r.capacity} Beds</div></div><div><div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Available</div><div style="font-size:1.8rem;font-weight:800;color:#198754">${r.available_spaces} left</div></div></div><div style="padding:20px"><img src="${r.room_image ? '../' + r.room_image : '../assets/images/FAQIR_IPI_HOUSE.jpg'}" style="width:100%;height:200px;object-fit:cover;border-radius:10px;margin-bottom:14px"/><p style="color:var(--text-muted);margin-bottom:12px">${r.description || 'Your assigned room.'}</p><span style="display:inline-flex;align-items:center;gap:6px;font-size:0.85rem;color:var(--primary);font-weight:600;margin-bottom:16px"><i class="fas fa-home"></i> ${r.hostel_name}</span><h4 style="margin-bottom:10px">Roommates</h4>${r.roommates?.length ? r.roommates.map(rm => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5"><div style="width:34px;height:34px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.82rem">${rm.full_name[0]}</div><span style="font-weight:600">${rm.full_name}</span></div>`).join('') : '<p style="color:var(--text-muted);font-size:0.88rem">No roommates yet.</p>'}<button class="btn btn-danger btn-sm" style="margin-top:16px" onclick="leaveRoom()"><i class="fas fa-sign-out-alt"></i> Request Room Leave</button></div></div>`;
}

async function leaveRoom() {
  if (!confirm('Request to leave your room?')) return;
  const fd = new FormData(); fd.append('action', 'leave_room');
  const data = await apiFetch('leave_room', 'POST', fd);
  alert(data.message);
  if (data.success) loadMyRoom();
}

async function loadMyRooms() {
  const status = document.getElementById('roomStatusFilter')?.value || '';
  const grid = document.getElementById('availableRoomsGrid');
  grid.innerHTML = '<div class="spinner"></div>';
  const data = await apiFetch(`get_rooms${status ? '&status=' + status : ''}`, 'GET');
  if (!data.rooms?.length) { grid.innerHTML = '<p style="color:var(--text-muted)">No rooms available.</p>'; return; }
  grid.innerHTML = data.rooms.map(r => `
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06);transition:all 0.2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
      <div style="height:150px;overflow:hidden;position:relative">
        <img src="${r.room_image ? '../' + r.room_image : '../assets/images/hero-image1.jpeg'}" style="width:100%;height:100%;object-fit:cover"/>
        <span style="position:absolute;top:10px;right:10px;padding:4px 10px;border-radius:16px;font-size:0.75rem;font-weight:700;background:${r.available_spaces > 0 ? '#198754' : '#dc3545'};color:#fff">${r.available_spaces > 0 ? 'Available' : 'Full'}</span>
      </div>
      <div style="padding:14px">
        <h4 style="margin-bottom:6px;font-size:0.9rem">Room ${r.room_no}</h4>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:10px">${r.description?.substring(0, 60) || 'Standard room'}</p>
        <div style="display:flex;gap:10px;font-size:0.78rem;color:var(--text-muted);margin-bottom:12px">
          <span><i class="fas fa-users"></i> ${r.capacity} beds</span>
          <span><i class="fas fa-door-open"></i> ${r.available_spaces} free</span>
        </div>
        ${r.available_spaces > 0 ? `
          <div style="margin-bottom:12px;text-align:left;">
            <label style="font-size:0.75rem;font-weight:600;color:#2c3e50;display:block;margin-bottom:4px;">Expiry Date (DD/MM/YYYY) *</label>
            <input type="date" id="customDurationInput-${r.id}" style="width:100%;padding:8px;border:1px solid #ced4da;border-radius:6px;font-size:0.8rem;box-sizing:border-box;" />
          </div>
          <button class="btn btn-primary btn-sm" style="width:100%" onclick="applyRoom(${r.id})"><i class="fas fa-plus"></i> Apply</button>
        ` : '<button class="btn btn-sm" style="width:100%;background:var(--light-gray);color:var(--text-muted)" disabled>Full</button>'}
      </div>
    </div>`).join('');
}

async function applyRoom(roomId) {
  const rawDate = document.getElementById(`customDurationInput-${roomId}`).value;
  if (!rawDate) {
    alert('Please select an expiry date.');
    return;
  }
  let duration = '';
  const parts = rawDate.split('-'); // [YYYY, MM, DD]
  if (parts.length === 3) {
    duration = `${parts[2]}/${parts[1]}/${parts[0]}`;
  } else {
    duration = rawDate;
  }

  if (!confirm(`Apply for this room with duration: ${duration}?`)) return;

  const fd = new FormData();
  fd.append('action', 'apply_room');
  fd.append('room_id', roomId);
  fd.append('booking_duration', duration);

  const data = await apiFetch('apply_room', 'POST', fd);
  alert(data.message);
  if (data.success) {
    loadMyApplications();
    loadMyRooms();
  }
}

async function loadMyApplications() {
  const body = document.getElementById('myAppsBody');
  const data = await apiFetch('get_my_applications', 'GET');
  if (!data.applications?.length) { body.innerHTML = '<tr><td colspan="6" class="no-data">No applications yet.</td></tr>'; return; }
  body.innerHTML = data.applications.map(a => `<tr><td>${new Date(a.applied_at).toLocaleDateString()}</td><td>${a.hostel_name}</td><td>Room ${a.room_no}</td><td>${a.application_type}</td><td>${a.booking_duration || '—'}</td><td><span class="badge-status badge-${a.status.toLowerCase()}">${a.status}</span></td></tr>`).join('');
}

async function loadMyFees() {
  const data = await apiFetch('get_my_fees', 'GET');
  document.getElementById('feePaidTotal').textContent = 'Rs. ' + parseFloat(data.total_paid || 0).toFixed(2);
  document.getElementById('feeDueTotal').textContent = 'Rs. ' + parseFloat(data.total_due || 0).toFixed(2);
  const body = document.getElementById('feeTableBody');
  if (!data.fees?.length) { body.innerHTML = '<tr><td colspan="5" class="no-data">No fee records.</td></tr>'; return; }
  body.innerHTML = data.fees.map((f, i) => {
    let actionHtml = '—';
    if (f.status === 'Paid' && f.receipt_no) {
      actionHtml = `<button class="btn btn-sm btn-outline" onclick="downloadReceipt('${f.receipt_no}','${f.fee_month} ${f.fee_year}','${f.amount}')"><i class="fas fa-download"></i> Receipt</button>`;
    } else if (f.status === 'Unpaid' || f.status === 'Partial') {
      actionHtml = `<button class="btn btn-sm" style="background:var(--primary);color:#fff;" onclick="openPaymentModal(${f.id})"><i class="fas fa-wallet"></i> Pay Online</button>`;
    } else if (f.status === 'Pending Verification') {
      actionHtml = `<span style="font-size:0.8rem;color:var(--text-muted)"><i class="fas fa-hourglass-half"></i> Under Review</span>`;
    }
    return `<tr><td>${i + 1}</td><td>${f.fee_month} ${f.fee_year}</td><td>Rs. ${parseFloat(f.amount).toFixed(2)}</td><td><span class="badge-status badge-${f.status.replace(' ', '-').toLowerCase()}">${f.status}</span></td><td>${actionHtml}</td></tr>`;
  }).join('');
}

function openPaymentModal(feeId) {
  window.location.href = `../pay-online.html?fee_id=${feeId}`;
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}



function downloadReceipt(rn, month, amount) {
  const name = userProfile?.full_name || 'Student';
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Fee Receipt</title><style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto}h2{color:#326a33;text-align:center}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}@media print{button{display:none}}</style></head><body><h2>FATA University Hostel</h2><h3 style="text-align:center">Fee Receipt</h3><div class="row"><span>Receipt No:</span><strong>${rn}</strong></div><div class="row"><span>Name:</span><strong>${name}</strong></div><div class="row"><span>Period:</span><strong>${month}</strong></div><div class="row"><span>Amount:</span><strong>Rs. ${parseFloat(amount).toFixed(2)}</strong></div><div class="row"><span>Status:</span><strong style="color:#198754">PAID</strong></div><br><button onclick="window.print()">🖨️ Print</button></body></html>`);
  w.document.close();
}

async function submitComplaint() {
  const title = document.getElementById('complaintTitle').value.trim();
  const desc = document.getElementById('complaintDesc').value.trim();
  const alertBox = document.getElementById('complaintAlert');
  if (!title || !desc) { alertBox.innerHTML = '<div class="alert alert-warning">Fill all fields.</div>'; return; }
  const fd = new FormData(); fd.append('action', 'submit_complaint'); fd.append('title', title); fd.append('description', desc);
  const data = await apiFetch('submit_complaint', 'POST', fd);
  alertBox.innerHTML = data.success ? `<div class="alert alert-success">${data.message}</div>` : `<div class="alert alert-danger">${data.message}</div>`;
  if (data.success) { document.getElementById('complaintTitle').value = ''; document.getElementById('complaintDesc').value = ''; loadMyComplaints(); }
}

async function loadMyComplaints() {
  const body = document.getElementById('myComplaintsBody');
  const data = await apiFetch('get_my_complaints', 'GET');
  if (!data.complaints?.length) { body.innerHTML = '<tr><td colspan="3" class="no-data">Inbox is empty.</td></tr>'; return; }
  body.innerHTML = data.complaints.map(c => `<tr><td>${new Date(c.submitted_at).toLocaleDateString()}</td><td>${c.title}</td><td><span class="badge-status badge-${c.status === 'Resolved' ? 'approved' : c.status === 'Pending' ? 'pending' : 'important'}">${c.status}</span></td></tr>`).join('');
}

async function uploadMyGallery() {
  const file = document.getElementById('galleryUploadFile').files[0];
  const caption = document.getElementById('galleryUploadCaption').value;
  const alertBox = document.getElementById('galleryAlert');
  if (!file) { alertBox.innerHTML = '<div class="alert alert-warning">Select a photo.</div>'; return; }
  const fd = new FormData(); fd.append('action', 'upload_gallery'); fd.append('photo', file); fd.append('caption', caption);
  const data = await apiFetch('upload_gallery', 'POST', fd);
  alertBox.innerHTML = data.success ? `<div class="alert alert-success">${data.message}</div>` : `<div class="alert alert-danger">${data.message}</div>`;
  if (data.success) { document.getElementById('galleryUploadFile').value = ''; document.getElementById('galleryUploadCaption').value = ''; loadMyGallery(); loadCommunityGallery(); }
}

async function loadCommunityGallery() {
  const grid = document.getElementById('communityGalleryGrid');
  if (!grid) return;
  try {
    const res = await fetch('../api/public.php?action=get_gallery&limit=30');
    const data = await res.json();
    if (!data.gallery?.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;grid-column:1/-1">No approved photos in the community gallery yet.</p>';
      return;
    }
    grid.innerHTML = data.gallery.map(g => `
      <div style="border-radius:8px;overflow:hidden;position:relative;aspect-ratio:1;cursor:pointer" onclick="openGalleryLightbox('../${g.image_path}')">
        <img src="../${g.image_path}" style="width:100%;height:100%;object-fit:cover" alt="${g.caption || 'Gallery'}" loading="lazy">
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.45);color:#fff;font-size:0.7rem;padding:4px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.caption || ''}</div>
        <div style="position:absolute;top:6px;right:6px;background:rgba(25,135,84,0.9);color:#fff;font-size:0.65rem;font-weight:700;padding:2px 7px;border-radius:10px">✓ Approved</div>
      </div>`).join('');
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;grid-column:1/-1">Could not load community gallery.</p>';
  }
}

function openGalleryLightbox(src) {
  const overlay = document.createElement('div');
  overlay.id = 'galleryLightbox';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:99999;cursor:zoom-out;';
  overlay.innerHTML = `
    <div style="position:relative;max-width:90vw;max-height:90vh">
      <button onclick="document.getElementById('galleryLightbox').remove()" style="position:absolute;top:-40px;right:0;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;line-height:1">&times;</button>
      <img src="${src}" style="max-width:90vw;max-height:85vh;border-radius:10px;object-fit:contain;box-shadow:0 8px 40px rgba(0,0,0,0.5)" alt="Gallery Photo">
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

async function loadMyGallery() {
  const grid = document.getElementById('myGalleryGrid');
  const data = await apiFetch('get_my_gallery', 'GET');
  if (!data.gallery?.length) { grid.innerHTML = '<p style="color:var(--text-muted)">No photos yet.</p>'; return; }
  grid.innerHTML = data.gallery.map(g => `<div style="border-radius:8px;overflow:hidden"><img src="../${g.image_path}" style="width:100%;aspect-ratio:1;object-fit:cover"/><div style="padding:6px;background:#f9f9f9;font-size:0.75rem"><p style="margin-bottom:2px;font-weight:600">${g.caption || 'No caption'}</p><span class="badge-status badge-${g.status.toLowerCase()}">${g.status}</span></div></div>`).join('');
}

async function loadSettingsData() {
  const data = await apiFetch('get_profile', 'GET');
  if (!data.success) return;
  const p = data.profile; userProfile = p;
  document.getElementById('settingsPhone').value = p.phone || '';
  document.getElementById('settingsAddress').value = p.home_address || '';
  document.getElementById('settingsEmail').value = p.email || '';
  if (document.getElementById('settingsSemester')) {
    document.getElementById('settingsSemester').value = p.semester || '';
  }
}

async function uploadProfilePhoto(input) {
  if (!input.files[0]) return;
  const fd = new FormData(); fd.append('action', 'update_profile'); fd.append('profile_photo', input.files[0]);
  fd.append('phone', document.getElementById('settingsPhone').value);
  fd.append('home_address', document.getElementById('settingsAddress').value);
  if (document.getElementById('settingsSemester')) {
    fd.append('semester', document.getElementById('settingsSemester').value);
  }
  const data = await apiFetch('update_profile', 'POST', fd);
  document.getElementById('settingsAlert').innerHTML = data.success ? '<div class="alert alert-success">Photo updated!</div>' : `<div class="alert alert-danger">${data.message}</div>`;
  if (data.success) location.reload();
}

async function updateSettings() {
  const fd = new FormData(); fd.append('action', 'update_profile');
  fd.append('phone', document.getElementById('settingsPhone').value);
  fd.append('home_address', document.getElementById('settingsAddress').value);
  if (document.getElementById('settingsSemester')) {
    fd.append('semester', document.getElementById('settingsSemester').value);
  }
  const data = await apiFetch('update_profile', 'POST', fd);
  document.getElementById('settingsAlert').innerHTML = data.success ? `<div class="alert alert-success">${data.message}</div>` : `<div class="alert alert-danger">${data.message}</div>`;
}

async function updatePassword() {
  const current = document.getElementById('currentPwd').value;
  const newPwd = document.getElementById('newPwd').value;
  const confirm = document.getElementById('confirmPwd').value;
  const alertBox = document.getElementById('passwordAlert');
  if (newPwd !== confirm) { alertBox.innerHTML = '<div class="alert alert-warning">Passwords do not match.</div>'; return; }
  const fd = new FormData(); fd.append('action', 'update_password'); fd.append('current_password', current); fd.append('new_password', newPwd); fd.append('confirm_password', confirm);
  const data = await fetch(AUTH, { method: 'POST', body: fd, credentials: 'include' }).then(r => r.json());
  alertBox.innerHTML = data.success ? `<div class="alert alert-success">${data.message}</div>` : `<div class="alert alert-danger">${data.message}</div>`;
  if (data.success) { document.getElementById('currentPwd').value = ''; document.getElementById('newPwd').value = ''; document.getElementById('confirmPwd').value = ''; }
}

async function updateAccountInfo() {
  const fd = new FormData(); fd.append('action', 'update_settings');
  fd.append('email', document.getElementById('settingsEmail').value);
  fd.append('phone', document.getElementById('settingsPhone').value);
  fd.append('home_address', document.getElementById('settingsAddress').value);
  const data = await apiFetch('update_settings', 'POST', fd);
  document.getElementById('settingsAlert').innerHTML = data.success ? `<div class="alert alert-success">${data.message}</div>` : `<div class="alert alert-danger">${data.message}</div>`;
}

// ============ LOGOUT & NOTICES ============
async function doLogout(e) {
  if (e) e.preventDefault();
  const modalHTML = `
    <div id="logoutModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;opacity:0;transition:opacity 0.3s ease;backdrop-filter:blur(4px);">
      <div style="background:#fff;border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 15px 50px rgba(0,0,0,0.2);transform:translateY(20px);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        <div style="width:70px;height:70px;background:#ffebee;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:#f44336;font-size:2.2rem;">
          <i class="fas fa-sign-out-alt"></i>
        </div>
        <h3 style="font-family:'Playfair Display',serif;font-size:1.6rem;color:#2c3e50;margin-bottom:12px;font-weight:700;">Ready to leave?</h3>
        <p style="color:#6c757d;font-size:1rem;line-height:1.6;margin-bottom:28px;">Are you sure you want to log out of your dashboard?</p>
        <div style="display:flex;gap:12px;justify-content:center;">
           <button onclick="document.getElementById('logoutModal').remove()" style="background:#f1f3f5;color:#495057;border:none;padding:12px 24px;border-radius:30px;font-size:1rem;font-weight:600;cursor:pointer;flex:1;">Cancel</button>
           <button onclick="confirmLogout()" style="background:#dc3545;color:#fff;border:none;padding:12px 24px;border-radius:30px;font-size:1rem;font-weight:600;cursor:pointer;flex:1;box-shadow:0 4px 15px rgba(220,53,69,0.3);">Logout</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('logoutModal');
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    modal.children[0].style.transform = 'translateY(0)';
  });
}

window.confirmLogout = async function () {
  const fd = new FormData(); fd.append('action', 'logout');
  await fetch(AUTH, { method: 'POST', body: fd, credentials: 'include' });
  window.location.href = '../login.html';
}

window.showAllNotices = function (e) {
  if (e) e.preventDefault();
  if (!allNoticesCache.length) return alert('No notices available.');
  const html = allNoticesCache.map(n => `
      <div style="margin-bottom:15px;padding:15px;background:#f8f9fa;border-left:4px solid var(--primary);border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.04);text-align:left;">
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <span class="badge-status badge-${n.priority.toLowerCase()}">${n.priority}</span>
          <span style="font-size:0.8rem;color:var(--text-muted)"><i class="far fa-calendar-alt"></i> ${new Date(n.created_at).toLocaleDateString()}</span>
        </div>
        <h4 style="margin-bottom:8px;font-size:1.05rem;color:#2c3e50;">${n.title}</h4>
        <p style="font-size:0.9rem;color:#555;margin:0;line-height:1.5;">${n.message}</p>
      </div>`).join('');

  const modalHTML = `
    <div id="allNoticesModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);opacity:0;transition:opacity 0.3s ease;">
      <div style="background:#fff;border-radius:12px;width:90%;max-width:550px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 15px 50px rgba(0,0,0,0.2);transform:scale(0.95);transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        <div style="padding:20px 24px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;background:#fdfdfd;border-radius:12px 12px 0 0;">
          <h3 style="margin:0;font-size:1.25rem;color:#2c3e50;"><i class="fas fa-bullhorn" style="color:var(--primary);margin-right:8px;"></i> All Notices</h3>
          <button onclick="document.getElementById('allNoticesModal').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#999;transition:color 0.2s;" onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'">&times;</button>
        </div>
        <div style="padding:24px;overflow-y:auto;flex:1;">
          ${html}
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('allNoticesModal');
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    modal.children[0].style.transform = 'scale(1)';
  });
}

async function apiFetch(action, method = 'GET', fd = null) {
  try {
    const url = API + (method === 'GET' ? '?action=' + action : '');
    const opts = { method, credentials: 'include' };
    if (method === 'POST') opts.body = fd;
    return await (await fetch(url, opts)).json();
  } catch { return { success: false }; }
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href="student_id_card.html"], a[href="faculty_id_card.html"]');
  if (link) {
    if (typeof hasAssignedRoom !== 'undefined' && !hasAssignedRoom) {
      e.preventDefault();
      showAccessDeniedToast('You have not assigned room please wait for approval.');
    }
  }
});

function showAccessDeniedToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:80px;right:20px;z-index:99999;background:#fff;border-left:4px solid #f39c12;padding:16px 20px;border-radius:8px;box-shadow:0 8px 25px rgba(0,0,0,0.15);display:flex;align-items:center;gap:12px;transform:translateX(150%);transition:transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);max-width:320px;';
  t.innerHTML = `<div style="color:#f39c12;font-size:1.5rem;"><i class="fas fa-exclamation-triangle"></i></div>
                 <div style="color:#2c3e50;font-size:0.95rem;font-weight:500;font-family:'DM Sans',sans-serif;line-height:1.4;">${msg}</div>`;
  document.body.appendChild(t);

  requestAnimationFrame(() => {
    t.style.transform = 'translateX(0)';
  });

  setTimeout(() => {
    t.style.transform = 'translateX(150%)';
    setTimeout(() => t.remove(), 400);
  }, 4000);
}

async function downloadMyFeesPDF() {
  const data = await apiFetch('get_my_fees', 'GET');
  if (!data.success || !data.fees?.length) {
    alert('No fee records found to generate PDF.');
    return;
  }
  const name = loggedInUser?.user_name || userProfile?.full_name || 'Student';
  const email = loggedInUser?.user_email || userProfile?.email || 'info@fu.edu.pk';
  const w = window.open('', '_blank');
  let rowsHtml = data.fees.map((f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${f.fee_month} ${f.fee_year}</td>
      <td>Rs. ${parseFloat(f.amount).toFixed(2)}</td>
      <td>${f.status}</td>
      <td>${f.receipt_no || '—'}</td>
    </tr>
  `).join('');

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>My Fee Report</title>
      <style>
        body { font-family: 'DM Sans', sans-serif; color: #333; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #326a33; padding-bottom: 20px; }
        .header h1 { margin: 0; color: #326a33; font-size: 24px; }
        .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 13px; }
        th { background-color: #f4f6f8; font-weight: bold; color: #326a33; }
        tr:nth-child(even) { background-color: #fafafa; }
        .footer { margin-top: 40px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        .print-btn { display: inline-block; background-color: #326a33; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-bottom: 20px; }
        @media print {
          .print-btn { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>FATA University Hostel</h1>
        <p>Student Fee Statement Report | Generated on ${new Date().toLocaleDateString()}</p>
        <p><strong>Name:</strong> ${name} | <strong>Email:</strong> ${email}</p>
      </div>
      <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Month/Year</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Receipt No</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="footer">
        <p>© ${new Date().getFullYear()} FATA University. All rights reserved.</p>
      </div>
    </body>
    </html>
  `);
  w.document.close();
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.innerHTML = inp.type === 'password'
    ? '<i class="fas fa-eye"></i>'
    : '<i class="fas fa-eye-slash"></i>';
}
