<?php
/**
 * TripPool Nepal - Expenses Database REST API (PHP / cPanel)
 */

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT * FROM expenses ORDER BY expense_date DESC");
        $expenses = $stmt->fetchAll();
        $formatted = [];

        foreach ($expenses as $exp) {
            $splitStmt = $pdo->prepare("SELECT member_id, member_name, split_amount FROM expense_splits WHERE expense_id = :exp_id");
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
                "payer_member_name" => $exp['payer_member_name'],
                "amount" => (float)$exp['amount'],
                "category" => $exp['category'],
                "description" => $exp['description'],
                "split_type" => $exp['split_type'],
                "receipt_image" => $exp['receipt_image'],
                "expense_date" => $exp['expense_date'],
                "splits" => $formattedSplits
            ];
        }

        echo json_encode($formatted);
        break;

    case 'POST':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        $trip_id = (int)($data['trip_id'] ?? 1);
        $amount = (float)($data['amount'] ?? 0);
        $category = $data['category'] ?? 'Miscellaneous';
        $payer_type = $data['payer_type'] ?? 'pool';
        $payer_member_id = $data['payer_member_id'] ? (int)$data['payer_member_id'] : null;
        $payer_member_name = $data['payer_member_name'] ?? 'Trip Pool';
        $description = $data['description'] ?? '';
        $split_type = $data['split_type'] ?? 'equal';
        $receipt_image = $data['receipt_image'] ?? null;
        $expense_date = $data['expense_date'] ?? date('Y-m-d H:i:s');

        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid expense amount is required"]);
            exit();
        }

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

        if (isset($data['splits']) && is_array($data['splits'])) {
            $splitStmt = $pdo->prepare("INSERT INTO expense_splits (expense_id, member_id, member_name, split_amount) VALUES (:expense_id, :member_id, :member_name, :split_amount)");
            foreach ($data['splits'] as $s) {
                $splitStmt->execute([
                    ':expense_id' => $expId,
                    ':member_id' => (int)$s['member_id'],
                    ':member_name' => $s['member_name'],
                    ':split_amount' => (float)$s['split_amount']
                ]);
            }
        }

        http_response_code(201);
        echo json_encode(array_merge(["id" => $expId], $data));
        break;

    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            $path = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
            $id = (int)end($path);
        }

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid Expense ID is required"]);
            exit();
        }

        $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["success" => true, "message" => "Expense {$id} deleted"]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method Not Allowed"]);
        break;
}
