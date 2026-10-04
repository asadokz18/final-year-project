<?php
// ============================================
// FATA University Hostel - Public API
// (No auth required for homepage data)
// ============================================

require_once 'config/headers.php';
require_once 'middleware.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    // ============ GET ROOMS (TOP 6) ============
    case 'get_rooms':
        $limit = intval($_GET['limit'] ?? 6);
        
        // Auto-heal: Sync all rooms first to ensure availability is always correct in real-time
        $all_rooms = $conn->query("SELECT id FROM rooms");
        while ($room_row = $all_rooms->fetch_assoc()) {
            sync_room_availability($conn, $room_row['id']);
        }

        $r = $conn->query("SELECT * FROM rooms ORDER BY id ASC LIMIT $limit");
        $rooms = [];
        while ($row = $r->fetch_assoc()) $rooms[] = $row;
        send_json(['success' => true, 'rooms' => $rooms]);
        break;

    // ============ GET ALL ROOMS WITH FILTER ============
    case 'get_rooms_all':
        $hostel = clean($conn, $_GET['hostel'] ?? '');
        $status = clean($conn, $_GET['status'] ?? '');
        
        // Auto-heal: Sync all rooms first to ensure availability is always correct in real-time
        $all_rooms = $conn->query("SELECT id FROM rooms");
        while ($room_row = $all_rooms->fetch_assoc()) {
            sync_room_availability($conn, $room_row['id']);
        }

        $sql = "SELECT * FROM rooms WHERE 1=1";
        if ($hostel) $sql .= " AND hostel_name='$hostel'";
        if ($status) $sql .= " AND status='$status'";
        $sql .= " ORDER BY hostel_name, room_no";
        $r = $conn->query($sql);
        $rooms = [];
        while ($row = $r->fetch_assoc()) $rooms[] = $row;
        send_json(['success' => true, 'rooms' => $rooms]);
        break;

    // ============ GET NOTICES (TOP 4) ============
    case 'get_notices':
        $limit = intval($_GET['limit'] ?? 4);
        $r = $conn->query("SELECT * FROM notices WHERE status='Active' AND (expiry_date IS NULL OR expiry_date >= CURDATE()) ORDER BY id DESC LIMIT $limit");
        $notices = [];
        while ($row = $r->fetch_assoc()) $notices[] = $row;
        send_json(['success' => true, 'notices' => $notices]);
        break;

    // ============ GET GALLERY (APPROVED, TOP 6) ============
    case 'get_gallery':
        $limit = intval($_GET['limit'] ?? 6);
        $r = $conn->query("SELECT * FROM gallery WHERE status='Approved' ORDER BY uploaded_at DESC LIMIT $limit");
        $gallery = [];
        while ($row = $r->fetch_assoc()) $gallery[] = $row;
        send_json(['success' => true, 'gallery' => $gallery]);
        break;

    // ============ SUBMIT CONTACT MESSAGE ============
    case 'contact':
        $name    = clean($conn, $_POST['name'] ?? '');
        $email   = clean($conn, $_POST['email'] ?? '');
        $subject = clean($conn, $_POST['subject'] ?? '');
        $message = clean($conn, $_POST['message'] ?? '');
        
        if (!$name || !$email || !$message) {
            send_json(['success' => false, 'message' => 'Please fill all required fields.']);
        }
        
        // Require the mailer logic
        require_once 'mailer.php';
        
        // Fetch the admin email to send to (usually the smtp_user)
        $admin_email = 'info@fu.edu.pk'; // Default fallback
        $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key='smtp_user'");
        if ($result && $row = $result->fetch_assoc()) {
            if (!empty($row['setting_value'])) {
                $admin_email = $row['setting_value'];
            }
        }
        
        $email_subject = "New Contact Message: " . ($subject ?: 'General Inquiry');
        $email_body = "
            <div style='font-family: Arial, sans-serif; color: #333;'>
                <h3>New Message from Hostel Contact Form</h3>
                <p><strong>Name:</strong> " . htmlspecialchars($name) . "</p>
                <p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>
                <p><strong>Subject:</strong> " . htmlspecialchars($subject ?: 'General Inquiry') . "</p>
                <hr style='border: 1px solid #eee;'>
                <p><strong>Message:</strong></p>
                <p style='background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #ddd;'>
                    " . nl2br(htmlspecialchars($message)) . "
                </p>
            </div>
        ";
        
        // Dispatch email
        $mail_sent = send_hostel_email($admin_email, $email_subject, $email_body);
        
        if ($mail_sent) {
            send_json(['success' => true, 'message' => 'Your message has been sent. We will contact you soon!']);
        } else {
            send_json(['success' => false, 'message' => 'Failed to send message. Please try again later.']);
        }
        break;

    default:
        send_json(['success' => false, 'message' => 'Invalid action.'], 400);
}
