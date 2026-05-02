/**
 * printInvoice — opens a new window with the invoice content and triggers print.
 * No dependency on react-to-print, Tailwind, or any external library.
 */
export function printInvoice(invoice) {
  if (!invoice) return;

  const fmt = (n) => `${Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج`;
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

  const itemsRows = (invoice.items || []).map((it) => {
    const name = it.productId?.name || 'منتج محذوف';
    const qty  = it.quantity || 0;
    const price = it.unitPrice || 0;
    const total = qty * price;
    const returned = qty === 0 ? ' <span style="font-size:11px;color:#64748b">(مُرجَع)</span>' : '';
    const rowStyle = qty === 0 ? 'opacity:0.45;' : '';
    return `
      <tr style="border-bottom:1px solid #e2e8f0;${rowStyle}">
        <td style="padding:10px 14px;font-weight:700">${name}${returned}</td>
        <td style="padding:10px 14px;text-align:center;font-family:monospace;font-weight:700">${qty} قطعة</td>
        <td style="padding:10px 14px;text-align:center;font-family:monospace;font-weight:700">${fmt(price)}</td>
        <td style="padding:10px 14px;text-align:center;font-family:monospace;font-weight:700">${fmt(total)}</td>
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
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#fff;color:#000;padding:36px;direction:rtl;font-size:14px}
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
      <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px">العميل</div>
      <div style="font-weight:700;color:#000">${invoice.customerId?.name || 'عميل نقدي'}</div>
      ${invoice.customerId?.phone ? `<div style="font-size:11px;font-family:monospace;margin-top:3px">${invoice.customerId.phone}</div>` : ''}
    </div>
    <div style="border:1.5px solid #cbd5e1;border-radius:8px;padding:10px">
      <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px">التاريخ</div>
      <div style="font-weight:700;font-size:12px;color:#000">${fmtDate(invoice.createdAt)}</div>
    </div>
    <div style="border:1.5px solid #cbd5e1;border-radius:8px;padding:10px">
      <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px">طريقة الدفع</div>
      <div style="font-weight:700;color:#000">${METHOD[invoice.paymentMethod] || invoice.paymentMethod || ''}</div>
    </div>
    <div style="border:1.5px solid #cbd5e1;border-radius:8px;padding:10px">
      <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px">الحالة</div>
      <div style="font-weight:700;color:#000">${STATUS[invoice.status] || invoice.status || ''}</div>
    </div>
  </div>

  <!-- Items Table -->
  <div style="border:1.5px solid #cbd5e1;border-radius:8px;overflow:hidden;margin-bottom:20px">
    <table>
      <thead style="background:#f1f5f9;border-bottom:2px solid #cbd5e1">
        <tr>
          <th style="padding:10px 14px;text-align:right;font-weight:700;font-size:13px">المنتج</th>
          <th style="padding:10px 14px;text-align:center;font-weight:700;font-size:13px">الكمية</th>
          <th style="padding:10px 14px;text-align:center;font-weight:700;font-size:13px">سعر الوحدة</th>
          <th style="padding:10px 14px;text-align:center;font-weight:700;font-size:13px">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>
  </div>

  <!-- Totals -->
  <div style="border:1.5px solid #cbd5e1;border-radius:8px;padding:16px;max-width:320px;margin-right:auto;margin-bottom:30px">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-weight:700;font-size:13px">
      <span>الإجمالي الفرعي:</span><span style="font-family:monospace">${fmt(invoice.subTotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-weight:700;font-size:13px">
      <span>الخصم:</span><span style="font-family:monospace">${fmt(invoice.discount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;border-top:2px solid #000;padding-top:10px;margin-top:8px;font-weight:900;font-size:16px">
      <span>الصافي:</span><span style="font-family:monospace">${fmt(invoice.totalAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:10px;font-weight:700;font-size:13px">
      <span>المدفوع:</span><span style="font-family:monospace;color:#16a34a">${fmt(invoice.paidAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;font-weight:900;font-size:14px">
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

  // Use a hidden iframe instead of a new window for better mobile compatibility
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.zIndex = '-1';
  document.body.appendChild(iframe);

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
    // Cleanup iframe after print dialog is closed
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 5000);
  }, 600);
}
