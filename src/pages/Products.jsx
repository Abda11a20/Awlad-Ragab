import { useState, useEffect, useCallback } from 'react';
import { productsAPI } from '../api';
import useStore from '../store';
import toast from 'react-hot-toast';
import { SkeletonTable, EmptyState, ErrorState, Modal, Pagination, inputCls, labelCls, badgeCls } from '../components/UI';
import { formatCurrency, formatNumber } from '../utils/format';
import { Search, Plus, Edit2, Trash2, PackagePlus } from 'lucide-react';

const PER_PAGE = 10;

export default function Products() {
  const { products, setProducts, addProduct, updateProduct, removeProduct } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', unitPrice: '', unitsPerBox: '12', retailPrice: '', stockBoxes: ''
  });

  // Stock adjustment state
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockData, setStockData] = useState({ operation: 'ADD', quantity: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    let qParams = [`page=${page}`, `limit=${PER_PAGE}`];
    if (debouncedSearch) qParams.push(`name=${encodeURIComponent(debouncedSearch)}`);
    const q = '?' + qParams.join('&');
    const { data, error: apiError } = await productsAPI.getAll(q);

    // 404 means "no products found" — treat as empty, not an error
    if (apiError && data === null) {
      setProducts([]);
    } else if (apiError) {
      setError(apiError);
    } else {
      setProducts(data?.data || []);
    }
    setLoading(false);
  }, [page, debouncedSearch, setProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm !== debouncedSearch) setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Backend handles pagination
  const currentItems = products || [];
  const hasNextPage = currentItems.length === PER_PAGE;

  const openAdd = () => {
    setCurrentId(null);
    setFormData({ name: '', description: '', unitPrice: '', unitsPerBox: '12', retailPrice: '', stockBoxes: '' });
    setIsModalOpen(true);
  };

  const openEdit = (p) => {
    setCurrentId(p._id);
    setFormData({
      name: p.name,
      description: p.description || '',
      unitPrice: p.unitPrice,
      unitsPerBox: p.unitsPerBox,
      retailPrice: p.retailPrice || '',
      stockBoxes: Math.floor((p.stock || 0) / (p.unitsPerBox || 1))
    });
    setIsModalOpen(true);
  };

  const openDelete = (id) => {
    setCurrentId(id);
    setIsDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.unitPrice || !formData.unitsPerBox) {
      return toast.error('يرجى تعبئة الحقول الإجبارية');
    }

    const finalUnitsPerBox = parseInt(formData.unitsPerBox);

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      unitPrice: parseFloat(formData.unitPrice),
      unitsPerBox: finalUnitsPerBox,
      retailPrice: parseFloat(formData.retailPrice) || 0,
    };

    if (currentId) {
      // عند التعديل: نحسب boxesInStock من stock الحالي عشان الباك ميرستش المخزون
      const originalProduct = products.find(p => p._id === currentId);
      if (originalProduct) {
        payload.boxesInStock = originalProduct.stock / finalUnitsPerBox;
      }
      const { data, error } = await productsAPI.update(currentId, payload);
      if (error) return toast.error(error);
      updateProduct(currentId, data.data);
      toast.success('تم التعديل بنجاح');
    } else {
      // عند الإنشاء: نستخدم القيمة من الفورم
      payload.boxesInStock = parseInt(formData.stockBoxes || 0);
      const { data, error } = await productsAPI.create(payload);
      if (error) return toast.error(error);
      addProduct(data.data);
      toast.success('تمت إضافة المنتج بنجاح');
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    const { error } = await productsAPI.delete(currentId);
    if (error) return toast.error(error);
    removeProduct(currentId);
    toast.success('تم الحذف بنجاح');
    setIsDeleteOpen(false);
  };

  const openStock = (p) => {
    setStockProduct(p);
    setStockData({ operation: 'ADD', quantity: '', unitType: 'BOX' });
    setIsStockOpen(true);
  };

  const handleStockSubmit = async () => {
    const qty = parseInt(stockData.quantity);
    if (!qty || qty <= 0) return toast.error('يرجى إدخال كمية صحيحة');
    const isBox = stockData.unitType === 'BOX';
    const pieces = isBox ? qty * (stockProduct.unitsPerBox || 1) : qty;
    const { data, error } = await productsAPI.updateStock(stockProduct._id, {
      quantity: pieces,
      operation: stockData.operation,
    });
    if (error) return toast.error(error);
    updateProduct(stockProduct._id, data.data);
    const label = isBox ? `${qty} علبة` : `${qty} قطعة`;
    toast.success(stockData.operation === 'ADD' ? `تمت إضافة ${label} بنجاح` : `تم سحب ${label} بنجاح`);
    setIsStockOpen(false);
    loadData();
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">المنتجات</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة المخزون والأسعار</p>
        </div>
        <button onClick={openAdd} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
          <Plus className="w-5 h-5" /> إضافة منتج
        </button>
      </div>

      <div className="mb-6 flex gap-3">
        <div className="relative w-full max-w-sm">
          <input
            type="search"
            placeholder="ابحث باسم المنتج..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-sm"
          />
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : error ? (
        <ErrorState msg={error} onRetry={() => loadData(searchTerm)} />
      ) : products.length === 0 ? (
        <EmptyState msg="لا توجد منتجات" icon="📦" />
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="flex flex-col gap-3 md:hidden">
            {currentItems.map((p, i) => (
              <div key={p._id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{p.name}</p>
                    {p.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{p.description}</p>}
                  </div>
                  <span className="text-xs text-slate-400 font-bold mr-2">#{(page - 1) * PER_PAGE + i + 1}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-50 rounded-xl p-2.5">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">سعر الوحدة</p>
                    <p className="text-sm font-mono font-bold text-slate-700">{formatCurrency(p.unitPrice)}</p>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">العلبة</p>
                    <p className="text-sm font-mono font-bold text-slate-700">{formatCurrency(p.boxPrice)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">التجزئة</p>
                    <p className="text-sm font-mono font-bold text-slate-700">{formatCurrency(p.retailPrice)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {Math.floor(p.stock / p.unitsPerBox) > 0 && (
                      <span className={`${p.stock < p.unitsPerBox * 2 ? badgeCls.warning : badgeCls.success}`}>
                        {formatNumber(Math.floor(p.stock / p.unitsPerBox))} علبة
                      </span>
                    )}
                    {(p.stock % p.unitsPerBox) > 0 && (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {formatNumber(p.stock % p.unitsPerBox)} قطعة
                      </span>
                    )}
                    {p.stock === 0 && <span className={badgeCls.danger}>نفد الكمية</span>}
                  </div>
                    <div className="flex gap-1">
                      <button onClick={() => openStock(p)} className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-lg transition-colors" title="تعديل المخزون"><PackagePlus className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(p)} className="text-slate-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="تعديل"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => openDelete(p._id)} className="text-slate-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
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
                  <th className="px-5 py-4">الاسم</th>
                  <th className="px-5 py-4">سعر الوحدة</th>
                  <th className="px-5 py-4">سعر العلبة</th>
                  <th className="px-5 py-4">سعر التجزئة</th>
                  <th className="px-5 py-4 text-center">المخزون</th>
                  <th className="px-5 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((p, i) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-4 text-center text-slate-500 font-bold">{(page - 1) * PER_PAGE + i + 1}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{p.name}</div>
                      {p.description && <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{p.description}</div>}
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-mono font-bold">{formatCurrency(p.unitPrice)}</td>
                    <td className="px-5 py-4 text-slate-700 font-mono font-bold">{formatCurrency(p.boxPrice)}</td>
                    <td className="px-5 py-4 text-slate-700 font-mono font-bold">{formatCurrency(p.retailPrice)}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {Math.floor(p.stock / p.unitsPerBox) > 0 && (
                          <span className={`${p.stock < p.unitsPerBox * 2 ? badgeCls.warning : badgeCls.success}`}>
                            {formatNumber(Math.floor(p.stock / p.unitsPerBox))} علبة
                          </span>
                        )}
                        {(p.stock % p.unitsPerBox) > 0 && (
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {formatNumber(p.stock % p.unitsPerBox)} قطعة
                          </span>
                        )}
                        {p.stock === 0 && (
                          <span className={badgeCls.danger}>نفد الكمية</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openStock(p)} className="text-slate-800 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-lg transition-colors" title="تعديل المخزون"><PackagePlus className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(p)} className="text-slate-800 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="تعديل"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => openDelete(p._id)} className="text-slate-800 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentId ? 'تعديل منتج' : 'إضافة منتج جديد'}
        onConfirm={handleSave}
        size="modal-lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>اسم المنتج <span className="text-red-400">*</span></label>
            <input className={inputCls} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="اسم المنتج..." />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>الوصف</label>
            <input className={inputCls} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="وصف اختياري..." />
          </div>
          <div>
            <label className={labelCls}>سعر القطعة (الوحدة) <span className="text-red-400">*</span></label>
            <input type="number" className={inputCls} value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <label className={labelCls}>عدد القطع داخل العلبة <span className="text-red-400">*</span></label>
            <input type="number" className={inputCls} value={formData.unitsPerBox} onChange={e => setFormData({ ...formData, unitsPerBox: e.target.value })} placeholder="12" />
          </div>
          <div>
            <label className={labelCls}>سعر التجزئة</label>
            <input type="number" className={inputCls} value={formData.retailPrice} onChange={e => setFormData({ ...formData, retailPrice: e.target.value })} placeholder="0.00" />
          </div>
          {!currentId && (
            <div>
              <label className={labelCls}>المخزون (عدد العلب)</label>
              <input type="number" className={inputCls} value={formData.stockBoxes} onChange={e => setFormData({ ...formData, stockBoxes: e.target.value })} placeholder="0" />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="حذف منتج"
        onConfirm={handleDelete}
        confirmText="حذف نهائي"
        confirmClass="btn-danger"
      >
        <p className="text-slate-600 font-bold">هل أنت متأكد من حذف المنتج؟ لا يمكن التراجع عن هذا الإجراء.</p>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isStockOpen}
        onClose={() => setIsStockOpen(false)}
        title={`تعديل مخزون: ${stockProduct?.name || ''}`}
        onConfirm={handleStockSubmit}
        confirmText={stockData.operation === 'ADD' ? 'إضافة للمخزون' : 'سحب من المخزون'}
        confirmClass={stockData.operation === 'ADD' ? '' : 'btn-warning'}
      >
        {stockProduct && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">المخزون الحالي:</span>
              <span className="font-mono font-bold text-slate-800">
                {Math.floor(stockProduct.stock / stockProduct.unitsPerBox)} علبة
                {(stockProduct.stock % stockProduct.unitsPerBox) > 0 && ` و ${stockProduct.stock % stockProduct.unitsPerBox} قطعة`}
              </span>
            </div>
            <div>
              <label className={labelCls}>العملية</label>
              <select className={inputCls} value={stockData.operation} onChange={e => setStockData({...stockData, operation: e.target.value})}>
                <option value="ADD">إضافة للمخزون</option>
                <option value="REMOVE">سحب من المخزون</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>نوع الإدخال</label>
              <select className={inputCls} value={stockData.unitType} onChange={e => setStockData({...stockData, unitType: e.target.value})}>
                <option value="BOX">علبة</option>
                <option value="UNIT">قطعة</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{stockData.unitType === 'BOX' ? 'عدد العلب' : 'عدد القطع'} <span className="text-red-400">*</span></label>
              <input type="number" min="1" className={inputCls} placeholder={stockData.unitType === 'BOX' ? 'أدخل عدد العلب...' : 'أدخل عدد القطع...'} value={stockData.quantity} onChange={e => setStockData({...stockData, quantity: e.target.value})} />
            </div>
            {stockData.quantity > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center text-sm font-bold text-emerald-700">
                {stockData.operation === 'ADD' ? 'سيتم إضافة' : 'سيتم سحب'}{' '}
                {stockData.unitType === 'BOX'
                  ? `${parseInt(stockData.quantity) * stockProduct.unitsPerBox} قطعة (${stockData.quantity} علبة × ${stockProduct.unitsPerBox} قطعة)`
                  : `${stockData.quantity} قطعة`
                }
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
