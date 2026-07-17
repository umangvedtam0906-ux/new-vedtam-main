<?php
/**
 * unsubscribe.php
 * Handles unsubscription requests via a secure token.
 */
require_once __DIR__ . '/config.php';

$token = $_GET['token'] ?? '';
$msg = "Invalid or expired unsubscribe link.";
$status = "error";

if (!empty($token) && preg_match('/^[a-f0-9]{64}$/', $token)) {
    try {
        $db = new PDO('sqlite:' . DB_FILE);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $stmt = $db->prepare("SELECT id, email, status FROM subscribers WHERE token = ?");
        $stmt->execute([$token]);
        $subscriber = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($subscriber) {
            if ($subscriber['status'] === 'unsubscribed') {
                $status = "info";
                $msg = "You are already unsubscribed from our alerts.";
            } else {
                $update = $db->prepare("UPDATE subscribers SET status = 'unsubscribed' WHERE id = ?");
                $update->execute([$subscriber['id']]);
                $status = "success";
                $msg = "You have been successfully unsubscribed. You will no longer receive CERT-In alerts from us.";
            }
        }
    } catch (PDOException $e) {
        $msg = "A database error occurred. Please try again later.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe — Vedtam Tech Solutions</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#1e293b;border-radius:16px;padding:48px 40px;max-width:480px;width:100%;text-align:center}
    .icon{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 24px}
    h1{color:#f8fafc;font-size:1.6rem;margin-bottom:12px}
    p{color:#94a3b8;font-size:.95rem;line-height:1.7;margin-bottom:28px}
    .btn{display:inline-block;background:linear-gradient(135deg,#fb923c,#f97316);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:.95rem}
  </style>
</head>
<body>
  <div class="card">
    <?php if ($status === 'success'): ?>
        <div class="icon" style="background:#06d6a022;color:#06d6a0">&#10003;</div>
        <h1>Unsubscribed Successfully</h1>
    <?php elseif ($status === 'info'): ?>
        <div class="icon" style="background:#3b82f622;color:#3b82f6">&#10548;</div>
        <h1>Already Unsubscribed</h1>
    <?php else: ?>
        <div class="icon" style="background:#e6394622;color:#e63946">&#10007;</div>
        <h1>Error</h1>
    <?php endif; ?>
    
    <p><?= htmlspecialchars($msg) ?></p>
    
    <a href="<?= SITE_URL ?>" class="btn">Return to Homepage</a>
  </div>
</body>
</html>
