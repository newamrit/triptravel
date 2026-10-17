import { Trip, Member, Deposit, Expense, SettlementData, SettlementDebt } from '../types';

export function calculateSettlement(
  trip: Trip,
  members: Member[],
  deposits: Deposit[],
  expenses: Expense[]
): SettlementData {
  const currency = trip.currency || 'Rs.';

  // 1. Identify trip leader
  const leader = members.find(m => m.is_leader) || members[0] || {
    id: 1,
    trip_id: trip.id,
    name: 'Trip Leader',
    is_leader: true,
    is_active: true
  };

  // 2. Map deposits by member
  const depositByMember: Record<number, number> = {};
  let totalCollected = 0;
  for (const dep of deposits) {
    depositByMember[dep.member_id] = (depositByMember[dep.member_id] || 0) + dep.amount;
    totalCollected += dep.amount;
  }

  // 3. Map out-of-pocket expenses and pool expenses
  const oopByMember: Record<number, number> = {};
  let totalPoolSpent = 0;
  let totalMemberSpent = 0;
  const categoryBreakdown: Record<string, number> = {};

  for (const exp of expenses) {
    categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;

    if (exp.payer_type === 'pool' || !exp.payer_member_id) {
      totalPoolSpent += exp.amount;
    } else {
      oopByMember[exp.payer_member_id] = (oopByMember[exp.payer_member_id] || 0) + exp.amount;
      totalMemberSpent += exp.amount;
    }
  }

  // 4. Map consumed shares from splits
  const consumedByMember: Record<number, number> = {};
  for (const exp of expenses) {
    if (exp.splits && exp.splits.length > 0) {
      for (const sp of exp.splits) {
        consumedByMember[sp.member_id] = (consumedByMember[sp.member_id] || 0) + sp.split_amount;
      }
    } else {
      // Fallback if splits were not expanded: equal split among all active members
      const activeM = members.filter(m => m.is_active);
      const share = activeM.length > 0 ? exp.amount / activeM.length : 0;
      for (const m of activeM) {
        consumedByMember[m.id] = (consumedByMember[m.id] || 0) + share;
      }
    }
  }

  // 5. Compute per-member balances
  const enrichedMembers: Member[] = members.map(m => {
    const deposited = depositByMember[m.id] || 0;
    const oop = oopByMember[m.id] || 0;
    const totalContributed = deposited + oop;
    const consumed = consumedByMember[m.id] || 0;
    const net = Math.round((totalContributed - consumed) * 100) / 100;

    let status: 'refund_due' | 'owes_money' | 'settled' = 'settled';
    if (net > 0.01) status = 'refund_due';
    else if (net < -0.01) status = 'owes_money';

    return {
      ...m,
      total_deposited: deposited,
      total_paid_out_of_pocket: oop,
      total_consumed: consumed,
      net_balance: net,
      status
    };
  });

  const totalSpent = totalPoolSpent + totalMemberSpent;
  const poolCashRemaining = Math.round((totalCollected - totalPoolSpent) * 100) / 100;

  // 6. Pool/Leader settlements
  const poolSettlements: SettlementDebt[] = [];
  for (const m of enrichedMembers) {
    if (m.id === leader.id) continue;
    const net = m.net_balance || 0;
    if (net > 0.01) {
      poolSettlements.push({
        from_id: leader.id,
        from_name: `Leader (${leader.name}) / Pool`,
        to_id: m.id,
        to_name: m.name,
        amount: Math.round(net * 100) / 100,
        instruction: `Leader refunds ${currency} ${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${m.name}`
      });
    } else if (net < -0.01) {
      poolSettlements.push({
        from_id: m.id,
        from_name: m.name,
        to_id: leader.id,
        to_name: `Leader (${leader.name}) / Pool`,
        amount: Math.round(Math.abs(net) * 100) / 100,
        instruction: `${m.name} owes ${currency} ${Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to Leader (${leader.name})`
      });
    }
  }

  // 7. Direct Peer-to-Peer simplified debts
  const creditors = enrichedMembers
    .filter(m => (m.net_balance || 0) > 0.01)
    .map(m => ({ id: m.id, name: m.name, amount: m.net_balance || 0 }));
  const debtors = enrichedMembers
    .filter(m => (m.net_balance || 0) < -0.01)
    .map(m => ({ id: m.id, name: m.name, amount: Math.abs(m.net_balance || 0) }));

  const p2pSettlements: SettlementDebt[] = [];
  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const c = creditors[cIdx];
    const d = debtors[dIdx];
    const settleAmt = Math.min(c.amount, d.amount);

    if (settleAmt > 0.01) {
      p2pSettlements.push({
        from_id: d.id,
        from_name: d.name,
        to_id: c.id,
        to_name: c.name,
        amount: Math.round(settleAmt * 100) / 100,
        instruction: `${d.name} pays ${c.name} ${currency} ${settleAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      });
    }

    c.amount -= settleAmt;
    d.amount -= settleAmt;

    if (c.amount < 0.01) cIdx++;
    if (d.amount < 0.01) dIdx++;
  }

  // 8. Generate WhatsApp formatted plain text
  const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const lines: string[] = [];
  lines.push(`🏔️ *${trip.title.toUpperCase()} - EXPENSE SETTLEMENT* 🏔️`);
  lines.push(`📅 Date: ${dateStr}`);
  lines.push(`--------------------------------------`);
  lines.push(`💰 *Total Pool Collected:* ${currency} ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`💸 *Total Expenses:* ${currency} ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`   • From Pool: ${currency} ${totalPoolSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`   • Out-of-Pocket: ${currency} ${totalMemberSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`💵 *Live Pool Cash in Hand:* ${currency} ${poolCashRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  if (Object.keys(categoryBreakdown).length > 0) {
    lines.push(`\n📊 *Category Breakdown:*`);
    for (const [cat, amt] of Object.entries(categoryBreakdown)) {
      lines.push(`  • ${cat}: ${currency} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
  }

  lines.push(`\n👥 *Member Balances:*`);
  for (const m of enrichedMembers) {
    const net = m.net_balance || 0;
    let verdict = `⚪ Settled (${currency} 0.00)`;
    if (net > 0.01) {
      verdict = `🟢 Gets Refund: ${currency} ${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (net < -0.01) {
      verdict = `🔴 Owes Pool: ${currency} ${Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const contributed = (m.total_deposited || 0) + (m.total_paid_out_of_pocket || 0);
    lines.push(`• *${m.name}*: Contributed ${currency} ${contributed.toLocaleString()} | Share ${currency} ${(m.total_consumed || 0).toLocaleString()} ➔ ${verdict}`);
  }

  lines.push(`\n🤝 *Settlement Instructions:*`);
  if (poolSettlements.length === 0) {
    lines.push(`🎉 All accounts are balanced! No pending debts.`);
  } else {
    poolSettlements.forEach((ps, idx) => {
      lines.push(`${idx + 1}. ${ps.instruction}`);
    });
  }
  lines.push(`\n_Calculated using TripPool App_`);

  const whatsapp_summary = lines.join('\n');

  return {
    trip,
    currency,
    summary: {
      total_collected: totalCollected,
      total_spent: totalSpent,
      total_pool_spent: totalPoolSpent,
      total_member_spent: totalMemberSpent,
      pool_cash_remaining: poolCashRemaining,
      category_breakdown: categoryBreakdown
    },
    members: enrichedMembers,
    settlements: poolSettlements,
    p2p_settlements: p2pSettlements,
    whatsapp_summary
  };
}
