<?php
/**
 * TripPool Nepal - Database Health Check Endpoint (PHP / cPanel)
 */

require_once __DIR__ . '/db.php';

try {
    $tripStmt = $pdo->query("SELECT * FROM trips ORDER BY id ASC LIMIT 1");
    $trip = $tripStmt->fetch();

    $memberCount = (int)$pdo->query("SELECT COUNT(*) FROM members")->fetchColumn();
    $expenseCount = (int)$pdo->query("SELECT COUNT(*) FROM expenses")->fetchColumn();
    $depositCount = (int)$pdo->query("SELECT COUNT(*) FROM deposits")->fetchColumn();
    $receiptCount = (int)$pdo->query("SELECT COUNT(*) FROM expenses WHERE receipt_image IS NOT NULL AND receipt_image != ''")->fetchColumn();

    echo json_encode([
        "success" => true,
        "status" => "connected",
        "database" => $db_name,
        "host" => $db_host,
        "trip" => $trip ?: ["id" => 1, "title" => "Upper Mustang Overland 2026", "currency" => "Rs."],
        "stats" => [
            "members" => $memberCount,
            "expenses" => $expenseCount,
            "deposits" => $depositCount,
            "receipts" => $receiptCount
        ],
        "timestamp" => date('c')
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "status" => "disconnected",
        "error" => $e->getMessage()
    ]);
}
