<?php
/**
 * TripPool Nepal - Trips Database REST API (PHP / cPanel)
 */

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT * FROM trips WHERE id = 1 LIMIT 1");
        $trip = $stmt->fetch();

        if (!$trip) {
            echo json_encode([
                "id" => 1,
                "title" => "Rara Trip 2026",
                "destination" => "Rara Lake & Karnali Valley",
                "currency" => "Rs.",
                "start_date" => "2026-10-18",
                "end_date" => "2026-10-25",
                "status" => "active"
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
            "status" => $trip['status']
        ]);
        break;

    case 'PUT':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        $id = (int)($_GET['id'] ?? $data['id'] ?? 1);
        $title = $data['title'] ?? 'Rara Trip 2026';
        $destination = $data['destination'] ?? 'Rara Lake & Karnali Valley';
        $currency = $data['currency'] ?? 'Rs.';

        $stmt = $pdo->prepare("UPDATE trips SET title = :title, destination = :destination, currency = :currency WHERE id = :id");
        $stmt->execute([
            ':title' => $title,
            ':destination' => $destination,
            ':currency' => $currency,
            ':id' => $id
        ]);

        echo json_encode([
            "id" => $id,
            "title" => $title,
            "destination" => $destination,
            "currency" => $currency
        ]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method Not Allowed"]);
        break;
}
