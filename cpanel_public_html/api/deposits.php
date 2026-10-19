<?php
/**
 * TripPool Nepal - Deposits Database REST API (PHP / cPanel)
 * Supports GET, POST, PUT, DELETE + POST _method override.
 */

require_once __DIR__ . '/db.php';

$data = getRequestData();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
} elseif ($method === 'POST' && !empty($data['_method'])) {
    $method = strtoupper($data['_method']);
}

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("
            SELECT 
                d.*,
                COALESCE(NULLIF(d.member_name, 'Member'), m.name, 'Member') AS resolved_member_name
            FROM deposits d
            LEFT JOIN members m ON d.member_id = m.id
            ORDER BY d.deposited_at DESC, d.id DESC
        ");
        $deposits = $stmt->fetchAll();
        $formatted = array_map(function($d) {
            return [
                "id" => (int)$d['id'],
                "trip_id" => (int)$d['trip_id'],
                "member_id" => (int)$d['member_id'],
                "member_name" => $d['resolved_member_name'],
                "amount" => (float)$d['amount'],
                "payment_method" => $d['payment_method'],
                "notes" => $d['notes'],
                "deposited_at" => $d['deposited_at']
            ];
        }, $deposits);

        echo json_encode($formatted);
        break;

    case 'POST':
        $trip_id = (int)($data['trip_id'] ?? 1);
        $member_id = (int)($data['member_id'] ?? 0);
        $member_name = trim($data['member_name'] ?? '');
        $amount = (float)($data['amount'] ?? 0);
        $payment_method = $data['payment_method'] ?? 'Cash';
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;
        $deposited_at = formatMysqlDateTime($data['deposited_at'] ?? null);

        if ($member_id <= 0 || $amount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid Member ID and amount are required"]);
            exit();
        }

        if (empty($member_name) || $member_name === 'Unknown Member') {
            $mStmt = $pdo->prepare("SELECT name FROM members WHERE id = :id LIMIT 1");
            $mStmt->execute([':id' => $member_id]);
            $mRow = $mStmt->fetch();
            $member_name = $mRow ? $mRow['name'] : 'Member';
        }

        $stmt = $pdo->prepare("INSERT INTO deposits (trip_id, member_id, member_name, amount, payment_method, notes, deposited_at) VALUES (:trip_id, :member_id, :member_name, :amount, :payment_method, :notes, :deposited_at)");
        $stmt->execute([
            ':trip_id' => $trip_id,
            ':member_id' => $member_id,
            ':member_name' => $member_name,
            ':amount' => $amount,
            ':payment_method' => $payment_method,
            ':notes' => $notes,
            ':deposited_at' => $deposited_at
        ]);

        $depId = (int)$pdo->lastInsertId();
        http_response_code(201);
        echo json_encode(["success" => true, "id" => $depId, "member_name" => $member_name, "deposited_at" => $deposited_at]);
        break;

    case 'PUT':
        $id = (int)($_GET['id'] ?? $data['id'] ?? 0);
        if ($id <= 0 && !empty($_SERVER['PATH_INFO'])) {
            $path = explode('/', trim($_SERVER['PATH_INFO'], '/'));
            $id = (int)end($path);
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid Deposit ID is required"]);
            exit();
        }

        $member_id = (int)($data['member_id'] ?? 0);
        $member_name = trim($data['member_name'] ?? '');
        $amount = (float)($data['amount'] ?? 0);
        $payment_method = $data['payment_method'] ?? 'Cash';
        $notes = array_key_exists('notes', $data) ? $data['notes'] : null;
        $deposited_at = formatMysqlDateTime($data['deposited_at'] ?? null);

        if ($member_id <= 0 || $amount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid Member ID and amount are required"]);
            exit();
        }

        if (empty($member_name) || $member_name === 'Unknown Member') {
            $mStmt = $pdo->prepare("SELECT name FROM members WHERE id = :id LIMIT 1");
            $mStmt->execute([':id' => $member_id]);
            $mRow = $mStmt->fetch();
            $member_name = $mRow ? $mRow['name'] : 'Member';
        }

        $stmt = $pdo->prepare("UPDATE deposits SET 
            member_id = :member_id,
            member_name = :member_name,
            amount = :amount,
            payment_method = :payment_method,
            notes = :notes,
            deposited_at = :deposited_at
            WHERE id = :id");
        $stmt->execute([
            ':member_id' => $member_id,
            ':member_name' => $member_name,
            ':amount' => $amount,
            ':payment_method' => $payment_method,
            ':notes' => $notes,
            ':deposited_at' => $deposited_at,
            ':id' => $id
        ]);

        echo json_encode(["success" => true, "id" => $id]);
        break;

    case 'DELETE':
        $id = (int)($_GET['id'] ?? $data['id'] ?? 0);
        if ($id <= 0 && !empty($_SERVER['PATH_INFO'])) {
            $path = explode('/', trim($_SERVER['PATH_INFO'], '/'));
            $id = (int)end($path);
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid Deposit ID is required"]);
            exit();
        }

        $stmt = $pdo->prepare("DELETE FROM deposits WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["success" => true, "message" => "Deposit {$id} deleted"]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method Not Allowed"]);
        break;
}
