<?php
/**
 * otp-handler.php
 * Handles OTP Generation, Email sending, and Verification via SQLite and SMTP.
 */

ob_start();
header('Content-Type: application/json');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/SmtpClient.php';

// CORS setup
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

$action = trim($input['action'] ?? '');
$email  = strtolower(trim($input['email'] ?? ''));
$name   = trim($input['name'] ?? 'Subscriber');
$ip     = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

// Restriction check for personal domains using config.php
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

$now = time();

// Delete expired OTPs globally to keep DB clean
$db->exec("DELETE FROM otps WHERE expires_at < $now");

if ($action === 'send') {
    // 1. Rate Limiting Check (Max 3 requests per 15 minutes per IP/Email combo)
    $stmt = $db->prepare("SELECT request_count, last_request_time FROM rate_limits WHERE ip_address = ? AND email = ?");
    $stmt->execute([$ip, $email]);
    $rateLimit = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($rateLimit) {
        if ($now - $rateLimit['last_request_time'] < 900) { // Within 15 minutes
            if ($rateLimit['request_count'] >= 3) {
                echo json_encode(['success' => false, 'message' => 'Too many OTP requests. Please wait 15 minutes.']);
                exit;
            }
            $updateStmt = $db->prepare("UPDATE rate_limits SET request_count = request_count + 1, last_request_time = ? WHERE ip_address = ? AND email = ?");
            $updateStmt->execute([$now, $ip, $email]);
        } else {
            // Reset counter after 15 mins
            $updateStmt = $db->prepare("UPDATE rate_limits SET request_count = 1, last_request_time = ? WHERE ip_address = ? AND email = ?");
            $updateStmt->execute([$now, $ip, $email]);
        }
    } else {
        $insertStmt = $db->prepare("INSERT INTO rate_limits (ip_address, email, last_request_time, request_count) VALUES (?, ?, ?, 1)");
        $insertStmt->execute([$ip, $email, $now]);
    }

    // 2. Generate and Store OTP
    $otpCode = sprintf('%06d', random_int(100000, 999999));
    $otpHash = password_hash($otpCode, PASSWORD_BCRYPT);
    $expiresAt = $now + OTP_EXPIRY;

    $stmt = $db->prepare("INSERT INTO otps (email, otp_hash, expires_at, attempts) VALUES (?, ?, ?, 0) 
                          ON CONFLICT(email) DO UPDATE SET otp_hash=excluded.otp_hash, expires_at=excluded.expires_at, attempts=0");
    $stmt->execute([$email, $otpHash, $expiresAt]);
    
    // 3. Send email using SmtpClient
    $subject  = 'Your Verification Code — Vedtam Tech Solutions';
    $year     = date('Y');
    $safeName = htmlspecialchars($name, ENT_QUOTES);
    
    $body = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#3d3561,#2d2545);padding:28px 32px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;">Vedtam Tech Solutions</p>
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#f8fafc;">Verify Your Email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0;color:#e2e8f0;font-size:15px;">Hi <strong>{$safeName}</strong>,</p>
              <p style="margin:14px 0 0 0;color:#94a3b8;font-size:14px;line-height:1.7;">
                You are setting up email verification on Vedtam. Use the One-Time Password (OTP) below to verify your email address.
              </p>
              <p style="margin:12px 0 0 0;color:#94a3b8;font-size:14px;line-height:1.7;">
                This code is valid for <strong style="color:#f8fafc;">10 minutes</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <div style="display:inline-block;background:#0f172a;border:1px solid rgba(0, 163, 217, 0.3);letter-spacing:6px;padding:16px 36px;border-radius:12px;font-weight:800;font-size:32px;color:#00a3d9;font-family:monospace;">
                {$otpCode}
              </div>
              <p style="margin:16px 0 0 0;color:#475569;font-size:11px;">
                For security, please do not share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0f172a;padding:18px 32px;text-align:center;border-top:1px solid #1e293b;">
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
                If you did not request this, please ignore this email.<br>
                &copy; {$year} Vedtam Tech Solutions &middot;
                <a href="https://vedtam.com/privacy-policy" style="color:#fb923c;text-decoration:none;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;

    $smtp = new SmtpClient();
    ob_end_clean();
    if ($smtp->sendHtmlEmail($email, $subject, $body)) {
        echo json_encode(['success' => true, 'message' => 'A verification code has been sent to ' . $email]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Could not send verification email. Please try again.']);
    }
    exit;
}

if ($action === 'verify') {
    $userOtp = trim($input['otp'] ?? '');
    
    if (empty($userOtp) || strlen($userOtp) !== 6) {
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Please enter a valid 6-digit OTP code.']);
        exit;
    }
    
    $stmt = $db->prepare("SELECT otp_hash, attempts FROM otps WHERE email = ?");
    $stmt->execute([$email]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'OTP expired or not found. Please request a new code.']);
        exit;
    }
    
    // Check limit attempts
    if ($record['attempts'] >= 3) {
        $db->prepare("DELETE FROM otps WHERE email = ?")->execute([$email]);
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Too many failed verification attempts. Please request a new code.']);
        exit;
    }
    
    // Verify OTP hash
    if (password_verify($userOtp, $record['otp_hash'])) {
        // Mark as verified (we just use a special hash or update expires_at)
        // By changing the hash to "VERIFIED", we know it's verified when saving later, 
        // and we give them 5 mins to submit the final form.
        $db->prepare("UPDATE otps SET otp_hash = 'VERIFIED', expires_at = ? WHERE email = ?")
           ->execute([$now + 300, $email]);
        
        ob_end_clean();
        echo json_encode(['success' => true, 'message' => 'Email verified successfully.']);
    } else {
        $db->prepare("UPDATE otps SET attempts = attempts + 1 WHERE email = ?")
           ->execute([$email]);
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Invalid verification code. Please try again.']);
    }
    exit;
}

ob_end_clean();
echo json_encode(['success' => false, 'message' => 'Invalid action.']);
exit;
