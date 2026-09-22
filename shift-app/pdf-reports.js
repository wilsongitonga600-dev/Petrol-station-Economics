// ============================================================
// PDF report generation — Shift & Lubes/LPG reports.
// Uses jsPDF 1.5.3 + jspdf-autotable 3.5.12 (a known-stable pairing;
// newer autotable versions break against jsPDF v1's UMD build).
// Loaded after those two CDN scripts on admin-dashboard.html.
// ============================================================

const KES = (v) => 'KES ' + Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SHELL_RED = [237, 28, 36];
const SHELL_DARK = [40, 44, 54];

function reportHeader(doc, title, fromDate, toDate) {
  doc.setFontSize(16);
  doc.setTextColor(...SHELL_RED);
  doc.text('Shell Station — ' + title, 40, 45);
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Period: ${fromDate} to ${toDate}`, 40, 62);
  doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, 40, 76);
  doc.setDrawColor(...SHELL_RED);
  doc.setLineWidth(1.5);
  doc.line(40, 86, doc.internal.pageSize.getWidth() - 40, 86);
}

function sectionTitle(doc, text, y) {
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(text, 40, y);
  return y + 10;
}

// ---------- Shift report ----------
// records: rows from shift_reconciliations, each with .profiles.full_name joined in
function generateShiftReportPDF(fromDate, toDate, records) {
  const doc = new jsPDF();
  reportHeader(doc, 'Shift Reconciliation Report', fromDate, toDate);

  const finalRecords = records.filter((r) => !r.is_checkpoint);

  // ---- Aggregate totals ----
  let totalFuelSales = 0, totalMoney = 0, totalVariance = 0;
  let mpesa = 0, cash = 0, card = 0, shellCard = 0, invoices = 0;

  finalRecords.forEach((r) => {
    totalFuelSales += Number(r.total_fuel_sales) || 0;
    totalMoney += Number(r.total_money) || 0;
    totalVariance += Number(r.variance) || 0;
    const m = r.money || {};
    const mpesaSale = (Number(m.mpesaClose) || 0) - (Number(m.mpesaOpen) || 0);
    mpesa += mpesaSale > 0 ? mpesaSale : 0;
    cash += Number(m.cashDrop) || 0;
    card += Number(m.card) || 0;
    shellCard += Number(m.shellCard) || 0;
    invoices += Number(m.invoices) || 0;
  });

  let y = 105;
  y = sectionTitle(doc, 'Summary', y);
  doc.autoTable({
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: SHELL_DARK },
    head: [['Metric', 'Value']],
    body: [
      ['Total fuel sales', KES(totalFuelSales)],
      ['Total money received', KES(totalMoney)],
      ['Net variance', (totalVariance >= 0 ? '+' : '-') + KES(Math.abs(totalVariance))],
      ['Finalized shifts', String(finalRecords.length)],
    ],
    margin: { left: 40, right: 40 },
    styles: { fontSize: 10 },
  });

  y = doc.lastAutoTable.finalY + 20;
  y = sectionTitle(doc, 'Payment channel breakdown', y);
  doc.autoTable({
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: SHELL_DARK },
    head: [['Channel', 'Amount']],
    body: [
      ['M-Pesa', KES(mpesa)],
      ['Cash', KES(cash)],
      ['Card', KES(card)],
      ['Shell Card', KES(shellCard)],
      ['Invoice', KES(invoices)],
    ],
    margin: { left: 40, right: 40 },
    styles: { fontSize: 10 },
  });

  // ---- Per-attendant breakdown ----
  const byAttendant = {};
  finalRecords.forEach((r) => {
    const name = r.profiles?.full_name || 'Unknown';
    if (!byAttendant[name]) byAttendant[name] = { shifts: 0, sales: 0, money: 0, variance: 0 };
    byAttendant[name].shifts += 1;
    byAttendant[name].sales += Number(r.total_fuel_sales) || 0;
    byAttendant[name].money += Number(r.total_money) || 0;
    byAttendant[name].variance += Number(r.variance) || 0;
  });

  y = doc.lastAutoTable.finalY + 20;
  y = sectionTitle(doc, 'By attendant', y);
  doc.autoTable({
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: SHELL_DARK },
    head: [['Attendant', 'Shifts', 'Fuel sales', 'Money in', 'Variance']],
    body: Object.entries(byAttendant).map(([name, a]) => [
      name, String(a.shifts), KES(a.sales), KES(a.money),
      (a.variance >= 0 ? '+' : '-') + KES(Math.abs(a.variance)),
    ]),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9 },
  });

  // ---- Full detail table (new page) ----
  doc.addPage();
  reportHeader(doc, 'Shift Detail', fromDate, toDate);
  const sorted = finalRecords.slice().sort((a, b) => a.shift_date.localeCompare(b.shift_date));
  doc.autoTable({
    startY: 100,
    theme: 'striped',
    headStyles: { fillColor: SHELL_DARK },
    head: [['Date', 'Attendant', 'Shift', 'Fuel sales', 'Money in', 'Variance']],
    body: sorted.map((r) => [
      r.shift_date,
      r.profiles?.full_name || 'Unknown',
      r.shift_name || '',
      KES(r.total_fuel_sales),
      KES(r.total_money),
      (Number(r.variance) >= 0 ? '+' : '-') + KES(Math.abs(Number(r.variance))),
    ]),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8 },
  });

  doc.save(`Shift-Report_${fromDate}_to_${toDate}.pdf`);
}

// ---------- Lubes & LPG report ----------
// records: rows from lubes_lpg_sales, each with .profiles.full_name joined in
function generateLubesReportPDF(fromDate, toDate, records) {
  const doc = new jsPDF();
  reportHeader(doc, 'Lubes & LPG Sales Report', fromDate, toDate);

  const finalRecords = records.filter((r) => !r.is_checkpoint);

  let lubesTotal = 0, lpgTotal = 0, grandTotal = 0;
  const productTotals = {}; // productName -> { qty, revenue }

  finalRecords.forEach((r) => {
    lubesTotal += Number(r.lubes_total) || 0;
    lpgTotal += Number(r.lpg_total) || 0;
    grandTotal += Number(r.grand_total) || 0;

    [r.lubes, r.lpg].forEach((group) => {
      if (!group) return;
      Object.entries(group).forEach(([productName, p]) => {
        const opening = Number(p.opening) || 0;
        const closing = Number(p.closing) || 0;
        const price = Number(p.price) || 0;
        const qty = opening - closing;
        if (qty <= 0) return;
        const revenue = qty * price;
        if (!productTotals[productName]) productTotals[productName] = { qty: 0, revenue: 0 };
        productTotals[productName].qty += qty;
        productTotals[productName].revenue += revenue;
      });
    });
  });

  let y = 105;
  y = sectionTitle(doc, 'Summary', y);
  doc.autoTable({
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: SHELL_DARK },
    head: [['Metric', 'Value']],
    body: [
      ['Lubes total', KES(lubesTotal)],
      ['LPG total', KES(lpgTotal)],
      ['Grand total', KES(grandTotal)],
      ['Finalized entries', String(finalRecords.length)],
    ],
    margin: { left: 40, right: 40 },
    styles: { fontSize: 10 },
  });

  // ---- Top selling products ----
  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 15);

  y = doc.lastAutoTable.finalY + 20;
  y = sectionTitle(doc, 'Top selling products', y);
  doc.autoTable({
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: SHELL_DARK },
    head: [['Product', 'Quantity sold', 'Revenue']],
    body: topProducts.length
      ? topProducts.map(([name, p]) => [name, p.qty.toFixed(1), KES(p.revenue)])
      : [['No sales recorded in this period', '', '']],
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9 },
  });

  // ---- Per-attendant breakdown ----
  const byAttendant = {};
  finalRecords.forEach((r) => {
    const name = r.profiles?.full_name || 'Unknown';
    if (!byAttendant[name]) byAttendant[name] = { entries: 0, lubes: 0, lpg: 0, grand: 0 };
    byAttendant[name].entries += 1;
    byAttendant[name].lubes += Number(r.lubes_total) || 0;
    byAttendant[name].lpg += Number(r.lpg_total) || 0;
    byAttendant[name].grand += Number(r.grand_total) || 0;
  });

  y = doc.lastAutoTable.finalY + 20;
  y = sectionTitle(doc, 'By attendant', y);
  doc.autoTable({
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: SHELL_DARK },
    head: [['Attendant', 'Entries', 'Lubes', 'LPG', 'Grand total']],
    body: Object.entries(byAttendant).map(([name, a]) => [
      name, String(a.entries), KES(a.lubes), KES(a.lpg), KES(a.grand),
    ]),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9 },
  });

  doc.save(`Lubes-LPG-Report_${fromDate}_to_${toDate}.pdf`);
}
  
