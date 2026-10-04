# FATA University Hostel Management System

A responsive Hostel Management System for FATA University. The system covers student and faculty registration, role-based login, room booking, hostel capacity tracking, fee records, online payment proof review, complaints, notices, gallery moderation, SMTP email notifications, and printable plus digital hostel ID cards.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | PHP with MySQLi |
| Database | MySQL 5.7+ / MariaDB 10.4+ |
| Email | PHPMailer with configurable SMTP |
| PDF/Print | Browser print layouts with print-specific CSS |
| QR Codes | QRCode.js CDN on ID card pages |
| Server | Apache/XAMPP with `.htaccess` rules |

## Project Structure

```text
hostel/
|-- index.html
|-- login.html
|-- register.html
|-- forgot-password.html
|-- pay-online.html
|-- .htaccess
|-- README.md
|-- project_architecture.txt
|
|-- admin/
|   `-- dashboard.html
|
|-- student/
|   |-- dashboard.html
|   |-- student_ecard.html
|   `-- student_id_card.html
|
|-- faculty/
|   |-- dashboard.html
|   |-- faculty_ecard.html
|   `-- faculty_id_card.html
|
|-- api/
|   |-- db.php
|   |-- auth.php
|   |-- public.php
|   |-- admin.php
|   |-- user.php
|   |-- middleware.php
|   |-- mailer.php
|   |-- settings.php
|   |-- config/
|   |   `-- headers.php
|   `-- PHPMailer/
|       `-- src/
|
|-- assets/
|   |-- css/
|   |-- js/
|   |-- images/
|   `-- uploads/
|       |-- admin/
|       |-- profile/
|       |-- rooms/
|       |-- gallery/
|       `-- payments/
|
`-- database/
    `-- database.sql
```

## File Descriptions

### Root Pages

| File | Description |
| --- | --- |
| `index.html` | Public landing page for the hostel portal. It presents hero/banner slides, live notice content, hostel block information, room statistics, gallery previews, and contact entry points. Logged-in users can be routed toward their role dashboards. |
| `login.html` | Unified login page for Admin, Student, and Faculty accounts. It accepts email/username and password, sends credentials to `api/auth.php`, and redirects successful users to the correct dashboard. |
| `register.html` | Registration page with separate student and faculty form sections. It collects identity details, academic/professional information, contact details, password, and profile photo upload. |
| `forgot-password.html` | Password recovery page for students and faculty. It requests an email OTP, verifies the OTP, and allows a new password to be saved. |
| `pay-online.html` | Standalone online payment guide showing supported payment channels such as EasyPaisa, JazzCash, and Pakistani bank transfer options. |
| `.htaccess` | Apache configuration for directory protection, blocked file types, session-related PHP flags, cache headers, and URL/server behavior. |
| `README.md` | Main setup and operations guide for installation, features, tables, credentials, and troubleshooting. |
| `project_architecture.txt` | Detailed architecture reference for folders, files, API actions, database tables, and system flows. |

### Dashboard Pages

| File | Description |
| --- | --- |
| `admin/dashboard.html` | Admin single-page dashboard shell. It provides sections for statistics, users, rooms, room applications, fees, complaints, notices, gallery moderation, SMTP settings, and admin profile management. |
| `student/dashboard.html` | Student dashboard shell. It supports profile viewing, room application, assigned room and roommate details, fee/payment proof management, complaints, notices, gallery uploads, account settings, and password updates. |
| `student/student_ecard.html` | Interactive digital student e-card with live student details, room assignment data, profile photo, and mobile-friendly card presentation. |
| `student/student_id_card.html` | Printable official student ID card page. It loads live ID-card data and renders front/back print layouts with QR code support. |
| `faculty/dashboard.html` | Faculty dashboard shell. It mirrors the resident workflow for faculty users while using faculty profile fields and faculty hostel assignment rules. |
| `faculty/faculty_ecard.html` | Interactive digital faculty e-card with live faculty details and room assignment data. |
| `faculty/faculty_id_card.html` | Printable official faculty ID card page with front/back print layout and QR code support. |

### API Files

| File | Description |
| --- | --- |
| `api/db.php` | Central MySQLi database connection file. It defines database constants, starts session-safe settings, sets UTF-8 encoding, provides the `clean()` helper, and includes room availability synchronization logic. |
| `api/auth.php` | Authentication controller. It handles `student_register`, `faculty_register`, `login`, `check_session`, `logout`, `forgot_password`, `reset_password`, and logged-in password changes. It also sends welcome, login, and reset OTP emails. |
| `api/public.php` | Public API controller for data that does not require login, including room lists, room statistics, active notices, approved gallery images, and contact submissions. |
| `api/admin.php` | Admin-only controller for dashboard statistics, recent users, room CRUD, application approval/rejection, fee creation and verification, reminders, fee reports, complaint resolution, notices, gallery moderation, and profile updates. |
| `api/user.php` | Student/faculty controller for profile data, profile updates, eligible room lists, room applications, leave requests, assigned room data, fee payment proof upload, fee history, complaints, notices, gallery upload/history, ID card data, stats, and receipts. |
| `api/middleware.php` | Shared helper layer for JSON responses and role/session guards such as admin-only and logged-in-user checks. |
| `api/mailer.php` | PHPMailer-based email dispatcher. It reads saved SMTP settings where available and sends HTML notifications for registration, login, room actions, fees, complaints, and password reset. |
| `api/settings.php` | Admin-only SMTP settings controller. It auto-creates the `settings` table when needed and supports loading/saving SMTP host, port, user, and password values. |
| `api/config/headers.php` | Shared API bootstrap for JSON headers, CORS headers, no-cache behavior, timezone, session startup, and database inclusion. |
| `api/PHPMailer/src/Exception.php` | PHPMailer exception class. |
| `api/PHPMailer/src/PHPMailer.php` | Main PHPMailer email composition and sending engine. |
| `api/PHPMailer/src/SMTP.php` | PHPMailer SMTP client implementation. |

### Stylesheets

| File | Description |
| --- | --- |
| `assets/css/style.css` | Global design tokens, typography, base layout rules, form styles, utility classes, and shared theme values. |
| `assets/css/index.css` | Landing page styling for hero sections, notices, statistics, gallery previews, contact sections, and responsive public layout. |
| `assets/css/login.css` | Login page layout, form styling, password visibility controls, and responsive authentication UI. |
| `assets/css/register.css` | Registration form layout, student/faculty tabs, upload controls, validation states, and responsive registration UI. |
| `assets/css/forgot_password.css` | Forgot-password and OTP reset page styling. |
| `assets/css/pay_online.css` | Payment guide layout, payment method cards, bank logo sections, and responsive payment instructions. |
| `assets/css/admin_dashboard.css` | Admin dashboard sidebar, topbar, stat cards, tables, modals, forms, badges, gallery controls, and responsive admin panels. |
| `assets/css/student_dashboard.css` | Student dashboard layout, room cards, fee tables, complaint forms, gallery views, profile/settings sections, and mobile navigation. |
| `assets/css/faculty_dashboard.css` | Faculty dashboard layout and faculty-specific dashboard presentation. |
| `assets/css/student_ecard.css` | Digital student e-card design, flip-card behavior, profile display, and mobile e-card responsiveness. |
| `assets/css/faculty_ecard.css` | Digital faculty e-card design and responsive card presentation. |
| `assets/css/student_id_card.css` | Printable student ID card front/back design, print sizing, QR placement, and official card styling. |
| `assets/css/faculty_id_card.css` | Printable faculty ID card front/back design, print sizing, QR placement, and official card styling. |

### JavaScript Controllers

| File | Description |
| --- | --- |
| `assets/js/index.js` | Controls public landing page behavior, loading public notices, room data, gallery previews, sliders, and contact form submission. |
| `assets/js/login.js` | Handles login form submission, validation, password visibility toggles, session response handling, and dashboard redirect. |
| `assets/js/register.js` | Handles student/faculty registration form validation, tab switching, profile photo upload previews, and API submission. |
| `assets/js/pay_online.js` | Provides payment page interactions and helper behaviors for online payment instructions. |
| `assets/js/admin_dashboard.js` | Main admin dashboard controller. It switches dashboard sections, loads statistics, users, rooms, applications, fees, complaints, notices, gallery entries, SMTP settings, and admin profile forms. |
| `assets/js/student_dashboard.js` | Student dashboard controller for profile, room application, assigned room details, roommates, fees, payment upload, complaints, notices, gallery, account settings, logout, and printable fee statements. |
| `assets/js/faculty_dashboard.js` | Faculty dashboard controller for the faculty version of room, fee, complaint, notice, gallery, profile, and settings workflows. |
| `assets/js/student_ecard.js` | Loads live student e-card data and controls e-card display interactions. |
| `assets/js/faculty_ecard.js` | Loads live faculty e-card data and controls faculty e-card display interactions. |
| `assets/js/student_id_card.js` | Loads student ID-card data, fills printable fields, generates QR code content, and supports printing. |
| `assets/js/faculty_id_card.js` | Loads faculty ID-card data, fills printable fields, generates QR code content, and supports printing. |

### Assets and Database

| Path | Description |
| --- | --- |
| `assets/images/logo.png` | FATA University logo used across the portal and cards. |
| `assets/images/hero-image*.jpg/jpeg` | Landing page hero/banner images. |
| `assets/images/FAQIR_IPI_HOUSE.jpg` | Male student hostel image reference. |
| `assets/images/FATIMA_HOUSE.jpg` | Female student/faculty hostel image reference. |
| `assets/images/KHYBER_HOUSE.jpg` | Male faculty hostel image reference. |
| `assets/images/banks/` | Bank logo assets for the payment page. |
| `assets/uploads/admin/` | Runtime admin profile photo uploads. |
| `assets/uploads/profile/` | Runtime student/faculty profile photo uploads. |
| `assets/uploads/rooms/` | Runtime room image uploads. |
| `assets/uploads/gallery/` | Runtime gallery image uploads. |
| `assets/uploads/payments/` | Runtime payment proof uploads. |
| `database/database.sql` | Complete database creation script with core tables, default admin account, sample rooms, and sample notices. |

## Installation

1. Copy the `hostel` folder into your web server document root.
   - XAMPP default path: `C:\xampp\htdocs\hostel`
2. Start Apache and MySQL from XAMPP.
3. Open phpMyAdmin at `http://localhost/phpmyadmin/`.
4. Import `database/database.sql`.
   - The SQL creates the `hostel_db` database and seeds the default admin account, rooms, and notices.
5. Check database credentials in `api/db.php`.

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'hostel_db');
```

6. Make sure `assets/uploads/` is writable by the web server.
7. Open the application at:

```text
http://localhost/hostel/
```

## Default Admin Login

| Field | Value |
| --- | --- |
| Username | `admin_hostel` |
| Email | `asadokz18@gmail.com` |
| Password | `admin123` |

Change the default password before using the system in production.

## Main Features

- Public landing page with hero slides, active notices, room stats, and approved gallery images.
- Student and faculty registration with profile photo upload.
- Role-based login for Admin, Student, and Faculty users.
- OTP-based password reset by email for students and faculty.
- Admin dashboard for users, rooms, applications, fees, complaints, notices, gallery items, SMTP settings, and profile updates.
- Student and faculty dashboards for room applications, leave requests, room details, roommates, fees, complaints, notices, gallery uploads, settings, and password updates.
- Gender and role-aware room visibility:
  - Male students: `FAQIR IPI HOUSE`
  - Female students: `FATIMA HOUSE`
  - Male faculty: `KHYBER HOUSE`
  - Female faculty: `FATIMA HOUSE`
- Online payment proof upload with admin verification.
- Automated emails for registration, login notifications, applications, assignments, fee reminders, payment verification, complaints, and password reset OTPs.
- Printable ID cards and interactive digital e-cards for students and faculty.

## Important API Files

| File | Purpose |
| --- | --- |
| `api/db.php` | Creates the MySQL connection and helper escaping function. |
| `api/auth.php` | Handles student/faculty registration, login, logout, session checks, OTP reset, and password updates. |
| `api/admin.php` | Handles admin-only dashboard actions. |
| `api/user.php` | Handles student/faculty dashboard actions. |
| `api/public.php` | Serves public rooms, notices, gallery, and contact actions. |
| `api/settings.php` | Loads and saves SMTP settings; auto-creates the `settings` table if missing. |
| `api/mailer.php` | Sends HTML email through PHPMailer and saved SMTP settings. |
| `api/middleware.php` | Provides session checks and shared JSON helpers. |
| `api/config/headers.php` | Sets API headers, timezone, session settings, and includes the database connection. |

## Database Tables

| Table | Purpose |
| --- | --- |
| `admin` | Admin account records. |
| `student` | Student profile and login records. |
| `faculty` | Faculty profile and login records. |
| `rooms` | Hostel rooms, capacities, availability, images, and status. |
| `applications` | Room apply/leave requests and approval status. |
| `fees` | Fee ledger records, payment proof, receipts, and verification status. |
| `complaints` | Complaint tickets, status, admin responses, and resolution dates. |
| `notices` | Notices with priority, target audience, expiry, and status. |
| `gallery` | Uploaded gallery images and moderation status. |
| `password_reset` | Password reset OTP tokens and expiry state. |
| `settings` | SMTP configuration key/value records, created automatically by `api/settings.php`. |

## SMTP Email Setup

SMTP settings can be configured from the admin dashboard:

1. Log in as admin.
2. Open the Admin Profile section.
3. Find the SMTP Configuration card.
4. Enter host, port, sender email, and SMTP/app password.
5. Save the settings.

For Gmail, use:

```text
Host: smtp.gmail.com
Port: 587
Password: Gmail App Password
```

The app password must be generated from a Google account with 2-Step Verification enabled.

## Upload Directories

The system stores runtime files under `assets/uploads/`:

| Folder | Content |
| --- | --- |
| `assets/uploads/admin/` | Admin profile photos. |
| `assets/uploads/profile/` | Student and faculty profile photos. |
| `assets/uploads/rooms/` | Room images uploaded by admin. |
| `assets/uploads/gallery/` | Gallery submissions and approved images. |
| `assets/uploads/payments/` | Online payment proof files. |

## Security Notes

- `.htaccess` disables directory listing.
- `.sql`, `.log`, `.env`, and similar sensitive files are blocked from direct browser access.
- Session cookies are configured as HTTP-only where Apache/PHP allows it.
- Protected dashboard APIs require an active session.
- Admin API actions require the `Admin` role.
- Passwords are stored using `password_hash()` and verified with `password_verify()`.
- Password reset uses a 6-digit OTP with a 15-minute expiry.

## Troubleshooting

**Blank dashboard or missing data**

Make sure Apache and MySQL are running, the database was imported, and `api/db.php` matches your MySQL credentials.

**Emails are not sending**

Check SMTP settings in the admin dashboard. For Gmail, use a 16-digit app password instead of the normal account password.

**Uploads fail**

Confirm that `assets/uploads/` exists and is writable. On Linux servers, permissions such as `775` are usually enough.

**ID card or e-card shows missing room data**

Room data appears only after an application has been approved by the admin.

**Direct access to API helper files is blocked**

This is expected for protected files and is part of the security configuration.

## Project Status

Documentation last synchronized with the local project structure and API files on 2026-05-20.
