import React, { forwardRef } from 'react';
import { formatCurrency, formatDateTime } from '../utils/format';

const STATUS_MAP = {
  paid:    'مدفوعة',
  partial: 'جزئية',
  unpaid:  'غير مدفوعة',
  PAID:    'مدفوعة',
  PARTIAL: 'جزئية',
  UNPAID:  'غير مدفوعة',
};

const METHOD_MAP = {
  cash:   'كاش',
  credit: 'آجل',
  CASH:   'كاش',
  CREDIT: 'آجل',
};

const formatQuantity = (qty, unitsPerBox = 1) => {
  if (qty > 0 && qty % unitsPerBox === 0) {
    return `${qty / unitsPerBox} علبة`;
  }
  return `${qty} قطعة`;
};

const InvoicePrintTemplate = forwardRef(({ invoice }, ref) => {
  if (!invoice) return null;

  return (
    <div ref={ref} className="p-10 bg-white min-h-screen text-black" dir="rtl" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <div className="flex flex-col gap-6">
        {/* Invoice Header (Company & Title) */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6">
          <div>
            <h1 className="text-3xl font-black text-black mb-1">شركة مارس</h1>
            <h2 className="text-xl font-bold text-black">شركة أولاد رجب</h2>
          </div>
          <div className="text-left">
            <h1 className="text-4xl font-black text-black mb-1">فاتورة</h1>
            <p className="text-md font-bold text-black">رقم: #{invoice._id ? invoice._id.slice(-8).toUpperCase() : (invoice.invoiceId ? invoice.invoiceId.slice(-8).toUpperCase() : '')}</p>
          </div>
        </div>

        {/* Header Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white rounded-xl p-4 border-2 border-slate-300">
            <div className="text-black text-sm mb-1 font-bold">العميل</div>
            <div className="font-bold text-black text-base">{invoice.customerId?.name || <span className="italic text-black">عميل نقدي</span>}</div>
            {invoice.customerId?.phone && <div className="text-sm text-black mt-1 font-mono">{invoice.customerId.phone}</div>}
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-slate-300">
            <div className="text-black text-sm mb-1 font-bold">التاريخ</div>
            <div className="font-bold text-black text-sm">{formatDateTime(invoice.createdAt)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-slate-300">
            <div className="text-black text-sm mb-1 font-bold">طريقة الدفع</div>
            <div className="font-bold text-black text-base">{METHOD_MAP[invoice.paymentMethod] || invoice.paymentMethod}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-slate-300">
            <div className="text-black text-sm mb-1 font-bold">الحالة</div>
            <span className="text-black font-bold text-base">{STATUS_MAP[invoice.status] || invoice.status}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="rounded-xl overflow-hidden border-2 border-slate-300 mt-4">
          <table className="w-full text-base text-right">
            <thead className="bg-slate-100 text-black border-b-2 border-slate-300">
              <tr>
                <th className="px-5 py-3 font-bold">المنتج</th>
                <th className="px-5 py-3 text-center font-bold">الكمية</th>
                <th className="px-5 py-3 text-center font-bold">سعر الوحدة</th>
                <th className="px-5 py-3 text-center font-bold">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200">
              {invoice.items?.map((it, idx) => (
                <tr key={idx} className={it.quantity === 0 ? 'opacity-50' : ''}>
                  <td className="px-5 py-4 text-black font-bold text-base">
                    {it.productId?.name || 'منتج محذوف'}
                    {it.quantity === 0 && <span className="text-sm text-black font-bold mr-2">(مُرجَع)</span>}
                  </td>
                  <td className="px-5 py-4 text-center text-black font-mono font-bold text-base">
                    {formatQuantity(it.quantity, it.productId?.unitsPerBox || 1)}
                  </td>
                  <td className="px-5 py-4 text-center text-black font-mono font-bold text-base">{formatCurrency(it.unitPrice)}</td>
                  <td className="px-5 py-4 text-center text-black font-mono font-bold text-base">{formatCurrency(it.quantity * it.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-white border-2 border-slate-300 rounded-xl p-5 flex flex-col gap-3 mr-auto w-full max-w-sm mt-4">
          <div className="flex justify-between text-base text-black font-bold"><span>الإجمالي الفرعي:</span><span className="font-mono text-black">{formatCurrency(invoice.subTotal)}</span></div>
          <div className="flex justify-between text-base text-black font-bold"><span>الخصم:</span><span className="font-mono text-black">{formatCurrency(invoice.discount)}</span></div>
          <div className="flex justify-between font-black text-black pt-4 mt-2 border-t-2 border-slate-300"><span className="text-xl">الصافي:</span><span className="font-mono text-black text-xl">{formatCurrency(invoice.totalAmount)}</span></div>
          <div className="flex justify-between text-base text-black font-bold mt-2"><span>المدفوع:</span><span className="font-mono text-black">{formatCurrency(invoice.paidAmount)}</span></div>
          <div className="flex justify-between font-black text-black text-lg">
            <span>المتبقي:</span>
            <span className="font-mono">{formatCurrency(invoice.dueAmount)}</span>
          </div>
        </div>

        {/* Invoice Footer */}
        <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-400 flex justify-center">
          <div className="inline-flex items-center gap-4 bg-white px-8 py-3 rounded-full border-2 border-slate-300">
            <span className="text-black font-black text-xl">مازن رجب</span>
            <span className="text-black font-bold text-xl">|</span>
            <span className="text-black font-bold font-mono tracking-widest text-xl" dir="ltr">01025210536 - 01158325071</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default InvoicePrintTemplate;
