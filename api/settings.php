<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

// Ensure admin is logged in
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'Admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

// Auto-create settings table if it doesn't exist
$conn->query("CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL
)");

$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'get_smtp') {
        $keys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass'];
        $settings = [];
        
        $sql = "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('" . implode("','", $keys) . "')";
        $result = $conn->query($sql);
        
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
        }
        
        // Provide defaults if not set
        if (!isset($settings['smtp_host'])) $settings['smtp_host'] = 'smtp.gmail.com';
        if (!isset($settings['smtp_port'])) $settings['smtp_port'] = '587';
        if (!isset($settings['smtp_user'])) $settings['smtp_user'] = '';
        if (!isset($settings['smtp_pass'])) $settings['smtp_pass'] = '';
        
        echo json_encode(['success' => true, 'settings' => $settings]);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'save_smtp') {
        $smtp_host = clean($conn, $_POST['smtp_host'] ?? '');
        $smtp_port = clean($conn, $_POST['smtp_port'] ?? '');
        $smtp_user = clean($conn, $_POST['smtp_user'] ?? '');
        $smtp_pass = clean($conn, $_POST['smtp_pass'] ?? '');
        
        $settings = [
            'smtp_host' => $smtp_host,
            'smtp_port' => $smtp_port,
            'smtp_user' => $smtp_user,
            'smtp_pass' => $smtp_pass
        ];
        
        $success = true;
        foreach ($settings as $key => $value) {
            $sql = "INSERT INTO settings (setting_key, setting_value, updated_at) 
                    VALUES ('$key', '$value', NOW()) 
                    ON DUPLICATE KEY UPDATE setting_value='$value', updated_at=NOW()";
            if (!$conn->query($sql)) {
                $success = false;
            }
        }
        
        if ($success) {
            echo json_encode(['success' => true, 'message' => 'SMTP Settings saved successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to save settings.']);
        }
        exit;
    }
}

echo json_encode(['success' => false, 'message' => 'Invalid action.']);
exit;
