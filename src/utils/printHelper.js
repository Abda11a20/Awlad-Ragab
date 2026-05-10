/**
 * @file printHelper.js
 * @description Unified invoice printing helper with automatic fallback.
 *
 * Printing priority:
 *   1. Web Bluetooth (BLE) direct printing → renders receipt as bitmap
 *   2. HTML-to-PDF fallback → opens print dialog via hidden iframe
 *
 * This helper abstracts away the print method selection so callers
 * only need to invoke `printInvoiceWithFallback(invoice)`.
 */

import { isBleSupported, printThermalDirect } from './thermalBluetooth';
import { printThermalInvoice } from './print';

/**
 * Print an invoice using the best available method.
 *
 * @param {Object} invoice - The fully-populated invoice object.
 * @returns {Promise<{ method: 'ble'|'html', success: boolean }>}
 * @throws {Error} If both BLE and HTML printing fail.
 */
export async function printInvoiceWithFallback(invoice) {
  // Attempt BLE direct printing when the browser supports it
  if (isBleSupported && typeof isBleSupported === 'function' && isBleSupported()) {
    try {
      await printThermalDirect(invoice);
      return { method: 'ble', success: true };
    } catch (err) {
      console.warn('BLE printing failed, falling back to HTML:', err);
    }
  }

  // Fallback: HTML-based thermal print (works on all browsers)
  try {
    await printThermalInvoice(invoice);
    return { method: 'html', success: true };
  } catch (err) {
    console.error('Both BLE and HTML printing failed:', err);
    throw err;
  }
}
