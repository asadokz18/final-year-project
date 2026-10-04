// ============================================
// Login Page JS — FATA University Hostel
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  checkAlreadyLoggedIn();
  handleRedirectParam();
});

// Check if already logged in
async function checkAlreadyLoggedIn() {
  try {
    const res  = await fetch('api/auth.php?action=check_session');
    const data = await res.json();
    if (data.logged_in) {
      const map = { Admin:'admin/dashboard.html', Student:'student/dashboard.html', Faculty:'faculty/dashboard.html' };
      window.location.href = map[data.user_role] || 'index.html';
    }
  } catch {}
}

// Store intended URL if redirect param present
function handleRedirectParam() {
  const params  = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (redirect) sessionStorage.setItem('intended_url', redirect);
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    inp.type = 'password';
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

function showAlert(msg, type = 'danger') {
  const box = document.getElementById('alertBox');
  if (!box) return;
  box.innerHTML = `<div class="alert alert-${type}">
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}
  </div>`;
}

async function doLogin() {
  const email    = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const btn      = document.getElementById('loginBtn');

  if (!email || !password) { showAlert('Please enter your email and password.'); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  document.getElementById('alertBox').innerHTML = '';

  const fd = new FormData();
  fd.append('action', 'login');
  fd.append('email', email);
  fd.append('password', password);

  try {
    const res  = await fetch('api/auth.php', { method: 'POST', body: fd });
    const data = await res.json();

    if (data.success) {
      showAlert('Login successful! Redirecting...', 'success');
      const intended = sessionStorage.getItem('intended_url');
      sessionStorage.removeItem('intended_url');
      setTimeout(() => { window.location.href = intended || data.redirect; }, 900);
    } else {
      showAlert(data.message || 'Invalid email or password.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  } catch {
    showAlert('Could not connect to server. Please try again.', 'warning');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
  }
}

// Allow Enter key to submit
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
