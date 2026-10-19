<?php
/**
 * TripPool Nepal - Expenses & Receipt Images Database REST API (PHP / cPanel)
 * Supports GET, POST, PUT, DELETE + POST _method override.
 * Stores receipt photos as Base64 data URLs in `expenses.receipt_image` LONGTEXT column.
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
                e.*,
                COALESCE(e.payer_member_name, m.name, 'Trip Pool') AS resolved_payer_name
            FROM expenses e
            LEFT JOIN members m ON e.payer_member_id = m.id
            ORDER BY e.expense_date DESC, e.id DESC
        ");
        $expenses = $stmt->fetchAll();
        $formatted = [];

        foreach ($expenses as $exp) {
            $splitStmt = $pdo->prepare("
                SELECT 
                    es.member_id,
                    COALESCE(NULLIF(es.member_name, 'Member'), m.name, 'Member') AS member_name,
                    es.split_amount
                FROM expense_splits es
                LEFT JOIN members m ON es.member_id = m.id
                WHERE es.expense_id = :exp_id
            ");
            $splitStmt->execute([':exp_id' => $exp['id']]);
            $splits = $splitStmt->fetchAll();

            $formattedSplits = array_map(function($s) {
                return [
                    "member_id" => (int)$s['member_id'],
                    "member_name" => $s['member_name'],
                    "split_amount" => (float)$s['split_amount']
                ];
            }, $splits);

            $formatted[] = [
                "id" => (int)$exp['id'],
                "trip_id" => (int)$exp['trip_id'],
                "payer_type" => $exp['payer_type'],
                "payer_member_id" => $exp['payer_member_id'] ? (int)$exp['payer_member_id'] : null,
                "payer_member_name" => $exp['resolved_payer_name'],
                "amount" => (float)$exp['amount'],
                "category" => $exp['category'],
                "description" => $exp['description'],
                "split_type" => $exp['split_type'],
                "receipt_image" => $exp['receipt_image'] ?? null,
                "expense_date" => $exp['expense_date'],
                "splits" => $formattedSplits
            ];
        }

        echo json_encode($formatted);
        break;

    case 'POST':
        $trip_id = (int)($data['trip_id'] ?? 1);
        $amount = (float)($data['amount'] ?? 0);
        $category = $data['category'] ?? 'Miscellaneous';
        $payer_type = ($data['payer_type'] ?? 'pool') === 'member' ? 'member' : 'pool';
        $payer_member_id = ($payer_type === 'member' && !empty($data['payer_member_id'])) ? (int)$data['payer_member_id'] : null;
        $payer_member_name = $payer_type === 'pool' ? 'Trip Pool' : ($data['payer_member_name'] ?? 'Member');
        $description = trim($data['description'] ?? '');
        $raw_split_type = $data['split_type'] ?? 'equal';
        $split_type = in_array($raw_split_type, ['equal', 'custom', 'exact', 'shares'], true) ? $raw_split_type : 'equal';
        $receipt_image = !empty($data['receipt_image']) ? $data['receipt_image'] : null;
        $expense_date = formatMysqlDateTime($data['expense_date'] ?? null);

        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid expense amount is required"]);
            exit();
        }

        if ($payer_type === 'member' && $payer_member_id) {
            $mStmt = $pdo->prepare("SELECT name FROM members WHERE id = :id LIMIT 1");
            $mStmt->execute([':id' => $payer_member_id]);
            $mRow = $mStmt->fetch();
            if ($mRow) {
                $payer_member_name = $mRow['name'];
            }
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO expenses (trip_id, payer_type, payer_member_id, payer_member_name, amount, category, description, split_type, receipt_image, expense_date) VALUES (:trip_id, :payer_type, :payer_member_id, :payer_member_name, :amount, :category, :description, :split_type, :receipt_image, :expense_date)");
            $stmt->execute([
                ':trip_id' => $trip_id,
                ':payer_type' => $payer_type,
                ':payer_member_id' => $payer_member_id,
                ':payer_member_name' => $payer_member_name,
                ':amount' => $amount,
                ':category' => $category,
                ':description' => $description,
                ':split_type' => $split_type,
                ':receipt_image' => $receipt_image,
                ':expense_date' => $expense_date
            ]);

            $expId = (int)$pdo->lastInsertId();

            $splitsToInsert = [];
            if (!empty($data['splits']) && is_array($data['splits'])) {
                $splitsToInsert = $data['splits'];
            } elseif (!empty($data['split_members']) && is_array($data['split_members'])) {
                $count = count($data['split_members']);
                $perPerson = round($amount / max(1, $count), 2);
                foreach ($data['split_members'] as $mid) {
                    $mStmt = $pdo->prepare("SELECT name FROM members WHERE id = :id LIMIT 1");
                    $mStmt->execute([':id' => (int)$mid]);
                    $mRow = $mStmt->fetch();
                    $splitsToInsert[] = [
                        'member_id' => (int)$mid,
                        'member_name' => $mRow ? $mRow['name'] : 'Member',
                        'split_amount' => $perPerson
                    ];
                }
            }

            if (!empty($splitsToInsert)) {
                $seenMembers = [];
                $splitStmt = $pdo->prepare("INSERT INTO expense_splits (expense_id, member_id, member_name, split_amount) VALUES (:expense_id, :member_id, :member_name, :split_amount)");
                foreach ($splitsToInsert as $s) {
                    $mid = (int)($s['member_id'] ?? 0);
                    if ($mid <= 0 || isset($seenMembers[$mid])) continue;
                    $seenMembers[$mid] = true;
                    $splitStmt->execute([
                        ':expense_id' => $expId,
                        ':member_id' => $mid,
                        ':member_name' => $s['member_name'] ?? 'Member',
                        ':split_amount' => (float)$s['split_amount']
                    ]);
                }
            }

            $pdo->commit();
            http_response_code(201);
            echo json_encode(["success" => true, "id" => $expId, "expense_date" => $expense_date]);
        } catch (Exception $ex) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $ex->getMessage()]);
        }
        break;

    case 'PUT':
        $id = (int)($_GET['id'] ?? $data['id'] ?? 0);
        if ($id <= 0 && !empty($_SERVER['PATH_INFO'])) {
            $path = explode('/', trim($_SERVER['PATH_INFO'], '/'));
            $id = (int)end($path);
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid Expense ID is required"]);
            exit();
        }

        $amount = (float)($data['amount'] ?? 0);
        $category = $data['category'] ?? 'Miscellaneous';
        $payer_type = ($data['payer_type'] ?? 'pool') === 'member' ? 'member' : 'pool';
        $payer_member_id = ($payer_type === 'member' && !empty($data['payer_member_id'])) ? (int)$data['payer_member_id'] : null;
        $payer_member_name = $payer_type === 'pool' ? 'Trip Pool' : ($data['payer_member_name'] ?? 'Member');
        $description = trim($data['description'] ?? '');
        $raw_split_type = $data['split_type'] ?? 'equal';
        $split_type = in_array($raw_split_type, ['equal', 'custom', 'exact', 'shares'], true) ? $raw_split_type : 'equal';
        $receipt_image = array_key_exists('receipt_image', $data) ? $data['receipt_image'] : null;
        $expense_date = formatMysqlDateTime($data['expense_date'] ?? null);

        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid expense amount is required"]);
            exit();
        }

        if ($payer_type === 'member' && $payer_member_id) {
            $mStmt = $pdo->prepare("SELECT name FROM members WHERE id = :id LIMIT 1");
            $mStmt->execute([':id' => $payer_member_id]);
            $mRow = $mStmt->fetch();
            if ($mRow) {
                $payer_member_name = $mRow['name'];
            }
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("UPDATE expenses SET 
                payer_type = :payer_type,
                payer_member_id = :payer_member_id,
                payer_member_name = :payer_member_name,
                amount = :amount,
                category = :category,
                description = :description,
                split_type = :split_type,
                receipt_image = :receipt_image,
                expense_date = :expense_date
                WHERE id = :id");
            $stmt->execute([
                ':payer_type' => $payer_type,
                ':payer_member_id' => $payer_member_id,
                ':payer_member_name' => $payer_member_name,
                ':amount' => $amount,
                ':category' => $category,
                ':description' => $description,
                ':split_type' => $split_type,
                ':receipt_image' => $receipt_image,
                ':expense_date' => $expense_date,
                ':id' => $id
            ]);

            if (!empty($data['splits']) && is_array($data['splits'])) {
                $pdo->prepare("DELETE FROM expense_splits WHERE expense_id = :id")->execute([':id' => $id]);
                $seenMembers = [];
                $splitStmt = $pdo->prepare("INSERT INTO expense_splits (expense_id, member_id, member_name, split_amount) VALUES (:expense_id, :member_id, :member_name, :split_amount)");
                foreach ($data['splits'] as $s) {
                    $mid = (int)($s['member_id'] ?? 0);
                    if ($mid <= 0 || isset($seenMembers[$mid])) continue;
                    $seenMembers[$mid] = true;
                    $splitStmt->execute([
                        ':expense_id' => $id,
                        ':member_id' => $mid,
                        ':member_name' => $s['member_name'] ?? 'Member',
                        ':split_amount' => (float)$s['split_amount']
                    ]);
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true, "id" => $id]);
        } catch (Exception $ex) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $ex->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = (int)($_GET['id'] ?? $data['id'] ?? 0);
        if ($id <= 0 && !empty($_SERVER['PATH_INFO'])) {
            $path = explode('/', trim($_SERVER['PATH_INFO'], '/'));
            $id = (int)end($path);
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid Expense ID is required"]);
            exit();
        }

        $pdo->prepare("DELETE FROM expense_splits WHERE expense_id = :id")->execute([':id' => $id]);
        $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["success" => true, "message" => "Expense {$id} deleted"]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method Not Allowed"]);
        break;
}
