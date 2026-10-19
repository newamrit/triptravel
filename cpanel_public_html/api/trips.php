<?php
/**
 * TripPool Nepal - Trips Database REST API (PHP / cPanel)
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
        $stmt = $pdo->query("SELECT * FROM trips ORDER BY id ASC LIMIT 1");
        $trip = $stmt->fetch();

        if (!$trip) {
            echo json_encode([
                "id" => 1,
                "title" => "Upper Mustang Overland 2026",
                "destination" => "Pokhara • Marpha • Kagbeni • Lo Manthang",
                "currency" => "Rs.",
                "start_date" => "2026-10-15",
                "end_date" => "2026-10-24",
                "status" => "active",
                "total_budget" => 35000
            ]);
            exit();
        }

        echo json_encode([
            "id" => (int)$trip['id'],
            "title" => $trip['title'],
            "destination" => $trip['destination'],
            "currency" => $trip['currency'],
            "start_date" => $trip['start_date'],
            "end_date" => $trip['end_date'],
            "status" => $trip['status'],
            "total_budget" => isset($trip['total_budget']) ? (float)$trip['total_budget'] : 35000
        ]);
        break;

    case 'POST':
    case 'PUT':
        $id = (int)($_GET['id'] ?? $data['id'] ?? 1);
        $title = $data['title'] ?? 'Upper Mustang Overland 2026';
        $destination = $data['destination'] ?? 'Pokhara • Marpha • Kagbeni • Lo Manthang';
        $currency = $data['currency'] ?? 'Rs.';
        $start_date = $data['start_date'] ?? '2026-10-15';
        $end_date = $data['end_date'] ?? '2026-10-24';
        $status = $data['status'] ?? 'active';
        $total_budget = isset($data['total_budget']) ? (float)$data['total_budget'] : 35000;

        try {
            $pdo->exec("ALTER TABLE trips ADD COLUMN total_budget DECIMAL(12,2) NOT NULL DEFAULT 35000.00");
        } catch (Exception $e) {
            // Column already exists
        }

        try {
            $stmt = $pdo->prepare("UPDATE trips SET title = :title, destination = :destination, currency = :currency, start_date = :start_date, end_date = :end_date, status = :status, total_budget = :total_budget WHERE id = :id");
            $stmt->execute([
                ':title' => $title,
                ':destination' => $destination,
                ':currency' => $currency,
                ':start_date' => $start_date,
                ':end_date' => $end_date,
                ':status' => $status,
                ':total_budget' => $total_budget,
                ':id' => $id
            ]);
        } catch (Exception $e) {
            $stmt = $pdo->prepare("UPDATE trips SET title = :title, destination = :destination, currency = :currency, start_date = :start_date, end_date = :end_date, status = :status WHERE id = :id");
            $stmt->execute([
                ':title' => $title,
                ':destination' => $destination,
                ':currency' => $currency,
                ':start_date' => $start_date,
                ':end_date' => $end_date,
                ':status' => $status,
                ':id' => $id
            ]);
        }

        echo json_encode([
            "success" => true,
            "id" => $id,
            "title" => $title,
            "destination" => $destination,
            "currency" => $currency,
            "start_date" => $start_date,
            "end_date" => $end_date,
            "status" => $status,
            "total_budget" => $total_budget
        ]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method Not Allowed"]);
        break;
}
