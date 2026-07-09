/**
 * @file Invoices.jsx
 * @description Core invoice management module.
 *              Handles the creation, viewing, printing, and refunding of invoices.
 *              Integrates closely with both the Product (inventory check) and
 *              Customer (credit check) modules. Features complex state management
 *              for item selection and asynchronous double-submit protections.
 */

import { useState, useEffect, useCallback } from 'react';
import { invoicesAPI, productsAPI, customersAPI, default as http } from '../api';
import useStore from '../store';
import toast from 'react-hot-toast';
import { SkeletonTable, EmptyState, ErrorState, Modal, Pagination, SearchableSelect, inputCls, labelCls, badgeCls } from '../components/UI';
import { formatCurrency, formatDateTime } from '../utils/format';
import { Plus, Trash2, Undo2, FileText as FileTextIcon, Eye, Printer, Bluetooth, Banknote, ArrowUpDown } from 'lucide-react';
import { printInvoice, printThermalInvoice } from '../utils/print';
import { isBleSupported, isConnected as isBleConnected, printThermalDirect, connectPrinter, getDeviceName, shareInvoiceToRawBT } from '../utils/thermalBluetooth';

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

  // Payment Collection State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Prevent double submit
  const [submitting, setSubmitting] = useState(false);

  // Sorting state (desc: newest to oldest, asc: oldest to newest)
  const [sortOrder, setSortOrder] = useState('desc');



  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    let allInvoices = [];
    let pg = 1;
    let more = true;
    const LIMIT = 100;

    while (more && pg <= 50) {
      let q = [`page=${pg}`, `limit=${LIMIT}`];
      if (filterStatus) q.push(`status=${filterStatus}`);
      if (filterMethod) q.push(`paymentMethod=${filterMethod}`);
      const qs = '?' + q.join('&');

      const { data, error: apiError } = await invoicesAPI.getAll(qs);
      
      if (apiError && data === null) {
        if (pg === 1) setInvoices([]);
        more = false;
      } else if (apiError) {
        if (pg === 1) setError(apiError);
        more = false;
      } else {
        const fetched = data?.data || [];
        allInvoices = [...allInvoices, ...fetched];
        more = fetched.length > 0 && (fetched.length === LIMIT || fetched.length === 10);
        pg++;
      }
    }
    setInvoices(allInvoices);
    setLoading(false);
  }, [filterStatus, filterMethod, setInvoices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side pagination of the sorted invoices
  const rawItems = invoices || [];
  const sortedItems = [...rawItems].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });
  const currentItems = sortedItems.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasNextPage = sortedItems.length > page * PER_PAGE;

  const openCreate = async () => {
    // Load ALL products by paginating through every page (backend returns 10 per page)
    const BACKEND_LIMIT = 10;
    let allProducts = [];
    let pg = 1;
    let more = true;
    while (more) {
      const { data } = await productsAPI.getAll(`?page=${pg}&limit=${BACKEND_LIMIT}`);
      if (data?.data && data.data.length > 0) {
        allProducts = [...allProducts, ...data.data];
        more = data.data.length === BACKEND_LIMIT; // if less than limit, it's the last page
        pg++;
      } else {
        more = false;
      }
    }
    if (allProducts.length > 0) setProducts(allProducts);

    // Load ALL customers by paginating through every page
    let allCustomers = [];
    pg = 1;
    more = true;
    while (more) {
      const { data } = await customersAPI.getAll(`?page=${pg}&limit=${BACKEND_LIMIT}`);
      if (data?.data && data.data.length > 0) {
        allCustomers = [...allCustomers, ...data.data];
        more = data.data.length === BACKEND_LIMIT;
        pg++;
      } else {
        more = false;
      }
    }
    if (allCustomers.length > 0) setCustomers(allCustomers);

    setCreateData({ customerId: '', paymentMethod: 'cash', discount: 0, paidAmount: 0, items: [{ productId: '', quantity: '', unitPrice: 0, unitType: 'UNIT' }] });
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
    setCreateData({ ...createData, items: [...createData.items, { productId: '', quantity: '', unitPrice: 0, unitType: 'UNIT' }] });
  };

  const removeCreateItem = (index) => {
    const newItems = createData.items.filter((_, i) => i !== index);
    setCreateData({ ...createData, items: newItems });
  };

  const calculateCreateTotals = () => {
    let subtotal = createData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const prod = products.find(p => p._id === item.productId);
      const multiplier = item.unitType === 'BOX' && prod ? prod.unitsPerBox : 1;
      return sum + (qty * multiplier * price);
    }, 0);
    let discount = parseFloat(createData.discount) || 0;
    
    // Fix floating point precision issues (e.g., 3 * 12.6666 = 37.9998 instead of 38.00)
    subtotal = Math.round(subtotal * 100) / 100;
    discount = Math.round(discount * 100) / 100;
    
    let total = Math.round((subtotal - discount) * 100) / 100;

    // CASH: backend auto-fills paidAmount = totalAmount, dueAmount = 0
    if (createData.paymentMethod === 'cash') {
      return { subtotal, discount, total, paid: total, due: 0 };
    }

    let paid = Math.round((parseFloat(createData.paidAmount) || 0) * 100) / 100;
    let due = Math.round((total - paid) * 100) / 100;
    
    return { subtotal, discount, total, paid, due };
  };

  const handleCreateSubmit = async () => {
    if (submitting) return;
    const validItems = createData.items.filter(i => i.productId && i.quantity > 0);
    if (!validItems.length) return toast.warning('يجب إضافة عنصر واحد على الأقل للفاتورة');

    // ══════ التحقق من المخزون قبل الإرسال ══════
    for (const item of validItems) {
      const prod = products.find(p => p._id === item.productId);
      if (!prod) {
        return toast.error('منتج غير موجود، يرجى تحديث الصفحة');
      }
      const multiplier = item.unitType === 'BOX' && prod ? prod.unitsPerBox : 1;
      const requiredUnits = parseInt(item.quantity) * multiplier;
      if (requiredUnits > prod.stock) {
        const availText = Math.floor(prod.stock / prod.unitsPerBox) > 0
          ? `${Math.floor(prod.stock / prod.unitsPerBox)} علبة و ${prod.stock % prod.unitsPerBox} قطعة`
          : `${prod.stock} قطعة`;
        return toast.error(`الكمية المطلوبة من "${prod.name}" (${requiredUnits} قطعة) أكبر من المخزون المتاح (${availText})`);
      }
    }

    const { subtotal, discount, total, paid } = calculateCreateTotals();

    const isCash = createData.paymentMethod === 'cash';

    // Backend model: allows paying up to 2 pounds extra to handle piaster issues (CREDIT only)
    if (!isCash && paid > total + 2) {
      return toast.error(`المبلغ المدفوع (${formatCurrency(paid)}) يتجاوز إجمالي الفاتورة بحد غير مسموح. أقصى زيادة مسموحة هي 2 جنيه`);
    }

    // Cap paidAmount to totalAmount to prevent negative dueAmount on backend
    const safePaid = isCash ? Math.round(total * 100) / 100 : Math.round(Math.min(paid, total) * 100) / 100;

    const payload = {
      customerId: createData.customerId || undefined,
      paymentMethod: createData.paymentMethod,
      discount: Math.round(discount * 100) / 100,
      paidAmount: safePaid,
      items: validItems.map(i => {
        const prod = products.find(p => p._id === i.productId);
        const multiplier = i.unitType === 'BOX' && prod ? prod.unitsPerBox : 1;
        return {
          productId: i.productId,
          quantity: parseInt(i.quantity) * multiplier,
          unitPrice: Math.round(parseFloat(i.unitPrice) * 100) / 100,
        };
      }),
    };

    setSubmitting(true);
    const { error } = await invoicesAPI.create(payload);
    setSubmitting(false);
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
    if (submitting) return;
    setSubmitting(true);
    const { error } = await invoicesAPI.delete(currentInvoice._id);
    setSubmitting(false);
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
    toast.dismiss(toastId);
    printThermalInvoice(data?.data);
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
    if (submitting) return;
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

    setSubmitting(true);
    const { error } = await invoicesAPI.refund(currentInvoice._id, { items });
    setSubmitting(false);
    if (error) return toast.error(error);

    clearCache();
    toast.success('تمت معالجة الإرجاع بنجاح');
    setIsRefundOpen(false);
    loadData();
  };

  // Payment collection functions
  const openPayment = async (inv) => {
    const { data, error } = await invoicesAPI.getById(inv._id);
    if (error) return toast.error(error);
    const fetchedInv = data?.data;
    setCurrentInvoice(fetchedInv);
    setPaymentAmount(0);
    setIsPaymentOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (submitting) return;
    const additionalPayment = parseFloat(paymentAmount) || 0;
    if (additionalPayment <= 0) return toast.warning('يجب إدخال مبلغ أكبر من 0');

    const newPaidAmount = (currentInvoice.paidAmount || 0) + additionalPayment;

    if (newPaidAmount > currentInvoice.totalAmount + 2) {
      return toast.error('المبلغ الإجمالي المدفوع يتجاوز إجمالي الفاتورة');
    }

    setSubmitting(true);
    const { error } = await invoicesAPI.refund(currentInvoice._id, { paidAmount: newPaidAmount });
    setSubmitting(false);
    if (error) return toast.error(error);

    clearCache();
    toast.success('تم تحديث المبلغ المدفوع بنجاح');
    setIsPaymentOpen(false);
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
        <select value={filterStatus} onChange={e => {setFilterStatus(e.target.value); setPage(1);}} className="bg-white border border-slate-300 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 min-w-[150px] shadow-sm w-full sm:w-auto">
          <option value="">جميع الحالات</option>
          <option value="paid">مدفوعة</option>
          <option value="partial">جزئية</option>
          <option value="unpaid">غير مدفوعة</option>
        </select>
        <select value={filterMethod} onChange={e => {setFilterMethod(e.target.value); setPage(1);}} className="bg-white border border-slate-300 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 min-w-[150px] shadow-sm w-full sm:w-auto">
          <option value="">جميع الطرق</option>
          <option value="cash">كاش</option>
          <option value="credit">آجل</option>
        </select>
        <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 transition-colors shadow-sm flex items-center gap-2 justify-center w-full sm:w-auto">
          <ArrowUpDown className="w-4 h-4 text-slate-500" />
          <span>ترتيب: {sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
        </button>
        <button onClick={() => {setFilterStatus(''); setFilterMethod(''); setPage(1);}} className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 transition-colors shadow-sm w-full sm:w-auto">
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
            {currentItems.map((inv, i) => (
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
                    <button onClick={() => openRefund(inv)} className="text-slate-600 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-lg transition-colors" title="إرجاع" style={{ display: 'none' }}>
                      <Undo2 className="w-4 h-4" />
                    </button>
                    {inv.dueAmount > 0 && (
                      <button onClick={() => openPayment(inv)} className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-lg transition-colors" title="تحصيل مبلغ">
                        <Banknote className="w-4 h-4" />
                      </button>
                    )}
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
                {currentItems.map((inv, i) => (
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
                        <button onClick={() => openRefund(inv)} className="text-slate-800 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-lg transition-colors" title="إرجاع (Refund)" style={{ display: 'none' }}>
                          <Undo2 className="w-4 h-4" />
                        </button>
                        {inv.dueAmount > 0 && (
                          <button onClick={() => openPayment(inv)} className="text-slate-800 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-lg transition-colors" title="تحصيل مبلغ">
                            <Banknote className="w-4 h-4" />
                          </button>
                        )}
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

      {!loading && !error && <Pagination page={page} hasNext={hasNextPage} onChange={setPage} />}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="إنشاء فاتورة جديدة" onConfirm={handleCreateSubmit} confirmText={submitting ? 'جاري الإصدار...' : 'إصدار الفاتورة'} confirmDisabled={submitting} size="modal-xl">
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
              {createData.paymentMethod !== 'cash' && (
                <div>
                  <label className={labelCls}>المبلغ المدفوع</label>
                  <input type="number" min="0" className={inputCls} value={createData.paidAmount} onChange={e => setCreateData({...createData, paidAmount: e.target.value})} />
                </div>
              )}
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
                <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
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
                  <div className="flex gap-2 items-start">
                    <div className="w-24 sm:w-20">
                      <input type="number" min="1" className={`${inputCls} text-center`} placeholder="الكمية" value={item.quantity} onChange={e => handleCreateItemChange(idx, 'quantity', e.target.value)} />
                    </div>
                    <select className={`${inputCls} w-20 text-center text-xs px-1`} value={item.unitType || 'UNIT'} onChange={e => handleCreateItemChange(idx, 'unitType', e.target.value)}>
                      <option value="UNIT">قطعة</option>
                      <option value="BOX">علبة</option>
                    </select>
                    <button onClick={() => removeCreateItem(idx)} className="shrink-0 h-10 w-10 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex justify-between text-sm text-slate-500 font-bold"><span>الإجمالي الفرعي:</span><span className="font-mono text-slate-800">{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between text-sm text-slate-500 font-bold"><span>الخصم:</span><span className="font-mono text-slate-800">{formatCurrency(totals.discount)}</span></div>
            <div className="flex justify-between font-bold text-slate-800 mt-1 pt-2 border-t border-slate-200"><span>الإجمالي:</span><span className="font-mono text-emerald-600">{formatCurrency(totals.total)}</span></div>
            <div className="flex justify-between text-sm text-slate-500 font-bold"><span>المدفوع:</span><span className="font-mono text-slate-800">{formatCurrency(totals.paid)}</span></div>
            <div className={`flex justify-between font-bold mt-1 pt-2 border-t ${totals.due < -2 ? 'border-red-200' : 'border-slate-200'}`}>
              <span>المتبقي:</span>
              <span className={`font-mono ${totals.due > 0 ? 'text-red-500' : totals.due >= -2 && totals.due <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totals.due < -2 ? '⚠ تجاوز الحد' : formatCurrency(totals.due)}
              </span>
            </div>
            {totals.due < -2 && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs text-center font-bold">
                المبلغ المدفوع يتجاوز إجمالي الفاتورة بحد غير مسموح — راجع المدفوع (أقصى زيادة 2 جنيه)
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
            <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-300 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="inline-flex items-center gap-4 bg-white px-6 py-2.5 rounded-full border border-slate-300 shadow-sm">
                <span className="text-black font-black text-lg">مازن رجب</span>
                <span className="text-black font-bold">|</span>
                <span className="text-black font-bold font-mono tracking-widest text-lg" dir="ltr">01025210536 - 01158325071</span>
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <button 
                  onClick={async () => {
                    if (isBleSupported()) {
                      const tid = toast.loading('جاري الطباعة عبر البلوتوث...');
                      try {
                        await printThermalDirect(currentInvoice);
                        toast.success(isBleConnected() ? `تم الطباعة على ${getDeviceName()}` : 'تم الطباعة عبر البلوتوث', { id: tid });
                      } catch (err) {
                        toast.error(err.message || 'فشل الطباعة', { id: tid });
                        printThermalInvoice(currentInvoice);
                      }
                    } else {
                      printThermalInvoice(currentInvoice);
                    }
                  }} 
                  className="flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-full font-bold hover:bg-slate-700 transition-colors shadow-sm w-full md:w-auto"
                >
                  <Printer className="w-5 h-5" />
                  طباعة الفاتورة
                </button>
                <button 
                  onClick={() => shareInvoiceToRawBT(currentInvoice)} 
                  className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-emerald-700 transition-colors shadow-sm w-full md:w-auto"
                >
                  <Printer className="w-5 h-5" />
                  طباعة عبر RawBT
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal isOpen={isRefundOpen} onClose={() => setIsRefundOpen(false)} title={`إرجاع من فاتورة رقم ${currentInvoice?._id?.slice(-8) || ''}`} onConfirm={handleRefundSubmit} confirmText={submitting ? 'جاري المعالجة...' : 'معالجة الإرجاع'} confirmDisabled={submitting} confirmClass="btn-warning">
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

      {/* Payment Collection Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title={`تحصيل مبلغ - فاتورة #${currentInvoice?._id?.slice(-8) || ''}`} onConfirm={handlePaymentSubmit} confirmText={submitting ? 'جاري التحديث...' : 'تأكيد التحصيل'} confirmDisabled={submitting}>
        {currentInvoice && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-500">إجمالي الفاتورة:</span>
                <span className="font-mono text-slate-800">{formatCurrency(currentInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-500">المدفوع سابقاً:</span>
                <span className="font-mono text-emerald-600">{formatCurrency(currentInvoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 mt-1 border-t border-slate-200">
                <span className="text-red-600">المتبقي:</span>
                <span className="font-mono text-red-600">{formatCurrency(currentInvoice.dueAmount)}</span>
              </div>
            </div>

            <div>
              <label className={labelCls}>المبلغ المُحصَّل</label>
              <input
                type="number"
                min="0"
                max={currentInvoice.dueAmount}
                className={inputCls}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="أدخل المبلغ المحصل..."
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPaymentAmount(currentInvoice.dueAmount)}
                  className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                >
                  تحصيل كامل المتبقي ({formatCurrency(currentInvoice.dueAmount)})
                </button>
              </div>
            </div>

            {parseFloat(paymentAmount) > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>المدفوع بعد التحصيل:</span>
                  <span className="font-mono text-emerald-600">{formatCurrency((currentInvoice.paidAmount || 0) + (parseFloat(paymentAmount) || 0))}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700 mt-1">
                  <span>المتبقي بعد التحصيل:</span>
                  <span className={`font-mono ${currentInvoice.dueAmount - (parseFloat(paymentAmount) || 0) <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(Math.max(currentInvoice.dueAmount - (parseFloat(paymentAmount) || 0), 0))}
                  </span>
                </div>
                {currentInvoice.dueAmount - (parseFloat(paymentAmount) || 0) <= 0 && (
                  <div className="mt-2 text-center text-emerald-700 font-bold text-xs">
                    ✅ ستصبح الفاتورة مدفوعة بالكامل
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="حذف فاتورة" onConfirm={handleDelete} confirmText={submitting ? 'جاري الحذف...' : 'حذف الفاتورة'} confirmDisabled={submitting} confirmClass="btn-danger">
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm font-bold shadow-sm">
          <span className="text-xl mb-2 block">⚠️</span>
          سيؤدي هذا إلى حذف الفاتورة نهائياً، واستعادة مخزون المنتجات المباعة، وتعديل رصيد العميل إذا كانت الفاتورة آجلة.
          <br/><br/>هل تريد الاستمرار؟
        </div>
      </Modal>
    </>
  );
}
