/**
 * @file print.js
 * @description Utilities for generating and printing invoices via a hidden iframe.
 *              This approach avoids dependencies like react-to-print and ensures
 *              pixel-perfect printing by injecting raw HTML directly.
 *
 * Methods:
 * - printInvoice: Prints a standard A4/Letter size invoice.
 * - printThermalInvoice: Prints an 80mm thermal receipt format.
 */
export function printInvoice(invoice) {
  if (!invoice) return;

  const fmt = (n) => `${Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const STATUS = { paid: 'مدفوعة', partial: 'جزئية', unpaid: 'غير مدفوعة', PAID: 'مدفوعة', PARTIAL: 'جزئية', UNPAID: 'غير مدفوعة' };
  const METHOD = { cash: 'كاش', credit: 'آجل', CASH: 'كاش', CREDIT: 'آجل' };

  const invId = (invoice._id || invoice.invoiceId || '').slice(-8).toUpperCase();

  const fmtQty = (qty, unitsPerBox = 1) => {
    if (qty === 0) return '٠';
    if (unitsPerBox <= 1) return `${qty} قطعة`;
    const boxes = Math.floor(qty / unitsPerBox);
    const pieces = qty % unitsPerBox;
    if (boxes > 0 && pieces === 0) return `${boxes} علبة`;
    if (boxes === 0) return `${pieces} قطعة`;
    return `${boxes} علبة و ${pieces} قطعة`;
  };

  const itemsRows = (invoice.items || []).map((it) => {
    const name = it.productId?.name || 'منتج محذوف';
    const qty  = it.quantity || 0;
    const unitsPerBox = it.productId?.unitsPerBox || 1;
    const price = it.unitPrice || 0;
    const total = qty * price;
    const returned = qty === 0 ? ' <span style="font-size:16px;color:#64748b">(مُرجَع)</span>' : '';
    const rowStyle = qty === 0 ? 'opacity:0.45;' : '';
    return `
      <tr style="border-bottom:1px solid #e2e8f0;${rowStyle}">
        <td style="padding:12px 14px;font-weight:900;font-size:18px">${name}${returned}</td>
        <td style="padding:12px 14px;text-align:center;font-family:monospace;font-weight:900;font-size:18px">${fmtQty(qty, unitsPerBox)}</td>
        <td style="padding:12px 14px;text-align:center;font-family:monospace;font-weight:900;font-size:20px">${fmt(price)}</td>
        <td style="padding:12px 14px;text-align:center;font-family:monospace;font-weight:900;font-size:20px">${fmt(total)}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>فاتورة #${invId}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#fff;color:#000;padding:36px;direction:rtl;font-size:18px}
    h1,h2,h3{margin:0}
    table{width:100%;border-collapse:collapse}
    @media print{body{padding:20px}@page{margin:15mm}}
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #000;padding-bottom:18px;margin-bottom:20px">
    <div>
      <h1 style="font-size:26px;font-weight:900;color:#000">شركة مارس</h1>
      <h2 style="font-size:18px;font-weight:700;color:#000">شركة أولاد رجب</h2>
    </div>
    <div style="text-align:left">
      <h1 style="font-size:32px;font-weight:900;color:#000">فاتورة</h1>
      <p style="font-size:13px;font-weight:700;color:#000">رقم: #${invId}</p>
    </div>
  </div>

  <!-- Info Grid -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
    <div style="border:1.5px solid #cbd5e1;border-radius:8px;padding:10px">
      <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:4px">العميل</div>
      <div style="font-weight:700;font-size:16px;color:#000">${invoice.customerId?.name || 'عميل نقدي'}</div>
      ${invoice.customerId?.phone ? `<div style="font-size:14px;font-family:monospace;margin-top:3px">${invoice.customerId.phone}</div>` : ''}
    </div>
    <div style="border:1.5px solid #cbd5e1;border-radius:8px;padding:10px">
      <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:4px">التاريخ</div>
      <div style="font-weight:700;font-size:14px;color:#000">${fmtDate(invoice.createdAt)}</div>
    </div>
    <div style="border:1.5px solid #cbd5e1;border-radius:8px;padding:10px">
      <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:4px">طريقة الدفع</div>
      <div style="font-weight:700;font-size:16px;color:#000">${METHOD[invoice.paymentMethod] || invoice.paymentMethod || ''}</div>
    </div>
    <div style="border:1.5px solid #cbd5e1;border-radius:8px;padding:10px">
      <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:4px">الحالة</div>
      <div style="font-weight:700;font-size:16px;color:#000">${STATUS[invoice.status] || invoice.status || ''}</div>
    </div>
  </div>

  <!-- Items Table -->
  <div style="border:1.5px solid #cbd5e1;border-radius:8px;overflow:hidden;margin-bottom:20px">
    <table>
      <thead style="background:#f1f5f9;border-bottom:2px solid #cbd5e1">
        <tr>
          <th style="padding:12px 14px;text-align:right;font-weight:700;font-size:16px">المنتج</th>
          <th style="padding:12px 14px;text-align:center;font-weight:700;font-size:16px">الكمية</th>
          <th style="padding:12px 14px;text-align:center;font-weight:700;font-size:16px">سعر الوحدة</th>
          <th style="padding:12px 14px;text-align:center;font-weight:700;font-size:16px">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>
  </div>

  <!-- Totals -->
  <div style="border:1.5px solid #cbd5e1;border-radius:8px;padding:16px;max-width:320px;margin-right:auto;margin-bottom:30px">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-weight:700;font-size:16px">
      <span>الإجمالي الفرعي:</span><span style="font-family:monospace">${fmt(invoice.subTotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-weight:700;font-size:16px">
      <span>الخصم:</span><span style="font-family:monospace">${fmt(invoice.discount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;border-top:2px solid #000;padding-top:10px;margin-top:8px;font-weight:900;font-size:20px">
      <span>الصافي:</span><span style="font-family:monospace">${fmt(invoice.totalAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:10px;font-weight:700;font-size:16px">
      <span>المدفوع:</span><span style="font-family:monospace;color:#16a34a">${fmt(invoice.paidAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;font-weight:900;font-size:18px">
      <span>المتبقي:</span><span style="font-family:monospace;color:${(invoice.dueAmount || 0) > 0 ? '#dc2626' : '#16a34a'}">${fmt(invoice.dueAmount)}</span>
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top:2px dashed #94a3b8;padding-top:18px;display:flex;justify-content:center">
    <div style="display:inline-flex;align-items:center;gap:14px;border:1.5px solid #cbd5e1;border-radius:999px;padding:10px 24px">
      <span style="font-weight:900;font-size:18px">مازن رجب</span>
      <span style="font-weight:700;font-size:18px">|</span>
      <span style="font-family:monospace;font-weight:700;font-size:17px;letter-spacing:2px" dir="ltr">01025210536 - 01158325071</span>
    </div>
  </div>

</body>
</html>`;

  // Use a hidden iframe and reuse it to avoid blank PDF on slow saves
  let iframe = document.getElementById('invoice-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'invoice-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);
  }

  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  // Wait for content to render, then print
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print failed', e);
    }
    // Intentionally omitting iframe removal to allow PDF generation to complete in the background
  }, 600);
}

/**
 * printThermalInvoice — formats and prints the invoice specifically for 80mm thermal printers.
 * Uses 100% width so the printer driver handles the 80mm sizing.
 */
export function printThermalInvoice(invoice) {
  if (!invoice) return;

  const fmt = (n) => `${Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('ar-EG', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const STATUS = { paid: 'مدفوعة', partial: 'جزئية', unpaid: 'غير مدفوعة', PAID: 'مدفوعة', PARTIAL: 'جزئية', UNPAID: 'غير مدفوعة' };
  const METHOD = { cash: 'كاش', credit: 'آجل', CASH: 'كاش', CREDIT: 'آجل' };

  const invId = (invoice._id || invoice.invoiceId || '').slice(-8).toUpperCase();

  const fmtQty = (qty, unitsPerBox = 1) => {
    if (qty === 0) return '٠';
    if (unitsPerBox <= 1) return `${qty} قطعة`;
    const boxes = Math.floor(qty / unitsPerBox);
    const pieces = qty % unitsPerBox;
    if (boxes > 0 && pieces === 0) return `${boxes} علبة`;
    if (boxes === 0) return `${pieces} قطعة`;
    return `${boxes} علبة و ${pieces} قطعة`;
  };

  const itemsRows = (invoice.items || []).map((it) => {
    const name = it.productId?.name || 'منتج محذوف';
    const qty  = it.quantity || 0;
    const unitsPerBox = it.productId?.unitsPerBox || 1;
    const price = it.unitPrice || 0;
    const total = qty * price;
    const returned = qty === 0 ? ' <span style="font-size:18px;">(مُرجَع)</span>' : '';
    const rowStyle = qty === 0 ? 'opacity:0.45;' : '';
    return `
      <tr style="border-bottom:1px dashed #000;${rowStyle}">
        <td style="padding:10px 1px;font-weight:900;font-size:22px;">${name}${returned}</td>
        <td style="padding:10px 1px;text-align:center;font-weight:900;font-size:20px;">${fmtQty(qty, unitsPerBox)}</td>
        <td style="padding:10px 1px;text-align:center;font-weight:900;font-size:32px;">${fmt(price)}</td>
        <td style="padding:10px 1px;text-align:center;font-weight:900;font-size:32px;">${fmt(total)}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة #${invId}</title>
  <style>
    @page {
      size: 79mm auto;
      margin: 0mm !important;
    }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; width: 79mm !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { width: 79mm; }
    body {
      font-family: Tahoma, Arial, sans-serif;
      background: #fff;
      color: #000;
      width: 79mm;
      max-width: 79mm;
      margin: 0;
      padding: 2px 3px;
      direction: rtl;
      font-size: 16px;
      line-height: 1.5;
      overflow: hidden;
    }
    h1,h2,h3,p { margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    .text-center { text-align: center; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .mb { margin-bottom: 6px; }
    .font-bold { font-weight: 900; }
    .sep { border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .sep-top { border-top: 2px dashed #000; padding-top: 8px; margin-top: 8px; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="text-center" style="margin-bottom: 8px;">
    <h1 style="font-size:40px;font-weight:900;margin-bottom:4px;">شركة مارس</h1>
    <h2 style="font-size:32px;font-weight:900;margin-bottom:6px;">شركة أولاد رجب</h2>
    <div style="font-size:24px;font-weight:900;margin-bottom:4px;">فاتورة رقم #${invId}</div>
    <div style="font-size:20px;font-weight:900;">${fmtDate(invoice.createdAt)}</div>
  </div>

  <!-- Info -->
  <div style="margin-bottom: 8px;">
    <div class="flex-between mb"><span class="font-bold" style="font-size:22px;">العميل:</span><span class="font-bold" style="font-size:22px;">${invoice.customerId?.name || 'عميل نقدي'}</span></div>
    ${invoice.customerId?.phone ? `<div class="flex-between mb"><span class="font-bold" style="font-size:22px;">الجوال:</span><span class="font-bold" style="font-size:22px;">${invoice.customerId.phone}</span></div>` : ''}
    <div class="flex-between mb"><span class="font-bold" style="font-size:22px;">الدفع:</span><span class="font-bold" style="font-size:22px;">${METHOD[invoice.paymentMethod] || invoice.paymentMethod || ''}</span></div>
    <div class="flex-between"><span class="font-bold" style="font-size:22px;">الحالة:</span><span class="font-bold" style="font-size:22px;">${STATUS[invoice.status] || invoice.status || ''}</span></div>
  </div>

  <!-- Items Table -->
  <div class="mb">
    <table>
      <thead>
        <tr style="border-bottom:2px solid #000;">
          <th style="padding:10px 1px;text-align:right;font-size:22px;">المنتج</th>
          <th style="padding:10px 1px;text-align:center;font-size:22px;">الكمية</th>
          <th style="padding:10px 1px;text-align:center;font-size:22px;">سعر الوحدة</th>
          <th style="padding:10px 1px;text-align:center;font-size:22px;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="sep">
    <div class="flex-between mb"><span class="font-bold" style="font-size:32px;">الإجمالي الفرعي:</span><span class="font-bold" style="font-size:32px;">${fmt(invoice.subTotal)}</span></div>
    <div class="flex-between mb"><span class="font-bold" style="font-size:22px;">الخصم:</span><span class="font-bold" style="font-size:22px;">${fmt(invoice.discount)}</span></div>
    <div class="flex-between font-bold" style="font-size:32px;border-top:2px solid #000;padding-top:6px;margin:6px 0;">
      <span>الصافي:</span><span>${fmt(invoice.totalAmount)}</span>
    </div>
    <div class="flex-between mb"><span class="font-bold" style="font-size:22px;">المدفوع:</span><span class="font-bold" style="font-size:22px;">${fmt(invoice.paidAmount)}</span></div>
    <div class="flex-between font-bold" style="font-size:32px;"><span>المتبقي:</span><span>${fmt(invoice.dueAmount)}</span></div>
  </div>

  <!-- Footer -->
  <div class="text-center" style="margin-top:10px;">
    <div style="font-weight:900;font-size:30px;margin-bottom:4px;">مازن رجب</div>
    <div style="font-weight:900;font-size:30px;direction:ltr;">01025210536 - 01158325071</div>
    <div style="margin-top:12px;font-weight:900;font-size:20px;">شكراً لتعاملكم معنا</div>
  </div>

</body>
</html>`;

  let iframe = document.getElementById('thermal-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '100%';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);
  }

  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Thermal Print failed', e);
    }
    // Intentionally omitting iframe removal to allow PDF generation to complete in the background
  }, 600);
}

