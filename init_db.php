<?php
/**
 * init_db.php
 * One-time script to initialize the SQLite database schema.
 */

require_once __DIR__ . '/config.php';

try {
    $db = new PDO('sqlite:' . DB_FILE);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Create subscribers table
    $db->exec("CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        organisation TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL,
        token TEXT,
        subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Create otps table
    $db->exec("CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0
    )");

    // Create rate_limits table
    $db->exec("CREATE TABLE IF NOT EXISTS rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT,
        email TEXT,
        last_request_time INTEGER NOT NULL,
        request_count INTEGER DEFAULT 1
    )");
    
    // Add unique constraint for rate_limits
    $db->exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_ip_email ON rate_limits (ip_address, email)");

    echo "Database initialized successfully at " . DB_FILE . "\n";
} catch (PDOException $e) {
    echo "Database initialization failed: " . $e->getMessage() . "\n";
}
