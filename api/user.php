<?php
// ============================================
// FATA University Hostel - User API
// For: Student and Faculty
// ============================================
require_once 'config/headers.php';
require_once 'middleware.php';

// ---- AUTH CHECK ----
$user_data = require_user();
$uid   = $user_data['uid'];
$role  = $user_data['role']; // 'Student' or 'Faculty'
$table = $user_data['table'];

// Determine the action to perform based on POST or GET request
$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Main router for user actions
switch ($action) {

    // ============================================
    // GET PROFILE
    // ============================================
    case 'get_profile':
        $r = $conn->query("SELECT * FROM $table WHERE id=$uid LIMIT 1");
        if (!$r || !$r->num_rows)
            send_json(['success' => false, 'message' => 'User not found.']);
        $row = $r->fetch_assoc();
        unset($row['password'], $row['reset_token'], $row['reset_token_expiry']);
        send_json(['success' => true, 'profile' => $row, 'user' => $row, 'role' => $role]);
        break;

    // ============================================
    // UPDATE PROFILE (phone, address, photo, semester)
    // ============================================
    case 'update_profile':
        $phone   = clean($conn, $_POST['phone']        ?? '');
        $address = clean($conn, $_POST['home_address'] ?? '');
        $semester = clean($conn, $_POST['semester']    ?? '');
        $photo_path = '';

        if ($role === 'Student' && !$semester) {
            send_json(['success' => false, 'message' => 'Please select your semester.']);
        }

        if (!empty($_FILES['profile_photo']['name'])) {
            $ext = strtolower(pathinfo($_FILES['profile_photo']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg','jpeg','png','gif','webp','bmp','jfif'];
            if (!in_array($ext, $allowed))
                send_json(['success' => false, 'message' => 'Invalid image format.']);
            $filename = strtolower($role) . '_' . $uid . '_' . time() . '.' . $ext;
            $dest     = '../assets/uploads/profile/' . $filename;
            if (!move_uploaded_file($_FILES['profile_photo']['tmp_name'], $dest))
                send_json(['success' => false, 'message' => 'Photo upload failed.']);
            $photo_path = 'assets/uploads/profile/' . $filename;
            $_SESSION['user_photo'] = $photo_path;
        }

        $sql = "UPDATE $table SET phone='$phone', home_address='$address'";
        if ($role === 'Student') {
            $sql .= ", semester='$semester'";
        }
        if ($photo_path) $sql .= ", profile_photo='$photo_path'";
        $sql .= ", updated_at=NOW() WHERE id=$uid";
        $conn->query($sql);
        send_json(['success' => true, 'message' => 'Profile updated successfully.']);
        break;

    // ============================================
    // UPDATE SETTINGS (email, phone, address)
    // ============================================
    case 'update_settings':
        $phone   = clean($conn, $_POST['phone']        ?? '');
        $address = clean($conn, $_POST['home_address'] ?? '');
        $email   = clean($conn, $_POST['email']        ?? '');
        // Check email uniqueness
        if ($email) {
            $chk = $conn->query("SELECT id FROM $table WHERE email='$email' AND id != $uid LIMIT 1");
            if ($chk && $chk->num_rows > 0)
                send_json(['success' => false, 'message' => 'Email already used by another account.']);
        }
        $conn->query("UPDATE $table SET phone='$phone', home_address='$address', email='$email', updated_at=NOW() WHERE id=$uid");
        if ($email) $_SESSION['user_email'] = $email;
        send_json(['success' => true, 'message' => 'Account settings updated.']);
        break;

    // ============================================
    // UPDATE PASSWORD
    // ============================================
    case 'update_password':
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
        $conn->query("UPDATE $table SET password='$hashed', updated_at=NOW() WHERE id=$uid");
        send_json(['success' => true, 'message' => 'Password changed successfully.']);
        break;

    // ============================================
    // GET AVAILABLE ROOMS (filtered by gender/role)
    // ============================================
    case 'get_rooms':
        $status = clean($conn, $_GET['status'] ?? '');
        
        // Auto-heal: Sync all rooms first to ensure availability is always correct in real-time
        $all_rooms = $conn->query("SELECT id FROM rooms");
        while ($room_row = $all_rooms->fetch_assoc()) {
            sync_room_availability($conn, $room_row['id']);
        }

        // Fetch gender from the appropriate table
        $g = $conn->query("SELECT gender FROM $table WHERE id=$uid LIMIT 1")->fetch_assoc();
        $gender = $g['gender'] ?? 'Male';

        if ($role === 'Faculty') {
            $hostel_filter = ($gender === 'Female')
                ? "AND hostel_name='FATIMA HOUSE'"
                : "AND hostel_name='KHYBER HOUSE'";
        } else {
            $hostel_filter = ($gender === 'Female')
                ? "AND hostel_name='FATIMA HOUSE'"
                : "AND hostel_name='FAQIR IPI HOUSE'";
        }

        $sql = "SELECT * FROM rooms WHERE 1=1 $hostel_filter";
        if ($status === 'Available') $sql .= " AND available_spaces > 0 AND status='Available'";
        $sql .= " ORDER BY room_no ASC";

        $r = $conn->query($sql);
        $rooms = [];
        while ($row = $r->fetch_assoc()) $rooms[] = $row;
        send_json(['success' => true, 'rooms' => $rooms]);
        break;

    // ============================================
    // APPLY FOR A ROOM
    // Handles new room applications for Students and Faculty
    // ============================================
    case 'apply_room':
        $room_id = intval($_POST['room_id'] ?? 0);
        if (!$room_id)
            send_json(['success' => false, 'message' => 'Please select a room.']);

        $booking_duration = clean($conn, $_POST['booking_duration'] ?? '');
        if (empty($booking_duration)) {
            send_json(['success' => false, 'message' => 'Please select or specify a booking duration.']);
        }

        // Block if already has approved room
        $has_room = $conn->query("SELECT id FROM applications WHERE user_id=$uid AND user_role='$role' AND status='Approved' AND application_type='Apply' LIMIT 1");
        if ($has_room && $has_room->num_rows > 0)
            send_json(['success' => false, 'message' => 'You already have an assigned room. Cannot apply for another.']);

        // Block if pending application exists
        $pending = $conn->query("SELECT id FROM applications WHERE user_id=$uid AND user_role='$role' AND status='Pending' AND application_type='Apply' LIMIT 1");
        if ($pending && $pending->num_rows > 0)
            send_json(['success' => false, 'message' => 'You already have a pending room application.']);

        // Check room availability
        $room = $conn->query("SELECT * FROM rooms WHERE id=$room_id LIMIT 1")->fetch_assoc();
        if (!$room)
            send_json(['success' => false, 'message' => 'Room not found.']);
        if ($room['available_spaces'] <= 0 || $room['status'] !== 'Available')
            send_json(['success' => false, 'message' => 'This room is not available.']);

        if (!$conn->query("INSERT INTO applications (user_id, user_role, room_id, application_type, booking_duration, status, applied_at)
                      VALUES ($uid, '$role', $room_id, 'Apply', '$booking_duration', 'Pending', NOW())")) {
            send_json(['success' => false, 'message' => 'Application submit failed: ' . $conn->error]);
        }

        // Notify admin via email
        $admin_email_sent = false;
        require_once __DIR__ . '/mailer.php';
        $admin_res = $conn->query("SELECT email FROM admin LIMIT 1")->fetch_assoc();
        if ($admin_res) {
            $admin_email = $admin_res['email'];
            
            // Get applying user details
            $user_info = $conn->query("SELECT full_name, email, phone FROM $table WHERE id=$uid LIMIT 1")->fetch_assoc();
            $user_name = $user_info['full_name'] ?? 'Unknown User';
            $user_email = $user_info['email'] ?? 'N/A';
            $user_phone = $user_info['phone'] ?? 'N/A';
            
            $room_no = $room['room_no'] ?? 'N/A';
            $hostel_name = $room['hostel_name'] ?? 'N/A';
            
            $year_now  = date('Y');
            $time_now  = date('d M Y, h:i A');
            $subject   = "\xF0\x9F\x8F\xA0 New Room Application — {$user_name}";
            $message   = "
<div style='margin:0;padding:0;background:#f0f4f0;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f0f4f0;padding:32px 8px;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(50,106,51,0.10);'>

  <!-- HEADER -->
  <tr><td style='background:linear-gradient(135deg,#1e4520 0%,#326a33 100%);padding:32px 36px;text-align:center;'>
    <div style='font-size:11px;color:#a8d5a2;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;'>FATA University Hostel Management System</div>
    <div style='font-size:24px;font-weight:800;color:#ffffff;margin-bottom:4px;'>&#127968; New Room Application</div>
    <div style='font-size:13px;color:#c8e6c9;'>A new application is awaiting your review</div>
  </td></tr>

  <!-- BODY -->
  <tr><td style='padding:32px 36px;'>
    <p style='font-size:15px;color:#1e4520;font-weight:700;margin:0 0 6px;'>Hello, Admin</p>
    <p style='font-size:14px;color:#555;line-height:1.7;margin:0 0 28px;'>A new hostel room application has just been submitted on <strong>{$time_now}</strong> and is pending your approval.</p>

    <!-- Applicant Card -->
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f4f9f4;border-left:4px solid #326a33;border-radius:0 8px 8px 0;margin-bottom:20px;'>
      <tr><td style='padding:18px 20px;'>
        <div style='font-size:11px;color:#326a33;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;'>Applicant Details</div>
        <table width='100%' cellpadding='0' cellspacing='0' border='0'>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;width:140px;'>Full Name</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$user_name}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Role</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$role}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Email</td><td style='padding:5px 0;font-size:13px;color:#326a33;font-weight:600;'>{$user_email}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Phone</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$user_phone}</td></tr>
        </table>
      </td></tr>
    </table>

    <!-- Room Card -->
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f4f9f4;border-left:4px solid #937C3D;border-radius:0 8px 8px 0;margin-bottom:28px;'>
      <tr><td style='padding:18px 20px;'>
        <div style='font-size:11px;color:#937C3D;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;'>Requested Room</div>
        <table width='100%' cellpadding='0' cellspacing='0' border='0'>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;width:140px;'>Hostel Block</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$hostel_name}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Room Number</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$room_no}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Duration</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$booking_duration}</td></tr>
        </table>
      </td></tr>
    </table>

    <!-- CTA -->
    <table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'>
      <a href='http://localhost/hostel/admin/dashboard.html' style='display:inline-block;background:#326a33;color:#ffffff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:7px;text-decoration:none;letter-spacing:0.5px;'>Open Admin Dashboard &rarr;</a>
    </td></tr></table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style='background:#f4f9f4;border-top:1px solid #e0ede0;padding:18px 36px;text-align:center;'>
    <p style='font-size:11px;color:#999;margin:0;'>&copy; {$year_now} FATA University Hostel Management System &mdash; Automated Notification. Do not reply.</p>
  </td></tr>

</table>
</td></tr></table>
</div>";
            $admin_email_sent = send_hostel_email($admin_email, $subject, $message);
        }

        $msg = 'Application submitted! Waiting for admin approval.';
        if ($admin_email_sent) {
            $msg .= ' Admin email sent.';
        } else {
            $msg .= ' Admin email was not sent. Please check SMTP/admin email settings.';
        }
        send_json(['success' => true, 'message' => $msg]);
        break;

    // ============================================
    // SUBMIT ROOM LEAVE REQUEST
    // Allows users to request vacating their current room
    // ============================================
    case 'leave_room':
        $cur = $conn->query("SELECT a.id, a.room_id, r.room_no, r.hostel_name
                             FROM applications a
                             JOIN rooms r ON a.room_id = r.id
                             WHERE a.user_id=$uid AND a.user_role='$role'
                               AND a.status='Approved' AND a.application_type='Apply'
                             ORDER BY a.applied_at DESC LIMIT 1")->fetch_assoc();
        if (!$cur)
            send_json(['success' => false, 'message' => 'You are not currently assigned to any room.']);

        $dues = $conn->query(
            "SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as total
             FROM fees
             WHERE user_id=$uid AND user_role='$role'
               AND status IN ('Unpaid','Partial','Pending Verification')"
        )->fetch_assoc();
        $due_count = intval($dues['c'] ?? 0);
        $due_total = floatval($dues['total'] ?? 0);
        if ($due_count > 0) {
            $amount = number_format($due_total, 2);
            $due_message = "First clear your dues before requesting room leave. Pending fee records: $due_count, total: Rs. $amount.";

            require_once __DIR__ . '/mailer.php';
            $user_info = $conn->query("SELECT full_name, email FROM $table WHERE id=$uid LIMIT 1")->fetch_assoc();
            if ($user_info && !empty($user_info['email'])) {
                $year_now = date('Y');
                $dashboard_link = ($role === 'Faculty')
                    ? 'http://localhost/hostel/faculty/dashboard.html'
                    : 'http://localhost/hostel/student/dashboard.html';
                $subject = 'Clear Dues Before Room Leave Request - FATA University Hostel';
                $message = "
<div style='font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px 8px;'>
  <div style='max-width:540px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border-top:4px solid #dc3545;'>
    <div style='padding:22px 26px;text-align:center;background:#f8fafc;'>
      <div style='font-size:18px;font-weight:800;color:#1e293b;'>FATA University Hostel</div>
      <div style='font-size:12px;color:#64748b;margin-top:4px;'>Room Leave Request Blocked</div>
    </div>
    <div style='padding:24px 26px;'>
      <p style='font-size:15px;color:#1e293b;font-weight:700;margin:0 0 8px;'>Dear {$user_info['full_name']},</p>
      <p style='font-size:14px;color:#475569;line-height:1.7;margin:0 0 18px;'>{$due_message}</p>
      <table width='100%' cellpadding='0' cellspacing='0' style='background:#fff5f5;border-left:4px solid #dc3545;border-radius:0 8px 8px 0;margin-bottom:18px;'>
        <tr><td style='padding:16px 18px;font-size:13px;color:#334155;line-height:1.9;'>
          <strong>Pending fee records:</strong> {$due_count}<br>
          <strong>Total dues:</strong> Rs. {$amount}
        </td></tr>
      </table>
      <div style='text-align:center;'>
        <a href='{$dashboard_link}' style='background:#326a33;color:#ffffff;padding:11px 22px;border-radius:7px;text-decoration:none;font-size:13px;font-weight:700;display:inline-block;'>Open Dashboard</a>
      </div>
    </div>
    <div style='background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 26px;text-align:center;font-size:11px;color:#94a3b8;'>&copy; {$year_now} FATA University Hostel. Automated notification.</div>
  </div>
</div>";
                send_hostel_email($user_info['email'], $subject, $message);
            }

            send_json([
                'success' => false,
                'message' => $due_message
            ]);
        }

        // Check if leave request already pending
        $leave_pending = $conn->query("SELECT id FROM applications WHERE user_id=$uid AND user_role='$role' AND status='Pending' AND application_type='Leave' LIMIT 1");
        if ($leave_pending && $leave_pending->num_rows > 0)
            send_json(['success' => false, 'message' => 'A leave request is already pending.']);

        $room_id = intval($cur['room_id']);
        if (!$conn->query("INSERT INTO applications (user_id, user_role, room_id, application_type, status, applied_at)
                           VALUES ($uid, '$role', $room_id, 'Leave', 'Pending', NOW())")) {
            send_json(['success' => false, 'message' => 'Leave request failed: ' . $conn->error]);
        }

        $admin_email_sent = false;
        require_once __DIR__ . '/mailer.php';
        $admin_res = $conn->query("SELECT email FROM admin LIMIT 1")->fetch_assoc();
        $user_info = $conn->query("SELECT full_name, email, phone FROM $table WHERE id=$uid LIMIT 1")->fetch_assoc();
        if ($admin_res && $user_info) {
            $admin_email = $admin_res['email'];
            $user_name = $user_info['full_name'] ?? 'Unknown User';
            $user_email = $user_info['email'] ?? 'N/A';
            $user_phone = $user_info['phone'] ?? 'N/A';
            $hostel_name = $cur['hostel_name'] ?? 'N/A';
            $room_no = $cur['room_no'] ?? 'N/A';
            $time_now = date('d M Y, h:i A');
            $year_now = date('Y');
            $subject = "Room Leave Request - {$user_name}";
            $message = "
<div style='font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px 8px;'>
  <div style='max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border-top:4px solid #937C3D;'>
    <div style='padding:22px 26px;text-align:center;background:#f8fafc;'>
      <div style='font-size:18px;font-weight:800;color:#1e293b;'>FATA University Hostel</div>
      <div style='font-size:12px;color:#64748b;margin-top:4px;'>New Room Leave Request</div>
    </div>
    <div style='padding:24px 26px;'>
      <p style='font-size:15px;color:#1e293b;font-weight:700;margin:0 0 8px;'>Hello, Admin</p>
      <p style='font-size:14px;color:#475569;line-height:1.7;margin:0 0 18px;'>A user has requested to leave their assigned room on <strong>{$time_now}</strong>. Fee dues were checked before submitting this request.</p>
      <table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;border-left:4px solid #326a33;border-radius:0 8px 8px 0;margin-bottom:16px;'>
        <tr><td style='padding:16px 18px;font-size:13px;color:#334155;line-height:1.9;'>
          <strong>Name:</strong> {$user_name}<br>
          <strong>Role:</strong> {$role}<br>
          <strong>Email:</strong> {$user_email}<br>
          <strong>Phone:</strong> {$user_phone}
        </td></tr>
      </table>
      <table width='100%' cellpadding='0' cellspacing='0' style='background:#fff7ed;border-left:4px solid #937C3D;border-radius:0 8px 8px 0;margin-bottom:18px;'>
        <tr><td style='padding:16px 18px;font-size:13px;color:#334155;line-height:1.9;'>
          <strong>Hostel:</strong> {$hostel_name}<br>
          <strong>Room:</strong> {$room_no}<br>
          <strong>Fee Dues:</strong> Cleared
        </td></tr>
      </table>
      <div style='text-align:center;'>
        <a href='http://localhost/hostel/admin/dashboard.html' style='background:#326a33;color:#ffffff;padding:11px 22px;border-radius:7px;text-decoration:none;font-size:13px;font-weight:700;display:inline-block;'>Open Admin Dashboard</a>
      </div>
    </div>
    <div style='background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 26px;text-align:center;font-size:11px;color:#94a3b8;'>&copy; {$year_now} FATA University Hostel. Automated notification.</div>
  </div>
</div>";
            $admin_email_sent = send_hostel_email($admin_email, $subject, $message);
        }

        $msg = 'Leave request submitted. Waiting for admin approval.';
        if ($admin_email_sent) {
            $msg .= ' Admin email sent.';
        } else {
            $msg .= ' Admin email was not sent. Please check SMTP/admin email settings.';
        }
        send_json(['success' => true, 'message' => $msg]);
        break;

    // ============================================
    // FETCH MY PREVIOUS APPLICATIONS
    // Retrieves history of room applications (Apply/Leave)
    // ============================================
    case 'get_my_applications':
        $r = $conn->query("SELECT a.id, a.application_type, a.booking_duration, a.status, a.applied_at, a.remarks,
                                  r.room_no, r.hostel_name, r.room_image
                           FROM applications a
                           JOIN rooms r ON a.room_id = r.id
                           WHERE a.user_id=$uid AND a.user_role='$role'
                           ORDER BY a.applied_at DESC");
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'applications' => $rows]);
        break;

    // ============================================
    // GET CURRENT ASSIGNED ROOM DETAILS
    // Fetches room info and lists all roommates sharing the same room
    // ============================================
    case 'get_my_room':
        // Get latest approved Apply application with room details
        $app = $conn->query(
            "SELECT a.id as app_id, a.applied_at,
                    r.id as room_id, r.room_no, r.hostel_name, r.capacity,
                    r.available_spaces, r.description, r.room_image, r.status as room_status
             FROM applications a
             JOIN rooms r ON a.room_id = r.id
             WHERE a.user_id=$uid AND a.user_role='$role'
               AND a.status='Approved' AND a.application_type='Apply'
             ORDER BY a.applied_at DESC LIMIT 1"
        )->fetch_assoc();

        if (!$app) {
            send_json(['success' => true, 'room' => null]);
        }

        $room_id = intval($app['room_id']);

        // Get roommates (others in same room with approved application)
        $rm_r = $conn->query(
            "SELECT a.user_id, a.user_role
             FROM applications a
             WHERE a.room_id=$room_id
               AND a.status='Approved' AND a.application_type='Apply'
               AND NOT (a.user_id=$uid AND a.user_role='$role')"
        );
        $roommates = [];
        while ($rm = $rm_r->fetch_assoc()) {
            $rt   = ($rm['user_role'] === 'Faculty') ? 'faculty' : 'student';
            $dept = ($rt === 'faculty') ? 'designation' : 'department';
            $u    = $conn->query("SELECT full_name, profile_photo, $dept as dept_field FROM $rt WHERE id={$rm['user_id']} LIMIT 1")->fetch_assoc();
            if ($u) $roommates[] = [
                'full_name'    => $u['full_name'],
                'profile_photo'=> $u['profile_photo'] ?? '',
                'department'   => $u['dept_field'] ?? '',
                'role'         => $rm['user_role'],
            ];
        }
        $app['roommates'] = $roommates;
        send_json(['success' => true, 'room' => $app]);
        break;

    // ============================================
    // SUBMIT FEE PAYMENT PROOF
    // Handles uploading payment screenshots and transaction details
    // ============================================
    case 'submit_fee_payment':
        $fee_id = intval($_POST['fee_id'] ?? 0);
        $method = clean($conn, $_POST['payment_method'] ?? '');
        $trx_id = clean($conn, $_POST['transaction_id'] ?? '');

        if (!$fee_id || !$method || !$trx_id)
            send_json(['success' => false, 'message' => 'Please provide payment method and transaction ID.']);

        if (empty($_FILES['payment_proof']['name']))
            send_json(['success' => false, 'message' => 'Please upload a screenshot as proof of payment.']);

        $ext = strtolower(pathinfo($_FILES['payment_proof']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','webp','bmp','pdf'];
        if (!in_array($ext, $allowed))
            send_json(['success' => false, 'message' => 'Invalid file format.']);

        if ($_FILES['payment_proof']['size'] > 5 * 1024 * 1024)
            send_json(['success' => false, 'message' => 'File too large. Maximum size is 5MB.']);

        if (!is_dir('../assets/uploads/payments/')) mkdir('../assets/uploads/payments/', 0777, true);
        $filename = 'payment_' . $fee_id . '_' . time() . '.' . $ext;
        $dest     = '../assets/uploads/payments/' . $filename;

        if (!move_uploaded_file($_FILES['payment_proof']['tmp_name'], $dest))
            send_json(['success' => false, 'message' => 'Upload failed.']);

        $path = 'assets/uploads/payments/' . $filename;
        $conn->query("UPDATE fees SET status='Pending Verification', payment_method='$method', transaction_id='$trx_id', payment_proof='$path', updated_at=NOW() WHERE id=$fee_id AND user_id=$uid AND user_role='$role'");
        
        send_json(['success' => true, 'message' => 'Payment submitted successfully! Waiting for admin verification.']);
        break;

    // ============================================
    // GET MY FEES
    // ============================================
    case 'get_my_fees':
        $r = $conn->query(
            "SELECT * FROM fees WHERE user_id=$uid AND user_role='$role'
             ORDER BY fee_year DESC, FIELD(fee_month,'January','February','March','April','May','June','July','August','September','October','November','December') DESC"
        );
        $rows   = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        $paid   = floatval($conn->query("SELECT COALESCE(SUM(amount),0) as t FROM fees WHERE user_id=$uid AND user_role='$role' AND status='Paid'")->fetch_assoc()['t']);
        $unpaid = floatval($conn->query("SELECT COALESCE(SUM(amount),0) as t FROM fees WHERE user_id=$uid AND user_role='$role' AND status='Unpaid'")->fetch_assoc()['t']);
        send_json(['success' => true, 'fees' => $rows, 'total_paid' => $paid, 'total_due' => $unpaid]);
        break;

    // ============================================
    // SUBMIT COMPLAINT
    // ============================================
    case 'submit_complaint':
        $title = clean($conn, $_POST['title']       ?? '');
        $desc  = clean($conn, $_POST['description'] ?? '');
        if (!$title || !$desc)
            send_json(['success' => false, 'message' => 'Title and description are required.']);
        $conn->query("INSERT INTO complaints (user_id, user_role, title, description, submitted_at)
                      VALUES ($uid, '$role', '$title', '$desc', NOW())");
                      
        // Notify admin via email
        require_once __DIR__ . '/mailer.php';
        $admin_res = $conn->query("SELECT email FROM admin LIMIT 1")->fetch_assoc();
        if ($admin_res) {
            $admin_email = $admin_res['email'];
            $year_now = date('Y');
            $time_now = date('d M Y, h:i A');
            $subject  = "\xF0\x9F\x9A\xA8 New Complaint — {$title}";
            $message  = "
<div style='margin:0;padding:0;background:#f0f4f0;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f0f4f0;padding:32px 8px;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(50,106,51,0.10);'>

  <!-- HEADER -->
  <tr><td style='background:linear-gradient(135deg,#7a2a00 0%,#e58c0c 100%);padding:32px 36px;text-align:center;'>
    <div style='font-size:11px;color:#ffe0b2;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;'>FATA University Hostel Management System</div>
    <div style='font-size:24px;font-weight:800;color:#ffffff;margin-bottom:4px;'>&#128680; New Complaint Received</div>
    <div style='font-size:13px;color:#ffe0b2;'>Submitted on {$time_now}</div>
  </td></tr>

  <!-- BODY -->
  <tr><td style='padding:32px 36px;'>
    <p style='font-size:15px;color:#7a2a00;font-weight:700;margin:0 0 6px;'>Hello, Admin</p>
    <p style='font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;'>A <strong>{$role}</strong> has submitted a new complaint ticket that requires your attention.</p>

    <!-- Complaint Card -->
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#fff8f0;border-left:4px solid #e58c0c;border-radius:0 8px 8px 0;margin-bottom:20px;'>
      <tr><td style='padding:18px 20px;'>
        <div style='font-size:11px;color:#e58c0c;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;'>Complaint Details</div>
        <div style='font-size:15px;font-weight:700;color:#1C2331;margin-bottom:10px;'>{$title}</div>
        <div style='font-size:13px;color:#555;line-height:1.7;white-space:pre-wrap;'>{$desc}</div>
      </td></tr>
    </table>

    <!-- Submitted By -->
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f4f9f4;border-left:4px solid #326a33;border-radius:0 8px 8px 0;margin-bottom:28px;'>
      <tr><td style='padding:14px 20px;'>
        <div style='font-size:11px;color:#326a33;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;'>Submitted By</div>
        <div style='font-size:13px;color:#1e1e1e;font-weight:600;'>Role: {$role}</div>
      </td></tr>
    </table>

    <!-- CTA -->
    <table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'>
      <a href='http://localhost/hostel/admin/dashboard.html' style='display:inline-block;background:#e58c0c;color:#ffffff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:7px;text-decoration:none;letter-spacing:0.5px;'>Review Complaint &rarr;</a>
    </td></tr></table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style='background:#f4f9f4;border-top:1px solid #e0ede0;padding:18px 36px;text-align:center;'>
    <p style='font-size:11px;color:#999;margin:0;'>&copy; {$year_now} FATA University Hostel Management System &mdash; Automated Notification. Do not reply.</p>
  </td></tr>

</table>
</td></tr></table>
</div>";
            send_hostel_email($admin_email, $subject, $message);
        }

        send_json(['success' => true, 'message' => 'Complaint submitted successfully.']);
        break;

    // ============================================
    // GET MY COMPLAINTS
    // ============================================
    case 'get_my_complaints':
        $r = $conn->query(
            "SELECT id, title, description, status, admin_response, submitted_at, resolved_at
             FROM complaints WHERE user_id=$uid AND user_role='$role'
             ORDER BY submitted_at DESC"
        );
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'complaints' => $rows]);
        break;

    // ============================================
    // GET NOTICES (for logged-in user)
    // ============================================
    case 'get_notices':
        $audience_filter = "AND (target_audience='All' OR target_audience='" . ($role === 'Faculty' ? 'Faculty' : 'Students') . "')";
        $r = $conn->query(
            "SELECT * FROM notices
             WHERE status='Active'
               $audience_filter
               AND (expiry_date IS NULL OR expiry_date >= CURDATE())
             ORDER BY created_at DESC LIMIT 10"
        );
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'notices' => $rows]);
        break;

    // ============================================
    // UPLOAD GALLERY PHOTO
    // ============================================
    case 'upload_gallery':
        if (empty($_FILES['photo']['name']))
            send_json(['success' => false, 'message' => 'Please select a photo.']);

        $caption = clean($conn, $_POST['caption'] ?? '');
        $ext     = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','webp','bmp','jfif','heic','avif'];
        if (!in_array($ext, $allowed))
            send_json(['success' => false, 'message' => 'Invalid image format. Use JPG, PNG, GIF, WEBP, or BMP.']);

        // Check file size (max 5MB)
        if ($_FILES['photo']['size'] > 5 * 1024 * 1024)
            send_json(['success' => false, 'message' => 'File too large. Maximum size is 5MB.']);

        $filename = 'gallery_' . strtolower($role) . '_' . $uid . '_' . time() . '.' . $ext;
        $dest     = '../assets/uploads/gallery/' . $filename;

        // Create directory if not exists
        if (!is_dir('../assets/uploads/gallery/'))
            mkdir('../assets/uploads/gallery/', 0777, true);

        if (!move_uploaded_file($_FILES['photo']['tmp_name'], $dest))
            send_json(['success' => false, 'message' => 'Upload failed. Check directory permissions.']);

        $path = 'assets/uploads/gallery/' . $filename;
        $conn->query("INSERT INTO gallery (uploaded_by_id, uploaded_by_role, image_path, caption, status, uploaded_at)
                      VALUES ($uid, '$role', '$path', '$caption', 'Pending', NOW())");
        send_json(['success' => true, 'message' => 'Photo uploaded successfully! Waiting for admin approval.']);
        break;

    // ============================================
    // GET MY GALLERY
    // ============================================
    case 'get_my_gallery':
        $r = $conn->query(
            "SELECT id, image_path, caption, status, uploaded_at
             FROM gallery
             WHERE uploaded_by_id=$uid AND uploaded_by_role='$role'
             ORDER BY uploaded_at DESC"
        );
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'gallery' => $rows]);
        break;

    // ============================================
    // GET ID CARD DATA
    // ============================================
    case 'get_id_card_data':
        $profile = $conn->query("SELECT * FROM $table WHERE id=$uid LIMIT 1")->fetch_assoc();
        if (!$profile)
            send_json(['success' => false, 'message' => 'Profile not found.']);
        unset($profile['password'], $profile['reset_token'], $profile['reset_token_expiry']);

        // Get assigned room
        $app = $conn->query(
            "SELECT r.room_no, r.hostel_name, a.booking_duration
             FROM applications a
             JOIN rooms r ON a.room_id = r.id
             WHERE a.user_id=$uid AND a.user_role='$role'
               AND a.status='Approved' AND a.application_type='Apply'
             ORDER BY a.applied_at DESC LIMIT 1"
        )->fetch_assoc();

        $profile['room_no']          = $app['room_no']          ?? 'Not Assigned';
        $profile['hostel_name']      = $app['hostel_name']      ?? 'Not Assigned';
        $profile['booking_duration'] = $app['booking_duration'] ?? '—';
        $profile['role']             = $role;

        send_json(['success' => true, 'profile' => $profile, 'user' => $profile]);
        break;

    // ============================================
    // GET DASHBOARD STATS
    // ============================================
    case 'get_stats':
        $room_data = $conn->query(
            "SELECT r.room_no, r.hostel_name, r.description, r.room_image
             FROM applications a
             JOIN rooms r ON a.room_id = r.id
             WHERE a.user_id=$uid AND a.user_role='$role'
               AND a.status='Approved' AND a.application_type='Apply'
             ORDER BY a.applied_at DESC LIMIT 1"
        )->fetch_assoc();

        $fees_paid   = floatval($conn->query("SELECT COALESCE(SUM(amount),0) as t FROM fees WHERE user_id=$uid AND user_role='$role' AND status='Paid'")->fetch_assoc()['t']);
        $fees_unpaid = floatval($conn->query("SELECT COALESCE(SUM(amount),0) as t FROM fees WHERE user_id=$uid AND user_role='$role' AND status='Unpaid'")->fetch_assoc()['t']);

        $room_no = $room_data['room_no'] ?? null;
        $roommates = [];
        if ($room_no) {
            $rid = intval($conn->query("SELECT id FROM rooms WHERE room_no='$room_no' AND hostel_name='{$room_data['hostel_name']}' LIMIT 1")->fetch_assoc()['id']);
            $rm_r = $conn->query(
                "SELECT a.user_id, a.user_role
                 FROM applications a
                 WHERE a.room_id=$rid
                   AND a.status='Approved' AND a.application_type='Apply'
                   AND NOT (a.user_id=$uid AND a.user_role='$role')"
            );
            while ($rm = $rm_r->fetch_assoc()) {
                $t = (strtolower($rm['user_role']) === 'faculty') ? 'faculty' : 'student';
                $u = $conn->query("SELECT full_name, profile_photo FROM $t WHERE id={$rm['user_id']} LIMIT 1")->fetch_assoc();
                if ($u) $roommates[] = [
                    'full_name' => $u['full_name'],
                    'profile_photo' => $u['profile_photo'] ?? ''
                ];
            }
        }

        send_json([
            'success'     => true,
            'room_no'     => $room_no,
            'hostel_name' => $room_data['hostel_name'] ?? null,
            'description' => $room_data['description'] ?? null,
            'room_image'  => $room_data['room_image']  ?? null,
            'roommates'   => $roommates,
            'fees_paid'   => number_format($fees_paid,   0),
            'fees_due'    => number_format($fees_unpaid, 0),
        ]);
        break;

    // ============================================
    // DOWNLOAD RECEIPT DATA
    // ============================================
    case 'download_receipt':
        $fid = intval($_GET['fid'] ?? 0);
        $fee = $conn->query("SELECT * FROM fees WHERE id=$fid AND user_id=$uid AND user_role='$role' AND status='Paid' LIMIT 1")->fetch_assoc();
        if (!$fee)
            send_json(['success' => false, 'message' => 'Receipt not found.']);
        $person = $conn->query("SELECT full_name FROM $table WHERE id=$uid LIMIT 1")->fetch_assoc();
        send_json(['success' => true, 'receipt' => $fee, 'name' => $person['full_name'] ?? '']);
        break;

    default:
        send_json(['success' => false, 'message' => 'Invalid action.'], 400);
}
