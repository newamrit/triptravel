import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip, Member, Deposit, Expense, SettlementData } from '../types';

export interface PdfExportOptions {
  includeCategoryBreakdown?: boolean;
  includeDailyTimeline?: boolean;
  includeItemizedExpenses?: boolean;
  includeMemberSettlement?: boolean;
  includeReceiptPhotos?: boolean;
  filterCategory?: string;
  filterDayKey?: string;
  preparedBy?: string;
}

// Clean text helper so jsPDF standard Helvetica never prints garbled symbols
function cleanPdfText(input: string | undefined | null): string {
  if (!input) return '';
  return String(input)
    .replace(/•/g, ' - ')
    .replace(/➔|→/g, '->')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

function formatMoney(amount: number, currency = 'Rs.'): string {
  const safeCurr = cleanPdfText(currency) || 'Rs.';
  const num = Number(amount) || 0;
  return `${safeCurr} ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function exportTripExpensesToPdf(
  trip: Trip,
  members: Member[],
  deposits: Deposit[],
  expenses: Expense[],
  settlement: SettlementData,
  options: PdfExportOptions = {}
): Promise<string> {
  const {
    includeCategoryBreakdown = true,
    includeDailyTimeline = true,
    includeItemizedExpenses = true,
    includeMemberSettlement = true,
    includeReceiptPhotos = true,
    filterCategory = 'all',
    filterDayKey = 'all',
    preparedBy = 'Trip Leader / Admin',
  } = options;

  const currency = cleanPdfText(trip.currency) || 'Rs.';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Filter expenses if a specific category or day filter was requested
  const targetExpenses = expenses
    .filter((exp) => {
      if (filterCategory !== 'all' && exp.category !== filterCategory) return false;
      if (filterDayKey !== 'all') {
        const expDay = (exp.expense_date || '').substring(0, 10);
        if (expDay !== filterDayKey) return false;
      }
      return true;
    })
    .sort((a, b) => {
      return (
        new Date(a.expense_date.replace(' ', 'T')).getTime() -
        new Date(b.expense_date.replace(' ', 'T')).getTime()
      );
    });

  // Establish Day 1..N map across all trip dates
  const allDatesSorted = Array.from(
    new Set(expenses.map((e) => (e.expense_date || '').substring(0, 10)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const dayNumberMap: Record<string, number> = {};
  allDatesSorted.forEach((d, idx) => {
    dayNumberMap[d] = idx + 1;
  });

  const totalFilteredSpent = targetExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const filteredPoolSpent = targetExpenses
    .filter((e) => e.payer_type === 'pool')
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const filteredOopSpent = targetExpenses
    .filter((e) => e.payer_type === 'member')
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  // =========================================================================
  // 1. TOP BRANDED HEADER BANNER
  // =========================================================================
  doc.setFillColor(15, 23, 42); // Slate 900 (#0f172a)
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Emerald Accent Stripe
  doc.setFillColor(5, 150, 105); // Emerald 600 (#059669)
  doc.rect(0, 40.5, pageWidth, 1.5, 'F');

  // Kicker
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(52, 211, 153); // Emerald 400
  doc.text('TRIPPOOL OFFICIAL EXPENSE & WHERE-MONEY-WAS-SPENT STATEMENT', margin, 11);

  // Trip Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanPdfText(trip.title) || 'Trip Expense Report', margin, 20);

  // Route & Dates
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  const routeLine = `${cleanPdfText(trip.destination)}   |   Trip Dates: ${cleanPdfText(trip.start_date)} to ${cleanPdfText(trip.end_date)}`;
  doc.text(routeLine, margin, 27);

  // Meta Info (Prepared By + Timestamp)
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  const nowStr = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const filterNote =
    filterCategory !== 'all' || filterDayKey !== 'all'
      ? `   |   Filter: ${filterCategory !== 'all' ? filterCategory : 'All Categories'} (${filterDayKey !== 'all' ? filterDayKey : 'All Days'})`
      : '';
  doc.text(
    `Prepared by: ${cleanPdfText(preparedBy)}   |   Generated: ${cleanPdfText(nowStr)}${cleanPdfText(filterNote)}`,
    margin,
    34.5
  );

  // =========================================================================
  // 2. EXECUTIVE KPI SUMMARY CARDS
  // =========================================================================
  let currentY = 48;
  const cardGap = 3.5;
  const cardWidth = (pageWidth - margin * 2 - cardGap * 3) / 4;
  const cardHeight = 22;

  const kpiCards = [
    {
      label: 'TOTAL POOL COLLECTED',
      value: formatMoney(settlement.summary.total_collected, currency),
      sub: `${deposits.length} deposit record(s)`,
      borderColor: [16, 185, 129] as [number, number, number],
    },
    {
      label: 'TOTAL MONEY SPENT',
      value: formatMoney(totalFilteredSpent, currency),
      sub: `${targetExpenses.length} expense bill(s)`,
      borderColor: [245, 158, 11] as [number, number, number],
    },
    {
      label: 'PAID FROM POOL vs OOP',
      value: formatMoney(filteredPoolSpent, currency),
      sub: `OOP: ${formatMoney(filteredOopSpent, currency)}`,
      borderColor: [2, 132, 199] as [number, number, number],
    },
    {
      label: 'POOL CASH REMAINING',
      value: formatMoney(settlement.summary.pool_cash_remaining, currency),
      sub:
        settlement.summary.pool_cash_remaining >= 0
          ? 'Live custodian balance'
          : 'Pool deficit (top-up needed)',
      borderColor:
        settlement.summary.pool_cash_remaining >= 0
          ? ([5, 150, 105] as [number, number, number])
          : ([239, 68, 68] as [number, number, number]),
    },
  ];

  kpiCards.forEach((card, idx) => {
    const x = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    // Top color bar on card
    doc.setFillColor(card.borderColor[0], card.borderColor[1], card.borderColor[2]);
    doc.rect(x, currentY, cardWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 3, currentY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(card.value, x + 3, currentY + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(card.sub, x + 3, currentY + 18.8);
  });

  currentY += cardHeight + 8;

  // =========================================================================
  // 3. SECTION 1: WHERE THE MONEY WAS SPENT (CATEGORY BREAKDOWN)
  // =========================================================================
  if (includeCategoryBreakdown && targetExpenses.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Where the Money Was Spent (Category Breakdown)', margin, currentY);
    currentY += 2.5;

    const catStats: Record<
      string,
      { count: number; pool: number; oop: number; total: number }
    > = {};

    targetExpenses.forEach((exp) => {
      const cat = cleanPdfText(exp.category) || 'Miscellaneous';
      if (!catStats[cat]) {
        catStats[cat] = { count: 0, pool: 0, oop: 0, total: 0 };
      }
      const amt = Number(exp.amount) || 0;
      catStats[cat].count += 1;
      if (exp.payer_type === 'pool') catStats[cat].pool += amt;
      else catStats[cat].oop += amt;
      catStats[cat].total += amt;
    });

    const catRows = Object.entries(catStats)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([cat, st], i) => {
        const pct = totalFilteredSpent > 0 ? ((st.total / totalFilteredSpent) * 100).toFixed(1) : '0.0';
        return [
          String(i + 1),
          cat,
          String(st.count),
          formatMoney(st.pool, currency),
          formatMoney(st.oop, currency),
          formatMoney(st.total, currency),
          `${pct}%`,
        ];
      });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Spending Category', 'Bills', 'Paid from Pool', 'Out-of-Pocket', 'Total Spent', 'Share %']],
      body: catRows,
      foot: [
        [
          '',
          'TOTAL SPENT ACROSS CATEGORIES',
          String(targetExpenses.length),
          formatMoney(filteredPoolSpent, currency),
          formatMoney(filteredOopSpent, currency),
          formatMoney(totalFilteredSpent, currency),
          '100.0%',
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 8,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        2: { cellWidth: 14, halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 18, halign: 'right' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // =========================================================================
  // 4. SECTION 2: DAY-BY-DAY SPENDING TIMELINE
  // =========================================================================
  if (includeDailyTimeline && targetExpenses.length > 0) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Day-by-Day Spending Breakdown', margin, currentY);
    currentY += 2.5;

    const dayMap: Record<
      string,
      { count: number; pool: number; oop: number; total: number; catTotals: Record<string, number> }
    > = {};

    targetExpenses.forEach((exp) => {
      const dateKey = (exp.expense_date || '').substring(0, 10) || 'Unknown';
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = { count: 0, pool: 0, oop: 0, total: 0, catTotals: {} };
      }
      const amt = Number(exp.amount) || 0;
      dayMap[dateKey].count += 1;
      if (exp.payer_type === 'pool') dayMap[dateKey].pool += amt;
      else dayMap[dateKey].oop += amt;
      dayMap[dateKey].total += amt;
      dayMap[dateKey].catTotals[exp.category] = (dayMap[dateKey].catTotals[exp.category] || 0) + amt;
    });

    const dayRows = Object.entries(dayMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, st]) => {
        const dayNum = dayNumberMap[dateKey] || 1;
        const parsed = new Date(`${dateKey}T00:00:00`);
        const formattedDate = !isNaN(parsed.getTime())
          ? parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          : dateKey;
        const topCat =
          Object.entries(st.catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Miscellaneous';

        return [
          `Day ${dayNum}`,
          cleanPdfText(formattedDate),
          String(st.count),
          cleanPdfText(topCat),
          formatMoney(st.pool, currency),
          formatMoney(st.oop, currency),
          formatMoney(st.total, currency),
        ];
      });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Trip Day', 'Date', 'Items', 'Primary Category', 'Pool Paid', 'Out-of-Pocket', 'Daily Total']],
      body: dayRows,
      foot: [
        [
          '',
          'TOTAL ACROSS TRIP DAYS',
          String(targetExpenses.length),
          '',
          formatMoney(filteredPoolSpent, currency),
          formatMoney(filteredOopSpent, currency),
          formatMoney(totalFilteredSpent, currency),
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 8,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 16, fontStyle: 'bold' },
        2: { cellWidth: 13, halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // =========================================================================
  // 5. SECTION 3: COMPLETE ITEMIZED EXPENSE LEDGER (ALL EXPENSES MADE)
  // =========================================================================
  if (includeItemizedExpenses) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `3. Complete Itemized Expense Ledger (${targetExpenses.length} Expense Record${targetExpenses.length === 1 ? '' : 's'})`,
      margin,
      currentY
    );
    currentY += 2.5;

    const expenseRows = targetExpenses.map((exp, idx) => {
      const dateKey = (exp.expense_date || '').substring(0, 10);
      const dayNum = dayNumberMap[dateKey] ? `Day ${dayNumberMap[dateKey]}` : '';
      const dObj = new Date(exp.expense_date.replace(' ', 'T'));
      const dateFormatted = !isNaN(dObj.getTime())
        ? `${dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${dObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
        : cleanPdfText(exp.expense_date);

      const paidByLabel =
        exp.payer_type === 'pool'
          ? 'Trip Pool'
          : `${cleanPdfText(exp.payer_member_name) || 'Member'} (OOP)`;

      const splitCount = exp.splits?.length || members.filter((m) => m.is_active).length || 1;
      const firstSplitAmt = exp.splits?.[0]?.split_amount ?? 0;
      const isUnequalSplit =
        exp.split_type === 'exact' ||
        exp.split_type === 'shares' ||
        Boolean(exp.splits?.some((s) => Math.abs((Number(s.split_amount) || 0) - Number(firstSplitAmt)) > 0.05));

      let splitSummary = '';
      if (isUnequalSplit && exp.splits?.length) {
        splitSummary = exp.splits
          .map(
            (s) =>
              `${cleanPdfText((s.member_name || 'Member').split(' ')[0])}: ${Number(s.split_amount).toLocaleString()}`
          )
          .join(', ');
      } else {
        const perPerson =
          exp.splits && exp.splits.length > 0
            ? exp.splits[0].split_amount
            : Math.round((Number(exp.amount) / splitCount) * 100) / 100;

        const splitNames =
          exp.split_type === 'custom' && exp.splits?.length
            ? exp.splits.map((s) => cleanPdfText((s.member_name || 'Member').split(' ')[0])).join(', ')
            : `All (${splitCount})`;

        splitSummary = `${splitNames} @ ${currency} ${Number(perPerson).toLocaleString()}/p`;
      }
      const receiptFlag = exp.receipt_image ? ' [Receipt]' : '';

      return [
        String(idx + 1),
        `${dayNum ? dayNum + ' - ' : ''}${cleanPdfText(dateFormatted)}`,
        `${cleanPdfText(exp.description)}${receiptFlag}`,
        cleanPdfText(exp.category),
        paidByLabel,
        splitSummary,
        formatMoney(exp.amount, currency),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        [
          '#',
          'Day & Time',
          'Description / Where Spent',
          'Category',
          'Paid By',
          'Split & Per-Person Share',
          'Amount',
        ],
      ],
      body:
        expenseRows.length > 0
          ? expenseRows
          : [['-', '-', 'No expenses logged for selected filter', '-', '-', '-', formatMoney(0, currency)]],
      foot: [
        [
          '',
          '',
          `GRAND TOTAL (${targetExpenses.length} EXPENSES)`,
          '',
          '',
          '',
          formatMoney(totalFilteredSpent, currency),
        ],
      ],
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.4,
        textColor: [15, 23, 42],
        cellPadding: 2.2,
      },
      footStyles: {
        fillColor: [15, 23, 42],
        textColor: [52, 211, 153],
        fontSize: 8,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 26 },
        2: { cellWidth: 44, fontStyle: 'bold' },
        3: { cellWidth: 26 },
        4: { cellWidth: 24 },
        5: { cellWidth: 30 },
        6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // =========================================================================
  // 6. SECTION 4: MEMBER DEPOSITS, FAIR SHARE & FINAL SETTLEMENT
  // =========================================================================
  if (includeMemberSettlement) {
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Member Pool Deposits, Consumption & Net Settlement', margin, currentY);
    currentY += 2.5;

    const memberRows = settlement.members.map((m, idx) => {
      const statusLabel =
        m.status === 'receives'
          ? 'Receives Refund'
          : m.status === 'owes'
          ? 'Owes Pool'
          : 'Settled';
      const netPrefix = m.net_balance > 0 ? '+' : '';
      return [
        String(idx + 1),
        cleanPdfText(m.name),
        formatMoney(m.deposited_to_pool, currency),
        formatMoney(m.paid_out_of_pocket, currency),
        formatMoney(m.total_contributed, currency),
        formatMoney(m.total_consumed, currency),
        `${netPrefix}${formatMoney(m.net_balance, currency)}`,
        statusLabel,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        [
          '#',
          'Member Name',
          'Pool Deposit',
          'OOP Paid',
          'Total Paid',
          'Share Spent',
          'Net Balance',
          'Status',
        ],
      ],
      body: memberRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Settlement Transfers Table (Who Owes Whom)
    if (settlement.settlements.length > 0) {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 18;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(5, 150, 105);
      doc.text('Final Settlement Action Plan (Who Pays Whom):', margin, currentY);
      currentY += 2;

      const transferRows = settlement.settlements.map((s, idx) => [
        String(idx + 1),
        cleanPdfText(s.from_name),
        'Pays ->',
        cleanPdfText(s.to_name),
        s.type === 'pay_to_pool' ? 'Top-up Pool Deficit' : 'Refund from Pool / Leader',
        formatMoney(s.amount, currency),
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['#', 'From', 'Action', 'To', 'Settlement Type', 'Transfer Amount']],
        body: transferRows,
        theme: 'grid',
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 7.8,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          5: { halign: 'right', fontStyle: 'bold' },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // =========================================================================
  // 7. SECTION 5: PHYSICAL RECEIPT PHOTOS APPENDIX (OPTIONAL)
  // =========================================================================
  const receiptExpenses = targetExpenses.filter((e) => Boolean(e.receipt_image));
  if (includeReceiptPhotos && receiptExpenses.length > 0) {
    doc.addPage();
    currentY = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `5. Attached Physical Receipt Photos (${receiptExpenses.length} Verified Bill${receiptExpenses.length === 1 ? '' : 's'})`,
      margin,
      currentY
    );
    currentY += 6;

    const colWidth = (pageWidth - margin * 2 - 6) / 2;
    const boxHeight = 76;

    receiptExpenses.forEach((exp, idx) => {
      const col = idx % 2;
      if (col === 0 && idx > 0) {
        currentY += boxHeight + 6;
      }
      if (currentY + boxHeight > pageHeight - 16) {
        doc.addPage();
        currentY = 18;
      }

      const x = margin + col * (colWidth + 6);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x, currentY, colWidth, boxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const titleLine = `#${idx + 1}: ${cleanPdfText(exp.description).substring(0, 34)}`;
      doc.text(titleLine, x + 3, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `${formatMoney(exp.amount, currency)}  |  ${cleanPdfText(exp.category)}  |  ${cleanPdfText((exp.expense_date || '').substring(0, 16))}`,
        x + 3,
        currentY + 10.5
      );

      if (exp.receipt_image) {
        try {
          const imgFormat = exp.receipt_image.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(
            exp.receipt_image,
            imgFormat,
            x + 3,
            currentY + 13,
            colWidth - 6,
            boxHeight - 16,
            undefined,
            'FAST'
          );
        } catch {
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text('[Receipt image attached in digital ledger]', x + 6, currentY + 35);
        }
      }
    });
  }

  // =========================================================================
  // 8. FOOTER PAGE NUMBERS & AUDIT STAMP ON EVERY PAGE
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${cleanPdfText(trip.title)} - Official TripPool Expense Statement`,
      margin,
      pageHeight - 6.5
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6.5, {
      align: 'right',
    });
  }

  const safeTripSlug = (cleanPdfText(trip.title) || 'TripPool')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const dateStamp = new Date().toISOString().substring(0, 10);
  const filename = `${safeTripSlug}_Expenses_Report_${dateStamp}.pdf`;

  doc.save(filename);
  return filename;
}
