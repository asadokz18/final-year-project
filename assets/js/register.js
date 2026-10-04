// ============================================
// Register Page JS — FATA University Hostel
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  detectRegisterType();
  setupPhotoPreview();
});

// Detect ?type=student or ?type=faculty from URL
/**
 * Detects whether the user wants to register as a student or faculty
 * based on the URL query parameter (e.g., ?type=faculty).
 */
function detectRegisterType() {
  const params = new URLSearchParams(window.location.search);
  const type   = params.get('type') || 'student';
  if (type === 'faculty') showFacultyForm();
  else showStudentForm();
}

function showStudentForm() {
  const sf = document.getElementById('studentForm');
  const ff = document.getElementById('facultyForm');
  if (sf) sf.style.display = 'block';
  if (ff) ff.style.display = 'none';
  document.querySelectorAll('.tab-student').forEach(b => b.classList.add('active'));
  document.querySelectorAll('.tab-faculty').forEach(b => b.classList.remove('active'));
  document.title = 'Student Register — FATA University Hostel';
}

function showFacultyForm() {
  const sf = document.getElementById('studentForm');
  const ff = document.getElementById('facultyForm');
  if (sf) sf.style.display = 'none';
  if (ff) ff.style.display = 'block';
  document.querySelectorAll('.tab-student').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-faculty').forEach(b => b.classList.add('active'));
  document.title = 'Faculty Register — FATA University Hostel';
}

// Photo preview
function setupPhotoPreview() {
  ['studentPhoto', 'facultyPhoto'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', function () {
      const previewId = id === 'studentPhoto' ? 'studentPhotoPreview' : 'facultyPhotoPreview';
      const preview   = document.getElementById(previewId);
      if (preview && this.files[0]) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; };
        reader.readAsDataURL(this.files[0]);
      }
    });
  });
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.innerHTML = inp.type === 'password'
    ? '<i class="fas fa-eye"></i>'
    : '<i class="fas fa-eye-slash"></i>';
}

function showAlert(containerId, msg, type = 'danger') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}
  </div>`;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---- STUDENT REGISTER ----
/**
 * Collects student registration data, validates it, and submits it to the API.
 * Redirects to login page upon successful account creation.
 */
async function registerStudent() {
  const btn = document.getElementById('studentSubmitBtn');
  const alertId = 'studentAlert';

  const fields = {
    full_name:       document.getElementById('s_fullname')?.value.trim(),
    father_name:     document.getElementById('s_fathername')?.value.trim(),
    email:           document.getElementById('s_email')?.value.trim(),
    phone:           document.getElementById('s_phone')?.value.trim(),
    gender:          document.getElementById('s_gender')?.value,
    cnic:            document.getElementById('s_cnic')?.value.trim(),
    dob:             document.getElementById('s_dob')?.value,
    department:      document.getElementById('s_department')?.value.trim(),
    semester:        document.getElementById('s_semester')?.value.trim(),
    registration_no: document.getElementById('s_regno')?.value.trim(),
    home_address:    document.getElementById('s_address')?.value.trim(),
    password:        document.getElementById('s_password')?.value,
    confirm_password:document.getElementById('s_confirm_password')?.value,
  };

  // Validate
  for (const [key, val] of Object.entries(fields)) {
    if (!val && key !== 'confirm_password') {
      showAlert(alertId, `Please fill in all required fields. Missing: ${key.replace(/_/g,' ')}`);
      return;
    }
  }
  if (fields.password !== fields.confirm_password) {
    showAlert(alertId, 'Passwords do not match.'); return;
  }
  if (fields.password.length < 6) {
    showAlert(alertId, 'Password must be at least 6 characters.'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

  const fd = new FormData();
  fd.append('action', 'student_register');
  Object.entries(fields).forEach(([k, v]) => { if (k !== 'confirm_password') fd.append(k, v); });

  const photo = document.getElementById('studentPhoto')?.files[0];
  if (photo) fd.append('profile_photo', photo);

  try {
    const res  = await fetch('api/auth.php', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showAlert(alertId, '🎉 ' + data.message + ' Redirecting to login...', 'success');
      setTimeout(() => window.location.href = 'login.html', 2000);
    } else {
      showAlert(alertId, data.message || 'Registration failed.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Register as Student';
    }
  } catch {
    showAlert(alertId, 'Server error. Please try again.');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Register as Student';
  }
}

// ---- FACULTY REGISTER ----
/**
 * Collects faculty registration data, validates it, and submits it to the API.
 * Handles photo uploads and professional details specific to faculty.
 */
async function registerFaculty() {
  const btn     = document.getElementById('facultySubmitBtn');
  const alertId = 'facultyAlert';

  const fields = {
    full_name:    document.getElementById('f_fullname')?.value.trim(),
    father_name:  document.getElementById('f_fathername')?.value.trim(),
    email:        document.getElementById('f_email')?.value.trim(),
    phone:        document.getElementById('f_phone')?.value.trim(),
    gender:       document.getElementById('f_gender')?.value,
    cnic:         document.getElementById('f_cnic')?.value.trim(),
    dob:          document.getElementById('f_dob')?.value,
    designation:  document.getElementById('f_designation')?.value.trim(),
    department:   document.getElementById('f_department')?.value.trim(),
    employee_id:  document.getElementById('f_employeeid')?.value.trim(),
    qualification:document.getElementById('f_qualification')?.value.trim(),
    home_address: document.getElementById('f_address')?.value.trim(),
    password:     document.getElementById('f_password')?.value,
    confirm_password: document.getElementById('f_confirm_password')?.value,
  };

  for (const [key, val] of Object.entries(fields)) {
    if (!val && key !== 'confirm_password') {
      showAlert(alertId, `Please fill in all required fields. Missing: ${key.replace(/_/g,' ')}`);
      return;
    }
  }
  if (fields.password !== fields.confirm_password) {
    showAlert(alertId, 'Passwords do not match.'); return;
  }
  if (fields.password.length < 6) {
    showAlert(alertId, 'Password must be at least 6 characters.'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

  const fd = new FormData();
  fd.append('action', 'faculty_register');
  Object.entries(fields).forEach(([k, v]) => { if (k !== 'confirm_password') fd.append(k, v); });

  const photo = document.getElementById('facultyPhoto')?.files[0];
  if (photo) fd.append('profile_photo', photo);

  try {
    const res  = await fetch('api/auth.php', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showAlert(alertId, '🎉 ' + data.message + ' Redirecting to login...', 'success');
      setTimeout(() => window.location.href = 'login.html', 2000);
    } else {
      showAlert(alertId, data.message || 'Registration failed.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Register as Faculty';
    }
  } catch {
    showAlert(alertId, 'Server error. Please try again.');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Register as Faculty';
  }
}
