<?php
/**
 * TripPool REST API: Settlement & Debt Simplification Engine
 * GET: Returns comprehensive pool balance, per-member balance, simplified debt settlements,
 * and a formatted summary ready for WhatsApp / Viber group export.
 */

if (file_exists(__DIR__ . '/db.php')) {
    require_once __DIR__ . '/db.php';
} else {
    require_once __DIR__ . '/../db.php';
}

$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed. Use GET.', 405);
}

$tripId = isset($_GET['trip_id']) ? (int)$_GET['trip_id'] : 1;

try {
    // 1. Fetch Trip details
    $tStmt = $pdo->prepare("SELECT * FROM trips WHERE id = :id");
    $tStmt->execute(['id' => $tripId]);
    $trip = $tStmt->fetch();
    if (!$trip) {
        sendError('Trip not found.', 404);
    }

    $currency = $trip['currency'] ?? 'Rs.';

    // 2. Fetch all members
    $mStmt = $pdo->prepare("SELECT id, name, phone, notes, is_leader, is_active FROM members WHERE trip_id = :trip_id ORDER BY is_leader DESC, name ASC");
    $mStmt->execute(['trip_id' => $tripId]);
    $members = $mStmt->fetchAll();

    if (empty($members)) {
        sendJson([
            'trip' => $trip,
            'pool_balance' => 0.0,
            'total_collected' => 0.0,
            'total_spent' => 0.0,
            'members' => [],
            'settlements' => [],
            'whatsapp_summary' => 'No members enrolled in this trip.'
        ]);
    }

    // Identify leader
    $leader = null;
    foreach ($members as $m) {
        if ($m['is_leader']) {
            $leader = $m;
            break;
        }
    }
    if (!$leader && !empty($members)) {
        $leader = $members[0]; // fallback to first member
    }

    // 3. Total deposits per member
    $dStmt = $pdo->prepare("
        SELECT member_id, SUM(amount) AS total_deposit
        FROM deposits
        WHERE trip_id = :trip_id
        GROUP BY member_id
    ");
    $dStmt->execute(['trip_id' => $tripId]);
    $depositsMap = $dStmt->fetchAll(PDO::FETCH_KEY_PAIR); // [member_id => total_deposit]

    // 4. Total expenses paid out-of-pocket per member
    $oopStmt = $pdo->prepare("
        SELECT payer_member_id, SUM(amount) AS total_oop
        FROM expenses
        WHERE trip_id = :trip_id AND payer_type = 'member' AND payer_member_id IS NOT NULL
        GROUP BY payer_member_id
    ");
    $oopStmt->execute(['trip_id' => $tripId]);
    $oopMap = $oopStmt->fetchAll(PDO::FETCH_KEY_PAIR); // [member_id => total_oop]

    // 5. Total pool expenses (paid from common fund)
    $poolExpStmt = $pdo->prepare("
        SELECT SUM(amount) AS total_pool_exp
        FROM expenses
        WHERE trip_id = :trip_id AND payer_type = 'pool'
    ");
    $poolExpStmt->execute(['trip_id' => $tripId]);
    $totalPoolSpent = (float)$poolExpStmt->fetchColumn();

    // 6. Category breakdown of expenses
    $catStmt = $pdo->prepare("
        SELECT category, SUM(amount) as cat_total
        FROM expenses
        WHERE trip_id = :trip_id
        GROUP BY category
    ");
    $catStmt->execute(['trip_id' => $tripId]);
    $categoryTotals = $catStmt->fetchAll(PDO::FETCH_KEY_PAIR);

    // 7. Consumed share per member from expense_splits
    $sStmt = $pdo->prepare("
        SELECT es.member_id, SUM(es.split_amount) AS total_share
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.trip_id = :trip_id
        GROUP BY es.member_id
    ");
    $sStmt->execute(['trip_id' => $tripId]);
    $shareMap = $sStmt->fetchAll(PDO::FETCH_KEY_PAIR);

    // 8. Calculate member balances
    $totalCollected = 0.0;
    $totalOopSpent = 0.0;
    $totalConsumed = 0.0;
    $memberStats = [];

    $creditors = []; // members who are owed money (net_balance > 0)
    $debtors = [];   // members who owe money (net_balance < 0)

    foreach ($members as $m) {
        $mId = (int)$m['id'];
        $deposited = isset($depositsMap[$mId]) ? (float)$depositsMap[$mId] : 0.0;
        $outOfPocket = isset($oopMap[$mId]) ? (float)$oopMap[$mId] : 0.0;
        $consumed = isset($shareMap[$mId]) ? (float)$shareMap[$mId] : 0.0;

        $totalContribution = $deposited + $outOfPocket;
        $netBalance = round($totalContribution - $consumed, 2);

        $totalCollected += $deposited;
        $totalOopSpent += $outOfPocket;
        $totalConsumed += $consumed;

        $stat = [
            'id' => $mId,
            'name' => $m['name'],
            'phone' => $m['phone'],
            'is_leader' => (bool)$m['is_leader'],
            'total_deposited' => round($deposited, 2),
            'total_paid_out_of_pocket' => round($outOfPocket, 2),
            'total_contributed' => round($totalContribution, 2),
            'total_consumed' => round($consumed, 2),
            'net_balance' => $netBalance,
            'status' => $netBalance > 0 ? 'refund_due' : ($netBalance < 0 ? 'owes_money' : 'settled')
        ];
        $memberStats[] = $stat;

        if ($netBalance > 0.01) {
            $creditors[] = ['id' => $mId, 'name' => $m['name'], 'is_leader' => (bool)$m['is_leader'], 'amount' => $netBalance];
        } elseif ($netBalance < -0.01) {
            $debtors[] = ['id' => $mId, 'name' => $m['name'], 'is_leader' => (bool)$m['is_leader'], 'amount' => abs($netBalance)];
        }
    }

    $totalSpent = $totalPoolSpent + $totalOopSpent;
    $poolCashRemaining = round($totalCollected - $totalPoolSpent, 2);

    // 9. Debt Simplification Engine (Greedy bilateral matching)
    $settlements = [];
    $tempCreditors = $creditors;
    $tempDebtors = $debtors;

    // First: Leader/Pool-centric settlement instructions
    // In a trip pool, debtors pay the leader/pool, and the leader refunds creditors from the pool cash!
    $poolSettlements = [];
    foreach ($memberStats as $ms) {
        if ($ms['id'] === (int)$leader['id']) {
            continue; // Leader is the central clearing house
        }
        if ($ms['net_balance'] > 0.01) {
            $poolSettlements[] = [
                'from_id' => (int)$leader['id'],
                'from_name' => "Leader ({$leader['name']}) / Pool",
                'to_id' => $ms['id'],
                'to_name' => $ms['name'],
                'amount' => round($ms['net_balance'], 2),
                'instruction' => "Leader refunds {$currency} " . number_format($ms['net_balance'], 2) . " to {$ms['name']}"
            ];
        } elseif ($ms['net_balance'] < -0.01) {
            $poolSettlements[] = [
                'from_id' => $ms['id'],
                'from_name' => $ms['name'],
                'to_id' => (int)$leader['id'],
                'to_name' => "Leader ({$leader['name']}) / Pool",
                'amount' => round(abs($ms['net_balance']), 2),
                'instruction' => "{$ms['name']} owes {$currency} " . number_format(abs($ms['net_balance']), 2) . " to Leader ({$leader['name']})"
            ];
        }
    }

    // Also calculate minimal direct peer-to-peer transfers (Splitwise style)
    $p2pSettlements = [];
    $cIdx = 0;
    $dIdx = 0;
    while ($cIdx < count($tempCreditors) && $dIdx < count($tempDebtors)) {
        $c = &$tempCreditors[$cIdx];
        $d = &$tempDebtors[$dIdx];

        $settleAmount = min($c['amount'], $d['amount']);
        if ($settleAmount > 0.01) {
            $p2pSettlements[] = [
                'from_id' => $d['id'],
                'from_name' => $d['name'],
                'to_id' => $c['id'],
                'to_name' => $c['name'],
                'amount' => round($settleAmount, 2),
                'instruction' => "{$d['name']} pays {$c['name']} {$currency} " . number_format($settleAmount, 2)
            ];
        }

        $c['amount'] -= $settleAmount;
        $d['amount'] -= $settleAmount;

        if ($c['amount'] < 0.01) $cIdx++;
        if ($d['amount'] < 0.01) $dIdx++;
    }

    // 10. Generate WhatsApp / Viber formatted message
    $lines = [];
    $lines[] = "🏔️ *" . mb_strtoupper($trip['title']) . " - EXPENSE SETTLEMENT* 🏔️";
    $lines[] = "📅 Date: " . date('Y-m-d H:i');
    $lines[] = "--------------------------------------";
    $lines[] = "💰 *Total Pool Collected:* {$currency} " . number_format($totalCollected, 2);
    $lines[] = "💸 *Total Expenses:* {$currency} " . number_format($totalSpent, 2);
    $lines[] = "   • Paid from Pool: {$currency} " . number_format($totalPoolSpent, 2);
    $lines[] = "   • Paid Out-of-Pocket: {$currency} " . number_format($totalOopSpent, 2);
    $lines[] = "💵 *Live Pool Cash in Hand:* {$currency} " . number_format($poolCashRemaining, 2);
    
    if (!empty($categoryTotals)) {
        $lines[] = "\n📊 *Category Breakdown:*";
        foreach ($categoryTotals as $cat => $amt) {
            $lines[] = "  • {$cat}: {$currency} " . number_format((float)$amt, 2);
        }
    }

    $lines[] = "\n👥 *Member Balances:*";
    foreach ($memberStats as $ms) {
        $net = $ms['net_balance'];
        if ($net > 0.01) {
            $verdict = "🟢 Gets Refund: {$currency} " . number_format($net, 2);
        } elseif ($net < -0.01) {
            $verdict = "🔴 Owes Pool: {$currency} " . number_format(abs($net), 2);
        } else {
            $verdict = "⚪ Fully Settled (Rs. 0.00)";
        }
        $lines[] = "• *{$ms['name']}*: Paid {$currency} " . number_format($ms['total_contributed'], 2) . 
                   " | Share {$currency} " . number_format($ms['total_consumed'], 2) . " ➔ {$verdict}";
    }

    $lines[] = "\n🤝 *Final Settlement Plan:*";
    if (empty($poolSettlements)) {
        $lines[] = "🎉 All accounts are balanced! No pending debts.";
    } else {
        foreach ($poolSettlements as $i => $ps) {
            $lines[] = ($i + 1) . ". " . $ps['instruction'];
        }
    }
    $lines[] = "\n_Calculated using TripPool App_";

    $whatsappSummary = implode("\n", $lines);

    sendJson([
        'trip' => $trip,
        'currency' => $currency,
        'summary' => [
            'total_collected' => round($totalCollected, 2),
            'total_spent' => round($totalSpent, 2),
            'total_pool_spent' => round($totalPoolSpent, 2),
            'total_member_spent' => round($totalOopSpent, 2),
            'pool_cash_remaining' => $poolCashRemaining,
            'category_breakdown' => $categoryTotals
        ],
        'members' => $memberStats,
        'settlements' => $poolSettlements,
        'p2p_settlements' => $p2pSettlements,
        'whatsapp_summary' => $whatsappSummary
    ]);
} catch (PDOException $e) {
    sendError('Settlement calculation failed: ' . $e->getMessage(), 500);
}
