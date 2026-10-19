<?php
/**
 * TripPool Nepal - Members Database REST API (PHP / cPanel)
 * Supports GET, POST, PUT, DELETE + POST _method override for cPanel ModSecurity compatibility
 */

require_once __DIR__ . '/db.php';

$data = getRequestData();
$method = $_SERVER['REQUEST_METHOD'];

// Support _method override for shared cPanel hosts that restrict PUT / DELETE
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
} elseif ($method === 'POST' && !empty($data['_method'])) {
    $method = strtoupper($data['_method']);
}

// Auto-ensure avatar column exists on members table for backward-compatible upgrades
try {
    $pdo->exec("ALTER TABLE members ADD COLUMN avatar LONGTEXT DEFAULT NULL");
} catch (Exception $e) {
    // Column already exists
}

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->query("SELECT id, trip_id, name, phone, notes, avatar, is_leader, is_active FROM members ORDER BY id ASC");
        } catch (Exception $e) {
            $stmt = $pdo->query("SELECT id, trip_id, name, phone, notes, is_leader, is_active FROM members ORDER BY id ASC");
        }
        $members = $stmt->fetchAll();
        $formatted = array_map(function($m) {
            return [
                "id" => (int)$m['id'],
                "trip_id" => (int)$m['trip_id'],
                "name" => $m['name'],
                "phone" => $m['phone'],
                "notes" => $m['notes'],
                "avatar" => $m['avatar'] ?? null,
                "is_leader" => (bool)$m['is_leader'],
                "is_active" => (bool)$m['is_active']
            ];
        }, $members);
        echo json_encode($formatted);
        break;

    case 'POST':
        $name = trim($data['name'] ?? '');
        $trip_id = (int)($data['trip_id'] ?? 1);
        $phone = !empty($data['phone']) ? trim($data['phone']) : null;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;
        $avatar = isset($data['avatar']) ? $data['avatar'] : null;
        $is_leader = !empty($data['is_leader']) ? 1 : 0;
        $is_active = isset($data['is_active']) ? ((bool)$data['is_active'] ? 1 : 0) : 1;

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Member name is required"]);
            exit();
        }

        if ($is_leader) {
            $pdo->prepare("UPDATE members SET is_leader = 0 WHERE trip_id = :trip_id")->execute([':trip_id' => $trip_id]);
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO members (trip_id, name, phone, notes, avatar, is_leader, is_active) VALUES (:trip_id, :name, :phone, :notes, :avatar, :is_leader, :is_active)");
            $stmt->execute([
                ':trip_id' => $trip_id,
                ':name' => $name,
                ':phone' => $phone,
                ':notes' => $notes,
                ':avatar' => $avatar,
                ':is_leader' => $is_leader,
                ':is_active' => $is_active
            ]);
        } catch (Exception $e) {
            $stmt = $pdo->prepare("INSERT INTO members (trip_id, name, phone, notes, is_leader, is_active) VALUES (:trip_id, :name, :phone, :notes, :is_leader, :is_active)");
            $stmt->execute([
                ':trip_id' => $trip_id,
                ':name' => $name,
                ':phone' => $phone,
                ':notes' => $notes,
                ':is_leader' => $is_leader,
                ':is_active' => $is_active
            ]);
        }

        $newId = (int)$pdo->lastInsertId();
        http_response_code(201);
        echo json_encode([
            "success" => true,
            "id" => $newId,
            "trip_id" => $trip_id,
            "name" => $name,
            "phone" => $phone,
            "notes" => $notes,
            "avatar" => $avatar,
            "is_leader" => (bool)$is_leader,
            "is_active" => (bool)$is_active
        ]);
        break;

    case 'PUT':
        $id = (int)($_GET['id'] ?? $data['id'] ?? 0);
        if ($id <= 0 && !empty($_SERVER['PATH_INFO'])) {
            $path = explode('/', trim($_SERVER['PATH_INFO'], '/'));
            $id = (int)end($path);
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid Member ID is required"]);
            exit();
        }

        if (!empty($data['is_leader'])) {
            $pdo->exec("UPDATE members SET is_leader = 0");
        }

        try {
            $stmt = $pdo->prepare("UPDATE members SET 
                name = COALESCE(:name, name),
                phone = COALESCE(:phone, phone),
                notes = COALESCE(:notes, notes),
                avatar = COALESCE(:avatar, avatar),
                is_leader = COALESCE(:is_leader, is_leader),
                is_active = COALESCE(:is_active, is_active)
                WHERE id = :id");
            $stmt->execute([
                ':name' => !empty($data['name']) ? trim($data['name']) : null,
                ':phone' => array_key_exists('phone', $data) ? $data['phone'] : null,
                ':notes' => array_key_exists('notes', $data) ? $data['notes'] : null,
                ':avatar' => array_key_exists('avatar', $data) ? $data['avatar'] : null,
                ':is_leader' => isset($data['is_leader']) ? ($data['is_leader'] ? 1 : 0) : null,
                ':is_active' => isset($data['is_active']) ? ($data['is_active'] ? 1 : 0) : null,
                ':id' => $id
            ]);
        } catch (Exception $e) {
            $stmt = $pdo->prepare("UPDATE members SET 
                name = COALESCE(:name, name),
                phone = COALESCE(:phone, phone),
                notes = COALESCE(:notes, notes),
                is_leader = COALESCE(:is_leader, is_leader),
                is_active = COALESCE(:is_active, is_active)
                WHERE id = :id");
            $stmt->execute([
                ':name' => !empty($data['name']) ? trim($data['name']) : null,
                ':phone' => array_key_exists('phone', $data) ? $data['phone'] : null,
                ':notes' => array_key_exists('notes', $data) ? $data['notes'] : null,
                ':is_leader' => isset($data['is_leader']) ? ($data['is_leader'] ? 1 : 0) : null,
                ':is_active' => isset($data['is_active']) ? ($data['is_active'] ? 1 : 0) : null,
                ':id' => $id
            ]);
        }

        // Cascade name change across deposits, expenses, and expense_splits in database
        if (!empty($data['name'])) {
            $cleanName = trim($data['name']);
            $pdo->prepare("UPDATE deposits SET member_name = :name WHERE member_id = :id")->execute([':name' => $cleanName, ':id' => $id]);
            $pdo->prepare("UPDATE expenses SET payer_member_name = :name WHERE payer_type = 'member' AND payer_member_id = :id")->execute([':name' => $cleanName, ':id' => $id]);
            $pdo->prepare("UPDATE expense_splits SET member_name = :name WHERE member_id = :id")->execute([':name' => $cleanName, ':id' => $id]);
        }

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
            echo json_encode(["success" => false, "error" => "Valid Member ID is required"]);
            exit();
        }

        // Safely clean up related records so foreign key constraints never block deletion
        $pdo->prepare("DELETE FROM expense_splits WHERE member_id = :id")->execute([':id' => $id]);
        $pdo->prepare("DELETE FROM deposits WHERE member_id = :id")->execute([':id' => $id]);
        $pdo->prepare("UPDATE expenses SET payer_type = 'pool', payer_member_id = NULL WHERE payer_member_id = :id")->execute([':id' => $id]);

        $stmt = $pdo->prepare("DELETE FROM members WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["success" => true, "message" => "Member {$id} deleted from database."]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method Not Allowed"]);
        break;
}
