/* src/utils/printHelper.js */
/**
 * Helper to print an invoice using the best available method.
 * 1️⃣ If the browser supports Web Bluetooth and a printer can be connected,
 *    it uses `printThermalDirect` (BLE direct printing).
 * 2️⃣ If any step fails (no BLE support, connection error, etc.),
 *    it falls back to the traditional HTML‑to‑PDF printing via `printThermalInvoice`.
 */
import { isBleSupported, printThermalDirect } from './thermalBluetooth';
import { printThermalInvoice } from './print';

export async function printInvoiceWithFallback(invoice) {
  // Prefer BLE direct printing when possible
  if (isBleSupported && typeof isBleSupported === 'function' && isBleSupported()) {
    try {
      await printThermalDirect(invoice);
      return { method: 'ble', success: true };
    } catch (err) {
      // BLE failed – fall back to HTML printing
      console.warn('BLE printing failed, falling back to HTML:', err);
    }
  }
  // Fallback – always works (provided @page size is set to 80mm)
  try {
    await printThermalInvoice(invoice);
    return { method: 'html', success: true };
  } catch (err) {
    console.error('Both BLE and HTML printing failed:', err);
    throw err;
  }
}
