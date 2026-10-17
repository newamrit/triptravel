<?php
/**
 * TripPool REST API: Expenses
 * GET: Retrieve expenses list along with split participants and payer details
 * POST: Transactionally create an expense and distribute splits among members
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
    $category = isset($_GET['category']) ? trim($_GET['category']) : null;
    $payerType = isset($_GET['payer_type']) ? trim($_GET['payer_type']) : null;

    try {
        $sql = "
            SELECT 
                e.id,
                e.trip_id,
                e.payer_type,
                e.payer_member_id,
                m.name AS payer_member_name,
                e.amount,
                e.category,
                e.description,
                e.split_type,
                e.expense_date,
                e.created_at
            FROM expenses e
            LEFT JOIN members m ON e.payer_member_id = m.id
            WHERE e.trip_id = :trip_id
        ";
        $params = ['trip_id' => $tripId];

        if ($category) {
            $sql .= " AND e.category = :category";
            $params['category'] = $category;
        }
        if ($payerType) {
            $sql .= " AND e.payer_type = :payer_type";
            $params['payer_type'] = $payerType;
        }

        $sql .= " ORDER BY e.expense_date DESC, e.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $expenses = $stmt->fetchAll();

        // If there are expenses, attach the splits for each expense
        if (!empty($expenses)) {
            $expenseIds = array_column($expenses, 'id');
            $placeholders = implode(',', array_fill(0, count($expenseIds), '?'));
            
            $splitStmt = $pdo->prepare("
                SELECT 
                    es.expense_id,
                    es.member_id,
                    m.name AS member_name,
                    es.split_amount
                FROM expense_splits es
                JOIN members m ON es.member_id = m.id
                WHERE es.expense_id IN ($placeholders)
                ORDER BY m.name ASC
            ");
            $splitStmt->execute($expenseIds);
            $allSplits = $splitStmt->fetchAll();

            $splitsByExpense = [];
            foreach ($allSplits as $s) {
                $expId = (int)$s['expense_id'];
                $splitsByExpense[$expId][] = [
                    'member_id' => (int)$s['member_id'],
                    'member_name' => $s['member_name'],
                    'split_amount' => (float)$s['split_amount']
                ];
            }

            foreach ($expenses as &$e) {
                $e['id'] = (int)$e['id'];
                $e['trip_id'] = (int)$e['trip_id'];
                $e['amount'] = (float)$e['amount'];
                $e['payer_member_id'] = $e['payer_member_id'] ? (int)$e['payer_member_id'] : null;
                $e['splits'] = $splitsByExpense[$e['id']] ?? [];
                $e['split_count'] = count($e['splits']);
            }
        }

        // Aggregate statistics
        $totalPoolSpent = 0.0;
        $totalMemberSpent = 0.0;
        $categoryTotals = [];

        foreach ($expenses as $e) {
            if ($e['payer_type'] === 'pool') {
                $totalPoolSpent += $e['amount'];
            } else {
                $totalMemberSpent += $e['amount'];
            }
            $cat = $e['category'];
            $categoryTotals[$cat] = ($categoryTotals[$cat] ?? 0.0) + $e['amount'];
        }

        sendJson([
            'trip_id' => $tripId,
            'count' => count($expenses),
            'total_spent' => round($totalPoolSpent + $totalMemberSpent, 2),
            'total_pool_spent' => round($totalPoolSpent, 2),
            'total_member_spent' => round($totalMemberSpent, 2),
            'category_breakdown' => $categoryTotals,
            'expenses' => $expenses
        ]);
    } catch (PDOException $e) {
        sendError('Failed to fetch expenses: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    $input = getJsonInput();

    $tripId = isset($input['trip_id']) ? (int)$input['trip_id'] : 1;
    $amount = isset($input['amount']) ? (float)$input['amount'] : 0.0;
    $category = isset($input['category']) ? trim($input['category']) : 'Food & Snacks';
    $payerType = isset($input['payer_type']) && $input['payer_type'] === 'member' ? 'member' : 'pool';
    $payerMemberId = ($payerType === 'member' && !empty($input['payer_member_id'])) ? (int)$input['payer_member_id'] : null;
    $description = isset($input['description']) ? trim($input['description']) : '';
    $splitType = isset($input['split_type']) && $input['split_type'] === 'custom' ? 'custom' : 'equal';
    $expenseDate = !empty($input['expense_date']) ? $input['expense_date'] : date('Y-m-d H:i:s');
    $splitMemberIds = isset($input['split_members']) && is_array($input['split_members']) ? $input['split_members'] : [];
    $customSplits = isset($input['custom_splits']) && is_array($input['custom_splits']) ? $input['custom_splits'] : null;

    // Validation
    if ($amount <= 0) {
        sendError('Expense amount must be greater than zero.', 422);
    }
    if (empty($description)) {
        sendError('Description/note is required.', 422);
    }
    if ($payerType === 'member' && !$payerMemberId) {
        sendError('Payer member must be specified when paid out-of-pocket.', 422);
    }

    $validCategories = [
        'Fuel',
        'Food & Snacks',
        'Hotel/Homestay',
        'Permits/Entry',
        'Vehicle Maintenance/Spares',
        'Miscellaneous'
    ];
    if (!in_array($category, $validCategories, true)) {
        $category = 'Miscellaneous';
    }

    try {
        // Fetch active trip members to calculate splits
        $mStmt = $pdo->prepare("SELECT id, name FROM members WHERE trip_id = :trip_id AND is_active = 1");
        $mStmt->execute(['trip_id' => $tripId]);
        $activeMembers = $mStmt->fetchAll();

        if (empty($activeMembers)) {
            sendError('No active members found for this trip.', 400);
        }

        $allMemberIds = array_column($activeMembers, 'id');

        // Determine split members
        if (empty($splitMemberIds)) {
            // Default to all active members
            $targetMemberIds = $allMemberIds;
        } else {
            // Filter to only valid members for this trip
            $targetMemberIds = array_values(array_intersect($splitMemberIds, $allMemberIds));
            if (empty($targetMemberIds)) {
                sendError('No valid members selected for expense split.', 422);
            }
        }

        // Calculate split allocations
        $splitAllocations = []; // member_id => split_amount
        $participantCount = count($targetMemberIds);

        if ($splitType === 'custom' && $customSplits) {
            // User provided custom split amounts
            $customTotal = 0.0;
            foreach ($targetMemberIds as $mid) {
                $customAmt = isset($customSplits[$mid]) ? (float)$customSplits[$mid] : 0.0;
                $splitAllocations[$mid] = round($customAmt, 2);
                $customTotal += $splitAllocations[$mid];
            }
            // Allow minor floating rounding tolerance of 0.05
            if (abs($customTotal - $amount) > 0.05) {
                sendError("Custom split amounts sum to {$customTotal}, which does not match total amount {$amount}.", 422);
            }
        } else {
            // Equal split across selected participants
            $baseShare = floor(($amount / $participantCount) * 100) / 100;
            $remainder = round($amount - ($baseShare * $participantCount), 2);
            $remainderCents = (int)round($remainder * 100);

            foreach ($targetMemberIds as $idx => $mid) {
                // Add 0.01 cent to the first N participants to cleanly handle rounding
                $extra = ($idx < $remainderCents) ? 0.01 : 0.0;
                $splitAllocations[$mid] = round($baseShare + $extra, 2);
            }
        }

        // Begin transaction
        $pdo->beginTransaction();

        $expStmt = $pdo->prepare("
            INSERT INTO expenses (trip_id, payer_type, payer_member_id, amount, category, description, split_type, expense_date)
            VALUES (:trip_id, :payer_type, :payer_member_id, :amount, :category, :description, :split_type, :expense_date)
        ");
        $expStmt->execute([
            'trip_id' => $tripId,
            'payer_type' => $payerType,
            'payer_member_id' => $payerMemberId,
            'amount' => $amount,
            'category' => $category,
            'description' => $description,
            'split_type' => $splitType,
            'expense_date' => $expenseDate
        ]);

        $expenseId = (int)$pdo->lastInsertId();

        $splitInsertStmt = $pdo->prepare("
            INSERT INTO expense_splits (expense_id, member_id, split_amount)
            VALUES (:expense_id, :member_id, :split_amount)
        ");

        $recordedSplits = [];
        foreach ($splitAllocations as $mId => $splitAmt) {
            $splitInsertStmt->execute([
                'expense_id' => $expenseId,
                'member_id' => $mId,
                'split_amount' => $splitAmt
            ]);
            $recordedSplits[] = [
                'member_id' => $mId,
                'split_amount' => $splitAmt
            ];
        }

        $pdo->commit();

        sendJson([
            'message' => 'Expense logged successfully',
            'id' => $expenseId,
            'expense' => [
                'id' => $expenseId,
                'trip_id' => $tripId,
                'payer_type' => $payerType,
                'payer_member_id' => $payerMemberId,
                'amount' => round($amount, 2),
                'category' => $category,
                'description' => $description,
                'split_type' => $splitType,
                'expense_date' => $expenseDate,
                'splits' => $recordedSplits
            ]
        ], 201);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendError('Failed to record expense: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method not allowed.', 405);
}
