<?php
/**
 * config.php
 * Central configuration file for the CERT-In Subscription Flow.
 */

// Detect protocol and host dynamically for staging/production compatibility
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($host) {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' 
                 || ($_SERVER['SERVER_PORT'] ?? 80) == 443 
                 || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')) 
                 ? 'https' : 'http';
    define('SITE_URL', $protocol . '://' . $host);
} else {
    define('SITE_URL', 'https://vedtam.com');
}

define('SITE_NAME', 'Vedtam Tech Solutions');
define('FROM_EMAIL', 'certin-advisories@vedtam.io');
define('FROM_NAME', 'Vedtam CERT-In Alerts');

// Google reCAPTCHA v2 Secret Key
define('RECAPTCHA_SECRET_KEY', '6Lfw7B8tAAAAAAu80dzMmNglhD-5XsVRdwsRZFUK'); 

// SQLite Database path
define('DB_FILE', __DIR__ . '/subscribers.db');
define('OTP_EXPIRY', 600); // 10 minutes (600 seconds)

// Blocked Personal Domains (Unified list for frontend and backend)
const BLOCKED_DOMAINS = [
    'aol.com', 'rediffmail.com', 'protonmail.com', 'proton.me', 'tutanota.com', 'gmx.com', 'gmx.net',
    'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'throwam.com', 'yopmail.com',
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'mail.com'
];
