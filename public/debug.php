<?php
/**
 * TripPool Nepal - cPanel & Database Diagnostic & Debug Tool
 * Visit this file in your browser (e.g. https://yourdomain.com/debug.php)
 * to verify file placement and MySQL database connectivity.
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

$startTime = microtime(true);
$checks = [];

// 1. File Location & Directory Checks
$currentDir = __DIR__;
$currentFile = __FILE__;
$checks['filesystem'] = [
    'status' => 'success',
    'dir' => $currentDir,
    'file' => $currentFile,
    'php_version' => phpversion(),
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
];

// 2. Required API Files Check
$requiredFiles = [
    'api/db.php',
    'api/login.php',
    'api/members.php',
    'api/expenses.php',
    'api/deposits.php',
    'api/trips.php'
];

$fileStatus = [];
foreach ($requiredFiles as $relPath) {
    $fullPath = $currentDir . '/' . $relPath;
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

$dbConfigPath = $currentDir . '/api/db.php';
if (file_exists($dbConfigPath)) {
    try {
        require_once $dbConfigPath;
        if (isset($pdo) && $pdo instanceof PDO) {
            $dbStatus['connected'] = true;
            $dbStatus['config'] = [
                'host' => $db_host ?? 'unknown',
                'database' => $db_name ?? 'unknown',
                'user' => $db_user ?? 'unknown'
            ];

            // Check tables
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
            $dbStatus['error'
            ] = '$pdo object not initialized in api/db.php';
        }
    } catch (Exception $dbEx) {
        $dbStatus['error'] = $dbEx->getMessage();
    }
} else {
    $dbStatus['error'] = 'api/db.php not found at ' . $dbConfigPath;
}
$checks['database'] = $dbStatus;

$executionTime = round((microtime(true) - $startTime) * 1000, 2);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TripPool - cPanel Diagnostic & Debug Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
        .container { max-width: 800px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); overflow: hidden; }
        header { background: #059669; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; }
        h1 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #ffffff; }
        .badge { background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .content { padding: 24px; }
        .section { margin-bottom: 24px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 16px; }
        h2 { margin-top: 0; font-size: 1rem; color: #34d399; border-bottom: 1px solid #334155; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #1e293b; }
        th { color: #94a3b8; font-weight: 600; }
        .success { color: #34d399; font-weight: 700; }
        .error { color: #f87171; font-weight: 700; }
        .code { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; color: #cbd5e1; }
        .footer { text-align: center; font-size: 0.75rem; color: #64748b; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>TripPool Diagnostic & Debug Dashboard</h1>
            <span class="badge">PHP <?= htmlspecialchars($checks['filesystem']['php_version']) ?></span>
        </header>

        <div class="content">
            <!-- File System Info -->
            <div class="section">
                <h2>1. File System & Server Location</h2>
                <table>
                    <tr>
                        <th>Current Working Directory</th>
                        <td><span class="code"><?= htmlspecialchars($checks['filesystem']['dir']) ?></span></td>
                    </tr>
                    <tr>
                        <th>Debug Script Path</th>
                        <td><span class="code"><?= htmlspecialchars($checks['filesystem']['file']) ?></span></td>
                    </tr>
                    <tr>
                        <th>Web Server Software</th>
                        <td><?= htmlspecialchars($checks['filesystem']['server_software']) ?></td>
                    </tr>
                    <tr>
                        <th>Diagnostic Execution Time</th>
                        <td><?= $executionTime ?> ms</td>
                    </tr>
                </table>
            </div>

            <!-- API Files Check -->
            <div class="section">
                <h2>2. Required API PHP Files Check</h2>
                <table>
                    <thead>
                        <tr>
                            <th>File Path</th>
                            <th>Status</th>
                            <th>Size</th>
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
                            <td><?= $fInfo['exists'] ? $fInfo['size'] . ' bytes' : '-' ?></td>
                            <td><?= $fInfo['readable'] ? 'Yes' : 'No' ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <!-- Database Connection & Tables -->
            <div class="section">
                <h2>3. MySQL Database Connection & Tables</h2>
                <table>
                    <tr>
                        <th>Connection Status</th>
                        <td>
                            <?php if ($checks['database']['connected']): ?>
                                <span class="success">Connected Successfully to MySQL (`<?= htmlspecialchars($checks['database']['config']['database']) ?>`)</span>
                            <?php else: ?>
                                <span class="error">Connection Failed: <?= htmlspecialchars($checks['database']['error'] ?? 'Unknown error') ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php if ($checks['database']['connected']): ?>
                    <tr>
                        <th>Database Host / User</th>
                        <td><span class="code"><?= htmlspecialchars($checks['database']['config']['host']) ?></span> (User: <span class="code"><?= htmlspecialchars($checks['database']['config']['user']) ?></span>)</td>
                    </tr>
                    <?php endif; ?>
                </table>

                <?php if ($checks['database']['connected'] && !empty($checks['database']['tables'])): ?>
                <h3 style="font-size: 0.875rem; color: #94a3b8; margin-top: 16px; margin-bottom: 8px;">Table Records Audit:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Table Name</th>
                            <th>Table Exists</th>
                            <th>Row Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($checks['database']['tables'] as $tblName => $tInfo): ?>
                        <tr>
                            <td><span class="code"><?= htmlspecialchars($tblName) ?></span></td>
                            <td>
                                <?php if ($tInfo['exists']): ?>
                                    <span class="success">Yes</span>
                                <?php else: ?>
                                    <span class="error">No (<?= htmlspecialchars($tInfo['error']) ?>)</span>
                                <?php endif; ?>
                            </td>
                            <td><?= $tInfo['exists'] ? $tInfo['count'] : '-' ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <div class="footer">
        TripPool Nepal &bull; Powered by cPanel PHP & MySQL &bull; Generated <?= date('Y-m-d H:i:s') ?>
    </div>
</body>
</html>
