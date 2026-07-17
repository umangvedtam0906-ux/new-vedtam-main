<?php
/**
 * save-subscriber.php
 * Handles POST request for new subscription saving (after OTP verification).
 */

ob_start();
header('Content-Type: application/json');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/SmtpClient.php';

$allowed_origins = [
    'https://vedtam.com',
    'https://vedtam.io',
    'http://vedtam.io',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: https://vedtam.com');
}
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

$name  = trim($input['name']  ?? '');
$phone = trim($input['phone'] ?? '');
$org   = trim($input['org']   ?? '');
$email = strtolower(trim($input['email'] ?? ''));
$recaptchaToken = trim($input['recaptcha'] ?? '');

if (empty($recaptchaToken)) {
    echo json_encode(['success' => false, 'message' => 'reCAPTCHA verification token is missing. Please complete the captcha challenge.']);
    exit;
}

function verify_recaptcha_enterprise(string $token, string $action): bool {
    // Standard siteverify API fallback
    $verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    $verifyData = [
        'secret'   => RECAPTCHA_SECRET_KEY,
        'response' => $token,
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $verifyUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($verifyData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $verifyResponse = curl_exec($ch);
    curl_close($ch);

    $verifyResult = json_decode($verifyResponse, true);
    if ($verifyResult && !empty($verifyResult['success'])) {
        if (isset($verifyResult['score']) && $verifyResult['score'] < 0.5) {
            return false;
        }
        return true;
    }
    return false;
}

if (!verify_recaptcha_enterprise($recaptchaToken, 'subscribe')) {
    echo json_encode(['success' => false, 'message' => 'reCAPTCHA security check failed. Please try again.']);
    exit;
}

if (strlen($name) < 2 || strlen($name) > 100) {
    echo json_encode(['success' => false, 'message' => 'Please enter your full name (2–100 characters).']);
    exit;
}
if (!preg_match('/^[a-zA-Z\s.\'-]+$/', $name)) {
    echo json_encode(['success' => false, 'message' => 'Name can only contain letters, spaces, and basic punctuation.']);
    exit;
}

$phoneDigits = preg_replace('/[^0-9]/', '', $phone);
if (substr($phoneDigits, 0, 2) === '91' && strlen($phoneDigits) === 12) {
    $phoneDigits = substr($phoneDigits, 2);
}
if (strlen($phoneDigits) !== 10) {
    echo json_encode(['success' => false, 'message' => 'Please enter a valid 10-digit Indian mobile number.']);
    exit;
}
if (!preg_match('/^[6-9][0-9]{9}$/', $phoneDigits)) {
    echo json_encode(['success' => false, 'message' => 'Mobile number must start with 6, 7, 8, or 9.']);
    exit;
}

if (strlen($org) < 2 || strlen($org) > 150) {
    echo json_encode(['success' => false, 'message' => 'Please enter your organisation name (2–150 characters).']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

$emailDomain = substr(strrchr($email, '@'), 1);
if (in_array($emailDomain, BLOCKED_DOMAINS, true)) {
    echo json_encode(['success' => false, 'message' => 'Please use your company email address. Personal email IDs are not accepted.']);
    exit;
}

try {
    $db = new PDO('sqlite:' . DB_FILE);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}

// Check if already subscribed
$stmt = $db->prepare("SELECT status FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$subscriber = $stmt->fetch(PDO::FETCH_ASSOC);

if ($subscriber && $subscriber['status'] === 'confirmed') {
    echo json_encode(['success' => false, 'message' => 'This email is already subscribed.']);
    exit;
}

// Check OTP verification
$stmt = $db->prepare("SELECT expires_at FROM otps WHERE email = ? AND otp_hash = 'VERIFIED'");
$stmt->execute([$email]);
$verifiedOtp = $stmt->fetch(PDO::FETCH_ASSOC);

$now = time();
if (!$verifiedOtp || $verifiedOtp['expires_at'] < $now) {
    echo json_encode(['success' => false, 'message' => 'Email verification is required. Please verify the OTP sent to your email first.']);
    exit;
}

$unsubscribeToken = bin2hex(random_bytes(32));

if ($subscriber) {
    $stmt = $db->prepare("UPDATE subscribers SET name=?, phone=?, organisation=?, status='confirmed', token=? WHERE email=?");
    $saved = $stmt->execute([$name, $phoneDigits, $org, $unsubscribeToken, $email]);
} else {
    $stmt = $db->prepare("INSERT INTO subscribers (name, phone, organisation, email, status, token) VALUES (?, ?, ?, ?, 'confirmed', ?)");
    $saved = $stmt->execute([$name, $phoneDigits, $org, $email, $unsubscribeToken]);
}

if ($saved) {
    // Remove verified OTP to prevent reuse
    $db->prepare("DELETE FROM otps WHERE email = ?")->execute([$email]);

    // Send welcome email using SmtpClient
    $safeName_ = htmlspecialchars($name, ENT_QUOTES);
    $year_     = date('Y');
    
    $welcomeBody = <<<HTML
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#3d3561,#2d2545);padding:28px 32px;text-align:center;">
<h1 style="margin:0;font-size:20px;font-weight:700;color:#f8fafc;">You're Subscribed!</h1></td></tr>
<tr><td style="padding:28px 32px 24px;">
<p style="color:#e2e8f0;font-size:15px;">Hi <strong>{$safeName_}</strong>,</p>
<p style="margin-top:12px;color:#94a3b8;font-size:14px;line-height:1.7;">You are now subscribed to <strong style="color:#f8fafc;">CERT-In Security Advisories</strong> from Vedtam Tech Solutions.</p>
</td></tr>
<tr><td style="padding:0 32px 28px;text-align:center;">
<a href="https://vedtam.com/cert-advisory" style="display:inline-block;background:linear-gradient(135deg,#fb923c,#f97316);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;">View Current Advisories →</a>
</td></tr>
<tr><td style="background:#0f172a;padding:18px 32px;text-align:center;">
<p style="color:#475569;font-size:12px;">
  © {$year_} Vedtam Tech Solutions · <a href="https://vedtam.com/privacy-policy" style="color:#fb923c;text-decoration:none;">Privacy Policy</a><br>
  <a href="https://vedtam.com/unsubscribe.php?token={$unsubscribeToken}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
</p>
</td></tr>
</table></td></tr></table></body></html>
HTML;

    $smtp = new SmtpClient();
    ob_end_clean();
    $smtp->sendHtmlEmail($email, 'Welcome to CERT-In Alerts — ' . SITE_NAME, $welcomeBody);

    echo json_encode(['success' => true, 'message' => 'Subscription confirmed successfully! Check your inbox for a welcome email.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Could not save your subscription. Please contact info@vedtam.com.']);
}
