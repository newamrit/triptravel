<?php
/**
 * TripPool Nepal - Database Connection & Self-Healing Schema Manager (cPanel / Apache / PHP)
 * Compatible with PHP 7.4, 8.0, 8.1, 8.2, 8.3+ and MySQL / MariaDB on Shared cPanel Hosting
 */

if (!defined('TRIPPOOL_DEBUG_HTML')) {
    // Prevent shared hosting PHP warnings/notices from corrupting JSON responses
    error_reporting(0);
    @ini_set('display_errors', '0');
    header("Content-Type: application/json; charset=UTF-8");
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================================================
// 1. CPANEL MYSQL DATABASE CREDENTIALS
// Edit these 4 lines with your cPanel MySQL Database Wizard details,
// OR configure them directly in your browser at yourdomain.com/debug.php
// ============================================================================
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'trippool';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';
$db_port = getenv('DB_PORT') ?: '3306';

// Automatically load credentials from .env file if saved via debug.php or uploaded to root/api
$envPaths = [__DIR__ . '/../.env', __DIR__ . '/.env'];
foreach ($envPaths as $envFile) {
    if (file_exists($envFile) && is_readable($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
                list($k, $v) = explode('=', $line, 2);
                $k = trim($k);
                $v = trim(trim($v), "\"'");
                if ($k === 'DB_HOST' && $v !== '') $db_host = $v;
                if ($k === 'DB_NAME' && $v !== '') $db_name = $v;
                if ($k === 'DB_USER' && $v !== '') $db_user = $v;
                if ($k === 'DB_PASS') $db_pass = $v;
                if ($k === 'DB_PORT' && $v !== '') $db_port = $v;
            }
        }
        break;
    }
}

$pdo = null;
$db_connection_error = null;

try {
    $dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4";
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    // Auto-ensure all 7 required tables, columns, and initial dummy data exist
    ensureTripPoolSchema($pdo, false);

} catch (PDOException $e) {
    $db_connection_error = $e->getMessage();
    if (!defined('TRIPPOOL_DEBUG_HTML') && !defined('TRIPPOOL_DEBUG_JSON')) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Database Connection Failed: " . $e->getMessage(),
            "message" => "Please update your cPanel database credentials in api/db.php or via /debug.php."
        ]);
        exit();
    }
}

/**
 * Helper to send JSON response and exit cleanly
 */
function sendJson($payload, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit();
}

/**
 * Safely converts any ISO-8601 (e.g. '2026-10-17T16:30:00.000Z') or HTML datetime-local string
 * into MySQL strict-mode compatible 'YYYY-MM-DD HH:MM:SS' format.
 */
function formatMysqlDateTime($dateStr): string {
    if (empty($dateStr) || !is_string($dateStr)) {
        return date('Y-m-d H:i:s');
    }
    $ts = strtotime($dateStr);
    if ($ts !== false && $ts > 0) {
        return date('Y-m-d H:i:s', $ts);
    }
    $clean = preg_replace('/\.[0-9]+Z?$/i', '', str_replace('T', ' ', trim($dateStr)));
    $clean = rtrim($clean, 'Zz ');
    if (strlen($clean) === 16) {
        $clean .= ':00';
    }
    return substr($clean, 0, 19) ?: date('Y-m-d H:i:s');
}

/**
 * Ensures all 7 required tables and columns exist and seeds Upper Mustang Overland 2026 dummy data
 * when the database is empty (or when $forceReseed is true).
 */
function ensureTripPoolSchema(PDO $pdo, bool $forceReseed = false): void {
    try {
        // 1. Users table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
            `id` varchar(64) NOT NULL,
            `email` varchar(191) NOT NULL,
            `name` varchar(191) NOT NULL,
            `role` enum('leader','member') NOT NULL DEFAULT 'member',
            `member_id` int(11) DEFAULT NULL,
            `password_hash` varchar(255) NOT NULL,
            `password_salt` varchar(255) NOT NULL,
            `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `idx_users_email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 2. Trips table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `trips` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `title` varchar(191) NOT NULL,
            `destination` varchar(255) NOT NULL DEFAULT '',
            `currency` varchar(16) NOT NULL DEFAULT 'Rs.',
            `start_date` date DEFAULT NULL,
            `end_date` date DEFAULT NULL,
            `status` enum('active','completed','archived') NOT NULL DEFAULT 'active',
            `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 3. Members table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `members` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `trip_id` int(11) NOT NULL DEFAULT 1,
            `name` varchar(191) NOT NULL,
            `phone` varchar(64) DEFAULT NULL,
            `notes` text DEFAULT NULL,
            `is_leader` tinyint(1) NOT NULL DEFAULT 0,
            `is_active` tinyint(1) NOT NULL DEFAULT 1,
            `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_members_trip` (`trip_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 4. Deposits table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `deposits` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `trip_id` int(11) NOT NULL DEFAULT 1,
            `member_id` int(11) NOT NULL,
            `member_name` varchar(191) NOT NULL DEFAULT 'Member',
            `amount` decimal(12,2) NOT NULL,
            `payment_method` varchar(64) NOT NULL DEFAULT 'Cash',
            `notes` text DEFAULT NULL,
            `deposited_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_deposits_trip` (`trip_id`),
            KEY `idx_deposits_member` (`member_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 5. Expenses table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `expenses` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `trip_id` int(11) NOT NULL DEFAULT 1,
            `payer_type` enum('pool','member') NOT NULL DEFAULT 'pool',
            `payer_member_id` int(11) DEFAULT NULL,
            `payer_member_name` varchar(191) DEFAULT 'Trip Pool',
            `amount` decimal(12,2) NOT NULL,
            `category` varchar(128) NOT NULL DEFAULT 'Food & Snacks',
            `description` text NOT NULL,
            `split_type` varchar(32) NOT NULL DEFAULT 'equal',
            `receipt_image` longtext DEFAULT NULL,
            `expense_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_expenses_trip` (`trip_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 6. Expense Splits table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `expense_splits` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `expense_id` int(11) NOT NULL,
            `member_id` int(11) NOT NULL,
            `member_name` varchar(191) NOT NULL DEFAULT 'Member',
            `split_amount` decimal(12,2) NOT NULL,
            PRIMARY KEY (`id`),
            KEY `idx_splits_expense` (`expense_id`),
            KEY `idx_splits_member` (`member_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 7. Sync Queue table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `sync_queue` (
            `id` varchar(64) NOT NULL,
            `type` varchar(64) NOT NULL,
            `action` varchar(32) NOT NULL,
            `payload` longtext NOT NULL,
            `status` enum('pending','synced','failed') NOT NULL DEFAULT 'pending',
            `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // Ensure columns exist if upgrading from an older schema
        $columnsToEnsure = [
            "ALTER TABLE `deposits` ADD COLUMN `member_name` varchar(191) NOT NULL DEFAULT 'Member' AFTER `member_id`",
            "ALTER TABLE `expenses` ADD COLUMN `payer_member_name` varchar(191) DEFAULT 'Trip Pool' AFTER `payer_member_id`",
            "ALTER TABLE `expenses` ADD COLUMN `receipt_image` longtext DEFAULT NULL AFTER `split_type`",
            "ALTER TABLE `expenses` MODIFY COLUMN `receipt_image` longtext DEFAULT NULL",
            "ALTER TABLE `expenses` MODIFY COLUMN `category` varchar(128) NOT NULL DEFAULT 'Food & Snacks'",
            "ALTER TABLE `expense_splits` ADD COLUMN `member_name` varchar(191) NOT NULL DEFAULT 'Member' AFTER `member_id`"
        ];
        foreach ($columnsToEnsure as $alterSql) {
            try {
                $pdo->exec($alterSql);
            } catch (Exception $ignore) {
                // Column already exists
            }
        }

        if ($forceReseed) {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
            $pdo->exec("TRUNCATE TABLE `expense_splits`");
            $pdo->exec("TRUNCATE TABLE `expenses`");
            $pdo->exec("TRUNCATE TABLE `deposits`");
            $pdo->exec("TRUNCATE TABLE `members`");
            $pdo->exec("TRUNCATE TABLE `trips`");
            $pdo->exec("TRUNCATE TABLE `users`");
            $pdo->exec("TRUNCATE TABLE `sync_queue`");
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        }

        // Seed dummy data when trips table is empty
        $tripCount = (int)$pdo->query("SELECT COUNT(*) FROM `trips`")->fetchColumn();
        if ($tripCount === 0) {
            $pdo->exec("INSERT INTO `trips` (`id`, `title`, `destination`, `currency`, `start_date`, `end_date`, `status`, `created_at`) VALUES
                (1, 'Upper Mustang Overland 2026', 'Pokhara • Marpha • Kagbeni • Lo Manthang', 'Rs.', '2026-10-15', '2026-10-24', 'active', '2026-10-15 07:00:00')");

            $memberCount = (int)$pdo->query("SELECT COUNT(*) FROM `members`")->fetchColumn();
            if ($memberCount === 0) {
                $pdo->exec("INSERT INTO `members` (`id`, `trip_id`, `name`, `phone`, `notes`, `is_leader`, `is_active`, `created_at`) VALUES
                    (1, 1, 'Amrit Timilsina', '+977-9851148290', 'Trip Leader & Float Pool Custodian', 1, 1, '2026-10-15 07:00:00'),
                    (2, 1, 'Bikash Thapa', '+977-9841623104', 'Lead 4WD Hilux Driver & Route Planner', 0, 1, '2026-10-15 07:05:00'),
                    (3, 1, 'Saurav Joshi', '+977-9801934512', 'Aerial Drone & Travel Photographer', 0, 1, '2026-10-15 07:10:00'),
                    (4, 1, 'Ayush Shrestha', '+977-9860412890', 'Logistics, Permits & Homestay Coordinator', 0, 1, '2026-10-15 07:15:00'),
                    (5, 1, 'Prashant Karki', '+977-9849087321', 'Co-Driver & Mechanical Backup', 0, 1, '2026-10-15 07:20:00')");
            }

            $depositCount = (int)$pdo->query("SELECT COUNT(*) FROM `deposits`")->fetchColumn();
            if ($depositCount === 0) {
                $pdo->exec("INSERT INTO `deposits` (`id`, `trip_id`, `member_id`, `member_name`, `amount`, `payment_method`, `notes`, `deposited_at`) VALUES
                    (1, 1, 1, 'Amrit Timilsina', 10000.00, 'Cash', 'Initial leader float cash contribution in Kathmandu', '2026-10-15 07:30:00'),
                    (2, 1, 2, 'Bikash Thapa', 10000.00, 'Fonepay', 'Fonepay QR transfer to Trip Pool account', '2026-10-15 08:00:00'),
                    (3, 1, 3, 'Saurav Joshi', 10000.00, 'Bank Transfer', 'Nabil Bank eBanking advance deposit', '2026-10-15 08:20:00'),
                    (4, 1, 4, 'Ayush Shrestha', 10000.00, 'Fonepay', 'Advance pool deposit via Fonepay QR', '2026-10-15 08:45:00'),
                    (5, 1, 5, 'Prashant Karki', 10000.00, 'Cash', 'Cash handed to Amrit at Pokhara Lakeside checkpoint', '2026-10-15 18:15:00')");
            }

            $expenseCount = (int)$pdo->query("SELECT COUNT(*) FROM `expenses`")->fetchColumn();
            if ($expenseCount === 0) {
                $pdo->exec("INSERT INTO `expenses` (`id`, `trip_id`, `payer_type`, `payer_member_id`, `payer_member_name`, `amount`, `category`, `description`, `split_type`, `receipt_image`, `expense_date`) VALUES
                    (1, 1, 'pool', NULL, 'Trip Pool', 8500.00, 'Fuel', 'Full tank diesel for 4WD Hilux at Pokhara Highway Fuel Station', 'equal', NULL, '2026-10-15 19:00:00'),
                    (2, 1, 'pool', NULL, 'Trip Pool', 5000.00, 'Entry Permits/Tickets', 'ACAP entry permits & Beni-Jomsom corridor checkpost fees (5 pax)', 'equal', NULL, '2026-10-16 09:30:00'),
                    (3, 1, 'pool', NULL, 'Trip Pool', 3250.00, 'Food & Snacks', 'Thakali Mutton Thali lunch & seabuckthorn juice at Lete Kalopani', 'equal', NULL, '2026-10-16 13:45:00'),
                    (4, 1, 'pool', NULL, 'Trip Pool', 7500.00, 'Hotel/Stay', 'Marpha Orchard Courtyard Lodge - 2 family rooms, campfire & dinner', 'equal', NULL, '2026-10-16 20:30:00'),
                    (5, 1, 'member', 2, 'Bikash Thapa', 2500.00, 'Vehicle Maintenance/Spares', 'Heavy-duty air filter cleaning, brake fluid & tire pressure service at Jomsom (paid by Bikash)', 'equal', NULL, '2026-10-17 10:15:00'),
                    (6, 1, 'member', 3, 'Saurav Joshi', 1750.00, 'Food & Snacks', 'Yak cheese platters, apple pie & masala tea at Kagbeni View Point (paid by Saurav)', 'equal', NULL, '2026-10-17 15:20:00')");

                $pdo->exec("INSERT INTO `expense_splits` (`expense_id`, `member_id`, `member_name`, `split_amount`) VALUES
                    (1, 1, 'Amrit Timilsina', 1700.00), (1, 2, 'Bikash Thapa', 1700.00), (1, 3, 'Saurav Joshi', 1700.00), (1, 4, 'Ayush Shrestha', 1700.00), (1, 5, 'Prashant Karki', 1700.00),
                    (2, 1, 'Amrit Timilsina', 1000.00), (2, 2, 'Bikash Thapa', 1000.00), (2, 3, 'Saurav Joshi', 1000.00), (2, 4, 'Ayush Shrestha', 1000.00), (2, 5, 'Prashant Karki', 1000.00),
                    (3, 1, 'Amrit Timilsina', 650.00), (3, 2, 'Bikash Thapa', 650.00), (3, 3, 'Saurav Joshi', 650.00), (3, 4, 'Ayush Shrestha', 650.00), (3, 5, 'Prashant Karki', 650.00),
                    (4, 1, 'Amrit Timilsina', 1500.00), (4, 2, 'Bikash Thapa', 1500.00), (4, 3, 'Saurav Joshi', 1500.00), (4, 4, 'Ayush Shrestha', 1500.00), (4, 5, 'Prashant Karki', 1500.00),
                    (5, 1, 'Amrit Timilsina', 500.00), (5, 2, 'Bikash Thapa', 500.00), (5, 3, 'Saurav Joshi', 500.00), (5, 4, 'Ayush Shrestha', 500.00), (5, 5, 'Prashant Karki', 500.00),
                    (6, 1, 'Amrit Timilsina', 350.00), (6, 2, 'Bikash Thapa', 350.00), (6, 3, 'Saurav Joshi', 350.00), (6, 4, 'Ayush Shrestha', 350.00), (6, 5, 'Prashant Karki', 350.00)");
            }
        }

        // Seed default login users if users table is empty
        $userCount = (int)$pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
        if ($userCount === 0) {
            $seedSalt = 'a1b2c3d4e5f67890a1b2c3d4e5f67890';
            $seedHash = hash_pbkdf2('sha256', 'Trip@2026', $seedSalt, 100000, 64);
            $uStmt = $pdo->prepare("INSERT INTO `users` (`id`, `email`, `name`, `role`, `member_id`, `password_hash`, `password_salt`, `created_at`) VALUES
                ('user_amrit', 'amrit.timilsinaa@gmail.com', 'Amrit Timilsina', 'leader', 1, :h1, :s1, NOW()),
                ('user_leader_1', 'leader@trippool.app', 'Amrit Timilsina', 'leader', 1, :h2, :s2, NOW()),
                ('user_member_2', 'bikash@trippool.app', 'Bikash Thapa', 'member', 2, :h3, :s3, NOW()),
                ('user_member_3', 'saurav@trippool.app', 'Saurav Joshi', 'member', 3, :h4, :s4, NOW()),
                ('user_member_4', 'ayush@trippool.app', 'Ayush Shrestha', 'member', 4, :h5, :s5, NOW()),
                ('user_member_5', 'prashant@trippool.app', 'Prashant Karki', 'member', 5, :h6, :s6, NOW())");
            $uStmt->execute([
                ':h1' => $seedHash, ':s1' => $seedSalt,
                ':h2' => $seedHash, ':s2' => $seedSalt,
                ':h3' => $seedHash, ':s3' => $seedSalt,
                ':h4' => $seedHash, ':s4' => $seedSalt,
                ':h5' => $seedHash, ':s5' => $seedSalt,
                ':h6' => $seedHash, ':s6' => $seedSalt
            ]);
        }
    } catch (Exception $schemaErr) {
        // Non-fatal schema upgrade notice
    }
}

/**
 * Helper to parse JSON request body or fallback to $_POST
 */
function getRequestData(): array {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return !empty($_POST) ? $_POST : [];
}
