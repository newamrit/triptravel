<?php
/**
 * TripPool REST API: Members
 * GET: Retrieve list of trip members with contribution/spending summary
 * POST: Create a new member or update existing member profile
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

    try {
        $stmt = $pdo->prepare("
            SELECT 
                m.id,
                m.trip_id,
                m.name,
                m.phone,
                m.notes,
                m.is_leader,
                m.is_active,
                m.created_at,
                COALESCE((SELECT SUM(amount) FROM deposits WHERE member_id = m.id AND trip_id = m.trip_id), 0.00) AS total_deposited,
                COALESCE((SELECT SUM(split_amount) FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE es.member_id = m.id AND e.trip_id = m.trip_id), 0.00) AS total_consumed,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE payer_type = 'member' AND payer_member_id = m.id AND trip_id = m.trip_id), 0.00) AS total_paid_out_of_pocket
            FROM members m
            WHERE m.trip_id = :trip_id
            ORDER BY m.is_leader DESC, m.name ASC
        ");
        $stmt->execute(['trip_id' => $tripId]);
        $members = $stmt->fetchAll();

        // Cast numeric types
        foreach ($members as &$m) {
            $m['id'] = (int)$m['id'];
            $m['trip_id'] = (int)$m['trip_id'];
            $m['is_leader'] = (bool)$m['is_leader'];
            $m['is_active'] = (bool)$m['is_active'];
            $m['total_deposited'] = (float)$m['total_deposited'];
            $m['total_consumed'] = (float)$m['total_consumed'];
            $m['total_paid_out_of_pocket'] = (float)$m['total_paid_out_of_pocket'];
            $m['net_balance'] = ($m['total_deposited'] + $m['total_paid_out_of_pocket']) - $m['total_consumed'];
        }

        sendJson([
            'trip_id' => $tripId,
            'count' => count($members),
            'members' => $members
        ]);
    } catch (PDOException $e) {
        sendError('Failed to retrieve members: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    $input = getJsonInput();

    $tripId = isset($input['trip_id']) ? (int)$input['trip_id'] : 1;
    $name = isset($input['name']) ? trim($input['name']) : '';
    $phone = isset($input['phone']) ? trim($input['phone']) : null;
    $notes = isset($input['notes']) ? trim($input['notes']) : null;
    $isLeader = !empty($input['is_leader']) ? 1 : 0;
    $isActive = isset($input['is_active']) ? ((int)$input['is_active'] ? 1 : 0) : 1;
    $id = isset($input['id']) ? (int)$input['id'] : null;

    if (empty($name)) {
        sendError('Member name is required.', 422);
    }

    try {
        if ($id) {
            // Update existing member
            $stmt = $pdo->prepare("
                UPDATE members 
                SET name = :name, phone = :phone, notes = :notes, is_leader = :is_leader, is_active = :is_active
                WHERE id = :id AND trip_id = :trip_id
            ");
            $stmt->execute([
                'name' => $name,
                'phone' => $phone,
                'notes' => $notes,
                'is_leader' => $isLeader,
                'is_active' => $isActive,
                'id' => $id,
                'trip_id' => $tripId
            ]);
            sendJson(['message' => 'Member updated successfully', 'id' => $id]);
        } else {
            // Insert new member
            $stmt = $pdo->prepare("
                INSERT INTO members (trip_id, name, phone, notes, is_leader, is_active)
                VALUES (:trip_id, :name, :phone, :notes, :is_leader, :is_active)
            ");
            $stmt->execute([
                'trip_id' => $tripId,
                'name' => $name,
                'phone' => $phone,
                'notes' => $notes,
                'is_leader' => $isLeader,
                'is_active' => $isActive
            ]);
            $newId = (int)$pdo->lastInsertId();
            sendJson([
                'message' => 'Member added successfully',
                'id' => $newId,
                'member' => [
                    'id' => $newId,
                    'trip_id' => $tripId,
                    'name' => $name,
                    'phone' => $phone,
                    'notes' => $notes,
                    'is_leader' => (bool)$isLeader,
                    'is_active' => (bool)$isActive,
                    'total_deposited' => 0,
                    'total_consumed' => 0,
                    'total_paid_out_of_pocket' => 0,
                    'net_balance' => 0
                ]
            ], 201);
        }
    } catch (PDOException $e) {
        sendError('Failed to save member: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method not allowed.', 405);
}
