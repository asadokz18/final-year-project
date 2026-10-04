<?php
// ============================================
// Middleware (Clean Version)
// ============================================

// Load DB connection (provides $conn, clean())
require_once __DIR__ . '/db.php';

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Helper function
function send_json($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

// Require admin
function require_admin() {
    if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'Admin') {
        send_json([
            'success' => false,
            'message' => 'Unauthorized. Admin access required.'
        ], 401);
    }
    return intval($_SESSION['user_id']);
}

// Require user (student/faculty)
function require_user() {
    if (empty($_SESSION['user_id']) || empty($_SESSION['user_role']) || $_SESSION['user_role'] === 'Admin') {
        send_json([
            'success' => false,
            'message' => 'Unauthorized. Please login.'
        ], 401);
    }

    return [
        'uid'   => intval($_SESSION['user_id']),
        'role'  => $_SESSION['user_role'],
        'table' => ($_SESSION['user_role'] === 'Faculty') ? 'faculty' : 'student'
    ];
}
?>