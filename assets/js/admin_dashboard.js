// ============================================
// Admin Dashboard JS
// ============================================

const API = '../api/admin.php';
const AUTH = '../api/auth.php';

// ============ INIT ============
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminAuth();
  loadAdminInfo();
  loadDashboard();
  document.getElementById('topbarDate') && (document.getElementById('topbarDate').textContent = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

  // Auto-refresh stats every 60 seconds
  setInterval(loadDashboard, 60000);
});

async function checkAdminAuth() {
  const fd = new FormData(); fd.append('action', 'check_session');
  const res = await fetch(AUTH, { method: 'POST', body: fd, credentials: 'include' });
  const data = await res.json();
  if (!data.logged_in || data.user_role !== 'Admin') {
    window.location.href = '../login.html';
  }
}

// ============ SIDEBAR ============
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
  if (window.innerWidth <= 900) {
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
  const titles = { dashboard: 'Admin Dashboard', students: 'Students & Faculty', rooms: 'Manage Rooms', applications: 'Room Applications', fees: 'Fee Management', complaints: 'Complaints', notices: 'Notices', gallery: 'Gallery Management', profile: 'Admin Profile' };
  document.getElementById('pageTitle').textContent = titles[id] || 'Dashboard';
  if (id === 'students') loadUsers();
  if (id === 'rooms') loadRoomsAdmin();
  if (id === 'applications') loadApplications();
  if (id === 'fees') loadFees();
  if (id === 'complaints') loadComplaints();
  if (id === 'notices') loadNoticesAdmin();
  if (id === 'gallery') loadGalleryAdmin();
  if (id === 'profile') loadAdminProfile();
}

// ============ ADMIN INFO ============
async function loadAdminInfo() {
  const fd = new FormData(); fd.append('action', 'get_admin_info');
  const res = await fetch(API, { method: 'GET' });
  // Use session data from check
  const fd2 = new FormData(); fd2.append('action', 'check_session');
  const res2 = await fetch(AUTH, { method: 'POST', body: fd2, credentials: 'include' });
  const data = await res2.json();
  if (data.logged_in) {
    const initials = data.user_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('sidebarName').textContent = data.user_name;
    document.getElementById('sidebarAvatar').textContent = initials;
    document.getElementById('topbarName').textContent = data.user_name;
    document.getElementById('topbarAvatar').textContent = initials;
  }
}

// ============ DASHBOARD ============
async function loadDashboard() {
  const res = await apiFetch('get_stats', 'GET');
  if (res.success) {
    document.getElementById('statStudents').textContent = parseInt(res.students) + parseInt(res.faculty);
    document.getElementById('statRooms').textContent = res.rooms;
    document.getElementById('statFees').textContent = 'Rs. ' + res.fees_collected;
    document.getElementById('statAvail').textContent = res.available_rooms;
    document.getElementById('statComplaints').textContent = res.complaints;
    const pb = document.getElementById('pendingBadge');
    if (pb) {
      pb.textContent = res.pending_apps;
      pb.style.display = (res.pending_apps == 0) ? 'none' : 'inline-flex';
    }
    const fb = document.getElementById('feesBadge');
    if (fb) {
      fb.textContent = res.pending_fees;
      fb.style.display = (res.pending_fees == 0) ? 'none' : 'inline-flex';
    }
    const cb = document.getElementById('complaintsBadge');
    if (cb) {
      cb.textContent = res.complaints;
      cb.style.display = (res.complaints == 0) ? 'none' : 'inline-flex';
    }
    const gb = document.getElementById('galleryBadge');
    if (gb) {
      gb.textContent = res.pending_gallery;
      gb.style.display = (res.pending_gallery == 0) ? 'none' : 'inline-flex';
    }
  }

  // Recent students
  const r2 = await apiFetch('get_recent_students', 'GET');
  const stuDiv = document.getElementById('recentStudents');
  if (r2.success && r2.students.length) {
    stuDiv.innerHTML = `<div class="table-responsive"><table class="data-table">
      <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Gender</th></tr></thead>
      <tbody>${r2.students.map((s, i) => `<tr><td>${i + 1}</td><td>${s.full_name}</td><td>${s.email}</td><td>${s.phone}</td><td><span class="badge-status badge-${s.gender === 'Male' ? 'approved' : 'pending'}">${s.gender}</span></td></tr>`).join('')}</tbody>
    </table></div>`;
  } else stuDiv.innerHTML = '<p style="color:var(--text-muted)">No students registered yet.</p>';

  // Recent applications
  const r3 = await apiFetch('get_recent_applications', 'GET');
  const appDiv = document.getElementById('recentApplications');
  if (r3.success && r3.applications.length) {
    appDiv.innerHTML = `<div class="table-responsive"><table class="data-table">
      <thead><tr><th>Date</th><th>User</th><th>Role</th><th>Hostel — Room</th><th>Status</th></tr></thead>
      <tbody>${r3.applications.map(a => `<tr>
        <td>${new Date(a.applied_at).toLocaleDateString()}</td>
        <td>${a.user_name || '—'}</td>
        <td><span class="badge-status badge-${a.user_role === 'Faculty' ? 'important' : 'approved'}">${a.user_role}</span></td>
        <td>${a.hostel_name} — Room ${a.room_no}</td>
        <td><span class="badge-status badge-${a.status.toLowerCase()}">${a.status}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } else appDiv.innerHTML = '<p style="color:var(--text-muted)">No applications yet.</p>';
}

// ============ USERS ============
let allUsers = [];
async function loadUsers() {
  const role = document.getElementById('userTypeFilter')?.value || 'student';
  const body = document.getElementById('usersTableBody');
  body.innerHTML = '<tr><td colspan="8" class="no-data"><div class="spinner"></div></td></tr>';
  const data = await apiFetch(`get_users&role=${role}`, 'GET');
  allUsers = data.users || [];
  renderUsers(allUsers);
}

function renderUsers(users) {
  const body = document.getElementById('usersTableBody');
  if (!users.length) { body.innerHTML = '<tr><td colspan="8" class="no-data">No users found.</td></tr>'; return; }
  body.innerHTML = users.map((u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><div style="width:34px;height:34px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;overflow:hidden">
        ${u.profile_photo ? `<img src="../${u.profile_photo}" style="width:100%;height:100%;object-fit:cover">` : u.full_name[0]}
      </div></td>
      <td>${u.full_name}</td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td><span class="badge-status badge-${u.gender === 'Male' ? 'approved' : 'pending'}">${u.gender}</span></td>
      <td>${new Date(u.created_at || u.joining_date).toLocaleDateString()}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button></td>
    </tr>`).join('');
}

function filterUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  renderUsers(allUsers.filter(u => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
}

async function deleteUser(id) {
  if (!confirm('Delete this user permanently?')) return;
  const role = document.getElementById('userTypeFilter')?.value || 'student';
  const fd = new FormData(); fd.append('action', 'delete_user'); fd.append('id', id); fd.append('role', role);
  const data = await apiFetch('delete_user', 'POST', fd);
  if (data.success) loadUsers();
  else alert(data.message);
}

// ============ ROOMS ============
async function loadRoomsAdmin() {
  const hostel = document.getElementById('roomHostelFilter')?.value || '';
  const grid = document.getElementById('roomsManageGrid');
  grid.innerHTML = '<div class="spinner"></div>';
  const data = await apiFetch(`get_rooms_admin${hostel ? '&hostel=' + encodeURIComponent(hostel) : ''}`, 'GET');
  if (!data.rooms?.length) { grid.innerHTML = '<p style="color:var(--text-muted)">No rooms found.</p>'; return; }
  grid.innerHTML = data.rooms.map(r => `
    <div class="room-manage-card">
      <div class="room-manage-img">
        ${r.room_image ? `<img src="../${r.room_image}" alt="Room"/>` : `<div class="no-img"><i class="fas fa-building"></i></div>`}
      </div>
      <div class="room-manage-body">
        <h4>${r.hostel_name} — Room ${r.room_no}</h4>
        <div class="room-manage-meta">
          <span><i class="fas fa-users"></i> Cap: ${r.capacity}</span>
          <span><i class="fas fa-door-open"></i> Avail: ${r.available_spaces}</span>
          <span class="badge-status badge-${r.status === 'Available' ? 'approved' : 'rejected'}">${r.status}</span>
        </div>
        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px">${r.description || 'No description.'}</p>
        <div class="room-manage-actions">
          <button class="btn btn-outline btn-sm" onclick="openEditRoomModal(${JSON.stringify(r).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteRoom(${r.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
}

function openAddRoomModal() {
  document.getElementById('roomModalTitle').innerHTML = '<i class="fas fa-building"></i> Add New Room';
  document.getElementById('editRoomId').value = '';
  document.getElementById('roomHostel').value = '';
  document.getElementById('roomNo').value = '';
  document.getElementById('roomCapacity').value = 2;
  document.getElementById('roomDesc').value = '';
  document.getElementById('addRoomModal').classList.add('active');
}

function openEditRoomModal(room) {
  document.getElementById('roomModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Room';
  document.getElementById('editRoomId').value = room.id;
  document.getElementById('roomHostel').value = room.hostel_name;
  document.getElementById('roomNo').value = room.room_no;
  document.getElementById('roomCapacity').value = room.capacity;
  document.getElementById('roomDesc').value = room.description || '';
  document.getElementById('addRoomModal').classList.add('active');
}

async function saveRoom() {
  const id = document.getElementById('editRoomId').value;
  const fd = new FormData();
  fd.append('action', 'save_room');
  if (id) fd.append('id', id);
  fd.append('hostel_name', document.getElementById('roomHostel').value);
  fd.append('room_no', document.getElementById('roomNo').value);
  fd.append('capacity', document.getElementById('roomCapacity').value);
  fd.append('description', document.getElementById('roomDesc').value);
  const img = document.getElementById('roomImage').files[0];
  if (img) fd.append('room_image', img);
  const data = await apiFetch('save_room', 'POST', fd);
  document.getElementById('roomModalAlert').innerHTML = data.success
    ? `<div class="alert alert-success">${data.message}</div>`
    : `<div class="alert alert-danger">${data.message}</div>`;
  if (data.success) { setTimeout(() => { closeModal('addRoomModal'); loadRoomsAdmin(); loadDashboard(); }, 1000); }
}

async function deleteRoom(id) {
  if (!confirm('Delete this room?')) return;
  const fd = new FormData(); fd.append('action', 'delete_room'); fd.append('id', id);
  const data = await apiFetch('delete_room', 'POST', fd);
  if (data.success) { loadRoomsAdmin(); loadDashboard(); }
}

// ============ APPLICATIONS ============
async function loadApplications() {
  const status = document.getElementById('appStatusFilter')?.value || '';
  const body = document.getElementById('applicationsBody');
  body.innerHTML = '<tr><td colspan="8" class="no-data"><div class="spinner"></div></td></tr>';
  const data = await apiFetch(`get_applications${status ? '&status=' + status : ''}`, 'GET');
  if (!data.applications?.length) { body.innerHTML = '<tr><td colspan="8" class="no-data">No applications found.</td></tr>'; return; }
  body.innerHTML = data.applications.map(a => `
    <tr>
      <td>${new Date(a.applied_at).toLocaleDateString()}</td>
      <td>${a.user_name}</td>
      <td><span class="badge-status badge-${a.user_role === 'Faculty' ? 'important' : 'approved'}">${a.user_role}</span></td>
      <td>${a.application_type}</td>
      <td>${a.hostel_name} — Room ${a.room_no}</td>
      <td>${a.booking_duration || '—'}</td>
      <td><span class="badge-status badge-${a.status.toLowerCase()}">${a.status}</span></td>
      <td>
        ${a.status === 'Pending' ? `
          <button class="btn btn-sm" style="background:#198754;color:#fff;margin-right:4px" onclick="updateApp(${a.id},'Approved')"><i class="fas fa-check"></i></button>
          <button class="btn btn-danger btn-sm" onclick="updateApp(${a.id},'Rejected')"><i class="fas fa-times"></i></button>` : '—'}
      </td>
    </tr>`).join('');
}

async function updateApp(id, status) {
  const actionText = status === 'Approved' ? 'approve' : 'reject';
  showConfirmModal(`Confirm ${status}`, `Are you sure you want to ${actionText} this application?`, async () => {
    const fd = new FormData(); fd.append('action', 'update_application'); fd.append('id', id); fd.append('status', status);
    const data = await apiFetch('update_application', 'POST', fd);
    if (data.success) { loadApplications(); loadDashboard(); }
  });
}

// ============ FEES ============
async function loadFees() {
  const role = document.getElementById('feeRoleFilter')?.value || '';
  const status = document.getElementById('feeStatusFilter')?.value || '';
  const body = document.getElementById('feesBody');
  body.innerHTML = '<tr><td colspan="8" class="no-data"><div class="spinner"></div></td></tr>';
  const data = await apiFetch(`get_fees${role ? '&role=' + role : ''}${status ? '&status=' + status : ''}`, 'GET');
  if (!data.fees?.length) { body.innerHTML = '<tr><td colspan="8" class="no-data">No fee records.</td></tr>'; return; }
  body.innerHTML = data.fees.map((f, i) => {
    const reportButton = `<button class="btn btn-sm btn-outline" onclick="sendUserFeeReport(${f.user_id}, '${f.user_role}')"><i class="fas fa-file-invoice"></i> Report</button>`;
    let actionHtml = reportButton;
    if (f.status === 'Unpaid' || f.status === 'Partial') {
      actionHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm" style="background:#198754;color:#fff" onclick="markFeePaid(${f.id}, '${f.user_role}')"><i class="fas fa-check"></i> Mark Paid</button>
        <button class="btn btn-sm btn-outline" onclick="sendFeeReminder(${f.id})"><i class="fas fa-envelope"></i> Reminder</button>
        ${reportButton}
      </div>`;
    } else if (f.status === 'Pending Verification') {
      actionHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="openVerifyModal(${f.id}, '${f.payment_method}', '${f.transaction_id}', '${f.payment_proof}')"><i class="fas fa-search"></i> Verify Payment</button>
        <button class="btn btn-sm btn-outline" onclick="sendFeeReminder(${f.id})"><i class="fas fa-envelope"></i> Reminder</button>
        ${reportButton}
      </div>`;
    } else if (f.status === 'Paid' && f.receipt_no) {
      actionHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="downloadReceipt('${f.receipt_no}','${(f.full_name || f.user_name || '').replace(/'/g, "\\'")}','${f.fee_month} ${f.fee_year}','${f.amount}')"><i class="fas fa-download"></i> Receipt</button>
        ${reportButton}
      </div>`;
    }
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${f.full_name || f.user_name || '—'}</td>
      <td>${f.user_role}</td>
      <td>${f.fee_month} ${f.fee_year}</td>
      <td>Rs. ${parseFloat(f.amount).toFixed(2)}</td>
      <td><span class="badge-status badge-${f.status.replace(' ', '-').toLowerCase()}">${f.status}</span></td>
      <td>${f.receipt_no || '—'}</td>
      <td>${actionHtml}</td>
    </tr>`;
  }).join('');
}

function downloadReceipt(rn, name, month, amount) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Fee Receipt</title><style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto}h2{color:#326a33;text-align:center}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}@media print{button{display:none}}</style></head><body><h2>FATA University Hostel</h2><h3 style="text-align:center">Fee Receipt</h3><div class="row"><span>Receipt No:</span><strong>${rn}</strong></div><div class="row"><span>Name:</span><strong>${name || 'Student/Faculty'}</strong></div><div class="row"><span>Period:</span><strong>${month}</strong></div><div class="row"><span>Amount:</span><strong>Rs. ${parseFloat(amount).toFixed(2)}</strong></div><div class="row"><span>Status:</span><strong style="color:#198754">PAID</strong></div><br><button onclick="window.print()">🖨️ Print</button></body></html>`);
  w.document.close();
}

function openVerifyModal(feeId, method, trxId, proof) {
  document.getElementById('verifyFeeId').value = feeId;
  document.getElementById('vPayMethod').textContent = method || 'N/A';
  document.getElementById('vTrxId').textContent = trxId || 'N/A';

  const imgEl = document.getElementById('vProofImg');
  const linkEl = document.getElementById('vProofLink');

  imgEl.style.display = 'none';
  linkEl.style.display = 'none';

  if (proof && proof !== 'undefined') {
    if (proof.toLowerCase().endsWith('.pdf')) {
      linkEl.href = '../' + proof;
      linkEl.style.display = 'inline';
    } else {
      imgEl.src = '../' + proof;
      imgEl.style.display = 'inline';
    }
  }

  document.getElementById('verifyPaymentModal').classList.add('active');
}

async function submitFeeVerification(status) {
  const id = document.getElementById('verifyFeeId').value;
  const action = status === 'Paid' ? 'Approve' : 'Reject';
  
  showConfirmModal(`Confirm ${action}`, `Are you sure you want to ${action.toLowerCase()} this payment?`, async () => {
    const fd = new FormData();
    fd.append('action', 'update_fee');
    fd.append('id', id);
    fd.append('status', status);

    await apiFetch('update_fee', 'POST', fd);
    closeModal('verifyPaymentModal');
    loadFees();
    loadDashboard();
  });
}

async function loadFeeUsers() {
  const role = document.getElementById('feeRole').value;
  const data = await apiFetch(`get_fee_users&role=${role}`, 'GET');
  const sel = document.getElementById('feeUser');
  sel.innerHTML = data.users?.map(u => `<option value="${u.id}">${u.full_name}</option>`).join('') || '<option>No users found</option>';
}

function openAddFeeModal() {
  loadFeeUsers();
  document.getElementById('addFeeModal').classList.add('active');
}

async function saveFee() {
  const fd = new FormData();
  fd.append('action', 'save_fee');
  fd.append('user_id', document.getElementById('feeUser').value);
  fd.append('user_role', document.getElementById('feeRole').value);
  fd.append('fee_month', document.getElementById('feeMonth').value);
  fd.append('fee_year', document.getElementById('feeYear').value);
  fd.append('amount', document.getElementById('feeAmount').value);
  fd.append('status', document.getElementById('feeStatus').value);
  fd.append('notes', document.getElementById('feeNotes').value);
  const data = await apiFetch('save_fee', 'POST', fd);
  document.getElementById('feeModalAlert').innerHTML = data.success
    ? `<div class="alert alert-success">${data.message}</div>`
    : `<div class="alert alert-danger">${data.message}</div>`;
  if (data.success) setTimeout(() => { closeModal('addFeeModal'); loadFees(); }, 1000);
}

async function markFeePaid(id, role) {
  const roleText = role.toLowerCase();
  const message = `Are you sure the <strong>${roleText}</strong> has paid the fee in cash?`;
  
  showConfirmModal('Confirm Cash Payment', message, async () => {
    const fd = new FormData(); 
    fd.append('action', 'update_fee'); 
    fd.append('id', id); 
    fd.append('status', 'Paid');
    await apiFetch('update_fee', 'POST', fd);
    loadFees();
    loadDashboard();
  });
}

async function sendUserFeeReport(userId, role) {
  showConfirmModal('Send Fee Report', `Send all fee records report to this ${role.toLowerCase()} by email?`, async () => {
    const fd = new FormData();
    fd.append('action', 'send_user_fee_report');
    fd.append('user_id', userId);
    fd.append('user_role', role);

    const data = await apiFetch('send_user_fee_report', 'POST', fd);
    if (data.success) {
      showSuccessMessage('Report Sent', data.message);
    } else {
      alert(data.message || 'Unable to send fee report.');
    }
  });
}

async function sendFeeReminder(id) {
  showConfirmModal('Send Fee Reminder', 'Send a fee reminder email to this user now?', async () => {
    const fd = new FormData();
    fd.append('action', 'send_fee_reminder');
    fd.append('id', id);

    const data = await apiFetch('send_fee_reminder', 'POST', fd);
    if (data.success) {
      showSuccessMessage('Reminder Sent', data.message);
    } else {
      alert(data.message || 'Unable to send fee reminder.');
    }
  });
}

function showConfirmModal(title, message, onConfirm) {
  const modalHTML = `
    <div id="customConfirmModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;opacity:0;transition:opacity 0.3s ease;backdrop-filter:blur(6px);">
      <div style="background:#fff;border-radius:20px;padding:32px;max-width:420px;width:90%;text-align:center;box-shadow:0 25px 80px rgba(0,0,0,0.2);transform:translateY(30px);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        <div style="width:74px;height:74px;background:#e8f5e9;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;color:#2e7d32;font-size:2.2rem;">
          <i class="fas fa-hand-holding-usd"></i>
        </div>
        <h3 style="font-family:'Poppins', sans-serif;font-size:1.4rem;color:#1a1a1a;margin-bottom:12px;font-weight:700;">${title}</h3>
        <p style="color:#666;font-size:1rem;line-height:1.6;margin-bottom:32px;">${message}</p>
        <div style="display:flex;gap:15px;justify-content:center;">
           <button onclick="document.getElementById('customConfirmModal').remove()" style="background:#f1f3f5;color:#495057;border:none;padding:12px 24px;border-radius:12px;font-size:0.95rem;font-weight:600;cursor:pointer;flex:1;transition:all 0.2s;">Cancel</button>
           <button id="confirmBtn" style="background:#198754;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:0.95rem;font-weight:600;cursor:pointer;flex:1;box-shadow:0 4px 15px rgba(25,135,84,0.3);transition:all 0.2s;">Yes, Confirm</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('customConfirmModal');
  const confirmBtn = document.getElementById('confirmBtn');
  
  confirmBtn.onclick = () => {
    modal.style.opacity = '0';
    modal.children[0].style.transform = 'translateY(20px)';
    setTimeout(() => {
      modal.remove();
      onConfirm();
    }, 300);
  };

  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    modal.children[0].style.transform = 'translateY(0)';
  });
}

function showSuccessMessage(title, message) {
  const modalHTML = `
    <div id="customSuccessModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;opacity:0;transition:opacity 0.3s ease;backdrop-filter:blur(6px);">
      <div style="background:#fff;border-radius:20px;padding:32px;max-width:420px;width:90%;text-align:center;box-shadow:0 25px 80px rgba(0,0,0,0.2);transform:translateY(30px);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        <div style="width:74px;height:74px;background:#e8f5e9;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;color:#2e7d32;font-size:2.2rem;">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3 style="font-family:'Poppins', sans-serif;font-size:1.4rem;color:#1a1a1a;margin-bottom:12px;font-weight:700;">${title}</h3>
        <p style="color:#666;font-size:1rem;line-height:1.6;margin-bottom:32px;">${message}</p>
        <button onclick="document.getElementById('customSuccessModal').remove()" style="background:#198754;color:#fff;border:none;padding:12px 32px;border-radius:12px;font-size:0.95rem;font-weight:600;cursor:pointer;box-shadow:0 4px 15px rgba(25,135,84,0.3);transition:all 0.2s;">Okay</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('customSuccessModal');

  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    modal.children[0].style.transform = 'translateY(0)';
  });
}

// ============ COMPLAINTS ============
async function loadComplaints() {
  const body = document.getElementById('complaintsBody');
  body.innerHTML = '<tr><td colspan="6" class="no-data"><div class="spinner"></div></td></tr>';
  const data = await apiFetch('get_complaints', 'GET');
  if (!data.complaints?.length) { body.innerHTML = '<tr><td colspan="6" class="no-data">No complaints found.</td></tr>'; return; }
  body.innerHTML = data.complaints.map(c => `
    <tr>
      <td>${new Date(c.submitted_at).toLocaleDateString()}</td>
      <td>${c.user_name}</td>
      <td>${c.title}</td>
      <td style="max-width:200px;white-space:normal">${c.description.substring(0, 80)}...</td>
      <td><span class="badge-status badge-${c.status === 'Resolved' ? 'approved' : c.status === 'Pending' ? 'pending' : 'important'}">${c.status}</span></td>
      <td>
        ${c.status !== 'Resolved' ? `<button class="btn btn-sm" style="background:#198754;color:#fff" onclick="resolveComplaint(${c.id})"><i class="fas fa-check"></i> Resolve</button>` : '✓ Resolved'}
      </td>
    </tr>`).join('');
}

async function resolveComplaint(id) {
  showConfirmModal('Resolve Complaint', 'Are you sure you want to mark this complaint as resolved?', async () => {
    const fd = new FormData(); fd.append('action', 'resolve_complaint'); fd.append('id', id); fd.append('status', 'Resolved');
    await apiFetch('resolve_complaint', 'POST', fd);
    loadComplaints(); loadDashboard();
  });
}

// ============ NOTICES ============
async function loadNoticesAdmin() {
  const body = document.getElementById('noticesBody');
  body.innerHTML = '<tr><td colspan="6" class="no-data"><div class="spinner"></div></td></tr>';
  const data = await apiFetch('get_notices_admin', 'GET');
  if (!data.notices?.length) { body.innerHTML = '<tr><td colspan="6" class="no-data">No notices.</td></tr>'; return; }
  body.innerHTML = data.notices.map(n => `
    <tr>
      <td>${n.title}</td>
      <td><span class="badge-status badge-${n.priority.toLowerCase()}">${n.priority}</span></td>
      <td>${n.target_audience}</td>
      <td>${n.expiry_date || 'No expiry'}</td>
      <td><span class="badge-status badge-${n.status === 'Active' ? 'approved' : 'rejected'}">${n.status}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteNotice(${n.id})"><i class="fas fa-trash"></i></button></td>
    </tr>`).join('');
}

async function postNotice() {
  const fd = new FormData();
  fd.append('action', 'post_notice');
  fd.append('title', document.getElementById('noticeTitle').value);
  fd.append('message', document.getElementById('noticeMessage').value);
  fd.append('priority', document.getElementById('noticePriority').value);
  fd.append('target_audience', document.getElementById('noticeAudience').value);
  fd.append('expiry_date', document.getElementById('noticeExpiry').value);
  const data = await apiFetch('post_notice', 'POST', fd);
  document.getElementById('noticeAlert').innerHTML = data.success
    ? `<div class="alert alert-success">${data.message}</div>`
    : `<div class="alert alert-danger">${data.message}</div>`;
  if (data.success) { document.getElementById('noticeTitle').value = ''; document.getElementById('noticeMessage').value = ''; loadNoticesAdmin(); }
}

async function deleteNotice(id) {
  const fd = new FormData(); fd.append('action', 'delete_notice'); fd.append('id', id);
  await apiFetch('delete_notice', 'POST', fd);
  loadNoticesAdmin();
}

// ============ GALLERY ============
async function loadGalleryAdmin() {
  const body = document.getElementById('galleryAdminBody');
  body.innerHTML = '<tr><td colspan="6" class="no-data"><div class="spinner"></div></td></tr>';
  const data = await apiFetch('get_gallery_admin', 'GET');
  if (!data.gallery?.length) { body.innerHTML = '<tr><td colspan="6" class="no-data">No gallery items.</td></tr>'; return; }
  body.innerHTML = data.gallery.map(g => `
    <tr>
      <td>${new Date(g.uploaded_at).toLocaleDateString()}</td>
      <td>${g.uploaded_by_role === 'Admin' ? '🔧 Admin' : '👤 ' + g.uploaded_by_role}</td>
      <td><img src="../${g.image_path}" style="width:60px;height:45px;object-fit:cover;border-radius:6px"/></td>
      <td>${g.caption || '—'}</td>
      <td><span class="badge-status badge-${g.status.toLowerCase()}">${g.status}</span></td>
      <td>
        ${g.status === 'Pending' ? `<button class="btn btn-sm" style="background:#198754;color:#fff;margin-right:4px" onclick="updateGallery(${g.id},'Approved')"><i class="fas fa-check"></i></button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteGallery(${g.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

async function uploadGallery() {
  const fd = new FormData();
  fd.append('action', 'upload_gallery');
  fd.append('caption', document.getElementById('galleryCaption').value);
  const file = document.getElementById('galleryFile').files[0];
  if (!file) { document.getElementById('galleryAdminAlert').innerHTML = '<div class="alert alert-warning">Please select an image.</div>'; return; }
  fd.append('photo', file);
  const data = await apiFetch('upload_gallery', 'POST', fd);
  document.getElementById('galleryAdminAlert').innerHTML = data.success
    ? `<div class="alert alert-success">${data.message}</div>`
    : `<div class="alert alert-danger">${data.message}</div>`;
  if (data.success) { document.getElementById('galleryFile').value = ''; document.getElementById('galleryCaption').value = ''; loadGalleryAdmin(); }
}

async function updateGallery(id, status) {
  showConfirmModal(`Confirm ${status}`, `Are you sure you want to ${status.toLowerCase()} this gallery photo?`, async () => {
    const fd = new FormData(); fd.append('action', 'update_gallery'); fd.append('id', id); fd.append('status', status);
    await apiFetch('update_gallery', 'POST', fd);
    loadGalleryAdmin();
    loadDashboard();
  });
}

async function deleteGallery(id) {
  const fd = new FormData(); fd.append('action', 'delete_gallery'); fd.append('id', id);
  await apiFetch('delete_gallery', 'POST', fd);
  loadGalleryAdmin();
  loadDashboard();
}

// ============ PROFILE ============
async function loadAdminProfile() {
  const fd = new FormData(); fd.append('action', 'check_session');
  const res = await fetch(AUTH, { method: 'POST', body: fd, credentials: 'include' });
  const data = await res.json();
  if (data.logged_in) {
    document.getElementById('profileUsername').value = data.user_name;
    document.getElementById('profileFullName').value = data.user_name;
    document.getElementById('profileEmail').value = data.user_email;
    const initials = data.user_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('profileAvatarBig').textContent = initials;
  }
  
  // Load SMTP Settings
  try {
    const smtpRes = await fetch('../api/settings.php?action=get_smtp', { credentials: 'include' });
    const smtpData = await smtpRes.json();
    if (smtpData.success && smtpData.settings) {
      document.getElementById('smtpHost').value = smtpData.settings.smtp_host || '';
      document.getElementById('smtpPort').value = smtpData.settings.smtp_port || '';
      document.getElementById('smtpUser').value = smtpData.settings.smtp_user || '';
      document.getElementById('smtpPass').value = smtpData.settings.smtp_pass || '';
    }
  } catch(e) {}
}

async function saveSmtpSettings() {
  const fd = new FormData();
  fd.append('action', 'save_smtp');
  fd.append('smtp_host', document.getElementById('smtpHost').value);
  fd.append('smtp_port', document.getElementById('smtpPort').value);
  fd.append('smtp_user', document.getElementById('smtpUser').value);
  fd.append('smtp_pass', document.getElementById('smtpPass').value);

  try {
    const res = await fetch('../api/settings.php', { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      showSuccessMessage('Settings Saved!', data.message);
      document.getElementById('smtpAlert').innerHTML = '';
    } else {
      document.getElementById('smtpAlert').innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
    }
  } catch (e) {
    document.getElementById('smtpAlert').innerHTML = `<div class="alert alert-danger">Connection error.</div>`;
  }
}

async function updateAdminProfile() {
  const fd = new FormData();
  fd.append('action', 'update_profile');
  fd.append('username', document.getElementById('profileUsername').value);
  fd.append('full_name', document.getElementById('profileFullName').value);
  fd.append('email', document.getElementById('profileEmail').value);
  const photo = document.getElementById('profilePhoto').files[0];
  if (photo) fd.append('profile_photo', photo);
  const data = await apiFetch('update_profile', 'POST', fd);
  if (data.success) {
    showSuccessMessage('Profile Updated', data.message);
    document.getElementById('profileAlert').innerHTML = '';
    loadAdminInfo();
  } else {
    document.getElementById('profileAlert').innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
  }
}

async function updateAdminPassword() {
  const current = document.getElementById('adminCurrentPwd').value;
  const newPwd = document.getElementById('adminNewPwd').value;
  const confirm = document.getElementById('adminConfirmPwd').value;
  if (!current || !newPwd || !confirm) {
    document.getElementById('passwordAlert').innerHTML = `<div class="alert alert-danger">All password fields are required.</div>`;
    return;
  }
  const fd = new FormData();
  fd.append('action', 'update_password');
  fd.append('current_password', current);
  fd.append('new_password', newPwd);
  fd.append('confirm_password', confirm);

  const res = await fetch(AUTH, { method: 'POST', body: fd, credentials: 'include' });
  const data = await res.json();
  
  if (data.success) {
    showSuccessMessage('Password Updated', data.message);
    document.getElementById('passwordAlert').innerHTML = '';
    document.getElementById('adminCurrentPwd').value = '';
    document.getElementById('adminNewPwd').value = '';
    document.getElementById('adminConfirmPwd').value = '';
  } else {
    document.getElementById('passwordAlert').innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
  }
}

// ============ LOGOUT ============
async function doLogout(e) {
  if (e) e.preventDefault();
  const modalHTML = `
    <div id="logoutModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;opacity:0;transition:opacity 0.3s ease;backdrop-filter:blur(4px);">
      <div style="background:#fff;border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 15px 50px rgba(0,0,0,0.2);transform:translateY(20px);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        <div style="width:70px;height:70px;background:#ffebee;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:#f44336;font-size:2.2rem;">
          <i class="fas fa-sign-out-alt"></i>
        </div>
        <h3 style="font-family:'Playfair Display',serif;font-size:1.6rem;color:#2c3e50;margin-bottom:12px;font-weight:700;">Ready to leave?</h3>
        <p style="color:#6c757d;font-size:1rem;line-height:1.6;margin-bottom:28px;">Are you sure you want to log out of your admin dashboard?</p>
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

// ============ HELPERS ============
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

async function apiFetch(action, method = 'GET', fd = null) {
  try {
    let url = API + (method === 'GET' ? '?action=' + action : '');
    const opts = { method, credentials: 'include' };
    if (method === 'POST') opts.body = fd;
    const res = await fetch(url, opts);
    return await res.json();
  } catch { return { success: false, message: 'Connection error.' }; }
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(mo => {
  mo.addEventListener('click', e => { if (e.target === mo) mo.classList.remove('active'); });
});

async function downloadRoomsPDF() {
  const data = await apiFetch('get_rooms_admin', 'GET');
  if (!data.success || !data.rooms?.length) {
    alert('No rooms found to generate PDF.');
    return;
  }
  const w = window.open('', '_blank');
  let rowsHtml = data.rooms.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.hostel_name}</td>
      <td>Room ${r.room_no}</td>
      <td>${r.capacity}</td>
      <td>${r.available_spaces}</td>
      <td>${r.status}</td>
      <td>${r.description || '—'}</td>
    </tr>
  `).join('');

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hostel Rooms Report</title>
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
        <p>Hostel Rooms & Availability Report | Generated on ${new Date().toLocaleDateString()}</p>
        <p>Contact: info@fu.edu.pk</p>
      </div>
      <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Hostel Name</th>
            <th>Room No</th>
            <th>Capacity</th>
            <th>Available Spaces</th>
            <th>Status</th>
            <th>Description</th>
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

async function downloadFeesPDFAdmin() {
  const data = await apiFetch('get_fees', 'GET');
  if (!data.success || !data.fees?.length) {
    alert('No fee records found to generate PDF.');
    return;
  }
  const w = window.open('', '_blank');
  let rowsHtml = data.fees.map((f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${f.full_name || f.user_name || '—'}</td>
      <td>${f.user_role}</td>
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
      <title>Hostel Fee Management Report</title>
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
        <p>Hostel Fee Status & Records Report | Generated on ${new Date().toLocaleDateString()}</p>
        <p>Contact: info@fu.edu.pk</p>
      </div>
      <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Role</th>
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
