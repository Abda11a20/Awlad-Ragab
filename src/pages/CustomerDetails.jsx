import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersAPI, invoicesAPI } from '../api';
import { SkeletonTable, ErrorState, badgeCls } from '../components/UI';
import { formatCurrency, formatDateTime } from '../utils/format';
import { ArrowRight, User, Phone, Mail, MapPin, Building, CreditCard, FileText, Activity, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import InvoicePrintTemplate from '../components/InvoicePrintTemplate';

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);

  // Print State
  const printRef = useRef();
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);

  const triggerPrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => setInvoiceToPrint(null),
    documentTitle: `invoice-${invoiceToPrint?._id?.slice(-8) || ''}`
  });

  useEffect(() => {
    if (invoiceToPrint) {
      triggerPrint();
    }
  }, [invoiceToPrint, triggerPrint]);

  const handlePrint = async (invoiceId) => {
    const toastId = toast.loading('جاري تجهيز الفاتورة للطباعة...');
    const { data, error } = await invoicesAPI.getById(invoiceId);
    if (error) {
      toast.error('فشل تحميل تفاصيل الفاتورة', { id: toastId });
      return;
    }
    setInvoiceToPrint(data?.data);
    toast.success('تم التجهيز!', { id: toastId });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch customer basics
    const { data: custData, error: custErr } = await customersAPI.getById(id);
    if (custErr) {
      setError(custErr);
      setLoading(false);
      return;
    }
    setCustomer(custData?.data);

    // Fetch ALL invoices and filter for this customer (Since backend route is missing)
    const { data: allInvData } = await invoicesAPI.getAll();
    
    if (allInvData?.data) {
      const cInvoices = allInvData.data.filter(inv => 
        (inv.customerId?._id === id) || (inv.customerId === id)
      );

      const totalAmount = cInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
      const totalPaid = cInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
      const totalDue = cInvoices.reduce((sum, i) => sum + (i.dueAmount || 0), 0);

      // Create dummy IDs for the list to render correctly since we map over invoiceId instead of _id in the JSX
      const mappedInvoices = cInvoices.map(i => ({
        ...i,
        invoiceId: i._id // Ensure invoiceId exists for the key and handlePrint
      }));

      setInvoiceData({ 
        totalInvoices: cInvoices.length, 
        totalAmount, 
        totalPaid, 
        totalDue, 
        invoices: mappedInvoices 
      });
    } else {
      setInvoiceData({ totalInvoices: 0, totalAmount: 0, totalPaid: 0, totalDue: 0, invoices: [] });
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <SkeletonTable rows={8} cols={4} />;
  }

  if (error) {
    return <ErrorState msg={error} onRetry={loadData} />;
  }

  if (!customer) return null;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/customers')}
            className="p-2 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors"
            title="عودة للعملاء"
          >
            <ArrowRight className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              {customer.name}
              <span className={customer.isActive ? badgeCls.success : badgeCls.danger}>
                {customer.isActive ? 'نشط' : 'موقوف'}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">تاريخ الإضافة: {customer.createdAt ? formatDateTime(customer.createdAt) : ''}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Basic Info Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5 border-b pb-3 border-slate-100">البيانات الأساسية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-500">الاسم</p>
                <p className="text-slate-800 font-bold">{customer.name}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-500">الشركة</p>
                <p className="text-slate-800 font-bold">{customer.companyName || <span className="text-slate-400">لا يوجد</span>}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-500">رقم الهاتف</p>
                <p className="text-slate-800 font-bold font-mono">{customer.phone}</p>
                {customer.secondPhone && <p className="text-slate-500 text-sm font-mono mt-1">{customer.secondPhone}</p>}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-500">البريد الإلكتروني</p>
                <p className="text-slate-800 font-bold">{customer.email || <span className="text-slate-400">لا يوجد</span>}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-500">العنوان</p>
                <p className="text-slate-800 font-bold">{customer.address || <span className="text-slate-400">لا يوجد</span>}</p>
              </div>
            </div>

            {customer.notes && (
              <div className="flex items-start gap-3 md:col-span-2 mt-2 pt-4 border-t border-slate-100">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-500">ملاحظات</p>
                  <p className="text-slate-700 mt-1 text-sm whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial Info Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5 border-b pb-3 border-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              البيانات المالية
            </h2>
            
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">الرصيد الحالي (المديونية)</p>
                <p className="text-3xl font-black text-slate-800 font-mono tracking-tight">{formatCurrency(customer.balance)}</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-1">الحد الائتماني</p>
                <p className="text-lg font-bold text-slate-700 font-mono">
                  {customer.allowCredit ? formatCurrency(customer.creditLimit) : <span className="text-red-500 text-sm">غير مسموح بالآجل</span>}
                </p>
              </div>

              {customer.allowCredit && customer.creditLimit > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">الاستهلاك</span>
                    <span className="text-slate-700">{Math.min(Math.round((customer.balance / customer.creditLimit) * 100), 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${customer.balance > customer.creditLimit * 0.85 ? 'bg-red-500' : customer.balance > customer.creditLimit * 0.6 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min((customer.balance / customer.creditLimit) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5 border-b pb-3 border-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              ملخص الفواتير
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 mb-1">إجمالي الفواتير</p>
                <p className="text-lg font-black text-slate-800">{invoiceData?.totalInvoices || 0}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 mb-1">إجمالي المدفوع</p>
                <p className="text-sm font-black text-emerald-700 font-mono">{formatCurrency(invoiceData?.totalPaid || 0)}</p>
              </div>
              <div className="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                <span className="text-xs font-bold text-blue-700">إجمالي المعاملات</span>
                <span className="text-sm font-black text-blue-800 font-mono">{formatCurrency(invoiceData?.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">سجل الفواتير</h2>
        </div>
        
        {invoiceData?.invoices?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">رقم الفاتورة</th>
                  <th className="px-5 py-3">التاريخ</th>
                  <th className="px-5 py-3 text-center">الحالة</th>
                  <th className="px-5 py-3 text-center">طريقة الدفع</th>
                  <th className="px-5 py-3">الإجمالي</th>
                  <th className="px-5 py-3">المدفوع</th>
                  <th className="px-5 py-3">المتبقي</th>
                  <th className="px-5 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceData.invoices.map((inv) => (
                  <tr key={inv.invoiceId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-600 text-xs">{inv.invoiceId.slice(-6).toUpperCase()}</td>
                    <td className="px-5 py-3 font-bold text-slate-700 text-xs">{formatDateTime(inv.createdAt)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={
                        inv.status === 'PAID' ? badgeCls.success :
                        inv.status === 'PARTIAL' ? badgeCls.warning : badgeCls.danger
                      }>
                        {inv.status === 'PAID' ? 'مدفوعة' : inv.status === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="font-bold text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {inv.paymentMethod === 'CASH' ? 'نقدي' : 'آجل'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-slate-800">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-5 py-3 font-mono font-bold text-emerald-600">{formatCurrency(inv.paidAmount)}</td>
                    <td className="px-5 py-3 font-mono font-bold text-red-500">{formatCurrency(inv.dueAmount)}</td>
                    <td className="px-5 py-3 text-center">
                      <button 
                        onClick={() => handlePrint(inv.invoiceId)}
                        className="text-xs font-bold text-slate-800 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                        title="طباعة / PDF"
                      >
                        <Printer className="w-3 h-3" /> طباعة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500">
            <p className="font-bold">لا يوجد فواتير مسجلة لهذا العميل حتى الآن.</p>
          </div>
        )}
      </div>

      {/* Hidden Print Template */}
      <div style={{ display: 'none' }}>
        <InvoicePrintTemplate ref={printRef} invoice={invoiceToPrint} />
      </div>

    </div>
  );
}
