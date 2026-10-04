<?php
// ============================================
// Hostel Email Sender Configuration
// ============================================

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Require the PHPMailer files we just downloaded
require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

function send_hostel_email($to, $subject, $message) {
    global $conn;
    
    // Ensure db.php is loaded and table exists
    if (!isset($conn)) { 
        require_once __DIR__ . '/db.php';
    }
    
    // Fetch SMTP settings from DB
    $smtp_host = 'smtp.gmail.com';
    $smtp_port = '587';
    $smtp_user = 'asadokz18@gmail.com';
    $smtp_pass = '';
    
    if (isset($conn)) {
        // Auto-create settings table if it doesn't exist
        $conn->query("CREATE TABLE IF NOT EXISTS settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_value TEXT DEFAULT NULL,
            updated_at DATETIME DEFAULT NULL
        )");
        
        $sql = "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass')";
        $result = $conn->query($sql);
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                if ($row['setting_key'] == 'smtp_host' && !empty($row['setting_value'])) $smtp_host = $row['setting_value'];
                if ($row['setting_key'] == 'smtp_port' && !empty($row['setting_value'])) $smtp_port = $row['setting_value'];
                if ($row['setting_key'] == 'smtp_user' && !empty($row['setting_value'])) $smtp_user = $row['setting_value'];
                if ($row['setting_key'] == 'smtp_pass' && !empty($row['setting_value'])) $smtp_pass = $row['setting_value'];
            }
        }
    }

    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->CharSet    = 'UTF-8';
        $mail->Host       = $smtp_host;
        $mail->SMTPAuth   = true;
        
        $mail->Username   = $smtp_user;
        $mail->Password   = $smtp_pass;
        
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; 
        $mail->Port       = $smtp_port;

        // Recipients
        $mail->setFrom($mail->Username, 'Hostel Admin');
        $mail->addAddress($to);                         // Add a recipient

        // Content
        $mail->isHTML(true);                           // Set email format to HTML
        $mail->Subject = $subject;
        $mail->Body    = $message;

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Hostel email failed for {$to}. Mailer Error: {$mail->ErrorInfo}");
        return false;
    }
}
