<?php
/**
 * TripPool - Robust Database Connection & API Utility Helper
 * Optimized for shared cPanel hosting (PHP 7.4 / 8.0 / 8.1 / 8.2 / 8.3)
 */

// 1. CORS & Response Headers
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Respond to preflight OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit(0);
}

// 2. Database Configuration
// Override these via environment variables or directly enter your cPanel MySQL credentials:
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'trippool_db';
$dbUser = getenv('DB_USER') ?: 'trippool_user';
$dbPass = getenv('DB_PASS') ?: 'SecretPass123!';
$dbPort = getenv('DB_PORT') ?: '3306';

/**
 * Returns a singleton PDO instance with strict error handling and utf8mb4 charset.
 */
function getDbConnection() {
    global $dbHost, $dbName, $dbUser, $dbPass, $dbPort;
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];

    try {
        $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
        return $pdo;
    } catch (PDOException $e) {
        sendError('Database connection failed: ' . $e->getMessage(), 500);
        exit;
    }
}

/**
 * Sends a successful JSON response and terminates.
 */
function sendJson($data, int $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => true,
        'data' => $data,
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Sends an error JSON response and terminates.
 */
function sendError(string $message, int $statusCode = 400, $details = null) {
    http_response_code($statusCode);
    $payload = [
        'success' => false,
        'error' => $message,
        'timestamp' => date('c')
    ];
    if ($details !== null) {
        $payload['details'] = $details;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Safely parses JSON request body or falls back to $_POST.
 */
function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST ?: [];
}
