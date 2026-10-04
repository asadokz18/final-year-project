<?php
// ============================================
// FATA University Hostel - Database Connection
// ============================================

// Session configuration - must be before session_start()
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_strict_mode', 1);
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.gc_maxlifetime', 86400); // 24 hours
    ini_set('session.cookie_lifetime', 86400);
}

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'hostel_db');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]));
}

$conn->set_charset('utf8mb4');


// Helper: sanitize input
function clean($conn, $val) {
    return $conn->real_escape_string(trim($val));
}

/**
 * Recalculates available_spaces and status for a specific room
 * based on current approved applications.
 */
function sync_room_availability($conn, $room_id) {
    $room_id = intval($room_id);
    if (!$room_id) return;
    
    // Get room capacity
    $r = $conn->query("SELECT capacity FROM rooms WHERE id=$room_id LIMIT 1")->fetch_assoc();
    if (!$r) return;
    $cap = intval($r['capacity']);
    
    // Count approved occupants
    $occ_res = $conn->query("SELECT COUNT(*) as c FROM applications WHERE room_id=$room_id AND status='Approved' AND application_type='Apply'");
    $occ = intval($occ_res->fetch_assoc()['c']);
    
    $new_avail = max(0, $cap - $occ);
    $new_status = ($new_avail <= 0) ? 'Full' : 'Available';
    
    // Update room
    $conn->query("UPDATE rooms SET available_spaces=$new_avail, status='$new_status', updated_at=NOW() WHERE id=$room_id");
}


