import { useState, useEffect, useCallback } from 'react';
import { customersAPI } from '../api';
import useStore from '../store';
import toast from 'react-hot-toast';
import { SkeletonTable, EmptyState, ErrorState, Modal, Pagination, inputCls, labelCls, badgeCls } from '../components/UI';
import { formatCurrency } from '../utils/format';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PER_PAGE = 10;

export default function Customers() {
  const { customers, setCustomers, addCustomer, updateCustomer, removeCustomer } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const navigate = useNavigate();
  
  const initialForm = {
    name: '', phone: '', secondPhone: '', email: '', companyName: '', address: '', creditLimit: 0, allowCredit: false, notes: '', isActive: true
  };
  const [formData, setFormData] = useState(initialForm);

  const loadData = useCallback(async (search = '') => {
    setLoading(true);
    setError(null);
    const q = search ? `?name=${encodeURIComponent(search)}` : '';
    const { data, error: apiError } = await customersAPI.getAll(q);
    
    // 404 means "no customers found" — treat as empty, not an error
    if (apiError && data === null) {
      setCustomers([]);
    } else if (apiError) {
      setError(apiError);
    } else {
      setCustomers(data?.data || []);
    }
    setLoading(false);
  }, [setCustomers]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      loadData(searchTerm);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, loadData]);

  const total = customers.length;
  const sliced = customers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd = () => {
    setCurrentId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const openEdit = (c) => {
    setCurrentId(c._id);
    setFormData({
      name: c.name, phone: c.phone, secondPhone: c.secondPhone || '', email: c.email || '',
      companyName: c.companyName || '', address: c.address || '', creditLimit: c.creditLimit || 0,
      allowCredit: c.allowCredit || false, notes: c.notes || '', isActive: c.isActive !== false
    });
    setIsModalOpen(true);
  };

  const openDelete = (id) => {
    setCurrentId(id);
    setIsDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.phone?.trim()) return toast.error('الاسم والهاتف مطلوبان');

    // Build payload — only include optional fields if they have actual values
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      creditLimit: parseFloat(formData.creditLimit) || 0,
      allowCredit: formData.allowCredit,
    };

    if (formData.secondPhone?.trim()) payload.secondPhone = formData.secondPhone.trim();
    if (formData.email?.trim())       payload.email       = formData.email.trim();
    if (formData.companyName?.trim()) payload.companyName = formData.companyName.trim();
    if (formData.address?.trim())     payload.address     = formData.address.trim();
    if (formData.notes?.trim())       payload.notes       = formData.notes.trim();
    if (currentId)                    payload.isActive    = formData.isActive;

    if (currentId) {
      const c = customers.find(x => x._id === currentId);
      if (c && c.balance > payload.creditLimit && payload.creditLimit > 0) {
        toast.warning(`تنبيه: الرصيد الحالي (${formatCurrency(c.balance)}) يتجاوز الحد الائتماني الجديد!`);
      }
      
      const { data, error } = await customersAPI.update(currentId, payload);
      if (error) return toast.error(error);
      updateCustomer(currentId, data.data);
      toast.success('تم التعديل بنجاح');
    } else {
      const { data, error } = await customersAPI.create(payload);
      if (error) return toast.error(error);
      addCustomer(data.data);
      toast.success('تمت إضافة العميل بنجاح');
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    const { error } = await customersAPI.delete(currentId);
    if (error) return toast.error(error);
    removeCustomer(currentId);
    toast.success('تم الحذف بنجاح');
    setIsDeleteOpen(false);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">العملاء</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة بيانات العملاء والمديونيات</p>
        </div>
        <button onClick={openAdd} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
          <Plus className="w-5 h-5" /> إضافة عميل
        </button>
      </div>
      
      <div className="mb-6 flex gap-3">
        <div className="relative w-full max-w-md">
          <input 
            type="search" 
            placeholder="ابحث بالاسم، الهاتف، الشركة..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-sm" 
          />
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
      
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <ErrorState msg={error} onRetry={() => loadData(searchTerm)} />
      ) : customers.length === 0 ? (
        <EmptyState msg="لا يوجد عملاء" icon="👥" />
      ) : (
        <div className="rounded-2xl overflow-x-auto border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-right text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 w-12 text-center">#</th>
                <th className="px-5 py-4">العميل</th>
                <th className="px-5 py-4">الهاتف</th>
                <th className="px-5 py-4">الشركة</th>
                <th className="px-5 py-4">الرصيد / الحد الائتماني</th>
                <th className="px-5 py-4 text-center">الحالة</th>
                <th className="px-5 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sliced.map((c, i) => {
                const pct = c.creditLimit > 0 ? Math.min((c.balance / c.creditLimit) * 100, 100) : 0;
                const limitColor = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <tr key={c._id} onClick={() => navigate(`/customers/${c._id}`)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="px-5 py-4 text-center text-slate-500 font-bold">{(page - 1) * PER_PAGE + i + 1}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{c.name}</div>
                      {c.email && <div className="text-xs text-slate-500 mt-0.5">{c.email}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-slate-700 font-bold font-mono">{c.phone}</div>
                      {c.secondPhone && <div className="text-xs text-slate-500 font-mono font-bold mt-0.5">{c.secondPhone}</div>}
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-bold">{c.companyName || <span className="text-slate-400">—</span>}</td>
                    <td className="px-5 py-4 min-w-[200px]">
                      {c.allowCredit ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${limitColor} credit-fill rounded-full`} style={{ width: `${pct}%` }}></div>
                          </div>
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className={pct > 85 ? 'text-red-500 font-bold' : 'text-slate-500 font-bold'}>{formatCurrency(c.balance)}</span>
                            <span className="text-slate-500 font-bold">{formatCurrency(c.creditLimit)}</span>
                          </div>
                        </div>
                      ) : <span className="text-slate-600 font-bold text-xs bg-slate-100 px-2 py-1 rounded">بدون ائتمان</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={c.isActive ? badgeCls.success : badgeCls.danger}>{c.isActive ? 'نشط' : 'موقوف'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="text-slate-800 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="تعديل"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); openDelete(c._id); }} className="text-slate-800 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && <Pagination total={total} page={page} perPage={PER_PAGE} onChange={setPage} />}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={currentId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
        onConfirm={handleSave}
        size="modal-lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>اسم العميل <span className="text-red-400">*</span></label>
            <input className={inputCls} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="الاسم الكامل" />
          </div>
          <div>
            <label className={labelCls}>الهاتف الأساسي <span className="text-red-400">*</span></label>
            <input className={`${inputCls} text-left`} dir="ltr" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="01..." />
          </div>
          <div>
            <label className={labelCls}>هاتف إضافي</label>
            <input className={`${inputCls} text-left`} dir="ltr" value={formData.secondPhone} onChange={e => setFormData({...formData, secondPhone: e.target.value})} placeholder="01..." />
          </div>
          <div>
            <label className={labelCls}>البريد الإلكتروني</label>
            <input type="email" className={`${inputCls} text-left`} dir="ltr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
          </div>
          <div>
            <label className={labelCls}>الشركة</label>
            <input className={inputCls} value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="اسم الشركة (إن وجد)" />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>العنوان</label>
            <input className={inputCls} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="عنوان العميل التفصيلي" />
          </div>
          
          <div className="md:col-span-2 mt-2 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-4">البيانات المالية</h4>
          </div>
          
          <div>
            <label className={labelCls}>الحد الائتماني (أقصى مديونية مسموحة)</label>
            <input type="number" min="0" className={inputCls} value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: e.target.value})} />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-3 cursor-pointer mt-4">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={formData.allowCredit} onChange={e => setFormData({...formData, allowCredit: e.target.checked})} />
                <div className={`w-11 h-6 rounded-full border transition-colors ${formData.allowCredit ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-200 border-slate-300'}`}></div>
                <div className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-sm ${formData.allowCredit ? '-translate-x-[20px]' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-sm font-bold text-slate-600">السماح بالائتمان (الآجل)</span>
            </label>
          </div>
          
          {currentId && (
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer mt-4">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                  <div className={`w-11 h-6 rounded-full border transition-colors ${formData.isActive ? 'bg-blue-500 border-blue-600' : 'bg-slate-200 border-slate-300'}`}></div>
                  <div className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-sm ${formData.isActive ? '-translate-x-[20px]' : 'translate-x-0'}`}></div>
                </div>
                <span className="text-sm font-bold text-slate-600">حالة العميل (نشط)</span>
              </label>
            </div>
          )}
          
          <div className="md:col-span-2 mt-2">
            <label className={labelCls}>ملاحظات</label>
            <textarea className={`${inputCls} resize-none h-20`} placeholder="أي ملاحظات إضافية حول العميل..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isDeleteOpen} 
        onClose={() => setIsDeleteOpen(false)} 
        title="حذف عميل"
        onConfirm={handleDelete}
        confirmText="حذف نهائي"
        confirmClass="btn-danger"
      >
        <p className="text-slate-600 font-bold">هل أنت متأكد من حذف العميل؟ لا يمكن التراجع عن هذا الإجراء.</p>
      </Modal>
    </>
  );
}
