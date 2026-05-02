import { useState, useEffect, useCallback, useRef } from 'react';
import { invoicesAPI, productsAPI, customersAPI, default as http } from '../api';
import useStore from '../store';
import toast from 'react-hot-toast';
import { SkeletonTable, EmptyState, ErrorState, Modal, Pagination, SearchableSelect, inputCls, labelCls, badgeCls } from '../components/UI';
import { formatCurrency, formatDateTime } from '../utils/format';
import { Plus, Trash2, Undo2, FileText as FileTextIcon, Eye, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import InvoicePrintTemplate from '../components/InvoicePrintTemplate';

const PER_PAGE = 10;

const STATUS_MAP = {
  paid:    { label: 'مدفوعة',  cls: badgeCls.success },
  partial: { label: 'جزئية',  cls: badgeCls.warning },
  unpaid:  { label: 'غير مدفوعة', cls: badgeCls.danger },
};

const METHOD_MAP = {
  cash:   'كاش',
  credit: 'آجل'
};

const formatQuantity = (qty, unitsPerBox = 1) => {
  if (qty > 0 && qty % unitsPerBox === 0) {
    return `${qty / unitsPerBox} علبة`;
  }
  return `${qty} قطعة`;
};

export default function Invoices() {
  const { invoices, setInvoices, products, setProducts, customers, setCustomers, clearCache } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);

  // Create Form State
  const [createData, setCreateData] = useState({
    customerId: '', paymentMethod: 'cash', discount: 0, paidAmount: 0, items: []
  });

  // Refund Form State
  const [refundItems, setRefundItems] = useState({});

  // Print State
  const printRef = useRef(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);

  const triggerPrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => setInvoiceToPrint(null),
    documentTitle: `invoice-${invoiceToPrint?._id?.slice(-8) || ''}`
  });

  useEffect(() => {
    if (invoiceToPrint) {
      // Small delay to ensure the hidden DOM element is rendered
      const t = setTimeout(() => triggerPrint(), 100);
      return () => clearTimeout(t);
    }
  }, [invoiceToPrint, triggerPrint]);

  const loadData = useCallback(async () => {
    if (invoices.length > 0 && !filterStatus && !filterMethod) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let q = [];
    if (filterStatus) q.push(`status=${filterStatus}`);
    if (filterMethod) q.push(`paymentMethod=${filterMethod}`);
    const qs = q.length ? '?' + q.join('&') : '';

    const { data, error: apiError } = await invoicesAPI.getAll(qs);
    // 404 means "no invoices found" — treat as empty, not an error
    if (apiError && data === null) {
      setInvoices([]);
    } else if (apiError) {
      setError(apiError);
    } else {
      setInvoices(data?.data || []);
    }
    setLoading(false);
  }, [filterStatus, filterMethod, setInvoices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const total = invoices.length;
  const sliced = invoices.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openCreate = async () => {
    if (products.length === 0) {
      const { data } = await productsAPI.getAll();
      if (data?.data) setProducts(data.data);
    }
    if (customers.length === 0) {
      const { data } = await customersAPI.getAll();
      // data may be null if backend returns 404 (no customers yet) — that's fine
      if (data?.data) setCustomers(data.data);
    }
    setCreateData({ customerId: '', paymentMethod: 'cash', discount: 0, paidAmount: 0, items: [{ productId: '', quantity: 1, unitPrice: 0 }] });
    setIsCreateOpen(true);
  };

  const handleCreateItemChange = (index, field, value) => {
    const newItems = [...createData.items];
    if (field === 'productId') {
      const prod = products.find(p => p._id === value);
      newItems[index] = { ...newItems[index], productId: value, unitPrice: prod ? prod.unitPrice : 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setCreateData({ ...createData, items: newItems });
  };

  const addCreateItem = () => {
    setCreateData({ ...createData, items: [...createData.items, { productId: '', quantity: 1, unitPrice: 0 }] });
  };

  const removeCreateItem = (index) => {
    const newItems = createData.items.filter((_, i) => i !== index);
    setCreateData({ ...createData, items: newItems });
  };

  const calculateCreateTotals = () => {
    const subtotal = createData.items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice) || 0), 0);
    const discount = parseFloat(createData.discount) || 0;
    const total = subtotal - discount;
    const paid = parseFloat(createData.paidAmount) || 0;
    const due = total - paid;
    return { subtotal, discount, total, paid, due };
  };

  const handleCreateSubmit = async () => {
    const validItems = createData.items.filter(i => i.productId && i.quantity > 0);
    if (!validItems.length) return toast.warning('يجب إضافة عنصر واحد على الأقل للفاتورة');

    const { subtotal, discount, total, paid } = calculateCreateTotals();

    // Backend model: dueAmount must be >= 0, so paidAmount cannot exceed totalAmount
    if (paid > total) {
      return toast.error(`المبلغ المدفوع (${formatCurrency(paid)}) لا يمكن أن يتجاوز إجمالي الفاتورة (${formatCurrency(total)})`);
    }

    const payload = {
      customerId: createData.customerId || undefined,
      paymentMethod: createData.paymentMethod,
      discount: discount,
      paidAmount: paid,
      // parse to numbers to avoid validation issues with string values
      items: validItems.map(i => ({
        productId: i.productId,
        quantity: parseInt(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
      })),
    };

    const { error } = await invoicesAPI.create(payload);
    if (error) return toast.error(error);
    
    clearCache();
    toast.success('تم إصدار الفاتورة بنجاح');
    setIsCreateOpen(false);
    loadData();
  };

  const openDelete = (inv) => {
    setCurrentInvoice(inv);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    const { error } = await invoicesAPI.delete(currentInvoice._id);
    if (error) return toast.error(error);
    clearCache();
    toast.success('تم حذف الفاتورة بنجاح');
    setIsDeleteOpen(false);
    loadData();
  };

  const downloadPDF = async (inv) => {
    const toastId = toast.loading('جاري تجهيز الفاتورة...');
    const { data, error } = await invoicesAPI.getById(inv._id);
    if (error) {
      toast.error('فشل تحميل تفاصيل الفاتورة', { id: toastId });
      return;
    }
    setInvoiceToPrint(data?.data);
    toast.success('تم التجهيز!', { id: toastId });
  };

  const openDetail = async (inv) => {
    setDetailLoading(true);
    setIsDetailOpen(true);
    const { data, error } = await invoicesAPI.getById(inv._id);
    setDetailLoading(false);
    if (error) return toast.error(error);
    setCurrentInvoice(data?.data);
  };

  const openRefund = async (inv) => {
    const { data, error } = await invoicesAPI.getById(inv._id);
    if (error) return toast.error(error);
    
    const fetchedInv = data?.data;
    const validItems = fetchedInv.items.filter(it => it.quantity > 0);
    
    if (!validItems.length) {
      return toast.info('تم إرجاع جميع عناصر هذه الفاتورة مسبقاً');
    }

    const initialRefunds = {};
    validItems.forEach(it => {
      initialRefunds[it.productId?._id || it.productId] = 0;
    });

    setCurrentInvoice(fetchedInv);
    setRefundItems(initialRefunds);
    setIsRefundOpen(true);
  };

  const handleRefundSubmit = async () => {
    const items = [];
    let hasInvalidQty = false;

    currentInvoice.items.filter(it => it.quantity > 0).forEach(it => {
      const pid = it.productId?._id || it.productId;
      const refundQty = parseInt(refundItems[pid]) || 0;
      if (refundQty > it.quantity) {
        hasInvalidQty = true;
        toast.error(`لا يمكن إرجاع كمية أكبر من المتاحة (${it.quantity})`);
      }
      if (refundQty > 0) {
        items.push({
          productId: pid,
          quantity: it.quantity - refundQty, // The backend expects the NEW remaining quantity!
          unitPrice: it.unitPrice,
        });
      }
    });

    if (hasInvalidQty) return;
    if (!items.length) return toast.warning('يجب إدخال كمية واحدة على الأقل للإرجاع');

    const { error } = await invoicesAPI.refund(currentInvoice._id, { items });
    if (error) return toast.error(error);

    clearCache();
    toast.success('تمت معالجة الإرجاع بنجاح');
    setIsRefundOpen(false);
    loadData();
  };

  const totals = isCreateOpen ? calculateCreateTotals() : { subtotal: 0, discount: 0, total: 0, paid: 0, due: 0 };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">الفواتير</h1>
          <p className="text-sm text-slate-500 mt-1">إنشاء ومتابعة الفواتير والمدفوعات</p>
        </div>
        <button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
          <Plus className="w-5 h-5" /> فاتورة جديدة
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={filterStatus} onChange={e => {setFilterStatus(e.target.value); setPage(1);}} className="bg-white border border-slate-300 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 min-w-[150px] shadow-sm">
          <option value="">جميع الحالات</option>
          <option value="paid">مدفوعة</option>
          <option value="partial">جزئية</option>
          <option value="unpaid">غير مدفوعة</option>
        </select>
        <select value={filterMethod} onChange={e => {setFilterMethod(e.target.value); setPage(1);}} className="bg-white border border-slate-300 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 min-w-[150px] shadow-sm">
          <option value="">جميع الطرق</option>
          <option value="cash">كاش</option>
          <option value="credit">آجل</option>
        </select>
        <button onClick={() => {setFilterStatus(''); setFilterMethod(''); setPage(1);}} className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 transition-colors shadow-sm">
          مسح التصفية
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : error ? (
        <ErrorState msg={error} onRetry={loadData} />
      ) : invoices.length === 0 ? (
        <EmptyState msg="لا توجد فواتير" icon="🧾" />
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="flex flex-col gap-3 md:hidden">
            {sliced.map((inv, i) => (
              <div key={inv._id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {inv.customerId?.name || <span className="text-slate-500 italic font-normal">عميل نقدي</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(inv.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={STATUS_MAP[inv.status]?.cls || badgeCls.info}>{STATUS_MAP[inv.status]?.label || inv.status}</span>
                    <span className={badgeCls.info}>{METHOD_MAP[inv.paymentMethod] || inv.paymentMethod}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-50 rounded-xl p-2.5">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">الإجمالي</p>
                    <p className="text-sm font-mono font-bold text-emerald-600">{formatCurrency(inv.totalAmount)}</p>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">المدفوع</p>
                    <p className="text-sm font-mono font-bold text-slate-700">{formatCurrency(inv.paidAmount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">المتبقي</p>
                    <p className={`text-sm font-mono font-bold ${inv.dueAmount > 0 ? 'text-red-500' : 'text-slate-400'}`}>{formatCurrency(inv.dueAmount)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold">#{(page - 1) * PER_PAGE + i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openDetail(inv)} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition-colors" title="عرض التفاصيل">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => downloadPDF(inv)} className="text-slate-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="طباعة / PDF">
                      <Printer className="w-4 h-4" />
                    </button>
                    <button onClick={() => openRefund(inv)} className="text-slate-600 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-lg transition-colors" title="إرجاع">
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDelete(inv)} className="text-slate-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl overflow-x-auto border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-right text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 w-12 text-center">#</th>
                  <th className="px-5 py-4">العميل</th>
                  <th className="px-5 py-4">التاريخ</th>
                  <th className="px-5 py-4">الإجمالي</th>
                  <th className="px-5 py-4">المدفوع / المتبقي</th>
                  <th className="px-5 py-4 text-center">الطريقة</th>
                  <th className="px-5 py-4 text-center">الحالة</th>
                  <th className="px-5 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sliced.map((inv, i) => (
                  <tr key={inv._id} onClick={(e) => {
                    if (e.target.closest('button') || e.target.closest('a')) return;
                    openDetail(inv);
                  }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="px-5 py-4 text-center text-slate-500 font-bold">{(page - 1) * PER_PAGE + i + 1}</td>
                    <td className="px-5 py-4 font-bold text-slate-800">
                      {inv.customerId?.name || <span className="text-slate-500 italic font-normal">عميل نقدي (Walk-in)</span>}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs font-bold">{formatDateTime(inv.createdAt)}</td>
                    <td className="px-5 py-4 text-emerald-600 font-mono font-bold">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-5 py-4">
                      <div className="text-slate-700 font-mono text-xs font-bold mb-0.5"><span className="text-slate-400">م:</span> {formatCurrency(inv.paidAmount)}</div>
                      <div className={`${inv.dueAmount > 0 ? 'text-red-500' : 'text-slate-500'} font-mono text-xs font-bold`}><span className="text-slate-400">ب:</span> {formatCurrency(inv.dueAmount)}</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={badgeCls.info}>{METHOD_MAP[inv.paymentMethod] || inv.paymentMethod}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={STATUS_MAP[inv.status]?.cls || badgeCls.info}>{STATUS_MAP[inv.status]?.label || inv.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openDetail(inv)} className="text-slate-800 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition-colors" title="عرض التفاصيل">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => downloadPDF(inv)} className="text-slate-800 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="طباعة / PDF">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={() => openRefund(inv)} className="text-slate-800 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-lg transition-colors" title="إرجاع (Refund)">
                          <Undo2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => openDelete(inv)} className="text-slate-800 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !error && <Pagination total={total} page={page} perPage={PER_PAGE} onChange={setPage} />}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="إنشاء فاتورة جديدة" onConfirm={handleCreateSubmit} confirmText="إصدار الفاتورة" size="modal-xl">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="md:col-span-2">
              <label className={labelCls}>العميل</label>
              <SearchableSelect
                value={createData.customerId}
                onChange={(val) => setCreateData({ ...createData, customerId: val })}
                placeholder="ابحث باسم العميل أو رقم الهاتف..."
                emptyText="لا يوجد عميل بهذا الاسم"
                options={[
                  { value: '', label: 'عميل نقدي (Walk-in)' },
                  ...customers.map(c => ({ value: c._id, label: c.name, sub: c.phone }))
                ]}
              />
            </div>
            <div>
              <label className={labelCls}>طريقة الدفع <span className="text-red-400">*</span></label>
              <select className={inputCls} value={createData.paymentMethod} onChange={e => setCreateData({...createData, paymentMethod: e.target.value})}>
                <option value="cash">كاش</option>
                <option value="credit">آجل</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>الخصم</label>
                <input type="number" min="0" className={inputCls} value={createData.discount} onChange={e => setCreateData({...createData, discount: e.target.value})} />
              </div>
              <div>
                <label className={labelCls}>المبلغ المدفوع</label>
                <input type="number" min="0" className={inputCls} value={createData.paidAmount} onChange={e => setCreateData({...createData, paidAmount: e.target.value})} />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <h4 className="font-bold text-slate-800">عناصر الفاتورة</h4>
              <button onClick={addCreateItem} className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold transition-colors">
                + إضافة عنصر
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {createData.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <SearchableSelect
                      value={item.productId}
                      onChange={(val) => handleCreateItemChange(idx, 'productId', val)}
                      placeholder="ابحث عن منتج..."
                      emptyText="لا يوجد منتج بهذا الاسم"
                      options={products.map(p => ({
                        value: p._id,
                        label: p.name,
                        sub: `متاح: ${p.stock} | سعر: ${p.unitPrice} ج`
                      }))}
                    />
                  </div>
                  <div className="w-24">
                    <input type="number" min="1" className={`${inputCls} text-center`} placeholder="الكمية" value={item.quantity} onChange={e => handleCreateItemChange(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="w-28">
                    <input type="number" min="0" className={`${inputCls} text-center`} placeholder="السعر" value={item.unitPrice} onChange={e => handleCreateItemChange(idx, 'unitPrice', e.target.value)} />
                  </div>
                  <button onClick={() => removeCreateItem(idx)} className="shrink-0 h-10 w-10 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex justify-between text-sm text-slate-500 font-bold"><span>الإجمالي الفرعي:</span><span className="font-mono text-slate-800">{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between text-sm text-slate-500 font-bold"><span>الخصم:</span><span className="font-mono text-slate-800">{formatCurrency(totals.discount)}</span></div>
            <div className="flex justify-between font-bold text-slate-800 mt-1 pt-2 border-t border-slate-200"><span>الإجمالي:</span><span className="font-mono text-emerald-600">{formatCurrency(totals.total)}</span></div>
            <div className="flex justify-between text-sm text-slate-500 font-bold"><span>المدفوع:</span><span className="font-mono text-slate-800">{formatCurrency(totals.paid)}</span></div>
            <div className={`flex justify-between font-bold mt-1 pt-2 border-t ${totals.due < 0 ? 'border-red-200' : 'border-slate-200'}`}>
              <span>المتبقي:</span>
              <span className={`font-mono ${totals.due > 0 ? 'text-red-500' : totals.due === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totals.due < 0 ? '⚠ خطأ' : formatCurrency(totals.due)}
              </span>
            </div>
            {totals.due < 0 && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs text-center font-bold">
                المبلغ المدفوع يتجاوز إجمالي الفاتورة — قلل المدفوع أو راجع الأسعار
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setCurrentInvoice(null); }}
        title={`تفاصيل الفاتورة #${currentInvoice?._id?.slice(-8) || '...'}`}
        size="modal-lg"
      >
        {detailLoading || !currentInvoice ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="flex flex-col gap-5 p-2">
            {/* Invoice Header (Company & Title) */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <h1 className="text-2xl font-black text-black mb-1">شركة مارس</h1>
                <h2 className="text-lg font-bold text-black">شركة أولاد رجب</h2>
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-black text-black mb-1">فاتورة</h1>
                <p className="text-sm font-bold text-black">رقم: #{currentInvoice._id.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            {/* Header Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white rounded-xl p-3 border border-slate-300">
                <div className="text-black text-xs mb-1 font-bold">العميل</div>
                <div className="font-bold text-black">{currentInvoice.customerId?.name || <span className="italic text-black">عميل نقدي</span>}</div>
                {currentInvoice.customerId?.phone && <div className="text-xs text-black mt-0.5">{currentInvoice.customerId.phone}</div>}
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-300">
                <div className="text-black text-xs mb-1 font-bold">التاريخ</div>
                <div className="font-bold text-black text-xs">{formatDateTime(currentInvoice.createdAt)}</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-300">
                <div className="text-black text-xs mb-1 font-bold">طريقة الدفع</div>
                <div className="font-bold text-black">{METHOD_MAP[currentInvoice.paymentMethod] || currentInvoice.paymentMethod}</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-300">
                <div className="text-black text-xs mb-1 font-bold">الحالة</div>
                <span className="text-black font-bold">{STATUS_MAP[currentInvoice.status]?.label || currentInvoice.status}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="rounded-xl overflow-hidden border border-slate-300 shadow-sm">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-black text-xs border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-2.5 font-bold">المنتج</th>
                    <th className="px-4 py-2.5 text-center font-bold">الكمية</th>
                    <th className="px-4 py-2.5 text-center font-bold">سعر الوحدة</th>
                    <th className="px-4 py-2.5 text-center font-bold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentInvoice.items.map((it, idx) => (
                    <tr key={idx} className={it.quantity === 0 ? 'opacity-40' : ''}>
                      <td className="px-4 py-3 text-black font-bold">
                        {it.productId?.name || 'منتج محذوف'}
                        {it.quantity === 0 && <span className="text-xs text-black font-bold mr-2">(مُرجَع)</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-black font-mono font-bold">
                        {formatQuantity(it.quantity, it.productId?.unitsPerBox || 1)}
                      </td>
                      <td className="px-4 py-3 text-center text-black font-mono font-bold">{formatCurrency(it.unitPrice)}</td>
                      <td className="px-4 py-3 text-center text-black font-mono font-bold">{formatCurrency(it.quantity * it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-white border border-slate-300 rounded-xl p-4 flex flex-col gap-2 shadow-sm mr-auto w-full md:w-80">
              <div className="flex justify-between text-sm text-black font-bold"><span>الإجمالي الفرعي:</span><span className="font-mono text-black">{formatCurrency(currentInvoice.subTotal)}</span></div>
              <div className="flex justify-between text-sm text-black font-bold"><span>الخصم:</span><span className="font-mono text-black">{formatCurrency(currentInvoice.discount)}</span></div>
              <div className="flex justify-between font-bold text-black pt-3 mt-1 border-t-2 border-slate-300"><span className="text-lg">الصافي:</span><span className="font-mono text-black text-lg">{formatCurrency(currentInvoice.totalAmount)}</span></div>
              <div className="flex justify-between text-sm text-black font-bold mt-2"><span>المدفوع:</span><span className="font-mono text-black">{formatCurrency(currentInvoice.paidAmount)}</span></div>
              <div className="flex justify-between font-bold text-black">
                <span>المتبقي:</span>
                <span className="font-mono">{formatCurrency(currentInvoice.dueAmount)}</span>
              </div>
            </div>

            {/* Invoice Footer */}
            <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-300 flex justify-center">
              <div className="inline-flex items-center gap-4 bg-white px-6 py-2.5 rounded-full border border-slate-300 shadow-sm">
                <span className="text-black font-black text-lg">مازن رجب</span>
                <span className="text-black font-bold">|</span>
                <span className="text-black font-bold font-mono tracking-widest text-lg" dir="ltr">01025210536 - 01158325071</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal isOpen={isRefundOpen} onClose={() => setIsRefundOpen(false)} title={`إرجاع من فاتورة رقم ${currentInvoice?._id?.slice(-8) || ''}`} onConfirm={handleRefundSubmit} confirmText="معالجة الإرجاع" confirmClass="btn-warning">
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-xs font-bold shadow-sm">
          ⚠️ تنبيه: الإرجاع يخفض إجمالي الفاتورة. إذا كانت الفاتورة مدفوعة بالكامل، قد يرفض السيرفر الإرجاع بسبب اختلاف في حساب المبالغ.
        </div>
        <p className="text-slate-600 font-bold text-sm mb-4">أدخل الكميات المراد إرجاعها (اترك 0 لتجاهل العنصر):</p>
        <div className="flex flex-col gap-3">
          {currentInvoice?.items?.filter(it => it.quantity > 0).map(it => {
            const pid = it.productId?._id || it.productId;
            return (
              <div key={pid} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-sm">{it.productId?.name || 'منتج محذوف'}</div>
                  <div className="text-xs text-slate-500 font-bold mt-1">الكمية المباعة: {it.quantity} | السعر: {formatCurrency(it.unitPrice)}</div>
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 text-center">كمية الإرجاع</label>
                  <input 
                    className={`${inputCls} text-center py-1.5`} 
                    type="number" min="0" max={it.quantity} 
                    value={refundItems[pid] || 0}
                    onChange={e => setRefundItems({...refundItems, [pid]: e.target.value})}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="حذف فاتورة" onConfirm={handleDelete} confirmText="حذف الفاتورة" confirmClass="btn-danger">
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm font-bold shadow-sm">
          <span className="text-xl mb-2 block">⚠️</span>
          سيؤدي هذا إلى حذف الفاتورة نهائياً، واستعادة مخزون المنتجات المباعة، وتعديل رصيد العميل إذا كانت الفاتورة آجلة.
          <br/><br/>هل تريد الاستمرار؟
        </div>
      </Modal>

      {/* Hidden Print Template */}
      <div className="print-section hidden print:block absolute top-0 left-0 w-full bg-white z-50">
        <InvoicePrintTemplate ref={printRef} invoice={invoiceToPrint} />
      </div>
    </>
  );
}
