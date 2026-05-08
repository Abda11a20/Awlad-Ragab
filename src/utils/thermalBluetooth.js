/**
 * thermalBluetooth.js — Web Bluetooth direct printing for ESC/POS thermal printers.
 * Designed for Xprinter XP-P802A (80mm, BLE).
 * Renders Arabic receipt as bitmap image and sends to printer.
 */

// ─── Printer State ───
let device = null;
let characteristic = null;

// ─── Constants ───
const RECEIPT_WIDTH = 576; // dots (80mm at 203 DPI)
const CHUNK_SIZE = 100;    // bytes per BLE write
const CHUNK_DELAY = 25;    // ms between chunks

// Common BLE UUIDs for Chinese thermal printers
const SERVICE_UUIDS = [
  '0000ff00-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '000018f0-0000-1000-8000-00805f9b34fb',
];
const CHAR_UUIDS = [
  '0000ff02-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '00002af1-0000-1000-8000-00805f9b34fb',
];

// ESC/POS
const ESC = 0x1B;
const GS  = 0x1D;

// ─── Public API ───

export function isBleSupported() {
  return !!(navigator.bluetooth);
}

export function isConnected() {
  return !!(device?.gatt?.connected && characteristic);
}

export function getDeviceName() {
  return device?.name || '';
}

/**
 * Connect to a BLE thermal printer.
 * Returns the device name on success.
 */
export async function connectPrinter() {
  if (!navigator.bluetooth) throw new Error('متصفحك لا يدعم البلوتوث');

  // Try name-based filters first, fallback to accept all
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'Printer' },
        { namePrefix: 'XP' },
        { namePrefix: 'Xprinter' },
        { namePrefix: 'BlueTooth' },
        { namePrefix: 'BT' },
      ],
      optionalServices: SERVICE_UUIDS,
    });
  } catch {
    // Fallback: show all devices
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICE_UUIDS,
    });
  }

  if (!device) throw new Error('لم يتم اختيار طابعة');

  device.addEventListener('gattserverdisconnected', () => {
    characteristic = null;
  });

  const server = await device.gatt.connect();

  // Find a working service
  let service = null;
  for (const uuid of SERVICE_UUIDS) {
    try { service = await server.getPrimaryService(uuid); break; } catch { /* next */ }
  }
  if (!service) throw new Error('لم يتم العثور على خدمة الطباعة');

  // Find a writable characteristic
  for (const uuid of CHAR_UUIDS) {
    try { characteristic = await service.getCharacteristic(uuid); break; } catch { /* next */ }
  }
  if (!characteristic) {
    const chars = await service.getCharacteristics();
    characteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse) || null;
  }
  if (!characteristic) throw new Error('لم يتم العثور على منفذ الكتابة');

  return device.name || 'طابعة حرارية';
}

export function disconnectPrinter() {
  try { device?.gatt?.disconnect(); } catch { /* ignore */ }
  characteristic = null;
  device = null;
}

// ─── Direct Print ───

/**
 * Print an invoice directly to the connected BLE thermal printer.
 */
export async function printThermalDirect(invoice) {
  if (!invoice) return;
  if (!isConnected()) {
    await connectPrinter();
  }

  const canvas = renderReceiptCanvas(invoice);
  const { bitmap, bytesPerLine, height } = canvasToMono(canvas);

  // Build ESC/POS: INIT + RASTER IMAGE + FEED + CUT
  const headerLen = 2 + 8;   // ESC@ + GSv0 header
  const footerLen = 6;       // feed + cut
  const data = new Uint8Array(headerLen + bitmap.length + footerLen);
  let i = 0;

  // ESC @ — initialize
  data[i++] = ESC; data[i++] = 0x40;

  // GS v 0 m xL xH yL yH
  data[i++] = GS; data[i++] = 0x76; data[i++] = 0x30; data[i++] = 0x00;
  data[i++] = bytesPerLine & 0xFF;
  data[i++] = (bytesPerLine >> 8) & 0xFF;
  data[i++] = height & 0xFF;
  data[i++] = (height >> 8) & 0xFF;

  // Bitmap data
  data.set(bitmap, i); i += bitmap.length;

  // Feed 4 lines: ESC d 4
  data[i++] = ESC; data[i++] = 0x64; data[i++] = 0x04;

  // Partial cut: GS V 1
  data[i++] = GS; data[i++] = 0x56; data[i++] = 0x01;

  await sendChunked(data);
}

// ─── Internal Helpers ───

async function sendChunked(data) {
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length));
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    if (offset + CHUNK_SIZE < data.length) {
      await new Promise(r => setTimeout(r, CHUNK_DELAY));
    }
  }
}

function canvasToMono(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const px = img.data;
  const bytesPerLine = Math.ceil(width / 8);
  const bitmap = new Uint8Array(bytesPerLine * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gray = 0.299 * px[idx] + 0.587 * px[idx+1] + 0.114 * px[idx+2];
      if (gray < 128 && px[idx+3] > 128) {
        bitmap[y * bytesPerLine + (x >> 3)] |= (0x80 >> (x & 7));
      }
    }
  }
  return { bitmap, bytesPerLine, height };
}

// ─── Canvas Receipt Renderer ───

function renderReceiptCanvas(invoice) {
  const W = RECEIPT_WIDTH;
  const PAD = 16;
  const TW = W - PAD * 2; // text width

  const fmt = (n) => `${Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('ar-EG', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const STATUS = { paid:'مدفوعة', partial:'جزئية', unpaid:'غير مدفوعة', PAID:'مدفوعة', PARTIAL:'جزئية', UNPAID:'غير مدفوعة' };
  const METHOD = { cash:'كاش', credit:'آجل', CASH:'كاش', CREDIT:'آجل' };

  const invId = (invoice._id || invoice.invoiceId || '').slice(-8).toUpperCase();
  const items = invoice.items || [];

  // ─── Calculate height ───
  let h = 0;
  h += 200;                   // header block
  h += 20;                    // separator
  h += 50 * 4;               // info lines (4 lines)
  if (invoice.customerId?.phone) h += 50;
  h += 20;                    // separator
  h += items.length * 80;    // items (no per-row separators)
  h += 20;                    // separator
  h += 50 * 5 + 30;          // totals (5 lines + padding)
  h += 20;                    // separator
  h += 150;                   // footer
  h += 40;                    // margin bottom

  // ─── Create canvas ───
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = '#000';

  let y = PAD;

  // ─── Helper functions ───
  function drawCenter(text, fontSize, bold = false) {
    ctx.font = `${bold ? '900 ' : ''}${fontSize}px Tahoma, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(text, W / 2, y);
    y += fontSize + 12;
  }

  function drawBetween(labelR, valueL, fontSize, bold = false) {
    ctx.font = `${bold ? '900 ' : ''}${fontSize}px Tahoma, Arial, sans-serif`;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillText(labelR, W - PAD, y);
    ctx.textAlign = 'left';
    ctx.fillText(valueL, PAD, y);
    y += fontSize + 14;
  }

  function drawDashedLine() {
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 12;
  }

  function drawSolidLine() {
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    y += 10;
  }

  // ─── HEADER ───
  y += 14;
  drawCenter('شركة مارس', 44, true);
  drawCenter('شركة أولاد رجب', 34, true);
  y += 8;
  drawCenter(`فاتورة رقم #${invId}`, 26, true);
  drawCenter(fmtDate(invoice.createdAt), 22, true);

  // ─── INFO ───
  drawBetween('العميل:', invoice.customerId?.name || 'عميل نقدي', 26, true);
  if (invoice.customerId?.phone) {
    drawBetween('الجوال:', invoice.customerId.phone, 26, true);
  }
  drawBetween('الدفع:', METHOD[invoice.paymentMethod] || invoice.paymentMethod || '', 26, true);
  drawBetween('الحالة:', STATUS[invoice.status] || invoice.status || '', 26, true);

  // ─── ITEMS TABLE ───
  // Table header
  const colX = [W - PAD, W * 0.55, W * 0.35, PAD];
  ctx.font = '900 24px Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('المنتج', colX[0], y);
  ctx.textAlign = 'center';
  ctx.fillText('كم', colX[1], y);
  ctx.fillText('سعر', colX[2], y);
  ctx.textAlign = 'left';
  ctx.fillText('إجمالي', colX[3], y);
  y += 14;
  // One solid line under header
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1;
  y += 18;

  // ─── Smart quantity formatter (mirrors system UI logic) ───
  const fmtQty = (qty, unitsPerBox = 1) => {
    if (qty === 0) return '٠';
    if (unitsPerBox <= 1) return `${qty} قطعة`;
    const boxes = Math.floor(qty / unitsPerBox);
    const pieces = qty % unitsPerBox;
    if (boxes > 0 && pieces === 0) return `${boxes} علبة`;
    if (boxes === 0) return `${pieces} قطعة`;
    return `${boxes} علبة و ${pieces} قطعة`;
  };

  // Table rows — NO per-row separators
  items.forEach((it) => {
    const name = it.productId?.name || 'منتج محذوف';
    const qty = it.quantity || 0;
    const unitsPerBox = it.productId?.unitsPerBox || 1;
    const price = it.unitPrice || 0;
    const total = qty * price;
    const qtyLabel = fmtQty(qty, unitsPerBox);

    if (qty === 0) ctx.globalAlpha = 0.45;

    ctx.font = '900 24px Tahoma, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText(name + (qty === 0 ? ' (مُرجَع)' : ''), colX[0], y);

    ctx.font = '900 20px Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(qtyLabel, colX[1], y);

    ctx.font = '900 34px monospace';
    ctx.fillText(fmt(price), colX[2], y);

    ctx.font = '900 34px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(fmt(total), colX[3], y);

    ctx.globalAlpha = 1;
    y += 80; // space between rows, no line
  });

  drawDashedLine();

  // ─── TOTALS ───
  drawBetween('الإجمالي الفرعي:', fmt(invoice.subTotal), 34, true);
  drawBetween('الخصم:', fmt(invoice.discount), 26, true);
  drawSolidLine();
  drawBetween('الصافي:', fmt(invoice.totalAmount), 34, true);
  y += 8;
  drawBetween('المدفوع:', fmt(invoice.paidAmount), 26, true);
  drawBetween('المتبقي:', fmt(invoice.dueAmount), 34, true);
  drawDashedLine();

  // ─── FOOTER ───
  y += 12;
  drawCenter('مازن رجب', 32, true);
  ctx.font = '900 32px monospace';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillText('01025210536 - 01158325071', W / 2, y);
  y += 44;
  drawCenter('شكراً لتعاملكم معنا', 24, true);

  return canvas;
}

// ─── RawBT Sharing ───

/**
 * Share invoice to RawBT app via Web Share API
 */
export async function shareInvoiceToRawBT(invoice) {
  try {
    const canvas = renderReceiptCanvas(invoice);
    const dataUrl = canvas.toDataURL('image/png');
    
    // Convert base64 to Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'invoice.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Invoice',
        text: 'Print invoice',
        files: [file]
      });
    } else {
      // Fallback intent if share API fails or is not supported
      window.location.href = 'intent://print#Intent;package=ru.a402d.rawbtprinter;end;';
    }
  } catch (error) {
    console.error('Error sharing to RawBT:', error);
    // Don't alert if user just cancelled the share sheet
    if (error.name !== 'AbortError') {
      window.location.href = 'intent://print#Intent;package=ru.a402d.rawbtprinter;end;';
    }
  }
}
