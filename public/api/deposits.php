<?php
/**
 * TripPool Nepal - Deposits Database REST API (PHP / cPanel)
 */

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT * FROM deposits ORDER BY deposited_at DESC");
        $deposits = $stmt->fetchAll();
        $formatted = array_map(function($d) {
            return [
                "id" => (int)$d['id'],
                "trip_id" => (int)$d['trip_id'],
                "member_id" => (int)$d['member_id'],
                "member_name" => $d['member_name'],
                "amount" => (float)$d['amount'],
                "payment_method" => $d['payment_method'],
                "notes" => $d['notes'],
                "deposited_at" => $d['deposited_at']
            ];
        }, $deposits);

        echo json_encode($formatted);
        break;

    case 'POST':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        $trip_id = (int)($data['trip_id'] ?? 1);
        $member_id = (int)($data['member_id'] ?? 0);
        $member_name = $data['member_name'] ?? 'Member';
        $amount = (float)($data['amount'] ?? 0);
        $payment_method = $data['payment_method'] ?? 'Cash';
        $notes = $data['notes'] ?? null;
        $deposited_at = $data['deposited_at'] ?? date('Y-m-d H:i:s');

        if ($member_id <= 0 || $amount <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid Member ID and amount are required"]);
            exit();
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
        echo json_encode(array_merge(["id" => $depId], $data));
        break;

    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            $path = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
            $id = (int)end($path);
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid Deposit ID is required"]);
            exit();
        }

        $stmt = $pdo->prepare("DELETE FROM deposits WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["success" => true, "message" => "Deposit {$id} deleted"]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method Not Allowed"]);
        break;
}
