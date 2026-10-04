// ============================================
// Faculty Dashboard JS — FATA University Hostel
// Fixed: correct API action names, session handling
// ============================================

const USER_API  = '../api/user.php';
const AUTH_API = '../api/auth.php';
const PUB_API  = '../api/public.php';

let currentUser = null;
let hasAssignedRoom = false;
let allNoticesCache = [];

document.addEventListener('DOMContentLoaded', () => {
  setDate();
  loadSession();
});

function setDate() {
  const el = document.getElementById('topbarDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-PK', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ============================================
// SESSION — must use credentials: 'include' for session cookies
// ============================================
/**
 * Verifies the user session and role. Redirects unauthorized users.
 * Initializes the dashboard UI upon successful verification.
 */
async function loadSession() {
  try {
    const res  = await fetch(AUTH_API + '?action=check_session', { credentials: 'include' });
    const data = await res.json();

    if (!data.logged_in) { window.location.href = '../login.html'; return; }
    if (data.user_role !== 'Faculty') {
      window.location.href = data.user_role === 'Admin'
        ? '../admin/dashboard.html'
        : '../student/dashboard.html';
      return;
    }
    currentUser = data;
    applyUserUI(data);
    loadOverview();
  } catch (e) {
    console.error('Session error:', e);
    window.location.href = '../login.html';
  }
}

function applyUserUI(u) {
  const name     = u.user_name || 'Faculty';
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  setText('topbarWelcome', `Welcome, ${name.split(' ')[0]}! 👋`);
  setText('sidebarName',   name);
  setText('userChipName',  name);

  const sidebarAv = document.getElementById('sidebarAvatarImg');
  const chipAv    = document.getElementById('userChipAvatar');

  if (u.user_photo) {
    const imgTag = `<img src="../${u.user_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    if (sidebarAv) sidebarAv.innerHTML = imgTag;
    if (chipAv)    chipAv.innerHTML    = imgTag;
  } else {
    const initEl = document.getElementById('sidebarInitials');
    if (initEl)  initEl.textContent = initials;
    if (chipAv)  chipAv.textContent = initials;
  }
}

// ============================================
// SIDEBAR
// ============================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
  const ov = document.getElementById('sidebarOverlay');
  if (ov) ov.classList.toggle('active');

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
    const ov = document.getElementById('sidebarOverlay');
    if (ov) ov.classList.remove('active');
  }
}

function showSection(name, el) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.style.display = 'block';
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (el) el.classList.add('active');
  closeSidebarOnMobile();
  if (name === 'myroom')       loadMyRoom();
  if (name === 'applications') { loadAvailableRooms(); loadMyApplications(); }
  if (name === 'fees')         loadFees();
  if (name === 'complaints')   loadComplaints();
  if (name === 'gallery')      { loadGallery(); loadCommunityGallery(); }
  if (name === 'profile')      loadProfile();
  if (name === 'settings')     loadSettingsData();
  return false;
}

// ============================================
// OVERVIEW — using correct action: get_stats
// ============================================
/**
 * Fetches dashboard stats including room status, hostel name, and fees.
 * Triggers rendering of the room info box and notice board.
 */
async function loadOverview() {
  try {
    const res  = await fetch(USER_API + '?action=get_stats', { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setText('ovRoom',   data.room_no     ? 'Room ' + data.room_no : '—');
      setText('ovHostel', data.hostel_name || '—');
      setText('ovPaid',   'Rs. ' + (data.fees_paid || '0'));
      setText('ovDue',    'Rs. ' + (data.fees_due  || '0'));
      if (data.room_no) {
        hasAssignedRoom = true;
        const banner = document.getElementById('idReadyBanner');
        if (banner) banner.style.display = 'flex';
      }
      // Show room info in overview card
      const el = document.getElementById('overviewRoom');
      if (el) {
        if (data.room_no) {
          el.innerHTML = `<div class="room-info-box">
            <img class="room-info-img" src="${data.room_image ? '../'+data.room_image : '../assets/images/KHYBER_HOUSE.jpg'}" alt="Room">
            <div class="room-info-details">
              <h4>Room ${data.room_no}</h4>
              <p>${data.description || 'Your assigned faculty room.'}</p>
              <span class="room-badge"><i class="fas fa-home"></i> ${data.hostel_name || '—'}</span>
              <div class="roommates-preview" style="margin-top:12px;border-top:1px solid #f0f0f0;padding-top:10px">
                <p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Roommates</p>
                ${data.roommates?.length ? `
                  <div style="display:flex;flex-wrap:wrap;gap:8px">
                    ${data.roommates.map(rm => `
                      <div title="${rm.full_name}" style="width:30px;height:30px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.1)">
                        ${rm.profile_photo ? `<img src="../${rm.profile_photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : rm.full_name[0]}
                      </div>
                    `).join('')}
                  </div>
                ` : '<p style="font-size:0.8rem;color:var(--text-muted)">No roommates yet.</p>'}
              </div>
            </div></div>`;
        } else {
          el.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem">No room assigned yet. <a href="#" onclick="showSection('applications',null);return false;" style="color:var(--primary);font-weight:600">Apply for a room →</a></p>`;
        }
      }
    }
  } catch (e) { console.error('Overview error:', e); }

  loadNotices();
  loadGalleryPreview();
}

// ============================================
// NOTICES (public — no auth needed)
// ============================================
async function loadNotices() {
  const el = document.getElementById('overviewNotices');
  if (!el) return;
  try {
    const res  = await fetch(PUB_API + '?action=get_notices&limit=4');
    const data = await res.json();
    if (!data.notices?.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem">No active notices.</p>';
      return;
    }
    allNoticesCache = data.notices;
    const topThree = data.notices.slice(0, 3);
    const itemsHTML = topThree.map(n => `
      <div class="notice-item" style="margin-bottom:15px;padding:12px;background:#f8f9fa;border-left:4px solid var(--primary);border-radius:6px;box-shadow:0 2px 5px rgba(0,0,0,0.02);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span class="badge-status badge-${n.priority.toLowerCase()}">${n.priority}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">${formatDate(n.created_at)}</span>
        </div>
        <h4 style="margin-bottom:6px;font-size:0.95rem;">${n.title}</h4>
        <p style="font-size:0.85rem;color:#555;margin:0;line-height:1.4;">${n.message}</p>
      </div>`).join('');
    el.innerHTML = `<marquee behavior="scroll" direction="up" scrollamount="3" onmouseover="this.stop();" onmouseout="this.start();" style="height:250px; padding:4px;">${itemsHTML}</marquee>`;
    const cnt = document.getElementById('noticeCount');
    if (cnt) cnt.innerHTML = `${data.notices.length} notices <a href="#" onclick="showAllNotices(event)" style="margin-left:10px;color:var(--primary);text-decoration:underline;font-weight:600;">View All</a>`;
  } catch (e) { console.error('Notices error:', e); }
}

// ============================================
// GALLERY PREVIEW (public — no auth)
// ============================================
async function loadGalleryPreview() {
  const el = document.getElementById('overviewGallery');
  if (!el) return;
  try {
    const res  = await fetch(PUB_API + '?action=get_gallery&limit=6');
    const data = await res.json();
    if (!data.gallery?.length) return;
    el.innerHTML = data.gallery.map(img => `
      <div class="gallery-preview-img">
        <img src="../${img.image_path}" alt="${img.caption || ''}" loading="lazy">
      </div>`).join('');
  } catch (e) { console.error('Gallery preview error:', e); }
}

// ============================================
// MY ROOM — correct action: get_my_room
// ============================================
/**
 * Loads the details of the currently assigned room for the faculty member.
 * Displays roommates and provides a "Request to Leave" button.
 */
async function loadMyRoom() {
  const el = document.getElementById('myRoomContent');
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const res  = await fetch(USER_API + '?action=get_my_room', { credentials: 'include' });
    const data = await res.json();

    if (!data.success || !data.room) {
      el.innerHTML = `<div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.06)">
        <i class="fas fa-door-open" style="font-size:3rem;color:#ccc;margin-bottom:16px"></i>
        <h3 style="margin-bottom:8px">No Room Assigned Yet</h3>
        <p style="color:var(--text-muted);margin-bottom:20px">Apply for a faculty room from the Applications section.</p>
        <a href="#" class="btn btn-primary" onclick="showSection('applications',null);return false;">
          <i class="fas fa-plus"></i> Apply for Room
        </a></div>`;
      return;
    }

    const r = data.room;
    el.innerHTML = `
      <div style="background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.06);overflow:hidden">
        <div style="padding:20px;border-bottom:1px solid #f0f0f0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;text-align:center">
          <div class="overview-card" style="margin:0;border-top:3px solid var(--primary)">
            <div class="overview-icon">🚪</div>
            <div class="overview-value">${r.room_no || '—'}</div>
            <div class="overview-label">Room No</div>
          </div>
          <div class="overview-card" style="margin:0;border-top:3px solid var(--secondary)">
            <div class="overview-icon">🛏</div>
            <div class="overview-value">${r.capacity || '—'}</div>
            <div class="overview-label">Capacity</div>
          </div>
          <div class="overview-card" style="margin:0;border-top:3px solid #198754">
            <div class="overview-icon">✅</div>
            <div class="overview-value">${r.available_spaces ?? '—'}</div>
            <div class="overview-label">Beds Left</div>
          </div>
        </div>
        <div style="padding:20px">
          <img src="${r.room_image ? '../'+r.room_image : '../assets/images/KHYBER_HOUSE.jpg'}"
               style="width:100%;height:220px;object-fit:cover;border-radius:10px;margin-bottom:16px" alt="Room">
          <p style="color:var(--text-muted);margin-bottom:12px">${r.description || 'Faculty accommodation.'}</p>
          <div style="margin-bottom:20px">
            <span class="badge-status badge-approved"><i class="fas fa-home"></i> ${r.hostel_name || '—'}</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="leaveRoomRequest()">
            <i class="fas fa-sign-out-alt"></i> Request to Leave Room
          </button>
        </div>
      </div>`;
  } catch (e) {
    console.error('My Room error:', e);
    el.innerHTML = '<div class="alert alert-danger">Could not load room information.</div>';
  }
}

async function leaveRoomRequest() {
  if (!confirm('Submit a room leave request?')) return;
  try {
    const fd = new FormData();
    fd.append('action', 'leave_room');
    const res  = await fetch(USER_API, { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'danger');
    if (data.success) loadMyRoom();
  } catch (e) { showToast('Error submitting request.', 'danger'); }
}

// ============================================
// APPLICATIONS — correct action: get_my_applications
// ============================================
/**
 * Fetches all available rooms matching the user's role and gender.
 * Allows users to click "Apply Now" for free rooms.
 */
async function loadAvailableRooms() {
  const grid = document.getElementById('availableRoomsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="spinner"></div>';
  const status = document.getElementById('roomStatusFilter')?.value || '';

  try {
    const res  = await fetch(USER_API + '?action=get_rooms&status=' + status, { credentials: 'include' });
    const data = await res.json();
    const rooms = data.rooms || [];

    if (!rooms.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted)">No rooms found matching your criteria.</div>';
      return;
    }

    grid.innerHTML = rooms.map(r => `
      <div class="room-card ${r.status.toLowerCase()}">
        <div class="room-card-img">
          <img src="${r.room_image ? '../' + r.room_image : '../assets/images/KHYBER_HOUSE.jpg'}" alt="Room">
          <span class="room-card-badge">${r.status}</span>
        </div>
        <div class="room-card-content">
          <h4>Room ${r.room_no}</h4>
          <p>${r.description || 'Faculty accommodation in ' + (r.hostel_name || 'assigned hostel') + '.'}</p>
          <div class="room-card-meta">
            <span><i class="fas fa-users"></i> ${r.capacity} Seats</span>
            <span><i class="fas fa-bed"></i> ${r.available_spaces} Free</span>
          </div>
          ${r.available_spaces > 0 && r.status === 'Available' ? `
            <div style="margin-bottom:12px;text-align:left;width:100%;">
              <label style="font-size:0.75rem;font-weight:600;color:#2c3e50;display:block;margin-bottom:4px;">Expiry Date (DD/MM/YYYY) *</label>
              <input type="date" id="customDurationInput-${r.id}" style="width:100%;padding:8px;border:1px solid #ced4da;border-radius:6px;font-size:0.8rem;box-sizing:border-box;" />
            </div>
          ` : ''}
          <button class="btn btn-primary btn-sm btn-block" onclick="applyForRoom(${r.id})" ${r.available_spaces <= 0 || r.status !== 'Available' ? 'disabled' : ''}>
            ${r.available_spaces <= 0 ? 'Full' : 'Apply Now'}
          </button>
        </div>
      </div>`).join('');
  } catch (e) {
    grid.innerHTML = '<div style="grid-column:1/-1" class="alert alert-danger">Error loading rooms.</div>';
  }
}

async function applyForRoom(roomId) {
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

  try {
    const fd = new FormData();
    fd.append('action', 'apply_room');
    fd.append('room_id', roomId);
    fd.append('booking_duration', duration);

    const res  = await fetch(USER_API, { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'danger');
    if (data.success) {
      loadMyApplications();
      loadAvailableRooms();
    }
  } catch (e) {
    showToast('Error submitting application.', 'danger');
  }
}

async function loadMyApplications() {
  const tbody = document.getElementById('myAppsBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="no-data"><div class="spinner"></div></td></tr>';
  try {
    // FIXED: correct action name get_my_applications
    const res  = await fetch(USER_API + '?action=get_my_applications', { credentials: 'include' });
    const data = await res.json();
    if (!data.applications?.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data">No applications yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.applications.map(a => `
      <tr>
        <td>${formatDate(a.applied_at)}</td>
        <td>${a.hostel_name || '—'}</td>
        <td>Room ${a.room_no || '—'}</td>
        <td><span class="badge-status badge-${(a.application_type||'').toLowerCase() === 'apply' ? 'approved' : 'pending'}">${a.application_type}</span></td>
        <td>${a.booking_duration || '—'}</td>
        <td><span class="badge-status badge-${(a.status||'').toLowerCase()}">${a.status}</span></td>
      </tr>`).join('');
  } catch (e) {
    console.error('Applications error:', e);
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">Error loading applications.</td></tr>';
  }
}


// ============================================
// FEES — correct action: get_my_fees
// ============================================
/**
 * Fetches the user's fee history and calculates total paid/due amounts.
 * Provides payment links for unpaid months.
 */
async function loadFees() {
  const tbody = document.getElementById('feeTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="no-data"><div class="spinner"></div></td></tr>';
  try {
    // FIXED: correct action name get_my_fees
    const res  = await fetch(USER_API + '?action=get_my_fees', { credentials: 'include' });
    const data = await res.json();

    setText('feePaidTotal', 'Rs. ' + parseFloat(data.total_paid || 0).toFixed(2));
    setText('feeDueTotal',  'Rs. ' + parseFloat(data.total_due  || 0).toFixed(2));

    if (!data.fees?.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-data">No fee records found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.fees.map((f, i) => {
      let actionHtml = '—';
      if (f.status === 'Paid' && f.receipt_no) {
        actionHtml = `<button class="btn btn-outline btn-sm" onclick="downloadReceipt('${f.receipt_no}','${f.fee_month} ${f.fee_year}','${f.amount}')">
                 <i class="fas fa-download"></i> Receipt</button>`;
      } else if (f.status === 'Unpaid' || f.status === 'Partial') {
        actionHtml = `<button class="btn btn-sm" style="background:var(--primary);color:#fff;" onclick="openPaymentModal(${f.id})"><i class="fas fa-wallet"></i> Pay Online</button>`;
      } else if (f.status === 'Pending Verification') {
        actionHtml = `<span style="font-size:0.8rem;color:var(--text-muted)"><i class="fas fa-hourglass-half"></i> Under Review</span>`;
      }
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${f.fee_month} ${f.fee_year}</td>
          <td>Rs. ${parseFloat(f.amount).toFixed(2)}</td>
          <td><span class="badge-status badge-${f.status.replace(' ', '-').toLowerCase()}">${f.status}</span></td>
          <td>${actionHtml}</td>
        </tr>`;
    }).join('');
  } catch (e) {
    console.error('Fees error:', e);
    tbody.innerHTML = '<tr><td colspan="5" class="no-data">Error loading fees.</td></tr>';
  }
}

function openPaymentModal(feeId) {
  window.location.href = `../pay-online.html?fee_id=${feeId}`;
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}



function downloadReceipt(rn, month, amount) {
  const name = currentUser?.user_name || 'Faculty';
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Fee Receipt</title>
    <style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto}
    h2{color:#326a33;text-align:center}.logo{text-align:center;margin-bottom:20px}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}
    .footer{margin-top:30px;text-align:center;color:#666;font-size:0.85rem}
    @media print{button{display:none}}</style></head><body>
    <div class="logo"><h2>FATA University Hostel</h2><p>Official Fee Receipt</p></div>
    <div class="row"><span>Receipt No:</span><strong>${rn}</strong></div>
    <div class="row"><span>Name:</span><strong>${name}</strong></div>
    <div class="row"><span>Period:</span><strong>${month}</strong></div>
    <div class="row"><span>Amount:</span><strong>Rs. ${parseFloat(amount).toFixed(2)}</strong></div>
    <div class="row"><span>Status:</span><strong style="color:#198754">✓ PAID</strong></div>
    <div class="footer"><p>FATA University, Darra Adam Khel, KPK</p><p>info@fu.edu.pk</p></div>
    <br><button onclick="window.print()" style="padding:10px 24px;background:#326a33;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨️ Print Receipt</button>
    </body></html>`);
  w.document.close();
}

// ============================================
// COMPLAINTS — correct action: get_my_complaints
// ============================================
async function loadComplaints() {
  const tbody = document.getElementById('myComplaintsBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" class="no-data"><div class="spinner"></div></td></tr>';
  try {
    // FIXED: correct action name get_my_complaints
    const res  = await fetch(USER_API + '?action=get_my_complaints', { credentials: 'include' });
    const data = await res.json();
    if (!data.complaints?.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="no-data">Inbox is empty.</td></tr>';
      return;
    }
    tbody.innerHTML = data.complaints.map(c => `
      <tr>
        <td>${formatDate(c.submitted_at)}</td>
        <td><strong>${c.title}</strong>
          ${c.admin_response ? `<br><small style="color:var(--text-muted)">Reply: ${c.admin_response}</small>` : ''}
        </td>
        <td><span class="badge-status badge-${c.status === 'Resolved' ? 'approved' : c.status === 'Pending' ? 'pending' : 'important'}">${c.status}</span></td>
      </tr>`).join('');
  } catch (e) {
    console.error('Complaints error:', e);
    tbody.innerHTML = '<tr><td colspan="3" class="no-data">Error loading complaints.</td></tr>';
  }
}

async function submitComplaint() {
  const title = document.getElementById('complaintTitle')?.value.trim();
  const desc  = document.getElementById('complaintDesc')?.value.trim();
  const el    = document.getElementById('complaintAlert');
  if (!title || !desc) {
    if (el) el.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Please fill all fields.</div>';
    return;
  }
  try {
    const fd = new FormData();
    fd.append('action', 'submit_complaint');
    fd.append('title', title);
    fd.append('description', desc);
    const res  = await fetch(USER_API, { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    if (el) el.innerHTML = `<div class="alert alert-${data.success?'success':'danger'}">${data.message}</div>`;
    if (data.success) {
      document.getElementById('complaintTitle').value = '';
      document.getElementById('complaintDesc').value  = '';
      loadComplaints();
    }
  } catch (e) { console.error('Submit complaint error:', e); }
}

// ============================================
// GALLERY
// ============================================
async function loadGallery() {
  const grid = document.getElementById('myGalleryGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="spinner"></div>';
  try {
    const res  = await fetch(USER_API + '?action=get_my_gallery', { credentials: 'include' });
    const data = await res.json();
    if (!data.gallery?.length) {
      grid.innerHTML = '<p style="color:var(--text-muted)">No photos uploaded yet.</p>';
      return;
    }
    grid.innerHTML = data.gallery.map(g => `
      <div class="gallery-thumb">
        <img src="../${g.image_path}" alt="${g.caption || ''}" loading="lazy">
        <div class="gallery-thumb-info">
          <div class="gallery-thumb-caption">${g.caption || 'No caption'}</div>
          <span class="badge-status badge-${(g.status||'').toLowerCase()}">${g.status}</span>
        </div>
      </div>`).join('');
  } catch (e) { console.error('Gallery error:', e); }
}

async function uploadMyGallery() {
  const file    = document.getElementById('galleryUploadFile')?.files[0];
  const caption = document.getElementById('galleryUploadCaption')?.value.trim() || '';
  const el      = document.getElementById('galleryAlert');
  if (!file) {
    if (el) el.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Please select a photo.</div>';
    return;
  }
  try {
    const fd = new FormData();
    fd.append('action',  'upload_gallery');
    fd.append('photo',   file);
    fd.append('caption', caption);
    const res  = await fetch(USER_API, { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    if (el) el.innerHTML = `<div class="alert alert-${data.success?'success':'danger'}">${data.message}</div>`;
    if (data.success) {
      document.getElementById('galleryUploadFile').value   = '';
      document.getElementById('galleryUploadCaption').value = '';
      loadGallery();
      loadCommunityGallery();
    }
  } catch (e) { console.error('Upload gallery error:', e); }
}

// ============================================
// COMMUNITY GALLERY (all approved photos)
// ============================================
async function loadCommunityGallery() {
  const grid = document.getElementById('communityGalleryGrid');
  if (!grid) return;
  try {
    const res  = await fetch(PUB_API + '?action=get_gallery&limit=30');
    const data = await res.json();
    if (!data.gallery?.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;grid-column:1/-1">No approved photos in the community gallery yet.</p>';
      return;
    }
    grid.innerHTML = data.gallery.map(g => `
      <div style="border-radius:8px;overflow:hidden;position:relative;aspect-ratio:1;cursor:pointer" onclick="openGalleryLightbox('../${g.image_path}')">
        <img src="../${g.image_path}" style="width:100%;height:100%;object-fit:cover" alt="${g.caption || 'Gallery'}" loading="lazy">
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.45);color:#fff;font-size:0.7rem;padding:4px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.caption || ''}</div>
        <div style="position:absolute;top:6px;right:6px;background:rgba(25,135,84,0.9);color:#fff;font-size:0.65rem;font-weight:700;padding:2px 7px;border-radius:10px">&#10003; Approved</div>
      </div>`).join('');
  } catch (e) {
    console.error('Community gallery error:', e);
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
// ============================================
// PROFILE — correct response key: profile
// ============================================
async function loadProfile() {
  try {
    const res  = await fetch(USER_API + '?action=get_profile', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return;
    const u = data.profile || data.user;
    if (!u) return;

    const photoEl = document.getElementById('profilePhotoDisplay');
    if (photoEl) {
      if (u.profile_photo) {
        photoEl.innerHTML = `<img src="../${u.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        photoEl.textContent = (u.full_name || 'F')[0].toUpperCase();
      }
    }
    setText('profileNameDisplay', u.full_name || '—');

    const fields = [
      ['Full Name',     u.full_name],
      ['Father Name',   u.father_name],
      ['Email',         u.email],
      ['Phone',         u.phone],
      ['Gender',        u.gender],
      ['Designation',   u.designation],
      ['Department',    u.department],
      ['Employee ID',   u.employee_id],
      ['Qualification', u.qualification],
      ['Home Address',  u.home_address],
      ['Date of Birth', u.dob],
    ];
    const detailsEl = document.getElementById('profileDetails');
    if (detailsEl) {
      detailsEl.innerHTML = fields.map(([label, val]) => `
        <div class="profile-detail-item">
          <label>${label}</label>
          <p>${val || '—'}</p>
        </div>`).join('');
    }
  } catch (e) { console.error('Profile error:', e); }
}

// ============================================
// SETTINGS
// ============================================
async function loadSettingsData() {
  try {
    const res  = await fetch(USER_API + '?action=get_profile', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return;
    const u = data.profile || data.user;
    if (!u) return;
    setVal('settingsPhone',   u.phone);
    setVal('settingsAddress', u.home_address);
    setVal('settingsEmail',   u.email);
  } catch (e) { console.error('Settings error:', e); }
}

async function uploadProfilePhoto(input) {
  if (!input.files[0]) return;
  const fd = new FormData();
  fd.append('action', 'update_profile');
  fd.append('profile_photo', input.files[0]);
  fd.append('phone', document.getElementById('settingsPhone')?.value || '');
  fd.append('home_address', document.getElementById('settingsAddress')?.value || '');
  try {
    const res  = await fetch(USER_API, { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'danger');
    if (data.success) location.reload();
  } catch (e) { showToast('Error uploading photo.', 'danger'); }
}

async function updateSettings() {
  const el = document.getElementById('settingsAlert');
  try {
    const fd = new FormData();
    fd.append('action',       'update_profile');
    fd.append('phone',        document.getElementById('settingsPhone')?.value.trim()   || '');
    fd.append('home_address', document.getElementById('settingsAddress')?.value.trim() || '');
    const res  = await fetch(USER_API, { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    if (el) el.innerHTML = `<div class="alert alert-${data.success?'success':'danger'}">${data.message}</div>`;
  } catch (e) { if (el) el.innerHTML = '<div class="alert alert-danger">Error updating profile.</div>'; }
}

async function updatePassword() {
  const cur  = document.getElementById('currentPwd')?.value;
  const nw   = document.getElementById('newPwd')?.value;
  const conf = document.getElementById('confirmPwd')?.value;
  const el   = document.getElementById('passwordAlert');
  if (nw !== conf) {
    if (el) el.innerHTML = '<div class="alert alert-warning">Passwords do not match.</div>';
    return;
  }
  try {
    const fd = new FormData();
    fd.append('action',           'update_password');
    fd.append('current_password', cur);
    fd.append('new_password',     nw);
    fd.append('confirm_password', conf);
    const res  = await fetch(AUTH_API, { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    if (el) el.innerHTML = `<div class="alert alert-${data.success?'success':'danger'}">${data.message}</div>`;
    if (data.success) {
      document.getElementById('currentPwd').value = '';
      document.getElementById('newPwd').value     = '';
      document.getElementById('confirmPwd').value = '';
    }
  } catch (e) { if (el) el.innerHTML = '<div class="alert alert-danger">Error.</div>'; }
}

async function updateAccountInfo() {
  const el = document.getElementById('settingsAlert');
  try {
    const fd = new FormData();
    fd.append('action',       'update_settings');
    fd.append('email',        document.getElementById('settingsEmail')?.value.trim()   || '');
    fd.append('phone',        document.getElementById('settingsPhone')?.value.trim()   || '');
    fd.append('home_address', document.getElementById('settingsAddress')?.value.trim() || '');
    const res  = await fetch(USER_API, { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    if (el) el.innerHTML = `<div class="alert alert-${data.success?'success':'danger'}">${data.message}</div>`;
  } catch (e) { if (el) el.innerHTML = '<div class="alert alert-danger">Error.</div>'; }
}

// ============================================
// LOGOUT & NOTICES
// ============================================
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

window.confirmLogout = async function() {
  const fd = new FormData(); fd.append('action', 'logout');
  await fetch(AUTH_API, { method: 'POST', body: fd, credentials: 'include' });
  window.location.href = '../login.html';
}

window.showAllNotices = function(e) {
  if (e) e.preventDefault();
  if (!allNoticesCache.length) return alert('No notices available.');
  const html = allNoticesCache.map(n => `
      <div style="margin-bottom:15px;padding:15px;background:#f8f9fa;border-left:4px solid var(--primary);border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.04);text-align:left;">
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <span class="badge-status badge-${n.priority.toLowerCase()}">${n.priority}</span>
          <span style="font-size:0.8rem;color:var(--text-muted)"><i class="far fa-calendar-alt"></i> ${formatDate(n.created_at)}</span>
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

// ============================================
// HELPERS
// ============================================
function setText(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }
function setVal(id, val)  { const e = document.getElementById(id); if (e) e.value = val || ''; }
function formatDate(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return str; }
}
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `alert alert-${type}`;
  t.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:280px;box-shadow:0 4px 20px rgba(0,0,0,0.15);animation:fadeInDown 0.3s ease';
  t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
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
  try {
    const res  = await fetch(USER_API + '?action=get_my_fees', { credentials: 'include' });
    const data = await res.json();
    if (!data.success || !data.fees?.length) {
      alert('No fee records found to generate PDF.');
      return;
    }
    const name = currentUser?.user_name || 'Faculty';
    const email = currentUser?.user_email || 'info@fu.edu.pk';
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
          <p>Faculty Fee Statement Report | Generated on ${new Date().toLocaleDateString()}</p>
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
  } catch (e) {
    alert('Error fetching fee data: ' + e);
  }
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.innerHTML = inp.type === 'password'
    ? '<i class="fas fa-eye"></i>'
    : '<i class="fas fa-eye-slash"></i>';
}

