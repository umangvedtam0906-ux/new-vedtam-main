<?php
/**
 * SmtpClient.php
 * A lightweight, native PHP SMTP client that uses credentials from .env.
 */
class SmtpClient {
    private $host;
    private $port;
    private $user;
    private $pass;
    private $secure;

    public function __construct() {
        $this->loadEnv();
        $this->host = getenv('SMTP_HOST');
        $this->port = (int)getenv('SMTP_PORT') ?: 587;
        $this->user = getenv('SMTP_USER');
        $this->pass = getenv('SMTP_PASSWORD');
        $this->secure = strtolower(getenv('SMTP_SECURE')) ?: 'tls';
    }

    private function loadEnv() {
        $envPath = __DIR__ . '/.env';
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($name, $value) = explode('=', $line, 2);
                    $name = trim($name);
                    $value = trim($value);
                    if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                        putenv(sprintf('%s=%s', $name, $value));
                        $_ENV[$name] = $value;
                        $_SERVER[$name] = $value;
                    }
                }
            }
        }
    }

    public function sendHtmlEmail($toEmail, $subject, $htmlBody) {
        if (!$this->host || !$this->user) {
            error_log("SMTP credentials missing. Email not sent.");
            return false;
        }

        $fromEmail = getenv('FROM_EMAIL') ?: 'alerts@vedtam.com';
        $fromName = getenv('FROM_NAME') ?: 'Vedtam Alerts';

        $boundary = md5(uniqid(time()));
        
        $headers = "From: =?utf-8?B?" . base64_encode($fromName) . "?= <$fromEmail>\r\n";
        $headers .= "Reply-To: $fromEmail\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";

        $message = "--$boundary\r\n";
        $message .= "Content-Type: text/plain; charset=utf-8\r\n";
        $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $message .= chunk_split(base64_encode(strip_tags($htmlBody))) . "\r\n";
        
        $message .= "--$boundary\r\n";
        $message .= "Content-Type: text/html; charset=utf-8\r\n";
        $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $message .= chunk_split(base64_encode($htmlBody)) . "\r\n";
        $message .= "--$boundary--";

        try {
            $context = stream_context_create();
            $socket_host = ($this->secure === 'ssl') ? "ssl://{$this->host}" : $this->host;
            
            $socket = @stream_socket_client("$socket_host:{$this->port}", $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $context);
            if (!$socket) throw new Exception("Could not connect to SMTP host: $errno $errstr");

            $this->readResponse($socket);

            $this->sendCommand($socket, "EHLO " . (isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost'));
            
            if ($this->secure === 'tls') {
                $this->sendCommand($socket, "STARTTLS", "220");
                stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT);
                $this->sendCommand($socket, "EHLO " . (isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost'));
            }

            if ($this->user && $this->pass) {
                $this->sendCommand($socket, "AUTH LOGIN", "334");
                $this->sendCommand($socket, base64_encode($this->user), "334");
                $this->sendCommand($socket, base64_encode($this->pass), "235");
            }

            $this->sendCommand($socket, "MAIL FROM:<$fromEmail>");
            $this->sendCommand($socket, "RCPT TO:<$toEmail>");
            
            $this->sendCommand($socket, "DATA", "354");
            
            $data = "Subject: =?utf-8?B?" . base64_encode($subject) . "?=\r\n";
            $data .= "To: $toEmail\r\n";
            $data .= $headers . "\r\n";
            $data .= $message . "\r\n.";
            
            $this->sendCommand($socket, $data, "250");
            $this->sendCommand($socket, "QUIT", "221");
            
            fclose($socket);
            return true;
        } catch (Exception $e) {
            error_log("SMTP Error: " . $e->getMessage());
            return false;
        }
    }

    private function sendCommand($socket, $command, $expectedCode = "250") {
        fwrite($socket, $command . "\r\n");
        $response = $this->readResponse($socket);
        if (!preg_match("/^($expectedCode)/", $response)) {
            throw new Exception("SMTP Command '$command' failed. Expected $expectedCode, got: $response");
        }
        return $response;
    }

    private function readResponse($socket) {
        $data = "";
        while ($str = fgets($socket, 515)) {
            $data .= $str;
            if (substr($str, 3, 1) == " ") break;
        }
        return $data;
    }
}
