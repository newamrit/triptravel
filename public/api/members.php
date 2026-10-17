<?php
/**
 * TripPool Nepal - Members Database REST API (PHP / cPanel)
 */

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT id, trip_id, name, phone, notes, is_leader, is_active FROM members ORDER BY id ASC");
        $members = $stmt->fetchAll();
        $formatted = array_map(function($m) {
            return [
                "id" => (int)$m['id'],
                "trip_id" => (int)$m['trip_id'],
                "name" => $m['name'],
                "phone" => $m['phone'],
                "notes" => $m['notes'],
                "is_leader" => (bool)$m['is_leader'],
                "is_active" => (bool)$m['is_active']
            ];
        }, $members);
        echo json_encode($formatted);
        break;

    case 'POST':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        $name = trim($data['name'] ?? '');
        $trip_id = (int)($data['trip_id'] ?? 1);
        $phone = $data['phone'] ?? null;
        $notes = $data['notes'] ?? null;
        $is_leader = !empty($data['is_leader']) ? 1 : 0;

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["error" => "Member name is required"]);
            exit();
        }

        $stmt = $pdo->prepare("INSERT INTO members (trip_id, name, phone, notes, is_leader, is_active) VALUES (:trip_id, :name, :phone, :notes, :is_leader, 1)");
        $stmt->execute([
            ':trip_id' => $trip_id,
            ':name' => $name,
            ':phone' => $phone,
            ':notes' => $notes,
            ':is_leader' => $is_leader
        ]);

        $newId = (int)$pdo->lastInsertId();
        http_response_code(201);
        echo json_encode([
            "id" => $newId,
            "trip_id" => $trip_id,
            "name" => $name,
            "phone" => $phone,
            "notes" => $notes,
            "is_leader" => (bool)$is_leader,
            "is_active" => true
        ]);
        break;

    case 'PUT':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        $id = (int)($_GET['id'] ?? $data['id'] ?? 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid Member ID is required"]);
            exit();
        }

        $stmt = $pdo->prepare("UPDATE members SET name=COALESCE(:name, name), phone=:phone, notes=:notes, is_leader=COALESCE(:is_leader, is_leader), is_active=COALESCE(:is_active, is_active) WHERE id=:id");
        $stmt->execute([
            ':name' => $data['name'] ?? null,
            ':phone' => $data['phone'] ?? null,
            ':notes' => $data['notes'] ?? null,
            ':is_leader' => isset($data['is_leader']) ? ($data['is_leader'] ? 1 : 0) : null,
            ':is_active' => isset($data['is_active']) ? ($data['is_active'] ? 1 : 0) : null,
            ':id' => $id
        ]);

        echo json_encode(["success" => true, "id" => $id]);
        break;

    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            // Check path info
            $path = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
            $id = (int)end($path);
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid Member ID is required"]);
            exit();
        }

        $stmt = $pdo->prepare("DELETE FROM members WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["success" => true, "message" => "Member {$id} deleted from database."]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method Not Allowed"]);
        break;
}
