<?php
// ============================================
// FATA University Hostel - Authentication API
// Handles: login, register, logout, password reset
// ============================================
require_once 'config/headers.php';
require_once 'middleware.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    // ============================================
    // NEW STUDENT ENROLLMENT
    // ============================================
    case 'student_register':
        $full_name       = clean($conn, $_POST['full_name']       ?? '');
        $father_name     = clean($conn, $_POST['father_name']     ?? '');
        $email           = clean($conn, $_POST['email']           ?? '');
        $phone           = clean($conn, $_POST['phone']           ?? '');
        $gender          = clean($conn, $_POST['gender']          ?? '');
        $cnic            = clean($conn, $_POST['cnic']            ?? '');
        $dob             = clean($conn, $_POST['dob']             ?? '');
        $department      = clean($conn, $_POST['department']      ?? '');
        $semester        = clean($conn, $_POST['semester']        ?? '');
        $registration_no = clean($conn, $_POST['registration_no'] ?? '');
        $home_address    = clean($conn, $_POST['home_address']    ?? '');
        $password        = $_POST['password']                     ?? '';

        if (!$full_name || !$email || !$password || !$cnic || !$registration_no || !$gender || !$semester)
            send_json(['success' => false, 'message' => 'All required fields must be filled.']);
        if (strlen($password) < 6)
            send_json(['success' => false, 'message' => 'Password must be at least 6 characters.']);

        $chk = $conn->query("SELECT id FROM student WHERE email='$email' LIMIT 1");
        if ($chk && $chk->num_rows > 0)
            send_json(['success' => false, 'message' => 'Email already registered.']);
        $chk = $conn->query("SELECT id FROM student WHERE cnic='$cnic' LIMIT 1");
        if ($chk && $chk->num_rows > 0)
            send_json(['success' => false, 'message' => 'CNIC already registered.']);
        $chk = $conn->query("SELECT id FROM student WHERE registration_no='$registration_no' LIMIT 1");
        if ($chk && $chk->num_rows > 0)
            send_json(['success' => false, 'message' => 'Registration number already exists.']);

        $hashed     = password_hash($password, PASSWORD_DEFAULT);
        $photo_path = '';

        if (!empty($_FILES['profile_photo']['name'])) {
            $ext     = strtolower(pathinfo($_FILES['profile_photo']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg','jpeg','png','gif','webp','bmp','jfif'];
            if (!in_array($ext, $allowed))
                send_json(['success' => false, 'message' => 'Invalid photo format.']);
            if (!is_dir('../assets/uploads/profile/')) mkdir('../assets/uploads/profile/', 0777, true);
            $filename = 'student_' . time() . '_' . rand(1000,9999) . '.' . $ext;
            $dest     = '../assets/uploads/profile/' . $filename;
            if (move_uploaded_file($_FILES['profile_photo']['tmp_name'], $dest))
                $photo_path = 'assets/uploads/profile/' . $filename;
        }

        $today = date('Y-m-d');
        $now   = date('Y-m-d H:i:s');
        $sql   = "INSERT INTO student
                    (full_name, father_name, email, phone, gender, cnic, dob,
                     department, semester, registration_no, home_address, profile_photo,
                     password, joining_date, status, created_at, updated_at)
                  VALUES
                    ('$full_name','$father_name','$email','$phone','$gender','$cnic','$dob',
                     '$department','$semester','$registration_no','$home_address','$photo_path',
                     '$hashed','$today','Active','$now','$now')";

        if ($conn->query($sql)) {
            send_welcome_email($email, $full_name, 'Student');
            send_json(['success' => true, 'message' => 'Student registration successful! Please login.']);
        } else
            send_json(['success' => false, 'message' => 'Registration failed: ' . $conn->error]);
        break;

    // ============================================
    // NEW FACULTY ENROLLMENT
    // ============================================
    case 'faculty_register':
        $full_name    = clean($conn, $_POST['full_name']    ?? '');
        $father_name  = clean($conn, $_POST['father_name']  ?? '');
        $email        = clean($conn, $_POST['email']        ?? '');
        $phone        = clean($conn, $_POST['phone']        ?? '');
        $gender       = clean($conn, $_POST['gender']       ?? '');
        $cnic         = clean($conn, $_POST['cnic']         ?? '');
        $dob          = clean($conn, $_POST['dob']          ?? '');
        $designation  = clean($conn, $_POST['designation']  ?? '');
        $department   = clean($conn, $_POST['department']   ?? '');
        $employee_id  = clean($conn, $_POST['employee_id']  ?? '');
        $qualification= clean($conn, $_POST['qualification'] ?? '');
        $home_address = clean($conn, $_POST['home_address'] ?? '');
        $password     = $_POST['password']                  ?? '';

        if (!$full_name || !$email || !$password || !$employee_id || !$gender)
            send_json(['success' => false, 'message' => 'All required fields must be filled.']);
        if (strlen($password) < 6)
            send_json(['success' => false, 'message' => 'Password must be at least 6 characters.']);

        $chk = $conn->query("SELECT id FROM faculty WHERE email='$email' LIMIT 1");
        if ($chk && $chk->num_rows > 0)
            send_json(['success' => false, 'message' => 'Email already registered.']);
        $chk = $conn->query("SELECT id FROM faculty WHERE employee_id='$employee_id' LIMIT 1");
        if ($chk && $chk->num_rows > 0)
            send_json(['success' => false, 'message' => 'Employee ID already registered.']);

        $hashed     = password_hash($password, PASSWORD_DEFAULT);
        $photo_path = '';

        if (!empty($_FILES['profile_photo']['name'])) {
            $ext     = strtolower(pathinfo($_FILES['profile_photo']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg','jpeg','png','gif','webp','bmp','jfif'];
            if (!in_array($ext, $allowed))
                send_json(['success' => false, 'message' => 'Invalid photo format.']);
            if (!is_dir('../assets/uploads/profile/')) mkdir('../assets/uploads/profile/', 0777, true);
            $filename = 'faculty_' . time() . '_' . rand(1000,9999) . '.' . $ext;
            $dest     = '../assets/uploads/profile/' . $filename;
            if (move_uploaded_file($_FILES['profile_photo']['tmp_name'], $dest))
                $photo_path = 'assets/uploads/profile/' . $filename;
        }

        $today = date('Y-m-d');
        $now   = date('Y-m-d H:i:s');
        $sql   = "INSERT INTO faculty
                    (full_name, father_name, email, phone, gender, cnic, dob,
                     designation, department, employee_id, qualification,
                     home_address, profile_photo, password,
                     joining_date, status, created_at, updated_at)
                  VALUES
                    ('$full_name','$father_name','$email','$phone','$gender','$cnic','$dob',
                     '$designation','$department','$employee_id','$qualification',
                     '$home_address','$photo_path','$hashed',
                     '$today','Active','$now','$now')";

        if ($conn->query($sql)) {
            send_welcome_email($email, $full_name, 'Faculty');
            send_json(['success' => true, 'message' => 'Faculty registration successful! Please login.']);
        } else
            send_json(['success' => false, 'message' => 'Registration failed: ' . $conn->error]);
        break;

    // ============================================
    // USER AUTHENTICATION (Login)
    // ============================================
    case 'login':
        $email    = clean($conn, $_POST['email']    ?? '');
        $password = $_POST['password']              ?? '';

        if (!$email || !$password)
            send_json(['success' => false, 'message' => 'Email and password are required.']);

        // Check Admin
        $r = $conn->query("SELECT * FROM admin WHERE email='$email' OR username='$email' LIMIT 1");
        if ($r && $r->num_rows > 0) {
            $admin = $r->fetch_assoc();
            if (password_verify($password, $admin['password'])) {
                session_regenerate_id(true);
                $_SESSION['user_id']    = $admin['id'];
                $_SESSION['user_role']  = 'Admin';
                $_SESSION['user_name']  = $admin['full_name'];
                $_SESSION['user_email'] = $admin['email'];
                $_SESSION['user_photo'] = $admin['profile_photo'] ?? '';
                send_login_notification($admin['email'], $admin['full_name'], 'Admin');
                send_json(['success' => true, 'role' => 'Admin', 'redirect' => 'admin/dashboard.html', 'message' => 'Welcome back, Admin!']);
            }
        }

        // Check Student
        $r = $conn->query("SELECT * FROM student WHERE email='$email' AND status='Active' LIMIT 1");
        if ($r && $r->num_rows > 0) {
            $user = $r->fetch_assoc();
            if (password_verify($password, $user['password'])) {
                session_regenerate_id(true);
                $_SESSION['user_id']    = $user['id'];
                $_SESSION['user_role']  = 'Student';
                $_SESSION['user_name']  = $user['full_name'];
                $_SESSION['user_email'] = $user['email'];
                $_SESSION['user_photo'] = $user['profile_photo'] ?? '';
                send_login_notification($user['email'], $user['full_name'], 'Student');
                send_json(['success' => true, 'role' => 'Student', 'redirect' => 'student/dashboard.html', 'message' => 'Welcome back!']);
            }
        }

        // Check Faculty
        $r = $conn->query("SELECT * FROM faculty WHERE email='$email' AND status='Active' LIMIT 1");
        if ($r && $r->num_rows > 0) {
            $user = $r->fetch_assoc();
            if (password_verify($password, $user['password'])) {
                session_regenerate_id(true);
                $_SESSION['user_id']    = $user['id'];
                $_SESSION['user_role']  = 'Faculty';
                $_SESSION['user_name']  = $user['full_name'];
                $_SESSION['user_email'] = $user['email'];
                $_SESSION['user_photo'] = $user['profile_photo'] ?? '';
                send_login_notification($user['email'], $user['full_name'], 'Faculty');
                send_json(['success' => true, 'role' => 'Faculty', 'redirect' => 'faculty/dashboard.html', 'message' => 'Welcome back!']);
            }
        }

        send_json(['success' => false, 'message' => 'Invalid email or password. Please try again.']);
        break;

    // ============================================
    // VALIDATE ACTIVE SESSION
    // ============================================
    case 'check_session':
        if (!empty($_SESSION['user_id'])) {
            send_json([
                'success'    => true,
                'logged_in'  => true,
                'user_id'    => $_SESSION['user_id'],
                'user_role'  => $_SESSION['user_role'],
                'user_name'  => $_SESSION['user_name'],
                'user_email' => $_SESSION['user_email'] ?? '',
                'user_photo' => $_SESSION['user_photo'] ?? '',
            ]);
        } else {
            send_json(['success' => true, 'logged_in' => false]);
        }
        break;

    // ============================================
    // LOGOUT
    // ============================================
    case 'logout':
        $_SESSION = [];
        session_destroy();
        send_json(['success' => true, 'redirect' => 'login.html']);
        break;

    // ============================================
    // INITIATE PASSWORD RECOVERY — sends 6-digit OTP
    // ============================================
    case 'forgot_password':
        $email = clean($conn, $_POST['email'] ?? '');
        $role  = clean($conn, $_POST['role']  ?? 'Student');

        if (!$email)
            send_json(['success' => false, 'message' => 'Please enter your email address.']);

        $table = ($role === 'Faculty') ? 'faculty' : 'student';
        $r     = $conn->query("SELECT id, full_name FROM $table WHERE email='$email' LIMIT 1");
        if (!$r || $r->num_rows === 0)
            send_json(['success' => false, 'message' => 'No account found with this email address.']);

        $user_row = $r->fetch_assoc();
        $name     = $user_row['full_name'];

        $conn->query("DELETE FROM password_reset WHERE email='$email' AND user_role='$role'");

        $otp    = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiry = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $now    = date('Y-m-d H:i:s');
        $conn->query("INSERT INTO password_reset (email, user_role, token, expiry, used, created_at)
                      VALUES ('$email','$role','$otp','$expiry',0,'$now')");

        send_forgot_password_email($email, $name, $role, $otp);

        send_json([
            'success' => true,
            'message' => 'A 6-digit OTP has been sent to your email address. It expires in 15 minutes.',
        ]);
        break;

    // ============================================
    // FINALIZE PASSWORD RECOVERY — verify OTP
    // ============================================
    case 'reset_password':
        $otp      = trim(clean($conn, $_POST['token']    ?? ''));
        $password = $_POST['password']                   ?? '';

        if (!$otp || !$password)
            send_json(['success' => false, 'message' => 'OTP and new password are required.']);
        if (!preg_match('/^\d{6}$/', $otp))
            send_json(['success' => false, 'message' => 'Please enter a valid 6-digit OTP.']);
        if (strlen($password) < 6)
            send_json(['success' => false, 'message' => 'Password must be at least 6 characters.']);

        $r = $conn->query("SELECT * FROM password_reset WHERE token='$otp' AND used=0 AND expiry > NOW() LIMIT 1");
        if (!$r || $r->num_rows === 0)
            send_json(['success' => false, 'message' => 'Invalid or expired OTP. Please request a new one.']);

        $reset  = $r->fetch_assoc();
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $email  = $reset['email'];
        $table  = ($reset['user_role'] === 'Faculty') ? 'faculty' : 'student';
        $now    = date('Y-m-d H:i:s');

        $conn->query("UPDATE $table SET password='$hashed', updated_at='$now' WHERE email='$email'");
        $conn->query("UPDATE password_reset SET used=1 WHERE token='$otp'");
        send_json(['success' => true, 'message' => 'Password reset successfully! You can now login.']);
        break;

    // ============================================
    // UPDATE PASSWORD (logged-in user)
    // ============================================
    case 'update_password':
        if (empty($_SESSION['user_id']))
            send_json(['success' => false, 'message' => 'Not authenticated.'], 401);

        $uid     = intval($_SESSION['user_id']);
        $role    = $_SESSION['user_role'];
        $table   = ($role === 'Faculty') ? 'faculty' : (($role === 'Admin') ? 'admin' : 'student');
        $current = $_POST['current_password'] ?? '';
        $new_pwd = $_POST['new_password']     ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        if ($new_pwd !== $confirm)
            send_json(['success' => false, 'message' => 'New passwords do not match.']);
        if (strlen($new_pwd) < 6)
            send_json(['success' => false, 'message' => 'Password must be at least 6 characters.']);

        $r   = $conn->query("SELECT password FROM $table WHERE id=$uid LIMIT 1");
        $row = $r->fetch_assoc();
        if (!password_verify($current, $row['password']))
            send_json(['success' => false, 'message' => 'Current password is incorrect.']);

        $hashed = password_hash($new_pwd, PASSWORD_DEFAULT);
        $now    = date('Y-m-d H:i:s');
        $conn->query("UPDATE $table SET password='$hashed', updated_at='$now' WHERE id=$uid");
        send_json(['success' => true, 'message' => 'Password updated successfully.']);
        break;

    default:
        send_json(['success' => false, 'message' => 'Invalid action.'], 400);
}

// ============================================
// SEND LOGIN NOTIFICATION EMAIL
// ============================================
function send_login_notification($email, $name, $role) {
    if (!file_exists(__DIR__ . '/mailer.php')) return false;
    require_once __DIR__ . '/mailer.php';

    $ip      = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    $agent   = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $os      = 'Unknown OS';
    $browser = 'Unknown Browser';

    if (preg_match('/windows/i',  $agent)) $os = 'Windows';
    elseif (preg_match('/macintosh/i', $agent)) $os = 'macOS';
    elseif (preg_match('/android/i',   $agent)) $os = 'Android';
    elseif (preg_match('/iphone|ipad/i',$agent)) $os = 'iOS';
    elseif (preg_match('/linux/i', $agent)) $os = 'Linux';

    if (preg_match('/chrome/i',$agent) && !preg_match('/edge|opr/i',$agent)) $browser = 'Google Chrome';
    elseif (preg_match('/firefox/i',$agent))  $browser = 'Mozilla Firefox';
    elseif (preg_match('/edge|edg/i',$agent)) $browser = 'Microsoft Edge';
    elseif (preg_match('/safari/i',$agent) && !preg_match('/chrome/i',$agent)) $browser = 'Safari';
    elseif (preg_match('/opr|opera/i',$agent)) $browser = 'Opera';

    $device = "$browser on $os";
    $time   = date('Y-m-d H:i:s');
    $year   = date('Y');
    $subject = 'FATA University Hostel - New Sign-In Detected';

    $message = "
<div style='font-family:Arial,sans-serif;background:#f1f5f9;padding:24px 8px;'>
<div style='max-width:460px;margin:0 auto;background:#fff;border-radius:10px;border-top:4px solid #6366f1;'>
<div style='padding:20px 24px 0;text-align:center;'>
  <div style='font-size:17px;font-weight:800;color:#1e1b4b;'>FATA University</div>
  <div style='font-size:10px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;'>Hostel Management System</div>
</div>
<div style='padding:18px 24px;'>
  <div style='font-size:14px;font-weight:700;color:#1e293b;margin-bottom:6px;'>New Sign-In Detected</div>
  <p style='font-size:12px;color:#64748b;line-height:1.6;margin:0 0 16px;'>Hello <strong>$name</strong>, a new login was recorded on your account.</p>
  <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f8fafc;border-radius:8px;margin-bottom:16px;'>
    <tr><td style='padding:14px 16px;font-size:12px;color:#475569;line-height:2;'>
      <strong>Role:</strong> $role<br>
      <strong>Email:</strong> $email<br>
      <strong>Time:</strong> $time<br>
      <strong>IP:</strong> $ip<br>
      <strong>Device:</strong> $device
    </td></tr>
  </table>
  <p style='font-size:11px;color:#94a3b8;margin:0;'>If this was not you, secure your account immediately.</p>
</div>
<div style='background:#f8fafc;border-top:1px solid #f1f5f9;padding:12px 24px;text-align:center;'>
  <div style='font-size:10px;color:#94a3b8;'>&copy; $year FATA University Hostel. All rights reserved.</div>
</div>
</div></div>";

    return send_hostel_email($email, $subject, $message);
}

// ============================================
// SEND WELCOME EMAIL
// ============================================
function send_welcome_email($email, $name, $role) {
    if (!file_exists(__DIR__ . '/mailer.php')) return false;
    require_once __DIR__ . '/mailer.php';

    $year    = date('Y');
    $subject = 'Welcome to FATA University Hostel System!';

    $message = "
<div style='font-family:Arial,sans-serif;background:#f1f5f9;padding:24px 8px;'>
<div style='max-width:460px;margin:0 auto;background:#fff;border-radius:10px;border-top:4px solid #10b981;'>
<div style='padding:20px 24px 0;text-align:center;'>
  <div style='font-size:17px;font-weight:800;color:#1e1b4b;'>FATA University</div>
  <div style='font-size:10px;color:#10b981;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;'>Hostel Management System</div>
</div>
<div style='padding:18px 24px;'>
  <div style='font-size:14px;font-weight:700;color:#1e293b;margin-bottom:6px;'>Registration Successful!</div>
  <p style='font-size:12px;color:#64748b;line-height:1.6;margin:0 0 14px;'>Hello <strong>$name</strong>, welcome! Your <strong>$role</strong> account has been created.</p>
  <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#ecfdf5;border-radius:8px;margin-bottom:16px;'>
    <tr><td style='padding:12px 15px;font-size:12px;color:#047857;line-height:1.8;'>
      &#10003; Log in with your registered email.<br>
      &#10003; Apply for a hostel room from your dashboard.<br>
      &#10003; Track room assignments and fee updates.
    </td></tr>
  </table>
  <div style='text-align:center;'>
    <a href='http://localhost/hostel/login.html'
       style='background:#10b981;color:#fff;padding:10px 22px;font-size:13px;
              font-weight:700;border-radius:6px;text-decoration:none;display:inline-block;'>
      Login to Portal
    </a>
  </div>
</div>
<div style='background:#f8fafc;border-top:1px solid #f1f5f9;padding:12px 24px;text-align:center;'>
  <div style='font-size:10px;color:#94a3b8;'>&copy; $year FATA University Hostel. All rights reserved.</div>
</div>
</div></div>";

    return send_hostel_email($email, $subject, $message);
}

// ============================================
// SEND PASSWORD RESET OTP EMAIL
// Mobile-safe table layout
// ============================================
function send_forgot_password_email($email, $name, $role, $otp) {
    if (!file_exists(__DIR__ . '/mailer.php')) return false;
    require_once __DIR__ . '/mailer.php';

    $year    = date('Y');
    $subject = 'FATA University Hostel - Password Reset OTP';

    // Individual digit cells (table-based for email client compatibility)
    $digits = str_split($otp);
    $cells  = '';
    foreach ($digits as $d) {
        $cells .= "<td style='padding:0 4px;'>"
                . "<div style='width:34px;height:42px;line-height:42px;text-align:center;"
                .             "font-size:20px;font-weight:800;color:#1e293b;"
                .             "background:#fff;border:2px solid #d1d5db;"
                .             "border-radius:6px;font-family:monospace;'>$d</div>"
                . "</td>";
    }

    $message = "
<div style='font-family:Arial,sans-serif;background:#f1f5f9;padding:24px 8px;'>
<div style='max-width:460px;margin:0 auto;background:#fff;border-radius:10px;border-top:4px solid #ef4444;'>

<div style='padding:20px 24px 0;text-align:center;'>
  <div style='font-size:17px;font-weight:800;color:#1e1b4b;'>FATA University</div>
  <div style='font-size:10px;color:#ef4444;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;'>Hostel Management System</div>
</div>

<div style='padding:18px 24px;'>
  <div style='font-size:14px;font-weight:700;color:#1e293b;margin-bottom:6px;'>Password Reset OTP</div>
  <p style='font-size:12px;color:#64748b;line-height:1.6;margin:0 0 16px;'>
    Hello <strong>$name</strong> — use the OTP below to reset your password.
    Expires in <strong>15 minutes</strong>.
  </p>

  <table width='100%' cellpadding='0' cellspacing='0' border='0'
         style='background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:16px;'>
    <tr><td style='padding:16px 12px;text-align:center;'>
      <div style='font-size:9px;color:#ef4444;font-weight:700;text-transform:uppercase;
                  letter-spacing:2px;margin-bottom:12px;'>Your One-Time Password</div>

      <table cellpadding='0' cellspacing='0' border='0' style='margin:0 auto;'>
        <tr>$cells</tr>
      </table>

      <div style='font-size:26px;font-weight:900;letter-spacing:8px;color:#1e293b;
                  font-family:monospace;margin-top:10px;text-indent:8px;'>$otp</div>

      <div style='font-size:10px;color:#94a3b8;margin-top:8px;'>
        Valid 15 min &nbsp;&middot;&nbsp; Do not share this OTP
      </div>
    </td></tr>
  </table>

  <table width='100%' cellpadding='0' cellspacing='0' border='0'
         style='background:#f8fafc;border-radius:6px;margin-bottom:14px;'>
    <tr><td style='padding:10px 14px;font-size:11px;color:#475569;line-height:1.8;'>
      <strong>Steps:</strong><br>
      1. Return to the Forgot Password page.<br>
      2. Enter the 6-digit OTP.<br>
      3. Set your new password.
    </td></tr>
  </table>

  <p style='font-size:10px;color:#94a3b8;margin:0;'>
    If you did not request this, ignore this email — your password is unchanged.
  </p>
</div>

<div style='background:#f8fafc;border-top:1px solid #f1f5f9;padding:12px 24px;text-align:center;'>
  <div style='font-size:10px;color:#94a3b8;'>&copy; $year FATA University Hostel. All rights reserved.</div>
</div>

</div></div>";

    return send_hostel_email($email, $subject, $message);
}
