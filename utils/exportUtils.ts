import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import XLSX from 'xlsx';
import { SECTIONS, MONTHS, MONTHS_SHORT } from '@/data/sections';
import {
  AllData, MonthData,
  getMonthData, getSectionTotal, getMonthTotal,
  getYearData, getYearTotal, getCategoryYearData,
  formatINRFull, formatINR,
} from '@/utils/storage';

function fmtCell(n: number): string {
  if (!n || n === 0) return '';
  return Math.round(n).toLocaleString('en-IN');
}

export async function exportToExcel(allData: AllData, year: number): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Export web pe supported nahi hai. Phone pe try karo.' };
  }
  try {
    const wb = XLSX.utils.book_new();

    const summaryRows: (string | number)[][] = [];
    summaryRows.push([
      `GHAR KA KHARCHA — Monthly Summary ${year}`, '', '', '', '', '', '', '', '', '', '', '', '', '',
    ]);
    summaryRows.push([]);
    summaryRows.push([
      'Category',
      ...MONTHS_SHORT,
      'Annual Total', 'Monthly Avg',
    ]);

    const monthTotals = Array.from({ length: 12 }, (_, i) =>
      getMonthTotal(getMonthData(allData, year, i + 1))
    );

    SECTIONS.forEach(sec => {
      const vals = Array.from({ length: 12 }, (_, i) =>
        getSectionTotal(getMonthData(allData, year, i + 1), sec.id)
      );
      const annualTotal = vals.reduce((a, b) => a + b, 0);
      if (annualTotal === 0) return;
      const avg = annualTotal / 12;
      summaryRows.push([
        sec.label,
        ...vals.map(fmtCell),
        fmtCell(annualTotal),
        fmtCell(avg),
      ]);
    });

    summaryRows.push([]);
    summaryRows.push([
      'KUL KHARCHA',
      ...monthTotals.map(fmtCell),
      fmtCell(monthTotals.reduce((a, b) => a + b, 0)),
      fmtCell(monthTotals.reduce((a, b) => a + b, 0) / 12),
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1['!cols'] = [{ wch: 28 }, ...Array(14).fill({ wch: 12 })];
    XLSX.utils.book_append_sheet(wb, ws1, 'Monthly Summary');

    for (let m = 1; m <= 12; m++) {
      const md = getMonthData(allData, year, m);
      const total = getMonthTotal(md);
      if (total === 0) continue;

      const rows: (string | number)[][] = [];
      rows.push([`${MONTHS[m - 1]} ${year} — Item-wise Kharcha`, '']);
      rows.push([]);
      rows.push(['Category / Item', 'Amount (₹)']);

      SECTIONS.forEach(sec => {
        const secTotal = getSectionTotal(md, sec.id);
        if (secTotal === 0) return;

        rows.push([`  ${sec.label.toUpperCase()}`, '']);
        const items = (md[sec.id] || {}) as Record<string, number>;
        const customItems = (md[`_custom_${sec.id}`] as string[]) || [];
        const allItemKeys = [...Object.keys(items), ...customItems.filter(i => !items[i])];
        allItemKeys.forEach(item => {
          const val = items[item] || 0;
          if (val > 0) rows.push([`    ${item}`, fmtCell(val)]);
        });
        rows.push([`  ${sec.label} Total`, fmtCell(secTotal)]);
        rows.push([]);
      });

      rows.push(['KUL KHARCHA', fmtCell(total)]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 35 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws, MONTHS_SHORT[m - 1]);
    }

    const years = [year - 2, year - 1, year].filter(y => y >= 2020);
    const compareRows: (string | number)[][] = [];
    compareRows.push(['GHAR KA KHARCHA — Year-wise Comparison', '', '', '', '']);
    compareRows.push([]);
    compareRows.push(['Category', ...years.map(y => `${y} Total`), 'Change %']);

    SECTIONS.forEach(sec => {
      const vals = years.map(y => getCategoryYearData(allData, y, sec.id));
      if (vals.every(v => v === 0)) return;
      const change = vals[0] > 0
        ? `${(((vals[vals.length - 1] - vals[0]) / vals[0]) * 100).toFixed(1)}%`
        : '—';
      compareRows.push([sec.label, ...vals.map(fmtCell), change]);
    });

    compareRows.push([]);
    compareRows.push([
      'KUL KHARCHA',
      ...years.map(y => fmtCell(getYearTotal(allData, y))),
      years[0] > 0
        ? `${(((getYearTotal(allData, years[years.length - 1]) - getYearTotal(allData, years[0])) / getYearTotal(allData, years[0])) * 100).toFixed(1)}%`
        : '—',
    ]);

    const ws3 = XLSX.utils.aoa_to_sheet(compareRows);
    ws3['!cols'] = [{ wch: 28 }, ...Array(4).fill({ wch: 16 })];
    XLSX.utils.book_append_sheet(wb, ws3, 'Year Comparison');

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const filename = `GharKaKharcha_${year}_${Date.now()}.xlsx`;
    const path = (FileSystem.cacheDirectory ?? '') + filename;
    await FileSystem.writeAsStringAsync(path, wbout, { encoding: FileSystem.EncodingType.Base64 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Ghar ka Kharcha ${year} — Excel Export`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    }
    return { success: true };
  } catch (e: any) {
    console.error('Excel export error:', e);
    return { success: false, error: e.message };
  }
}

export async function exportToPDF(allData: AllData, year: number, selectedMonth: number | null = null): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Export web pe supported nahi hai. Phone pe try karo.' };
  }
  try {
    const monthTotals = Array.from({ length: 12 }, (_, i) =>
      getMonthTotal(getMonthData(allData, year, i + 1))
    );
    const annualTotal = monthTotals.reduce((a, b) => a + b, 0);
    const prevYearTotal = getYearTotal(allData, year - 1);
    const yoyChange = prevYearTotal > 0
      ? (((annualTotal - prevYearTotal) / prevYearTotal) * 100).toFixed(1)
      : null;

    const catRows = SECTIONS.map(sec => {
      const vals = Array.from({ length: 12 }, (_, i) =>
        getSectionTotal(getMonthData(allData, year, i + 1), sec.id)
      );
      const total = vals.reduce((a, b) => a + b, 0);
      return { ...sec, vals, total };
    }).filter(s => s.total > 0);

    const monthsToShow = selectedMonth
      ? [selectedMonth]
      : Array.from({ length: 12 }, (_, i) => i + 1).filter(m => monthTotals[m - 1] > 0);

    let itemDetailHTML = '';
    for (const m of monthsToShow) {
      const md = getMonthData(allData, year, m);
      const mTotal = getMonthTotal(md);
      if (mTotal === 0) continue;

      itemDetailHTML += `
        <div class="month-section">
          <div class="month-header">
            <span>${MONTHS[m - 1]} ${year}</span>
            <span class="month-total">${formatINRFull(mTotal)}</span>
          </div>`;

      for (const sec of SECTIONS) {
        const secTotal = getSectionTotal(md, sec.id);
        if (secTotal === 0) continue;
        const secItems = (md[sec.id] || {}) as Record<string, number>;
        const customItems = (md[`_custom_${sec.id}`] as string[]) || [];
        const allItemKeys = [...Object.keys(secItems), ...customItems.filter(i => !secItems[i])];
        const itemsWithVal = allItemKeys.filter(i => (secItems[i] || 0) > 0);
        if (itemsWithVal.length === 0) continue;

        itemDetailHTML += `
          <div class="sec-block">
            <div class="sec-title" style="background:${sec.color}22;color:${sec.color}">
              ${sec.label}
              <span style="float:right">${formatINRFull(secTotal)}</span>
            </div>
            <table class="item-table">`;

        itemsWithVal.forEach(item => {
          const val = secItems[item] || 0;
          itemDetailHTML += `
              <tr>
                <td class="item-name">${item}</td>
                <td class="item-val">${formatINRFull(val)}</td>
              </tr>`;
        });

        itemDetailHTML += `</table></div>`;
      }
      itemDetailHTML += `</div>`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; color: #1A1A2E; background: #fff; font-size: 12px; }
  .cover { background: linear-gradient(135deg, #1A1A2E 0%, #2D1B69 100%); padding: 40px 30px 30px; color: white; margin-bottom: 20px; }
  .cover h1 { font-size: 26px; color: #C084FC; margin-bottom: 6px; }
  .cover .sub { font-size: 13px; color: #A78BFA; margin-bottom: 20px; }
  .cover-stats { display: flex; gap: 20px; flex-wrap: wrap; }
  .cstat { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 20px; min-width: 130px; }
  .cstat .lbl { font-size: 10px; color: #A78BFA; margin-bottom: 4px; text-transform: uppercase; }
  .cstat .val { font-size: 20px; font-weight: 700; color: #fff; }
  .cstat .ch { font-size: 11px; margin-top: 3px; }
  .up { color: #FCA5A5; } .dn { color: #6EE7B7; }
  .section { padding: 0 20px; margin-bottom: 24px; }
  h2 { font-size: 15px; color: #4C1D95; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #EDE9FE; }
  .summary-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .summary-table th { background: #7C3AED; color: #fff; padding: 7px 8px; text-align: right; font-size: 10px; }
  .summary-table th:first-child { text-align: left; }
  .summary-table td { padding: 6px 8px; border-bottom: 1px solid #EDE9FE; text-align: right; }
  .summary-table td:first-child { text-align: left; font-weight: 500; }
  .summary-table tr:nth-child(even) td { background: #F9F7FF; }
  .summary-table tr.total td { background: #4C1D95; color: #fff; font-weight: 700; font-size: 12px; }
  .summary-table .share { color: #7C3AED; font-weight: 600; }
  .bar-chart { margin: 0 0 20px; }
  .bar-row { display: flex; align-items: center; margin-bottom: 5px; gap: 8px; }
  .bar-lbl { width: 28px; font-size: 10px; color: #6B7280; text-align: right; }
  .bar-bg { flex: 1; background: #EDE9FE; border-radius: 4px; height: 16px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #7C3AED, #C084FC); border-radius: 4px; }
  .bar-val { width: 70px; font-size: 10px; color: #374151; font-weight: 600; text-align: right; }
  .month-section { margin-bottom: 20px; page-break-inside: avoid; }
  .month-header { background: #4C1D95; color: #fff; padding: 8px 12px; font-size: 13px; font-weight: 700; display: flex; justify-content: space-between; border-radius: 8px 8px 0 0; }
  .month-total { color: #C084FC; }
  .sec-block { border: 1px solid #EDE9FE; border-top: none; }
  .sec-title { padding: 5px 12px; font-size: 11px; font-weight: 700; display: flex; justify-content: space-between; }
  .item-table { width: 100%; border-collapse: collapse; }
  .item-table tr:nth-child(even) td { background: #FAFAFA; }
  .item-name { padding: 4px 12px 4px 20px; font-size: 11px; color: #374151; }
  .item-val { padding: 4px 12px; font-size: 11px; color: #1A1A2E; font-weight: 600; text-align: right; width: 90px; }
  .footer { text-align: center; font-size: 10px; color: #9CA3AF; margin-top: 30px; padding: 16px; border-top: 1px solid #EDE9FE; }
</style>
</head>
<body>
<div class="cover">
  <div class="cover-stats" style="margin-bottom:8px">
    <div style="flex:1">
      <h1>&#127968; Ghar ka Kharcha</h1>
      <div class="sub">Household Expense Report &mdash; ${year}</div>
    </div>
  </div>
  <div class="cover-stats">
    <div class="cstat">
      <div class="lbl">${year} Annual Total</div>
      <div class="val">${formatINR(annualTotal)}</div>
      ${yoyChange !== null
        ? `<div class="ch ${parseFloat(yoyChange) > 0 ? 'up' : 'dn'}">${parseFloat(yoyChange) > 0 ? '↑' : '↓'} ${Math.abs(parseFloat(yoyChange))}% vs ${year - 1}</div>`
        : '<div class="ch" style="color:#A78BFA">—</div>'}
    </div>
    <div class="cstat">
      <div class="lbl">Monthly Average</div>
      <div class="val">${formatINR(annualTotal / 12)}</div>
      <div class="ch" style="color:#A78BFA">Per month</div>
    </div>
    <div class="cstat">
      <div class="lbl">Active Months</div>
      <div class="val">${monthTotals.filter(x => x > 0).length}</div>
      <div class="ch" style="color:#A78BFA">of 12</div>
    </div>
    <div class="cstat">
      <div class="lbl">Categories</div>
      <div class="val">${catRows.length}</div>
      <div class="ch" style="color:#A78BFA">with expenses</div>
    </div>
  </div>
</div>
<div class="section">
  <h2>Monthly Kharcha — ${year}</h2>
  <div class="bar-chart">
    ${monthTotals.map((t, i) => {
      const maxT = Math.max(...monthTotals, 1);
      const pct = ((t / maxT) * 100).toFixed(1);
      return `<div class="bar-row">
        <div class="bar-lbl">${MONTHS_SHORT[i]}</div>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="bar-val">${t > 0 ? formatINR(t) : '—'}</div>
      </div>`;
    }).join('')}
  </div>
</div>
<div class="section">
  <h2>Category-wise Annual Summary</h2>
  <table class="summary-table">
    <thead>
      <tr>
        <th>Category</th>
        <th>Annual Total</th>
        <th>Monthly Avg</th>
        <th>Share %</th>
      </tr>
    </thead>
    <tbody>
      ${catRows.map(c => `
        <tr>
          <td>${c.label}</td>
          <td>${formatINRFull(c.total)}</td>
          <td>${formatINR(c.total / 12)}</td>
          <td class="share">${annualTotal > 0 ? ((c.total / annualTotal) * 100).toFixed(1) : 0}%</td>
        </tr>`).join('')}
      <tr class="total">
        <td>KUL KHARCHA</td>
        <td>${formatINRFull(annualTotal)}</td>
        <td>${formatINR(annualTotal / 12)}</td>
        <td>100%</td>
      </tr>
    </tbody>
  </table>
</div>
<div class="section">
  <h2>Item-wise Kharcha Detail</h2>
  ${itemDetailHTML || '<p style="color:#9CA3AF;font-size:12px">Koi data nahi mila.</p>'}
</div>
<div class="footer">
  Ghar ka Kharcha App &mdash; Generated on ${new Date().toLocaleDateString('en-IN')} &mdash; Apka ghar, apka hisaab &#127968;
</div>
</body>
</html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const filename = `GharKaKharcha_${year}_${selectedMonth ? MONTHS_SHORT[selectedMonth - 1] : 'Annual'}.pdf`;
    const destPath = (FileSystem.cacheDirectory ?? '') + filename;
    await FileSystem.moveAsync({ from: uri, to: destPath });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(destPath, {
        mimeType: 'application/pdf',
        dialogTitle: `Ghar ka Kharcha ${year} — PDF Report`,
        UTI: 'com.adobe.pdf',
      });
    }
    return { success: true };
  } catch (e: any) {
    console.error('PDF export error:', e);
    return { success: false, error: e.message };
  }
}
