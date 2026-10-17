<?php
/**
 * TripPool REST API: Deposits
 * GET: Fetch deposit transaction ledger and total collected fund
 * POST: Record a cash or digital contribution into the group pool
 */

if (file_exists(__DIR__ . '/db.php')) {
    require_once __DIR__ . '/db.php';
} else {
    require_once __DIR__ . '/../db.php';
}

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $tripId = isset($_GET['trip_id']) ? (int)$_GET['trip_id'] : 1;
    $memberId = isset($_GET['member_id']) ? (int)$_GET['member_id'] : null;

    try {
        $sql = "
            SELECT 
                d.id,
                d.trip_id,
                d.member_id,
                m.name AS member_name,
                m.is_leader,
                d.amount,
                d.payment_method,
                d.notes,
                d.deposited_at,
                d.created_at
            FROM deposits d
            JOIN members m ON d.member_id = m.id
            WHERE d.trip_id = :trip_id
        ";
        $params = ['trip_id' => $tripId];

        if ($memberId) {
            $sql .= " AND d.member_id = :member_id";
            $params['member_id'] = $memberId;
        }

        $sql .= " ORDER BY d.deposited_at DESC, d.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $deposits = $stmt->fetchAll();

        // Calculate aggregates
        $totalCollected = 0.0;
        $byMethod = [
            'Cash' => 0.0,
            'Fonepay' => 0.0,
            'Bank Transfer' => 0.0,
            'Other' => 0.0
        ];

        foreach ($deposits as &$d) {
            $d['id'] = (int)$d['id'];
            $d['trip_id'] = (int)$d['trip_id'];
            $d['member_id'] = (int)$d['member_id'];
            $d['amount'] = (float)$d['amount'];
            $d['is_leader'] = (bool)$d['is_leader'];

            $totalCollected += $d['amount'];
            $methodKey = $d['payment_method'];
            if (isset($byMethod[$methodKey])) {
                $byMethod[$methodKey] += $d['amount'];
            } else {
                $byMethod['Other'] += $d['amount'];
            }
        }

        sendJson([
            'trip_id' => $tripId,
            'total_collected' => round($totalCollected, 2),
            'by_payment_method' => $byMethod,
            'count' => count($deposits),
            'deposits' => $deposits
        ]);
    } catch (PDOException $e) {
        sendError('Failed to fetch deposits: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    $input = getJsonInput();

    $tripId = isset($input['trip_id']) ? (int)$input['trip_id'] : 1;
    $memberId = isset($input['member_id']) ? (int)$input['member_id'] : null;
    $amount = isset($input['amount']) ? (float)$input['amount'] : 0.0;
    $paymentMethod = isset($input['payment_method']) ? trim($input['payment_method']) : 'Cash';
    $notes = isset($input['notes']) ? trim($input['notes']) : null;
    $depositedAt = !empty($input['deposited_at']) ? $input['deposited_at'] : date('Y-m-d H:i:s');

    if (!$memberId) {
        sendError('Member ID is required.', 422);
    }
    if ($amount <= 0) {
        sendError('Deposit amount must be greater than zero.', 422);
    }

    $validMethods = ['Cash', 'Fonepay', 'Bank Transfer', 'Other'];
    if (!in_array($paymentMethod, $validMethods, true)) {
        $paymentMethod = 'Cash';
    }

    try {
        // Verify member belongs to this trip
        $checkStmt = $pdo->prepare("SELECT id, name FROM members WHERE id = :id AND trip_id = :trip_id");
        $checkStmt->execute(['id' => $memberId, 'trip_id' => $tripId]);
        $member = $checkStmt->fetch();
        if (!$member) {
            sendError('Invalid member specified for this trip.', 404);
        }

        $stmt = $pdo->prepare("
            INSERT INTO deposits (trip_id, member_id, amount, payment_method, notes, deposited_at)
            VALUES (:trip_id, :member_id, :amount, :payment_method, :notes, :deposited_at)
        ");
        $stmt->execute([
            'trip_id' => $tripId,
            'member_id' => $memberId,
            'amount' => $amount,
            'payment_method' => $paymentMethod,
            'notes' => $notes,
            'deposited_at' => $depositedAt
        ]);

        $newId = (int)$pdo->lastInsertId();

        // Calculate updated total collected
        $sumStmt = $pdo->prepare("SELECT SUM(amount) AS total FROM deposits WHERE trip_id = :trip_id");
        $sumStmt->execute(['trip_id' => $tripId]);
        $newTotal = (float)$sumStmt->fetchColumn();

        sendJson([
            'message' => 'Deposit recorded successfully',
            'id' => $newId,
            'deposit' => [
                'id' => $newId,
                'trip_id' => $tripId,
                'member_id' => $memberId,
                'member_name' => $member['name'],
                'amount' => round($amount, 2),
                'payment_method' => $paymentMethod,
                'notes' => $notes,
                'deposited_at' => $depositedAt
            ],
            'updated_total_collected' => round($newTotal, 2)
        ], 201);
    } catch (PDOException $e) {
        sendError('Failed to record deposit: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method not allowed.', 405);
}
