<?php
/**
 * TripPool Nepal - Database Health Check Endpoint (PHP / cPanel)
 */

require_once __DIR__ . '/db.php';

try {
    $memberStmt = $pdo->query("SELECT COUNT(*) as count FROM members");
    $memberCount = $memberStmt->fetch()['count'];

    $expenseStmt = $pdo->query("SELECT COUNT(*) as count FROM expenses");
    $expenseCount = $expenseStmt->fetch()['count'];

    $depositStmt = $pdo->query("SELECT COUNT(*) as count FROM deposits");
    $depositCount = $depositStmt->fetch()['count'];

    echo json_encode([
        "status" => "connected",
        "database" => $db_name,
        "stats" => [
            "members" => (int)$memberCount,
            "expenses" => (int)$expenseCount,
            "deposits" => (int)$depositCount
        ],
        "timestamp" => date('c')
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "disconnected",
        "error" => $e->getMessage()
    ]);
}
