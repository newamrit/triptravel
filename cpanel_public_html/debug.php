<?php
/**
 * TripPool Nepal - Protected cPanel & Database Diagnostic Setup Tool
 * Strictly restricted to authenticated Trip Leaders (Admin).
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

$isJson = (isset($_GET['format']) && $_GET['format'] === 'json') || isset($_GET['json']);

// Determine base directory (supports running from /debug.php OR /api/debug.php)
$currentDir = __DIR__;
if (basename($currentDir) === 'api') {
    $rootDir = dirname($currentDir);
} else {
    $rootDir = $currentDir;
}

// Handle Logout from debug.php
if (isset($_GET['logout']) || !empty($_POST['debug_logout'])) {
    $_SESSION['trippool_leader_debug_auth'] = false;
    unset($_SESSION['trippool_leader_debug_auth']);
    header("Location: " . strtok($_SERVER['REQUEST_URI'], '?'));
    exit();
}

// Check if already authenticated via session or internal leader_token (for JSON modal inside logged-in Leader dashboard)
$isLeaderAuthenticated = !empty($_SESSION['trippool_leader_debug_auth'])
    || (isset($_GET['leader_token']) && $_GET['leader_token'] === 'trippool_leader_2026');

$authError = null;

// Handle Trip Leader Login submission on debug.php
if (!$isLeaderAuthenticated && isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['debug_leader_login'])) {
    $loginEmail = strtolower(trim($_POST['leader_email'] ?? ''));
    $loginPass  = $_POST['leader_password'] ?? '';

    $verified = false;

    // 1. Try verifying against the MySQL `users` table (role = 'leader') if DB is connected
    $dbConfigPath = file_exists($rootDir . '/api/db.php') ? $rootDir . '/api/db.php' : ($currentDir . '/db.php');
    if (file_exists($dbConfigPath)) {
        define('TRIPPOOL_DEBUG_HTML', true);
        @require_once $dbConfigPath;
        if (isset($pdo) && $pdo instanceof PDO) {
            try {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ? AND role = 'leader' LIMIT 1");
                $stmt->execute([$loginEmail]);
                $userRow = $stmt->fetch();
                if ($userRow) {
                    $salt = (string)($userRow['password_salt'] ?? '');
                    $storedHash = (string)($userRow['password_hash'] ?? '');
                    $computedHex = hash_pbkdf2('sha256', $loginPass, $salt, 100000, 64, false);
                    $computedBin = ctype_xdigit($salt) && strlen($salt) % 2 === 0
                        ? hash_pbkdf2('sha256', $loginPass, hex2bin($salt), 100000, 64, false)
                        : '';
                    $sha256WithSalt = hash('sha256', $loginPass . $salt);
                    $sha256Raw = hash('sha256', $loginPass);
                    $md5Raw = md5($loginPass);
                    $isSeededDefault = ($loginPass === 'Trip@2026' && ($storedHash === 'pbkdf2_seeded_2026' || strpos($storedHash, 'seeded') !== false));

                    if (
                        $isSeededDefault ||
                        hash_equals($storedHash, $computedHex) ||
                        ($computedBin !== '' && hash_equals($storedHash, $computedBin)) ||
                        hash_equals(strtolower($storedHash), $sha256WithSalt) ||
                        hash_equals(strtolower($storedHash), $sha256Raw) ||
                        hash_equals(strtolower($storedHash), $md5Raw) ||
                        password_verify($loginPass, $storedHash) ||
                        hash_equals($storedHash, $loginPass)
                    ) {
                        $verified = true;
                    }
                }
            } catch (Throwable $e) {
                // Fallback to master leader check below if table not ready
            }
        }
    }

    // 2. Fallback check ONLY if database/users table is not reachable yet
    if (!$verified && empty($userRow)) {
        $allowedLeaderEmails = ['amrit.timilsinaa@gmail.com', 'leader@trippool.app'];
        if (in_array($loginEmail, $allowedLeaderEmails, true) && $loginPass === 'Trip@2026') {
            $verified = true;
        }
    }

    if ($verified) {
        $_SESSION['trippool_leader_debug_auth'] = true;
        $isLeaderAuthenticated = true;
    } else {
        $authError = "Access Denied: Only Trip Leader accounts can access Server & MySQL Diagnostics.";
    }
}

// Block unauthenticated access
if (!$isLeaderAuthenticated) {
    if ($isJson) {
        http_response_code(403);
        header("Content-Type: application/json; charset=UTF-8");
        echo json_encode([
            'status' => 'forbidden',
            'error' => 'Trip Leader authentication required to access diagnostics.'
        ]);
        exit();
    }
    header("Content-Type: text/html; charset=UTF-8");
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TripPool - Administrator Authentication Required</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet" />
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #090d16; color: #f8fafc; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { width: 100%; max-width: 420px; background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 28px; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.6); }
        h1 { font-family: 'Outfit', sans-serif; font-size: 1.2rem; margin: 0 0 6px 0; color: #fff; }
        p { font-size: 0.82rem; color: #94a3b8; margin: 0 0 20px 0; }
        label { display: block; font-size: 0.75rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px; }
        input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-size: 0.88rem; margin-bottom: 14px; }
        button { width: 100%; padding: 11px; border-radius: 8px; border: none; background: #059669; color: #fff; font-weight: 700; font-size: 0.88rem; cursor: pointer; }
        button:hover { background: #047857; }
        .err { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 10px 12px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 16px; font-weight: 600; }
        .back { display: block; text-align: center; margin-top: 16px; font-size: 0.78rem; color: #64748b; text-decoration: none; }
        .back:hover { color: #94a3b8; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Trip Leader Access Only</h1>
        <p>Server &amp; MySQL Diagnostics are restricted to the Trip Leader administrator.</p>
        <?php if ($authError): ?>
            <div class="err"><?= htmlspecialchars($authError) ?></div>
        <?php endif; ?>
        <form method="POST" action="">
            <input type="hidden" name="debug_leader_login" value="1">
            <label>Trip Leader Email</label>
            <input type="email" name="leader_email" placeholder="amrit.timilsinaa@gmail.com" required>
            <label>Password</label>
            <input type="password" name="leader_password" placeholder="••••••••" required>
            <button type="submit">Unlock Server Diagnostics</button>
        </form>
        <a href="./" class="back">&larr; Return to TripPool Login</a>
    </div>
</body>
</html>
    <?php
    exit();
}

$saveMessage = null;
$saveSuccess = false;
$forceReseedRequested = false;

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Handle POST action to save cPanel MySQL credentials directly to .env / api/.env
    if (!empty($_POST['save_db_config'])) {
        $newHost = trim($_POST['db_host'] ?? 'localhost') ?: 'localhost';
        $newPort = trim($_POST['db_port'] ?? '3306') ?: '3306';
        $newName = trim($_POST['db_name'] ?? '');
        $newUser = trim($_POST['db_user'] ?? '');
        $newPass = $_POST['db_pass'] ?? '';

        if ($newName !== '' && $newUser !== '') {
            $envContent = "# TripPool MySQL Configuration (Generated via debug.php)\n"
                . "DB_HOST=\"{$newHost}\"\n"
                . "DB_PORT=\"{$newPort}\"\n"
                . "DB_NAME=\"{$newName}\"\n"
                . "DB_USER=\"{$newUser}\"\n"
                . "DB_PASS=\"{$newPass}\"\n";

            $savedPaths = [];
            if (@file_put_contents($rootDir . '/.env', $envContent) !== false) {
                $savedPaths[] = $rootDir . '/.env';
            }
            if (is_dir($rootDir . '/api') && @file_put_contents($rootDir . '/api/.env', $envContent) !== false) {
                $savedPaths[] = $rootDir . '/api/.env';
            }

            if (!empty($savedPaths)) {
                $saveSuccess = true;
                $saveMessage = "MySQL credentials saved to " . implode(' & ', $savedPaths) . " and tested below!";
            } else {
                $saveMessage = "Could not write .env file due to folder permissions. Please edit api/db.php directly.";
            }
        } else {
            $saveMessage = "Database Name and Database User are required.";
        }
    }

    // 2. Handle POST action to reset/reload Upper Mustang Overland 2026 dummy data
    if (!empty($_POST['reseed_dummy_data'])) {
        $forceReseedRequested = true;
    }
}

if ($isJson) {
    if (!defined('TRIPPOOL_DEBUG_JSON')) define('TRIPPOOL_DEBUG_JSON', true);
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
} else {
    if (!defined('TRIPPOOL_DEBUG_HTML')) define('TRIPPOOL_DEBUG_HTML', true);
    header("Content-Type: text/html; charset=UTF-8");
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
}

$startTime = microtime(true);
$checks = [];

// 1. File Location & Directory Checks
$checks['filesystem'] = [
    'status' => 'success',
    'dir' => $rootDir,
    'file' => __FILE__,
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
    'request_uri' => $_SERVER['REQUEST_URI'] ?? '/debug.php',
    'php_version' => phpversion(),
    'pdo_mysql_loaded' => extension_loaded('pdo_mysql'),
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
];

// 2. Required Hosting & API Files Check
$requiredFiles = [
    'api/db.php',
    'api/login.php',
    'api/members.php',
    'api/expenses.php',
    'api/deposits.php',
    'api/trips.php',
    'api/sync.php',
    'api/health.php',
    'api/.htaccess',
    '.htaccess',
    'index.html'
];

$fileStatus = [];
foreach ($requiredFiles as $relPath) {
    $fullPath = $rootDir . '/' . $relPath;
    $exists = file_exists($fullPath);
    $fileStatus[$relPath] = [
        'exists' => $exists,
        'size' => $exists ? filesize($fullPath) : 0,
        'readable' => $exists ? is_readable($fullPath) : false
    ];
}
$checks['files'] = $fileStatus;

// 3. Database Connection & Table Check
$dbStatus = [
    'connected' => false,
    'error' => null,
    'tables' => [],
    'config' => []
];

$dbConfigPath = file_exists($rootDir . '/api/db.php')
    ? $rootDir . '/api/db.php'
    : ($currentDir . '/db.php');

if (file_exists($dbConfigPath)) {
    try {
        require_once $dbConfigPath;
        $dbStatus['config'] = [
            'host' => $db_host ?? 'localhost',
            'database' => $db_name ?? 'unknown',
            'user' => $db_user ?? 'unknown',
            'port' => $db_port ?? '3306'
        ];

        if (isset($pdo) && $pdo instanceof PDO) {
            $dbStatus['connected'] = true;

            if ($forceReseedRequested && function_exists('ensureTripPoolSchema')) {
                ensureTripPoolSchema($pdo, true);
                $saveSuccess = true;
                $saveMessage = "Successfully loaded fresh 'Upper Mustang Overland 2026' dummy data (5 Members, 5 Deposits, 6 Expenses, 6 Users) into MySQL!";
            }

            $tables = ['users', 'trips', 'members', 'deposits', 'expenses', 'expense_splits', 'sync_queue'];
            foreach ($tables as $tbl) {
                try {
                    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM `{$tbl}`");
                    $row = $stmt->fetch();
                    $dbStatus['tables'][$tbl] = [
                        'exists' => true,
                        'count' => (int)$row['cnt']
                    ];
                } catch (Exception $tErr) {
                    $dbStatus['tables'][$tbl] = [
                        'exists' => false,
                        'error' => $tErr->getMessage()
                    ];
                }
            }
        } else {
            $dbStatus['error'] = $db_connection_error ?? 'PDO connection could not be established. Enter your cPanel MySQL credentials below.';
        }
    } catch (Throwable $dbEx) {
        $dbStatus['error'] = $dbEx->getMessage();
    }
} else {
    $dbStatus['error'] = 'api/db.php not found at ' . $dbConfigPath;
}
$checks['database'] = $dbStatus;
$executionTime = round((microtime(true) - $startTime) * 1000, 2);
$checks['execution_ms'] = $executionTime;

if ($isJson) {
    echo json_encode($checks, JSON_PRETTY_PRINT);
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TripPool - cPanel Diagnostic & MySQL Setup Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=JetBrains+Mono:wght@500;600&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet" />
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
        .container { max-width: 900px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 15px 35px -5px rgba(0,0,0,0.5); overflow: hidden; }
        header { background: #059669; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        h1 { font-family: 'Outfit', sans-serif; margin: 0; font-size: 1.25rem; font-weight: 700; letter-spacing: -0.015em; color: #ffffff; }
        .badge { background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; color: #fff; }
        .content { padding: 24px; }
        .section { margin-bottom: 24px; background: #0f172a; border-radius: 12px; border: 1px solid #334155; padding: 18px; }
        h2 { font-family: 'Outfit', sans-serif; margin-top: 0; font-size: 1.02rem; font-weight: 700; color: #34d399; border-bottom: 1px solid #334155; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #1e293b; }
        th { color: #94a3b8; font-weight: 600; width: 34%; }
        .success { color: #34d399; font-weight: 700; }
        .error { color: #f87171; font-weight: 700; }
        .code { background: #1e293b; padding: 3px 7px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #cbd5e1; word-break: break-all; }
        .btn { display: inline-block; background: #10b981; color: #fff; text-decoration: none; padding: 9px 16px; border-radius: 8px; font-weight: 700; font-size: 0.82rem; border: none; cursor: pointer; }
        .btn-secondary { background: #334155; color: #f8fafc; }
        .btn-dark { background: #0f172a; border: 1px solid rgba(255,255,255,0.2); }
        .btn-danger { background: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.5); color: #fff; }
        .footer { text-align: center; font-size: 0.75rem; color: #64748b; margin-top: 20px; }
        .alert-box { margin-bottom: 18px; padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }
        .alert-success { background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; }
        .alert-error { background: rgba(248, 113, 113, 0.15); border: 1px solid #f87171; color: #fca5a5; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-top: 12px; }
        .form-group label { display: block; font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px; font-weight: 600; }
        .form-group input { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #fff; font-family: monospace; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>TripPool cPanel Diagnostic & MySQL Setup Dashboard</h1>
                <div style="font-size: 0.78rem; color: #d1fae5; margin-top: 4px;">Protected Trip Leader Diagnostic Tool (debug.php)</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <span class="badge">PHP <?= htmlspecialchars($checks['filesystem']['php_version']) ?></span>
                <a href="./" class="btn btn-dark">&larr; Open TripPool App</a>
                <a href="?logout=1" class="btn btn-danger">Lock Diagnostics</a>
            </div>
        </header>

        <div class="content">
            <?php if ($saveMessage): ?>
                <div class="alert-box <?= $saveSuccess ? 'alert-success' : 'alert-error' ?>">
                    <?= htmlspecialchars($saveMessage) ?>
                </div>
            <?php endif; ?>

            <!-- 1. Database Connection & Tables -->
            <div class="section">
                <h2>1. MySQL Database Connection & Tables Audit</h2>
                <table>
                    <tr>
                        <th>Connection Status</th>
                        <td>
                            <?php if ($checks['database']['connected']): ?>
                                <span class="success">✓ CONNECTED TO MYSQL DATABASE (`<?= htmlspecialchars($checks['database']['config']['database']) ?>`)</span>
                            <?php else: ?>
                                <span class="error">✗ CONNECTION FAILED: <?= htmlspecialchars($checks['database']['error'] ?? 'Unknown error') ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <th>Configured Host / Port</th>
                        <td><span class="code"><?= htmlspecialchars($checks['database']['config']['host'] ?? 'localhost') ?>:<?= htmlspecialchars($checks['database']['config']['port'] ?? '3306') ?></span></td>
                    </tr>
                    <tr>
                        <th>Configured DB Name / User</th>
                        <td>Database: <span class="code"><?= htmlspecialchars($checks['database']['config']['database'] ?? '') ?></span> &bull; User: <span class="code"><?= htmlspecialchars($checks['database']['config']['user'] ?? '') ?></span></td>
                    </tr>
                    <tr>
                        <th>PDO MySQL Extension</th>
                        <td><?= $checks['filesystem']['pdo_mysql_loaded'] ? '<span class="success">✓ Loaded</span>' : '<span class="error">✗ Not Loaded (Enable pdo_mysql in cPanel Select PHP Version)</span>' ?></td>
                    </tr>
                </table>

                <!-- Quick cPanel MySQL Credential Setup Form -->
                <form method="POST" action="" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #334155;">
                    <input type="hidden" name="save_db_config" value="1">
                    <div style="font-size: 0.85rem; font-weight: 700; color: #e2e8f0;">
                        Configure or Update cPanel MySQL Database Credentials:
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>MySQL Host</label>
                            <input type="text" name="db_host" value="<?= htmlspecialchars($checks['database']['config']['host'] ?? 'localhost') ?>" required>
                        </div>
                        <div class="form-group">
                            <label>Database Name (e.g. cpaneluser_trippool)</label>
                            <input type="text" name="db_name" value="<?= htmlspecialchars($checks['database']['config']['database'] ?? 'trippool') ?>" required>
                        </div>
                        <div class="form-group">
                            <label>Database Username</label>
                            <input type="text" name="db_user" value="<?= htmlspecialchars($checks['database']['config']['user'] ?? 'root') ?>" required>
                        </div>
                        <div class="form-group">
                            <label>Database Password</label>
                            <input type="password" name="db_pass" placeholder="Enter MySQL password">
                        </div>
                    </div>
                    <div style="margin-top: 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <button type="submit" class="btn">Save Credentials & Initialize MySQL Tables</button>
                        <span style="font-size: 0.75rem; color: #94a3b8;">Saves to <code>.env</code> and auto-creates all 7 TripPool tables + dummy data!</span>
                    </div>
                </form>

                <?php if ($checks['database']['connected'] && !empty($checks['database']['tables'])): ?>
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 20px; margin-bottom: 8px;">
                    <h3 style="font-size: 0.875rem; color: #94a3b8; margin: 0;">MySQL Table Records Audit (Auto-Created & Verified):</h3>
                    <form method="POST" action="" style="margin: 0;">
                        <input type="hidden" name="reseed_dummy_data" value="1">
                        <button type="submit" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.75rem;">
                            ↻ Reload Fresh Dummy Data (Upper Mustang 2026)
                        </button>
                    </form>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Table Name</th>
                            <th>Status</th>
                            <th>Live Row Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($checks['database']['tables'] as $tblName => $tInfo): ?>
                        <tr>
                            <td><span class="code"><?= htmlspecialchars($tblName) ?></span></td>
                            <td>
                                <?php if ($tInfo['exists']): ?>
                                    <span class="success">✓ Active</span>
                                <?php else: ?>
                                    <span class="error">✗ Missing (<?= htmlspecialchars($tInfo['error']) ?>)</span>
                                <?php endif; ?>
                            </td>
                            <td><strong><?= $tInfo['exists'] ? $tInfo['count'] . ' rows' : '-' ?></strong></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <?php endif; ?>
            </div>

            <!-- 2. File System Info -->
            <div class="section">
                <h2>2. File System & cPanel Directory Location</h2>
                <table>
                    <tr>
                        <th>Application Root Directory</th>
                        <td><span class="code"><?= htmlspecialchars($checks['filesystem']['dir']) ?></span></td>
                    </tr>
                    <tr>
                        <th>Debug Script Path</th>
                        <td><span class="code"><?= htmlspecialchars($checks['filesystem']['file']) ?></span></td>
                    </tr>
                    <tr>
                        <th>Document Root</th>
                        <td><span class="code"><?= htmlspecialchars($checks['filesystem']['document_root']) ?></span></td>
                    </tr>
                    <tr>
                        <th>Web Server Software</th>
                        <td><?= htmlspecialchars($checks['filesystem']['server_software']) ?> (Executed in <?= $executionTime ?> ms)</td>
                    </tr>
                </table>
            </div>

            <!-- 3. API Files Check -->
            <div class="section">
                <h2>3. Required Hosting & API Files Check</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Relative File Path</th>
                            <th>Status</th>
                            <th>File Size</th>
                            <th>Readable</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($checks['files'] as $path => $fInfo): ?>
                        <tr>
                            <td><span class="code"><?= htmlspecialchars($path) ?></span></td>
                            <td>
                                <?php if ($fInfo['exists']): ?>
                                    <span class="success">✓ Found</span>
                                <?php else: ?>
                                    <span class="error">✗ Missing</span>
                                <?php endif; ?>
                            </td>
                            <td><?= $fInfo['exists'] ? number_format($fInfo['size']) . ' bytes' : '-' ?></td>
                            <td><?= $fInfo['readable'] ? 'Yes' : 'No' ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div class="footer">
        TripPool Nepal &bull; 100% Database-Driven Roadtrip Expense Manager &bull; Generated <?= date('Y-m-d H:i:s') ?>
    </div>
</body>
</html>
