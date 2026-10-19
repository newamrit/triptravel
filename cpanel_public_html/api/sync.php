<?php
/**
 * TripPool Nepal - Batch Offline Sync Queue Endpoint (PHP / cPanel)
 * Processes queued member, deposit, and expense items into MySQL
 * using the exact TripPool schema and returns synced IDs.
 */

require_once __DIR__ . '/db.php';

$data = getRequestData();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'POST') {
    sendJson(['success' => false, 'error' => 'Method not allowed. Use POST.'], 405);
}

try {
    $items = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
    // Also support single queue item payload if posted directly
    if (empty($items) && !empty($data['type']) && !empty($data['payload'])) {
        $items = [$data];
    }

    $syncedIds = [];
    $pdo->beginTransaction();

    foreach ($items as $item) {
        $queueId = $item['id'] ?? ('q_' . uniqid());
        $type = strtolower(trim($item['type'] ?? ''));
        $payload = isset($item['payload']) && is_array($item['payload']) ? $item['payload'] : [];

        if (empty($payload)) {
            continue;
        }

        if ($type === 'member' || $type === 'add_member') {
            $name = trim($payload['name'] ?? '');
            if ($name !== '') {
                $stmt = $pdo->prepare("INSERT INTO members (trip_id, name, phone, notes, is_leader, is_active) VALUES (:trip_id, :name, :phone, :notes, :is_leader, 1)");
                $stmt->execute([
                    ':trip_id' => (int)($payload['trip_id'] ?? 1),
                    ':name' => $name,
                    ':phone' => $payload['phone'] ?? null,
                    ':notes' => $payload['notes'] ?? null,
                    ':is_leader' => !empty($payload['is_leader']) ? 1 : 0
                ]);
                $syncedIds[] = $queueId;
            }
        } elseif ($type === 'deposit' || $type === 'add_deposit') {
            $memberId = (int)($payload['member_id'] ?? $payload['memberId'] ?? 0);
            $amount = (float)($payload['amount'] ?? 0);
            if ($memberId > 0 && $amount > 0) {
                $memberName = trim($payload['member_name'] ?? $payload['memberName'] ?? '');
                if ($memberName === '') {
                    $mStmt = $pdo->prepare("SELECT name FROM members WHERE id = :id LIMIT 1");
                    $mStmt->execute([':id' => $memberId]);
                    $mRow = $mStmt->fetch();
                    $memberName = $mRow ? $mRow['name'] : 'Member';
                }

                $stmt = $pdo->prepare("INSERT INTO deposits (trip_id, member_id, member_name, amount, payment_method, notes, deposited_at) VALUES (:trip_id, :member_id, :member_name, :amount, :payment_method, :notes, :deposited_at)");
                $stmt->execute([
                    ':trip_id' => (int)($payload['trip_id'] ?? $payload['tripId'] ?? 1),
                    ':member_id' => $memberId,
                    ':member_name' => $memberName,
                    ':amount' => $amount,
                    ':payment_method' => $payload['payment_method'] ?? $payload['method'] ?? 'Cash',
                    ':notes' => $payload['notes'] ?? null,
                    ':deposited_at' => formatMysqlDateTime($payload['deposited_at'] ?? $payload['createdAt'] ?? null)
                ]);
                $syncedIds[] = $queueId;
            }
        } elseif ($type === 'expense' || $type === 'add_expense') {
            $amount = (float)($payload['amount'] ?? 0);
            if ($amount > 0) {
                $payerType = strtolower($payload['payer_type'] ?? $payload['paidByType'] ?? 'pool') === 'member' ? 'member' : 'pool';
                $payerMemberId = ($payerType === 'member' && !empty($payload['payer_member_id'] ?? $payload['paidByMemberId']))
                    ? (int)($payload['payer_member_id'] ?? $payload['paidByMemberId'])
                    : null;
                $payerMemberName = $payerType === 'pool'
                    ? 'Trip Pool'
                    : ($payload['payer_member_name'] ?? $payload['paidByMemberName'] ?? 'Member');

                $stmt = $pdo->prepare("INSERT INTO expenses (trip_id, payer_type, payer_member_id, payer_member_name, amount, category, description, split_type, receipt_image, expense_date) VALUES (:trip_id, :payer_type, :payer_member_id, :payer_member_name, :amount, :category, :description, :split_type, :receipt_image, :expense_date)");
                $stmt->execute([
                    ':trip_id' => (int)($payload['trip_id'] ?? $payload['tripId'] ?? 1),
                    ':payer_type' => $payerType,
                    ':payer_member_id' => $payerMemberId,
                    ':payer_member_name' => $payerMemberName,
                    ':amount' => $amount,
                    ':category' => $payload['category'] ?? 'Food & Snacks',
                    ':description' => $payload['description'] ?? $payload['title'] ?? 'Trip Expense',
                    ':split_type' => in_array(strtolower($payload['split_type'] ?? $payload['splitType'] ?? 'equal'), ['equal', 'custom', 'exact', 'shares'], true) ? strtolower($payload['split_type'] ?? $payload['splitType'] ?? 'equal') : 'equal',
                    ':receipt_image' => $payload['receipt_image'] ?? $payload['receiptUrl'] ?? null,
                    ':expense_date' => formatMysqlDateTime($payload['expense_date'] ?? $payload['createdAt'] ?? null)
                ]);

                $expId = (int)$pdo->lastInsertId();
                if (!empty($payload['splits']) && is_array($payload['splits'])) {
                    $splitStmt = $pdo->prepare("INSERT INTO expense_splits (expense_id, member_id, member_name, split_amount) VALUES (:expense_id, :member_id, :member_name, :split_amount)");
                    foreach ($payload['splits'] as $s) {
                        $mid = (int)($s['member_id'] ?? $s['memberId'] ?? 0);
                        if ($mid <= 0) continue;
                        $splitStmt->execute([
                            ':expense_id' => $expId,
                            ':member_id' => $mid,
                            ':member_name' => $s['member_name'] ?? $s['memberName'] ?? 'Member',
                            ':split_amount' => (float)($s['split_amount'] ?? $s['amount'] ?? 0)
                        ]);
                    }
                }
                $syncedIds[] = $queueId;
            }
        }
    }

    $pdo->commit();
    sendJson([
        'success' => true,
        'status' => 'ok',
        'syncedIds' => $syncedIds,
        'count' => count($syncedIds),
        'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
    ]);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJson(['success' => false, 'status' => 'error', 'error' => $e->getMessage()], 500);
}
