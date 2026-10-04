<?php
// ============================================
// FATA University Hostel - Admin API
// ============================================

require_once 'config/headers.php';
require_once 'middleware.php';

// ---- AUTH CHECK ----
$admin_id = require_admin();
$action   = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    // ============================================
    // DASHBOARD STATS
    // ============================================
    case 'get_stats':
        $students     = intval($conn->query("SELECT COUNT(*) as c FROM student")->fetch_assoc()['c']);
        $faculty      = intval($conn->query("SELECT COUNT(*) as c FROM faculty")->fetch_assoc()['c']);
        $rooms        = intval($conn->query("SELECT COUNT(*) as c FROM rooms")->fetch_assoc()['c']);
        $avail        = intval($conn->query("SELECT COUNT(*) as c FROM rooms WHERE available_spaces > 0 AND status='Available'")->fetch_assoc()['c']);
        $complaints   = intval($conn->query("SELECT COUNT(*) as c FROM complaints WHERE status='Pending'")->fetch_assoc()['c']);
        $fees_row     = $conn->query("SELECT COALESCE(SUM(amount),0) as total FROM fees WHERE status='Paid'")->fetch_assoc();
        $fees         = number_format(floatval($fees_row['total']), 2);
        $pending_apps = intval($conn->query("SELECT COUNT(*) as c FROM applications WHERE status='Pending'")->fetch_assoc()['c']);
        $notices      = intval($conn->query("SELECT COUNT(*) as c FROM notices WHERE status='Active'")->fetch_assoc()['c']);
        $pending_fees = intval($conn->query("SELECT COUNT(*) as c FROM fees WHERE status='Pending Verification'")->fetch_assoc()['c']);
        $pending_gallery = intval($conn->query("SELECT COUNT(*) as c FROM gallery WHERE status='Pending'")->fetch_assoc()['c']);
        
        send_json([
            'success'         => true,
            'students'        => $students,
            'faculty'         => $faculty,
            'rooms'           => $rooms,
            'available_rooms' => $avail,
            'complaints'      => $complaints,
            'fees_collected'  => $fees,
            'pending_apps'    => $pending_apps,
            'active_notices'  => $notices,
            'pending_fees'    => $pending_fees,
            'pending_gallery' => $pending_gallery,
        ]);
        break;

    // ============================================
    // RECENT STUDENTS (for dashboard widget)
    // ============================================
    case 'get_recent_students':
        $r = $conn->query("SELECT id, full_name, email, phone, gender, department, profile_photo, created_at FROM student ORDER BY created_at DESC LIMIT 5");
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'students' => $rows]);
        break;

    // ============================================
    // RECENT APPLICATIONS (for dashboard widget)
    // ============================================
    case 'get_recent_applications':
        $r = $conn->query(
            "SELECT a.id, a.user_id, a.user_role, a.application_type, a.booking_duration, a.status, a.applied_at,
                    r.room_no, r.hostel_name
             FROM applications a
             JOIN rooms r ON a.room_id = r.id
             ORDER BY a.applied_at DESC LIMIT 5"
        );
        $rows = [];
        while ($row = $r->fetch_assoc()) {
            $t = ($row['user_role'] === 'Faculty') ? 'faculty' : 'student';
            $u = $conn->query("SELECT full_name FROM $t WHERE id={$row['user_id']} LIMIT 1")->fetch_assoc();
            $row['user_name'] = $u['full_name'] ?? 'Unknown';
            $rows[] = $row;
        }
        send_json(['success' => true, 'applications' => $rows]);
        break;

    // ============================================
    // GET USERS (students or faculty)
    // ============================================
    case 'get_users':
        $type  = clean($conn, $_GET['role'] ?? 'student');
        $table = ($type === 'faculty') ? 'faculty' : 'student';
        $r     = $conn->query("SELECT * FROM $table ORDER BY created_at DESC");
        $rows  = [];
        while ($row = $r->fetch_assoc()) {
            unset($row['password'], $row['reset_token'], $row['reset_token_expiry']);
            $rows[] = $row;
        }
        send_json(['success' => true, 'users' => $rows]);
        break;

    // ============================================
    // DELETE USER
    // ============================================
    case 'delete_user':
        $id    = intval($_POST['id'] ?? 0);
        $role  = clean($conn, $_POST['role'] ?? 'student');
        $table = ($role === 'faculty') ? 'faculty' : 'student';
        if (!$id) send_json(['success' => false, 'message' => 'Invalid user ID.']);
        // Before deleting, if they had an approved room, get the room ID
        $app = $conn->query("SELECT room_id FROM applications WHERE user_id=$id AND user_role='" . ucfirst($role) . "' AND status='Approved' AND application_type='Apply' LIMIT 1")->fetch_assoc();
        
        if ($conn->query("DELETE FROM $table WHERE id=$id")) {
            // Also remove their records
            $conn->query("DELETE FROM applications WHERE user_id=$id AND user_role='" . ucfirst($role) . "'");
            $conn->query("DELETE FROM fees WHERE user_id=$id AND user_role='" . ucfirst($role) . "'");
            $conn->query("DELETE FROM complaints WHERE user_id=$id AND user_role='" . ucfirst($role) . "'");
            
            // If they had a room, recalculate it
            if ($app) {
                sync_room_availability($conn, $app['room_id']);
            }
            send_json(['success' => true, 'message' => ucfirst($role) . ' deleted successfully.']);
        }
        else
            send_json(['success' => false, 'message' => 'Delete failed: ' . $conn->error]);
        break;

    // ============================================
    // GET ROOMS (admin view)
    // ============================================
    case 'get_rooms_admin':
        $hostel = clean($conn, $_GET['hostel'] ?? '');
        
        // Auto-heal: Sync all rooms first to ensure availability is always correct in real-time
        $all_rooms = $conn->query("SELECT id FROM rooms");
        while ($room_row = $all_rooms->fetch_assoc()) {
            sync_room_availability($conn, $room_row['id']);
        }

        $sql    = "SELECT * FROM rooms";
        if ($hostel) $sql .= " WHERE hostel_name='$hostel'";
        $sql .= " ORDER BY hostel_name, room_no";
        $r    = $conn->query($sql);
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'rooms' => $rows]);
        break;

    // ============================================
    // SAVE ROOM (add or edit)
    // ============================================
    case 'save_room':
        $room_id  = intval($_POST['id'] ?? 0);
        $hostel   = clean($conn, $_POST['hostel_name']  ?? '');
        $room_no  = clean($conn, $_POST['room_no']      ?? '');
        $capacity = intval($_POST['capacity']            ?? 2);
        $desc     = clean($conn, $_POST['description']  ?? '');

        if (!$hostel || !$room_no || !$capacity)
            send_json(['success' => false, 'message' => 'Hostel, Room No and Capacity are required.']);

        // Handle image upload
        $img_path = clean($conn, $_POST['existing_image'] ?? '');
        if (!empty($_FILES['room_image']['name'])) {
            $ext     = strtolower(pathinfo($_FILES['room_image']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg','jpeg','png','gif','webp','bmp'];
            if (!in_array($ext, $allowed))
                send_json(['success' => false, 'message' => 'Invalid image format.']);
            if (!is_dir('../assets/uploads/rooms/')) mkdir('../assets/uploads/rooms/', 0777, true);
            $filename = 'room_' . time() . '.' . $ext;
            $dest     = '../assets/uploads/rooms/' . $filename;
            if (move_uploaded_file($_FILES['room_image']['tmp_name'], $dest))
                $img_path = 'assets/uploads/rooms/' . $filename;
        }

        if ($room_id) {
            // Update existing room
            $sql = "UPDATE rooms SET hostel_name='$hostel', room_no='$room_no', capacity=$capacity, description='$desc', updated_at=NOW()";
            if ($img_path) $sql .= ", room_image='$img_path'";
            $sql .= " WHERE id=$room_id";
            $conn->query($sql);
            
            // Sync availability based on new capacity
            sync_room_availability($conn, $room_id);
            
            send_json(['success' => true, 'message' => 'Room updated successfully.']);
        } else {
            // Check duplicate
            $chk = $conn->query("SELECT id FROM rooms WHERE hostel_name='$hostel' AND room_no='$room_no' LIMIT 1");
            if ($chk && $chk->num_rows > 0)
                send_json(['success' => false, 'message' => 'Room ' . $room_no . ' already exists in ' . $hostel . '.']);
            $conn->query("INSERT INTO rooms (hostel_name, room_no, capacity, available_spaces, description, room_image, created_at)
                          VALUES ('$hostel', '$room_no', $capacity, $capacity, '$desc', '$img_path', NOW())");
            send_json(['success' => true, 'message' => 'Room added successfully.']);
        }
        break;

    // ============================================
    // DELETE ROOM
    // ============================================
    case 'delete_room':
        $id = intval($_POST['id'] ?? 0);
        if (!$id) send_json(['success' => false, 'message' => 'Invalid room ID.']);
        // Remove room image if exists
        $row = $conn->query("SELECT room_image FROM rooms WHERE id=$id LIMIT 1")->fetch_assoc();
        if ($row && $row['room_image'] && file_exists('../' . $row['room_image']))
            @unlink('../' . $row['room_image']);
        $conn->query("DELETE FROM applications WHERE room_id=$id");
        $conn->query("DELETE FROM rooms WHERE id=$id");
        send_json(['success' => true, 'message' => 'Room deleted successfully.']);
        break;

    // ============================================
    // GET APPLICATIONS
    // ============================================
    case 'get_applications':
        $status = clean($conn, $_GET['status'] ?? '');
        $sql = "SELECT a.id, a.user_id, a.user_role, a.room_id, a.application_type, a.booking_duration, a.status, a.applied_at, a.remarks,
                       r.room_no, r.hostel_name
                FROM applications a
                JOIN rooms r ON a.room_id = r.id";
        if ($status) $sql .= " WHERE a.status='$status'";
        $sql .= " ORDER BY a.applied_at DESC";
        $r    = $conn->query($sql);
        $rows = [];
        while ($row = $r->fetch_assoc()) {
            $t = ($row['user_role'] === 'Faculty') ? 'faculty' : 'student';
            $u = $conn->query("SELECT full_name FROM $t WHERE id={$row['user_id']} LIMIT 1")->fetch_assoc();
            $row['user_name'] = $u['full_name'] ?? 'Unknown';
            $rows[] = $row;
        }
        send_json(['success' => true, 'applications' => $rows]);
        break;

    // ============================================
    // UPDATE APPLICATION (Approve / Reject)
    // ============================================
    case 'update_application':
        /*
         * The detailed approval email block below is currently disabled because it
         * broke the switch parser in this file. Keep application updates simple
         * and let the dashboard API stay available.
         */
        if (true) {
            $id      = intval($_POST['id'] ?? 0);
            $status  = clean($conn, $_POST['status'] ?? '');
            $remarks = clean($conn, $_POST['remarks'] ?? '');

            if (!$id) send_json(['success' => false, 'message' => 'Invalid application ID.']);
            if (!in_array($status, ['Approved', 'Rejected']))
                send_json(['success' => false, 'message' => 'Invalid status.']);

            $app_res = $conn->query("SELECT * FROM applications WHERE id=$id LIMIT 1");
            $app = $app_res ? $app_res->fetch_assoc() : null;
            if (!$app) send_json(['success' => false, 'message' => 'Application not found.']);
            if ($app['status'] === $status)
                send_json(['success' => true, 'message' => "Application is already $status."]);

            if (!$conn->query("UPDATE applications SET status='$status', remarks='$remarks', updated_at=NOW() WHERE id=$id"))
                send_json(['success' => false, 'message' => 'Update failed: ' . $conn->error]);

            if ($status === 'Approved' || ($app['status'] === 'Approved' && $status === 'Rejected'))
                sync_room_availability($conn, $app['room_id']);

            $email_sent = false;
            require_once __DIR__ . '/mailer.php';
            $user_table = ($app['user_role'] === 'Faculty') ? 'faculty' : 'student';
            $user_id = intval($app['user_id']);
            $user_res = $conn->query("SELECT email, full_name FROM $user_table WHERE id=$user_id LIMIT 1");
            $room_res = $conn->query("SELECT room_no, hostel_name FROM rooms WHERE id={$app['room_id']} LIMIT 1");
            $user = $user_res ? $user_res->fetch_assoc() : null;
            $room = $room_res ? $room_res->fetch_assoc() : null;

            if ($user && !empty($user['email'])) {
                $status_label = ($status === 'Approved') ? 'Approved' : 'Rejected';
                $type_label = ($app['application_type'] === 'Leave') ? 'Room Leave Request' : 'Room Application';
                $subject = "$type_label $status_label - FATA University Hostel";
                $status_color = ($status === 'Approved') ? '#326a33' : '#dc3545';
                $dashboard_link = ($app['user_role'] === 'Faculty')
                    ? 'http://localhost/hostel/faculty/dashboard.html'
                    : 'http://localhost/hostel/student/dashboard.html';
                $hostel_name = $room['hostel_name'] ?? 'N/A';
                $room_no = $room['room_no'] ?? 'N/A';
                $duration = $app['booking_duration'] ?: 'N/A';
                $remarks_text = $remarks ?: 'No remarks.';
                $year_now = date('Y');

                $message = "
<div style='font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px 8px;'>
  <div style='max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border-top:4px solid {$status_color};'>
    <div style='padding:22px 26px;text-align:center;background:#f8fafc;'>
      <div style='font-size:18px;font-weight:800;color:#1e293b;'>FATA University Hostel</div>
      <div style='font-size:12px;color:#64748b;margin-top:4px;'>{$type_label} Update</div>
    </div>
    <div style='padding:24px 26px;'>
      <p style='font-size:15px;color:#1e293b;font-weight:700;margin:0 0 8px;'>Dear {$user['full_name']},</p>
      <p style='font-size:14px;color:#475569;line-height:1.7;margin:0 0 18px;'>Your {$type_label} has been <strong style='color:{$status_color};'>{$status_label}</strong> by hostel administration.</p>
      <table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;border-left:4px solid {$status_color};border-radius:0 8px 8px 0;margin-bottom:18px;'>
        <tr><td style='padding:16px 18px;font-size:13px;color:#334155;line-height:1.9;'>
          <strong>Hostel:</strong> {$hostel_name}<br>
          <strong>Room:</strong> {$room_no}<br>
          <strong>Duration:</strong> {$duration}<br>
          <strong>Remarks:</strong> {$remarks_text}
        </td></tr>
      </table>
      <div style='text-align:center;'>
        <a href='{$dashboard_link}' style='background:#326a33;color:#ffffff;padding:11px 22px;border-radius:7px;text-decoration:none;font-size:13px;font-weight:700;display:inline-block;'>Open Dashboard</a>
      </div>
    </div>
    <div style='background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 26px;text-align:center;font-size:11px;color:#94a3b8;'>&copy; {$year_now} FATA University Hostel. Automated notification.</div>
  </div>
</div>";
                $email_sent = send_hostel_email($user['email'], $subject, $message);
            }

            if ($status === 'Approved' && $app['application_type'] === 'Leave') {
                $uid  = intval($app['user_id']);
                $role = clean($conn, $app['user_role']);
                $conn->query("UPDATE applications SET status='Rejected', remarks='Left room', updated_at=NOW()
                              WHERE user_id=$uid AND user_role='$role' AND status='Approved' AND application_type='Apply'");
                sync_room_availability($conn, $app['room_id']);
            }

            $msg = "Application $status successfully.";
            if ($email_sent) {
                $msg .= ' Email sent to user.';
            } else {
                $msg .= ' Email was not sent. Please check SMTP/admin settings.';
            }
            send_json(['success' => true, 'message' => $msg]);
        }
        break;

    case 'update_application_email_disabled':
        send_json(['success' => false, 'message' => 'This legacy email handler is disabled.']);
        break;

    /* Legacy update_application email template kept out of the switch parser.
        $id      = intval($_POST['id']      ?? 0);
        $status  = clean($conn, $_POST['status']  ?? '');
        $remarks = clean($conn, $_POST['remarks'] ?? '');

        if (!in_array($status, ['Approved','Rejected']))
            send_json(['success' => false, 'message' => 'Invalid status.']);

        // Get application details
        $app = $conn->query("SELECT * FROM applications WHERE id=$id LIMIT 1")->fetch_assoc();
        if (!$app) send_json(['success' => false, 'message' => 'Application not found.']);

        // Prevent redundant updates
        if ($app['status'] === $status) {
            send_json(['success' => true, 'message' => "Application is already $status."]);
        }

        $conn->query("UPDATE applications SET status='$status', remarks='$remarks', updated_at=NOW() WHERE id=$id");

        if ($status === 'Approved' || ($app['status'] === 'Approved' && $status === 'Rejected')) {
            // Always sync room availability when an approval state changes
            sync_room_availability($conn, $app['room_id']);
            $email_sent = false;
            if ($status === 'Approved') {
                require_once __DIR__ . '/mailer.php';
                $user_table = ($app['user_role'] === 'Faculty') ? 'faculty' : 'student';
                $user_id = intval($app['user_id']);
                $u_res = $conn->query("SELECT email, full_name FROM $user_table WHERE id=$user_id LIMIT 1");
                
                if ($u_res && $u_res->num_rows > 0) {
                    $user_data = $u_res->fetch_assoc();
                    $to = $user_data['email'];
                    
                    if ($app['application_type'] === 'Apply') {
                        $subject = "\xE2\x9C\x85 Room Assignment Confirmed — FATA University Hostel";
                        $room_res = $conn->query("SELECT room_no, hostel_name FROM rooms WHERE id={$app['room_id']} LIMIT 1")->fetch_assoc();
                        $room_no_disp   = $room_res['room_no']   ?? 'N/A';
                        $hostel_disp    = $room_res['hostel_name'] ?? 'N/A';
                        $duration_disp  = $app['booking_duration'] ?? 'N/A';
                        $year_now       = date('Y');
                        $message = "
<div style='margin:0;padding:0;background:#f0f4f0;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f0f4f0;padding:32px 8px;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(50,106,51,0.10);'>
  <tr><td style='background:linear-gradient(135deg,#1e4520 0%,#326a33 100%);padding:32px 36px;text-align:center;'>
    <div style='font-size:11px;color:#a8d5a2;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;'>FATA University Hostel Management System</div>
    <div style='font-size:28px;margin-bottom:6px;'>&#127881;</div>
    <div style='font-size:22px;font-weight:800;color:#ffffff;margin-bottom:4px;'>Room Assigned!</div>
    <div style='font-size:13px;color:#c8e6c9;'>Your application has been approved</div>
  </td></tr>
  <tr><td style='padding:32px 36px;'>
    <p style='font-size:15px;color:#1e4520;font-weight:700;margin:0 0 6px;'>Dear {$user_data['full_name']},</p>
    <p style='font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;'>Congratulations! Your hostel room application has been <strong style='color:#326a33;'>approved</strong>. Your room details are below.</p>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f4f9f4;border-left:4px solid #326a33;border-radius:0 8px 8px 0;margin-bottom:24px;'>
      <tr><td style='padding:18px 20px;'>
        <div style='font-size:11px;color:#326a33;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;'>Your Room Details</div>
        <table width='100%' cellpadding='0' cellspacing='0' border='0'>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;width:140px;'>Hostel Block</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$hostel_disp}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Room Number</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$room_no_disp}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Duration</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$duration_disp}</td></tr>
        </table>
      </td></tr>
    </table>
    <table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'>
      <a href='http://localhost/hostel/student/dashboard.html' style='display:inline-block;background:#326a33;color:#ffffff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:7px;text-decoration:none;'>Go to My Dashboard &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style='background:#f4f9f4;border-top:1px solid #e0ede0;padding:18px 36px;text-align:center;'>
    <p style='font-size:11px;color:#999;margin:0;'>&copy; {$year_now} FATA University Hostel Management System &mdash; Automated Notification. Do not reply.</p>
  </td></tr>
</table>
</td></tr></table>
</div>";
                    } else if ($app['application_type'] === 'Leave') {
                        $subject = "\xF0\x9F\x9A\xAA Room Leave Approved — FATA University Hostel";
                        $year_now = date('Y');
                        $message = "
<div style='margin:0;padding:0;background:#f0f4f0;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f0f4f0;padding:32px 8px;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(50,106,51,0.10);'>
  <tr><td style='background:linear-gradient(135deg,#1C2331 0%,#2d3a4a 100%);padding:32px 36px;text-align:center;'>
    <div style='font-size:11px;color:#90a4ae;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;'>FATA University Hostel Management System</div>
    <div style='font-size:28px;margin-bottom:6px;'>&#128682;</div>
    <div style='font-size:22px;font-weight:800;color:#ffffff;margin-bottom:4px;'>Room Leave Confirmed</div>
    <div style='font-size:13px;color:#b0bec5;'>Your vacate request has been approved</div>
  </td></tr>
  <tr><td style='padding:32px 36px;'>
    <p style='font-size:15px;color:#1C2331;font-weight:700;margin:0 0 6px;'>Dear {$user_data['full_name']},</p>
    <p style='font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;'>Your room leave request has been <strong>approved</strong>. You have been officially checked out of your room. We hope you had a comfortable stay.</p>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f8fafc;border-left:4px solid #90a4ae;border-radius:0 8px 8px 0;margin-bottom:24px;'><tr><td style='padding:16px 20px;font-size:13px;color:#555;line-height:1.7;'>
      If you need accommodation again in the future, you are welcome to apply through the portal at any time.
    </td></tr></table>
    <table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'>
      <a href='http://localhost/hostel/student/dashboard.html' style='display:inline-block;background:#1C2331;color:#ffffff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:7px;text-decoration:none;'>Go to My Dashboard &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style='background:#f4f9f4;border-top:1px solid #e0ede0;padding:18px 36px;text-align:center;'>
    <p style='font-size:11px;color:#999;margin:0;'>&copy; {$year_now} FATA University Hostel Management System &mdash; Automated Notification. Do not reply.</p>
  </td></tr>
</table>
</td></tr></table>
</div>";
                    
                    if (isset($message)) {
                        $email_sent = send_hostel_email($to, $subject, $message);
                    }
                }
            }
    } 
    if ($status === 'Approved' && $app['application_type'] === 'Leave') {
            // First mark the original apply application as rejected
            $conn->query("UPDATE applications SET status='Rejected', remarks='Left room', updated_at=NOW()
                          WHERE user_id={$app['user_id']} AND user_role='{$app['user_role']}' AND status='Approved' AND application_type='Apply'");
            // Then sync room availability to accurately update the empty spaces
            sync_room_availability($conn, $app['room_id']);
        }

        $msg = "Application $status successfully.";
        if (isset($email_sent) && $email_sent) {
            $msg .= " An email has been successfully sent to the user.";
        }

        send_json(['success' => true, 'message' => $msg]);
        break;
    */

    // ============================================
    // GET FEES
    // ============================================
    case 'get_fees':
        $role_filter   = clean($conn, $_GET['role']   ?? '');
        $status_filter = clean($conn, $_GET['status'] ?? '');
        $sql = "SELECT f.*, COALESCE(NULLIF(f.user_name, ''), s.full_name, fc.full_name) as full_name
                FROM fees f
                LEFT JOIN student s  ON f.user_role='Student' AND f.user_id=s.id
                LEFT JOIN faculty fc ON f.user_role='Faculty' AND f.user_id=fc.id
                WHERE 1=1";
        if ($role_filter)   $sql .= " AND f.user_role='$role_filter'";
        if ($status_filter) $sql .= " AND f.status='$status_filter'";
        $sql .= " ORDER BY f.created_at DESC";
        $r    = $conn->query($sql);
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'fees' => $rows]);
        break;

    // ============================================
    // GET FEE USERS (dropdown)
    // ============================================
    case 'get_fee_users':
        $role  = clean($conn, $_GET['role'] ?? 'Student');
        $table = ($role === 'Faculty') ? 'faculty' : 'student';
        $r     = $conn->query("SELECT id, full_name FROM $table ORDER BY full_name ASC");
        $rows  = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'users' => $rows]);
        break;

    // ============================================
    // SAVE FEE RECORD
    // ============================================
    case 'save_fee':
        $user_id = intval($_POST['user_id']   ?? 0);
        $role    = clean($conn, $_POST['user_role']  ?? 'Student');
        $month   = clean($conn, $_POST['fee_month']  ?? '');
        $year    = intval($_POST['fee_year']          ?? date('Y'));
        $amount  = floatval($_POST['amount']          ?? 0);
        $status  = clean($conn, $_POST['status']     ?? 'Unpaid');
        $notes   = clean($conn, $_POST['notes']      ?? '');

        if (!$user_id || !$month || !$amount)
            send_json(['success' => false, 'message' => 'User, month, and amount are required.']);

        $user_table = ($role === 'Faculty') ? 'faculty' : 'student';
        $user_row = $conn->query("SELECT full_name FROM $user_table WHERE id=$user_id LIMIT 1")->fetch_assoc();
        if (!$user_row)
            send_json(['success' => false, 'message' => 'Selected user was not found.']);
        $user_name = clean($conn, $user_row['full_name']);

        $receipt  = 'RCP-' . strtoupper(substr(md5(uniqid()), 0, 8));
        $pay_date = ($status === 'Paid') ? "'" . date('Y-m-d') . "'" : 'NULL';

        $conn->query("INSERT INTO fees (user_id, user_role, user_name, amount, fee_month, fee_year, status, payment_date, receipt_no, notes, created_at)
                      VALUES ($user_id, '$role', '$user_name', $amount, '$month', $year, '$status', $pay_date, '$receipt', '$notes', NOW())");
        send_json(['success' => true, 'message' => 'Fee record added.', 'receipt' => $receipt]);
        break;

    // ============================================
    // SEND FEE REMINDER EMAIL
    // ============================================
    case 'send_fee_reminder':
        $id = intval($_POST['id'] ?? 0);
        if (!$id)
            send_json(['success' => false, 'message' => 'Invalid fee record.']);

        $fee_res = $conn->query("SELECT * FROM fees WHERE id=$id LIMIT 1");
        $fee = $fee_res ? $fee_res->fetch_assoc() : null;
        if (!$fee)
            send_json(['success' => false, 'message' => 'Fee record not found.']);
        if ($fee['status'] === 'Paid')
            send_json(['success' => false, 'message' => 'This fee is already paid.']);

        $user_table = ($fee['user_role'] === 'Faculty') ? 'faculty' : 'student';
        $user_id = intval($fee['user_id']);
        $user_res = $conn->query("SELECT email, full_name FROM $user_table WHERE id=$user_id LIMIT 1");
        $user = $user_res ? $user_res->fetch_assoc() : null;
        if (!$user || empty($user['email']))
            send_json(['success' => false, 'message' => 'User email was not found.']);

        require_once __DIR__ . '/mailer.php';

        $full_name = htmlspecialchars($user['full_name'], ENT_QUOTES, 'UTF-8');
        $amount_fmt = 'Rs. ' . number_format(floatval($fee['amount']), 2);
        $month_year = htmlspecialchars($fee['fee_month'] . ' ' . $fee['fee_year'], ENT_QUOTES, 'UTF-8');
        $status = htmlspecialchars($fee['status'], ENT_QUOTES, 'UTF-8');
        $notes = trim($fee['notes'] ?? '');
        $notes_html = $notes ? '<tr><td style="padding:5px 0;font-size:13px;color:#777;">Notes</td><td style="padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;">' . htmlspecialchars($notes, ENT_QUOTES, 'UTF-8') . '</td></tr>' : '';
        $dashboard_link = ($fee['user_role'] === 'Faculty')
            ? 'http://localhost/hostel/faculty/dashboard.html'
            : 'http://localhost/hostel/student/dashboard.html';
        $year_now = date('Y');

        $subject = "Fee Payment Reminder - {$fee['fee_month']} {$fee['fee_year']}";
        $message = "
<div style='margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f4f6f8;padding:32px 8px;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>
  <tr><td style='background:#326a33;padding:30px 36px;text-align:center;'>
    <div style='font-size:11px;color:#d8efd5;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;'>FATA University Hostel Management System</div>
    <div style='font-size:24px;font-weight:800;color:#ffffff;margin-bottom:4px;'>Fee Payment Reminder</div>
    <div style='font-size:13px;color:#d8efd5;'>Please clear your pending hostel fee</div>
  </td></tr>
  <tr><td style='padding:32px 36px;'>
    <p style='font-size:15px;color:#1e4520;font-weight:700;margin:0 0 6px;'>Dear {$full_name},</p>
    <p style='font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;'>This is a reminder from the hostel administration that your fee for <strong>{$month_year}</strong> is still pending. Please submit your payment as soon as possible.</p>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f8fafc;border-left:4px solid #937C3D;border-radius:0 8px 8px 0;margin-bottom:24px;'>
      <tr><td style='padding:18px 20px;'>
        <div style='font-size:11px;color:#937C3D;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;'>Fee Details</div>
        <table width='100%' cellpadding='0' cellspacing='0' border='0'>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;width:140px;'>Period</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$month_year}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Amount Due</td><td style='padding:5px 0;font-size:16px;color:#326a33;font-weight:800;'>{$amount_fmt}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Current Status</td><td style='padding:5px 0;font-size:13px;color:#b45309;font-weight:700;'>{$status}</td></tr>
          {$notes_html}
        </table>
      </td></tr>
    </table>
    <table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'>
      <a href='{$dashboard_link}' style='display:inline-block;background:#326a33;color:#ffffff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:7px;text-decoration:none;'>Open Fee Dashboard</a>
    </td></tr></table>
  </td></tr>
  <tr><td style='background:#f4f9f4;border-top:1px solid #e0ede0;padding:18px 36px;text-align:center;'>
    <p style='font-size:11px;color:#999;margin:0;'>&copy; {$year_now} FATA University Hostel Management System. Automated notification.</p>
  </td></tr>
</table>
</td></tr></table>
</div>";

        $email_sent = send_hostel_email($user['email'], $subject, $message);
        if (!$email_sent)
            send_json(['success' => false, 'message' => 'Email was not sent. Please check SMTP/admin settings.']);

        send_json(['success' => true, 'message' => 'Fee reminder email sent to ' . $user['email'] . '.']);
        break;

    // ============================================
    // SEND ALL FEE RECORDS REPORT TO USER
    // ============================================
    case 'send_user_fee_report':
        $user_id = intval($_POST['user_id'] ?? 0);
        $role = clean($conn, $_POST['user_role'] ?? 'Student');
        if (!$user_id || !in_array($role, ['Student', 'Faculty']))
            send_json(['success' => false, 'message' => 'Invalid user.']);

        $user_table = ($role === 'Faculty') ? 'faculty' : 'student';
        $user_res = $conn->query("SELECT email, full_name FROM $user_table WHERE id=$user_id LIMIT 1");
        $user = $user_res ? $user_res->fetch_assoc() : null;
        if (!$user || empty($user['email']))
            send_json(['success' => false, 'message' => 'User email was not found.']);

        $fees_res = $conn->query("SELECT fee_month, fee_year, amount, status, payment_date, receipt_no, notes
                                  FROM fees
                                  WHERE user_id=$user_id AND user_role='$role'
                                  ORDER BY fee_year DESC, id DESC");
        $fees = [];
        while ($fees_res && $row = $fees_res->fetch_assoc()) $fees[] = $row;
        if (!$fees)
            send_json(['success' => false, 'message' => 'No fee records found for this user.']);

        $total_paid = 0;
        $total_due = 0;
        $rows_html = '';
        foreach ($fees as $index => $fee) {
            $amount = floatval($fee['amount']);
            if ($fee['status'] === 'Paid') $total_paid += $amount;
            else $total_due += $amount;

            $period = htmlspecialchars($fee['fee_month'] . ' ' . $fee['fee_year'], ENT_QUOTES, 'UTF-8');
            $status = htmlspecialchars($fee['status'], ENT_QUOTES, 'UTF-8');
            $receipt = htmlspecialchars($fee['receipt_no'] ?: '-', ENT_QUOTES, 'UTF-8');
            $payment_date = htmlspecialchars($fee['payment_date'] ?: '-', ENT_QUOTES, 'UTF-8');
            $amount_fmt = 'Rs. ' . number_format($amount, 2);
            $bg = ($index % 2 === 0) ? '#ffffff' : '#f8fafc';

            $rows_html .= "<tr style='background:{$bg};'>
                <td style='padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#334155;'>{$period}</td>
                <td style='padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#334155;'>{$amount_fmt}</td>
                <td style='padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#334155;'>{$status}</td>
                <td style='padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#334155;'>{$payment_date}</td>
                <td style='padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#334155;'>{$receipt}</td>
            </tr>";
        }

        require_once __DIR__ . '/mailer.php';

        $full_name = htmlspecialchars($user['full_name'], ENT_QUOTES, 'UTF-8');
        $total_paid_fmt = 'Rs. ' . number_format($total_paid, 2);
        $total_due_fmt = 'Rs. ' . number_format($total_due, 2);
        $generated_on = date('d M Y');
        $year_now = date('Y');
        $dashboard_link = ($role === 'Faculty')
            ? 'http://localhost/hostel/faculty/dashboard.html'
            : 'http://localhost/hostel/student/dashboard.html';

        $subject = "Your Hostel Fee Records Report";
        $message = "
<div style='margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f4f6f8;padding:32px 8px;'><tr><td align='center'>
<table width='680' cellpadding='0' cellspacing='0' border='0' style='max-width:680px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>
  <tr><td style='background:#326a33;padding:30px 36px;text-align:center;'>
    <div style='font-size:11px;color:#d8efd5;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;'>FATA University Hostel Management System</div>
    <div style='font-size:24px;font-weight:800;color:#ffffff;margin-bottom:4px;'>Fee Records Report</div>
    <div style='font-size:13px;color:#d8efd5;'>Generated on {$generated_on}</div>
  </td></tr>
  <tr><td style='padding:28px 30px;'>
    <p style='font-size:15px;color:#1e4520;font-weight:700;margin:0 0 6px;'>Dear {$full_name},</p>
    <p style='font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;'>Hostel administration has sent your complete fee records report. A summary and all available fee entries are listed below.</p>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;'>
      <tr>
        <td style='background:#f0f9f1;padding:14px;border-radius:8px;color:#326a33;font-weight:800;font-size:16px;'>Paid: {$total_paid_fmt}</td>
        <td width='12'></td>
        <td style='background:#fff7ed;padding:14px;border-radius:8px;color:#b45309;font-weight:800;font-size:16px;'>Due: {$total_due_fmt}</td>
      </tr>
    </table>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;border-collapse:separate;border-spacing:0;margin-bottom:22px;'>
      <thead>
        <tr style='background:#f1f5f9;'>
          <th align='left' style='padding:10px;font-size:11px;color:#475569;text-transform:uppercase;'>Period</th>
          <th align='left' style='padding:10px;font-size:11px;color:#475569;text-transform:uppercase;'>Amount</th>
          <th align='left' style='padding:10px;font-size:11px;color:#475569;text-transform:uppercase;'>Status</th>
          <th align='left' style='padding:10px;font-size:11px;color:#475569;text-transform:uppercase;'>Payment Date</th>
          <th align='left' style='padding:10px;font-size:11px;color:#475569;text-transform:uppercase;'>Receipt</th>
        </tr>
      </thead>
      <tbody>{$rows_html}</tbody>
    </table>
    <table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'>
      <a href='{$dashboard_link}' style='display:inline-block;background:#326a33;color:#ffffff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:7px;text-decoration:none;'>Open Dashboard</a>
    </td></tr></table>
  </td></tr>
  <tr><td style='background:#f4f9f4;border-top:1px solid #e0ede0;padding:18px 36px;text-align:center;'>
    <p style='font-size:11px;color:#999;margin:0;'>&copy; {$year_now} FATA University Hostel Management System. Automated report.</p>
  </td></tr>
</table>
</td></tr></table>
</div>";

        $email_sent = send_hostel_email($user['email'], $subject, $message);
        if (!$email_sent)
            send_json(['success' => false, 'message' => 'Email was not sent. Please check SMTP/admin settings.']);

        send_json(['success' => true, 'message' => 'Fee records report sent to ' . $user['email'] . '.']);
        break;

    // ============================================
    // UPDATE FEE STATUS
    // ============================================
    case 'update_fee':
        $id       = intval($_POST['id']     ?? 0);
        $status   = clean($conn, $_POST['status'] ?? '');
        $pay_date = ($status === 'Paid') ? "'" . date('Y-m-d') . "'" : 'NULL';
        $receipt  = ($status === 'Paid') ? "'" . 'RCP-' . strtoupper(substr(md5(uniqid()), 0, 8)) . "'" : 'receipt_no';
        
        $email_sent = false;

        if ($status === 'Unpaid') {
            // Rejection: remove payment proof if it exists
            $fee = $conn->query("SELECT payment_proof FROM fees WHERE id=$id")->fetch_assoc();
            if ($fee && $fee['payment_proof'] && file_exists('../' . $fee['payment_proof'])) {
                unlink('../' . $fee['payment_proof']);
            }
            $conn->query("UPDATE fees SET status='Unpaid', payment_method=NULL, transaction_id=NULL, payment_proof=NULL, payment_date=NULL, receipt_no=NULL, updated_at=NOW() WHERE id=$id");
        } else {
            $fee = $conn->query("SELECT status, user_id, user_role, fee_month, fee_year, amount FROM fees WHERE id=$id LIMIT 1")->fetch_assoc();
            
            $conn->query("UPDATE fees SET status='$status', payment_date=$pay_date, receipt_no=$receipt, updated_at=NOW() WHERE id=$id");
            
            if ($fee && $fee['status'] !== 'Paid' && $status === 'Paid') {
                // ----------------------------------------------------------
                // Send email for user (fee)
                // ----------------------------------------------------------
                require_once __DIR__ . '/mailer.php';
                $user_table = ($fee['user_role'] === 'Faculty') ? 'faculty' : 'student';
                $user_id = intval($fee['user_id']);
                $u_res = $conn->query("SELECT email, full_name FROM $user_table WHERE id=$user_id LIMIT 1");
                if ($u_res && $u_res->num_rows > 0) {
                    $user_data = $u_res->fetch_assoc();
                    $to         = $user_data['email'];
                    $amount_fmt = 'Rs. ' . number_format($fee['amount'], 2);
                    $month_year = $fee['fee_month'] . ' ' . $fee['fee_year'];
                    $year_now   = date('Y');
                    $subject    = "\xE2\x9C\x85 Fee Payment Confirmed \u2014 {$month_year}";
                    $message = "
<div style='margin:0;padding:0;background:#f0f4f0;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f0f4f0;padding:32px 8px;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(50,106,51,0.10);'>
  <tr><td style='background:linear-gradient(135deg,#1e4520 0%,#326a33 100%);padding:32px 36px;text-align:center;'>
    <div style='font-size:11px;color:#a8d5a2;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;'>FATA University Hostel Management System</div>
    <div style='font-size:28px;margin-bottom:6px;'>&#10003;</div>
    <div style='font-size:22px;font-weight:800;color:#ffffff;margin-bottom:4px;'>Payment Confirmed</div>
    <div style='font-size:13px;color:#c8e6c9;'>Your hostel fee has been verified</div>
  </td></tr>
  <tr><td style='padding:32px 36px;'>
    <p style='font-size:15px;color:#1e4520;font-weight:700;margin:0 0 6px;'>Dear {$user_data['full_name']},</p>
    <p style='font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;'>Your hostel fee payment for <strong>{$month_year}</strong> has been <strong style='color:#326a33;'>verified and confirmed</strong> by the administration.</p>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f4f9f4;border-left:4px solid #937C3D;border-radius:0 8px 8px 0;margin-bottom:24px;'>
      <tr><td style='padding:18px 20px;'>
        <div style='font-size:11px;color:#937C3D;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;'>Payment Receipt</div>
        <table width='100%' cellpadding='0' cellspacing='0' border='0'>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;width:140px;'>Period</td><td style='padding:5px 0;font-size:13px;color:#1e1e1e;font-weight:600;'>{$month_year}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Amount Paid</td><td style='padding:5px 0;font-size:16px;color:#326a33;font-weight:800;'>{$amount_fmt}</td></tr>
          <tr><td style='padding:5px 0;font-size:13px;color:#777;'>Status</td><td style='padding:5px 0;font-size:13px;color:#326a33;font-weight:700;'>&#10003; Paid</td></tr>
        </table>
      </td></tr>
    </table>
    <table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'>
      <a href='http://localhost/hostel/student/dashboard.html' style='display:inline-block;background:#326a33;color:#ffffff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:7px;text-decoration:none;'>View My Ledger &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style='background:#f4f9f4;border-top:1px solid #e0ede0;padding:18px 36px;text-align:center;'>
    <p style='font-size:11px;color:#999;margin:0;'>&copy; {$year_now} FATA University Hostel Management System &mdash; Automated Notification. Do not reply.</p>
  </td></tr>
</table>
</td></tr></table>
</div>";
                    
                    $email_sent = send_hostel_email($to, $subject, $message);
                }
            }
        }
        
        $msg = "Fee status updated.";
        if ($email_sent) {
            $msg .= " An email has been successfully sent to the user.";
        }
        
        send_json(['success' => true, 'message' => $msg]);
        break;

    // ============================================
    // GET COMPLAINTS
    // ============================================
    case 'get_complaints':
        $r = $conn->query(
            "SELECT c.*, COALESCE(s.full_name, f.full_name) as full_name
             FROM complaints c
             LEFT JOIN student s  ON c.user_role='Student' AND c.user_id=s.id
             LEFT JOIN faculty f  ON c.user_role='Faculty' AND c.user_id=f.id
             ORDER BY c.submitted_at DESC"
        );
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'complaints' => $rows]);
        break;

    // ============================================
    // RESOLVE COMPLAINT
    // ============================================
    case 'resolve_complaint':
        $id       = intval($_POST['id']        ?? 0);
        $status   = clean($conn, $_POST['status']   ?? 'Resolved');
        $response = clean($conn, $_POST['response'] ?? 'Resolved by admin.');
        $resolved = ($status === 'Resolved') ? "'" . date('Y-m-d H:i:s') . "'" : 'NULL';
        $conn->query("UPDATE complaints SET status='$status', admin_response='$response', resolved_at=$resolved WHERE id=$id");
        
        $email_sent = false;
        require_once __DIR__ . '/mailer.php';
        $comp = $conn->query("SELECT user_id, user_role, title FROM complaints WHERE id=$id LIMIT 1")->fetch_assoc();
        if ($comp) {
            $u_table = ($comp['user_role'] === 'Faculty') ? 'faculty' : 'student';
            $u_id = intval($comp['user_id']);
            $u_res = $conn->query("SELECT email, full_name FROM $u_table WHERE id=$u_id LIMIT 1")->fetch_assoc();
            if ($u_res) {
                $year_now = date('Y');
                $status_color = ($status === 'Resolved') ? '#326a33' : '#e58c0c';
                $status_icon  = ($status === 'Resolved') ? '&#9989;' : '&#128161;';
                $subject = "\xF0\x9F\x93\xA2 Complaint Update: {$comp['title']}";
                $message = "
<div style='margin:0;padding:0;background:#f0f4f0;font-family:Arial,Helvetica,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f0f4f0;padding:32px 8px;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(50,106,51,0.10);'>
  <tr><td style='background:linear-gradient(135deg,#1C2331 0%,#326a33 100%);padding:32px 36px;text-align:center;'>
    <div style='font-size:11px;color:#a8d5a2;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;'>FATA University Hostel Management System</div>
    <div style='font-size:28px;margin-bottom:6px;'>{$status_icon}</div>
    <div style='font-size:22px;font-weight:800;color:#ffffff;margin-bottom:4px;'>Complaint {$status}</div>
    <div style='font-size:13px;color:#c8e6c9;'>Your complaint has been reviewed</div>
  </td></tr>
  <tr><td style='padding:32px 36px;'>
    <p style='font-size:15px;color:#1C2331;font-weight:700;margin:0 0 6px;'>Dear {$u_res['full_name']},</p>
    <p style='font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;'>Your complaint has been updated to <strong style='color:{$status_color};'>{$status}</strong> by the hostel administration.</p>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f8fafc;border-left:4px solid #937C3D;border-radius:0 8px 8px 0;margin-bottom:16px;'>
      <tr><td style='padding:16px 20px;'>
        <div style='font-size:11px;color:#937C3D;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;'>Complaint Title</div>
        <div style='font-size:14px;color:#1C2331;font-weight:600;'>{$comp['title']}</div>
      </td></tr>
    </table>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f4f9f4;border-left:4px solid {$status_color};border-radius:0 8px 8px 0;margin-bottom:28px;'>
      <tr><td style='padding:16px 20px;'>
        <div style='font-size:11px;color:{$status_color};font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;'>Admin Response</div>
        <div style='font-size:13px;color:#555;line-height:1.7;white-space:pre-wrap;'>{$response}</div>
      </td></tr>
    </table>
    <table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'>
      <a href='http://localhost/hostel/student/dashboard.html' style='display:inline-block;background:#326a33;color:#ffffff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:7px;text-decoration:none;'>View My Complaints &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style='background:#f4f9f4;border-top:1px solid #e0ede0;padding:18px 36px;text-align:center;'>
    <p style='font-size:11px;color:#999;margin:0;'>&copy; {$year_now} FATA University Hostel Management System &mdash; Automated Notification. Do not reply.</p>
  </td></tr>
</table>
</td></tr></table>
</div>";
                $email_sent = send_hostel_email($u_res['email'], $subject, $message);
            }
        }
        
        $msg = 'Complaint updated successfully.';
        if ($email_sent) {
            $msg .= ' An email notification was sent to the user.';
        }
        
        send_json(['success' => true, 'message' => $msg]);
        break;

    // ============================================
    // POST NOTICE
    // ============================================
    case 'post_notice':
        $title    = clean($conn, $_POST['title']            ?? '');
        $message  = clean($conn, $_POST['message']          ?? '');
        $priority = clean($conn, $_POST['priority']         ?? 'Normal');
        $audience = clean($conn, $_POST['target_audience']  ?? 'All');
        $expiry   = clean($conn, $_POST['expiry_date']      ?? '');

        if (!$title || !$message)
            send_json(['success' => false, 'message' => 'Title and message are required.']);

        $expiry_val = ($expiry && $expiry !== '') ? "'$expiry'" : 'NULL';
        $conn->query("INSERT INTO notices (title, message, priority, target_audience, expiry_date, created_by, status, created_at)
                      VALUES ('$title', '$message', '$priority', '$audience', $expiry_val, $admin_id, 'Active', NOW())");
        send_json(['success' => true, 'message' => 'Notice posted successfully.']);
        break;

    // ============================================
    // GET NOTICES (admin)
    // ============================================
    case 'get_notices_admin':
        $r    = $conn->query("SELECT * FROM notices ORDER BY created_at DESC");
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'notices' => $rows]);
        break;

    // ============================================
    // DELETE NOTICE
    // ============================================
    case 'delete_notice':
        $id = intval($_POST['id'] ?? 0);
        $conn->query("DELETE FROM notices WHERE id=$id");
        send_json(['success' => true, 'message' => 'Notice deleted.']);
        break;

    // ============================================
    // GET GALLERY (admin)
    // ============================================
    case 'get_gallery_admin':
        $r = $conn->query(
            "SELECT g.*,
                    COALESCE(s.full_name, f.full_name, 'Admin') as uploaded_by_name
             FROM gallery g
             LEFT JOIN student s  ON g.uploaded_by_role='Student' AND g.uploaded_by_id=s.id
             LEFT JOIN faculty f  ON g.uploaded_by_role='Faculty' AND g.uploaded_by_id=f.id
             ORDER BY g.uploaded_at DESC"
        );
        $rows = [];
        while ($row = $r->fetch_assoc()) $rows[] = $row;
        send_json(['success' => true, 'gallery' => $rows]);
        break;

    // ============================================
    // UPLOAD GALLERY (admin - auto approved)
    // ============================================
    case 'upload_gallery':
        if (empty($_FILES['photo']['name']))
            send_json(['success' => false, 'message' => 'Please select an image.']);

        $caption = clean($conn, $_POST['caption'] ?? '');
        $ext     = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','webp','bmp','jfif','heic','avif'];
        if (!in_array($ext, $allowed))
            send_json(['success' => false, 'message' => 'Invalid image format.']);

        if ($_FILES['photo']['size'] > 5 * 1024 * 1024)
            send_json(['success' => false, 'message' => 'File too large. Max 5MB.']);

        if (!is_dir('../assets/uploads/gallery/')) mkdir('../assets/uploads/gallery/', 0777, true);
        $filename = 'gallery_admin_' . time() . '.' . $ext;
        $dest     = '../assets/uploads/gallery/' . $filename;
        if (!move_uploaded_file($_FILES['photo']['tmp_name'], $dest))
            send_json(['success' => false, 'message' => 'Upload failed.']);

        $path = 'assets/uploads/gallery/' . $filename;
        $conn->query("INSERT INTO gallery (uploaded_by_id, uploaded_by_role, image_path, caption, status, uploaded_at, approved_at)
                      VALUES ($admin_id, 'Admin', '$path', '$caption', 'Approved', NOW(), NOW())");
        send_json(['success' => true, 'message' => 'Photo uploaded and approved.']);
        break;

    // ============================================
    // UPDATE GALLERY STATUS (approve/reject)
    // ============================================
    case 'update_gallery':
        $id       = intval($_POST['id']     ?? 0);
        $status   = clean($conn, $_POST['status'] ?? '');
        $approved = ($status === 'Approved') ? "'" . date('Y-m-d H:i:s') . "'" : 'NULL';
        $conn->query("UPDATE gallery SET status='$status', approved_at=$approved WHERE id=$id");
        send_json(['success' => true, 'message' => "Gallery photo $status."]);
        break;

    // ============================================
    // DELETE GALLERY
    // ============================================
    case 'delete_gallery':
        $id  = intval($_POST['id'] ?? 0);
        $row = $conn->query("SELECT image_path FROM gallery WHERE id=$id LIMIT 1")->fetch_assoc();
        if ($row && $row['image_path'] && file_exists('../' . $row['image_path']))
            @unlink('../' . $row['image_path']);
        $conn->query("DELETE FROM gallery WHERE id=$id");
        send_json(['success' => true, 'message' => 'Deleted.']);
        break;

    // ============================================
    // UPDATE ADMIN PROFILE
    // ============================================
    case 'update_profile':
        $full_name = clean($conn, $_POST['full_name'] ?? '');
        $email     = clean($conn, $_POST['email']     ?? '');
        $username  = clean($conn, $_POST['username']  ?? '');
        $photo_path = '';

        if (!empty($_FILES['profile_photo']['name'])) {
            $ext  = strtolower(pathinfo($_FILES['profile_photo']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg','jpeg','png','gif','webp'];
            if (!in_array($ext, $allowed)) send_json(['success' => false, 'message' => 'Invalid image.']);
            if (!is_dir('../assets/uploads/admin/')) mkdir('../assets/uploads/admin/', 0777, true);
            $filename = 'admin_' . time() . '.' . $ext;
            if (move_uploaded_file($_FILES['profile_photo']['tmp_name'], '../assets/uploads/admin/' . $filename))
                $photo_path = 'assets/uploads/admin/' . $filename;
        }

        $sql = "UPDATE admin SET full_name='$full_name', email='$email', username='$username', updated_at=NOW()";
        if ($photo_path) $sql .= ", profile_photo='$photo_path'";
        $sql .= " WHERE id=$admin_id";
        $conn->query($sql);
        $_SESSION['user_name']  = $full_name;
        $_SESSION['user_email'] = $email;
        if ($photo_path) $_SESSION['user_photo'] = $photo_path;
        send_json(['success' => true, 'message' => 'Admin profile updated.']);
        break;

    // ============================================
    // GET ADMIN INFO
    // ============================================
    case 'get_admin_info':
        $r   = $conn->query("SELECT id, username, full_name, email, profile_photo FROM admin WHERE id=$admin_id LIMIT 1");
        $row = $r->fetch_assoc();
        send_json(['success' => true, 'admin' => $row]);
        break;

    default:
        send_json(['success' => false, 'message' => 'Invalid action.'], 400);
}
