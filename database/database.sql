-- ============================================
-- FATA University Hostel Management System
-- Database Schema - Compatible with MySQL 5.7+
-- ============================================

CREATE DATABASE IF NOT EXISTS hostel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hostel_db;

-- Disable strict mode for this session to ensure compatibility
SET SQL_MODE = '';
SET GLOBAL SQL_MODE = '';

-- ============================================
-- ADMIN TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    profile_photo VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL
);

-- Default admin (password: admin123)
INSERT IGNORE INTO admin (username, full_name, email, password, created_at, updated_at) VALUES
('admin_hostel', 'Main Admin', 'asadokz18@gmail.com', '$2y$10$OhSuu.0gPNV7/TvlfgQd1uPmHnDXcmE6I9rSmPPRPfMLmLGO9jDdq', NOW(), NOW());

-- ============================================
-- STUDENT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS student (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    father_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    gender ENUM('Male','Female') NOT NULL,
    cnic VARCHAR(20) NOT NULL UNIQUE,
    dob DATE NOT NULL,
    department VARCHAR(100) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    registration_no VARCHAR(50) NOT NULL UNIQUE,
    home_address TEXT NOT NULL,
    profile_photo VARCHAR(255) DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expiry DATETIME DEFAULT NULL,
    joining_date DATE DEFAULT NULL,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL
);

-- ============================================
-- FACULTY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    father_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    gender ENUM('Male','Female') NOT NULL,
    cnic VARCHAR(20) NOT NULL UNIQUE,
    dob DATE NOT NULL,
    designation VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    qualification VARCHAR(100) NOT NULL,
    home_address TEXT NOT NULL,
    profile_photo VARCHAR(255) DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expiry DATETIME DEFAULT NULL,
    joining_date DATE DEFAULT NULL,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL
);

-- ============================================
-- ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_name ENUM('FAQIR IPI HOUSE','FATIMA HOUSE','KHYBER HOUSE') NOT NULL,
    room_no VARCHAR(20) NOT NULL,
    capacity INT NOT NULL DEFAULT 2,
    available_spaces INT NOT NULL DEFAULT 2,
    description TEXT DEFAULT NULL,
    room_image VARCHAR(255) DEFAULT NULL,
    status ENUM('Available','Full','Maintenance') DEFAULT 'Available',
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    UNIQUE KEY unique_room (hostel_name, room_no)
);

-- Sample rooms
INSERT IGNORE INTO rooms (hostel_name, room_no, capacity, available_spaces, description, created_at) VALUES
('FAQIR IPI HOUSE', '101', 2, 2, 'Student single room on ground floor. Study table and chair is also available', NOW()),
('FAQIR IPI HOUSE', '102', 2, 2, 'Spacious room with natural light and two study desks', NOW()),
('FAQIR IPI HOUSE', '103', 3, 3, 'Triple sharing room with attached washroom', NOW()),
('FAQIR IPI HOUSE', '104', 2, 2, 'Ground floor room with window view and study area', NOW()),
('FATIMA HOUSE', 'F101', 2, 2, 'Female hostel room with proper security and CCTV surveillance', NOW()),
('FATIMA HOUSE', 'F102', 2, 2, 'Comfortable room with wardrobe and study area', NOW()),
('FATIMA HOUSE', 'F103', 3, 3, 'Spacious triple room with attached bathroom', NOW()),
('KHYBER HOUSE', '12', 2, 2, 'Faculty room on ground floor with two beds', NOW()),
('KHYBER HOUSE', '13', 1, 1, 'Single occupancy faculty room with attached bathroom', NOW());

-- ============================================
-- APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_role ENUM('Student','Faculty') NOT NULL,
    room_id INT NOT NULL,
    application_type ENUM('Apply','Leave') NOT NULL DEFAULT 'Apply',
    booking_duration VARCHAR(100) DEFAULT NULL,
    status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    remarks TEXT DEFAULT NULL,
    applied_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL
);

-- ============================================
-- FEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_role ENUM('Student','Faculty') NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    fee_month VARCHAR(20) NOT NULL,
    fee_year YEAR NOT NULL,
    status ENUM('Paid','Unpaid','Partial','Pending Verification') DEFAULT 'Unpaid',
    payment_method VARCHAR(50) DEFAULT NULL,
    transaction_id VARCHAR(100) DEFAULT NULL,
    payment_proof VARCHAR(255) DEFAULT NULL,
    payment_date DATE DEFAULT NULL,
    receipt_no VARCHAR(50) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL
);

-- ============================================
-- COMPLAINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_role ENUM('Student','Faculty') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('Pending','In Progress','Resolved') DEFAULT 'Pending',
    admin_response TEXT DEFAULT NULL,
    submitted_at DATETIME DEFAULT NULL,
    resolved_at DATETIME DEFAULT NULL
);

-- ============================================
-- NOTICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('Urgent','Important','Normal') DEFAULT 'Normal',
    target_audience ENUM('All','Students','Faculty') DEFAULT 'All',
    expiry_date DATE DEFAULT NULL,
    created_by INT NOT NULL DEFAULT 1,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_at DATETIME DEFAULT NULL
);

-- Sample notices
INSERT IGNORE INTO notices (title, message, priority, target_audience, expiry_date, created_by, status, created_at) VALUES
('Water Supply Maintenance', 'Water supply will be suspended on Sunday 9:00 AM - 12:00 PM for maintenance. Please store water accordingly.', 'Urgent', 'All', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 1, 'Active', NOW()),
('Welcome to FATA University Hostel', 'Dear students and faculty, welcome to our hostel. Please read all hostel rules and regulations carefully. These guidelines ensure comfort and security for all residents.', 'Normal', 'All', NULL, 1, 'Active', NOW()),
('Fee Submission Reminder', 'All hostel fees must be submitted by the 15th of each month. Late submission will incur a fine of Rs. 200.', 'Important', 'All', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1, 'Active', NOW()),
('New Schedule Update', 'Revised meal timings: Breakfast 7:00AM-9:00AM, Lunch 1:00PM-2:30PM, Dinner 7:00PM-9:00PM. Please follow strictly.', 'Important', 'All', DATE_ADD(CURDATE(), INTERVAL 60 DAY), 1, 'Active', NOW());

-- ============================================
-- GALLERY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gallery (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uploaded_by_id INT NOT NULL,
    uploaded_by_role ENUM('Admin','Student','Faculty') NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    caption VARCHAR(255) DEFAULT NULL,
    status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
    uploaded_at DATETIME DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL
);

-- ============================================
-- PASSWORD RESET TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    user_role ENUM('Student','Faculty','Admin') NOT NULL,
    token VARCHAR(255) NOT NULL,
    expiry DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT NULL
);
