import { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';
import { SkeletonCards, ErrorState } from '../components/UI';
import { formatCurrency, formatNumber } from '../utils/format';

const PERIODS = [
  { key: 'daily',     label: 'اليوم',      icon: '🌅' },
  { key: 'weekly',    label: 'الأسبوع',    icon: '📅' },
  { key: 'monthly',   label: 'الشهر',      icon: '📆' },
  { key: 'quarterly', label: 'ربع السنة',  icon: '📊' },
  { key: 'yearly',    label: 'السنة',      icon: '📈' },
];

const CARDS = [
  { key: 'totalSales', label: 'إجمالي المبيعات', icon: '💰', color: 'emerald', currency: true },
  { key: 'totalPaid',  label: 'إجمالي المدفوع',  icon: '✅', color: 'blue',    currency: true },
  { key: 'totalDue',   label: 'إجمالي المتبقي',  icon: '⏳', color: 'amber',   currency: true },
  { key: 'count',      label: 'عدد الفواتير',    icon: '🧾', color: 'purple',  currency: false },
];

const colorMap = {
  emerald: { border: 'border-emerald-200', bg: 'from-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  blue:    { border: 'border-blue-200',    bg: 'from-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-500' },
  amber:   { border: 'border-amber-200',   bg: 'from-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500' },
  purple:  { border: 'border-purple-200',  bg: 'from-purple-50',  text: 'text-purple-700',  bar: 'bg-purple-500' },
};

export default function Dashboard() {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activePeriod, setActivePeriod] = useState('monthly');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const { data: resData, error: apiError } = await dashboardAPI.getStats();
    if (apiError || !resData?.success) {
      setError(apiError || 'فشل تحميل لوحة التحكم');
    } else {
      setData(resData.data);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">لوحة التحكم</h1>
          <p className="text-sm text-slate-500 mt-1">جاري تحميل الإحصائيات...</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SkeletonCards n={4} />
        </div>
      </>
    );
  }

  if (error || !data) {
    return <ErrorState msg={error} onRetry={loadData} />;
  }

  const d = data[activePeriod] || {};

  // نسبة التحصيل
  const collectionRate = d.totalSales > 0
    ? Math.round((d.totalPaid / d.totalSales) * 100)
    : 0;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">لوحة التحكم</h1>
          <p className="text-sm text-slate-500 mt-1">نظرة عامة على المبيعات والإحصائيات</p>
        </div>
        {/* Period Tabs */}
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePeriod(p.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                activePeriod === p.key
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {CARDS.map((c) => {
          const col = colorMap[c.color];
          const value = d[c.key] || 0;
          return (
            <div
              key={c.key}
              className={`relative bg-gradient-to-br ${col.bg} to-white border ${col.border} rounded-2xl p-5 overflow-hidden hover:-translate-y-1 transition-transform duration-200 shadow-sm`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{c.icon}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${col.text} text-left`}>
                  {c.label}
                </span>
              </div>
              <p className="text-xl font-extrabold text-slate-800">
                {c.currency ? formatCurrency(value) : formatNumber(value)}
              </p>
              {/* نسبة صغيرة تحت قيمة المدفوع */}
              {c.key === 'totalPaid' && d.totalSales > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span className="font-bold">نسبة التحصيل</span>
                    <span className="text-blue-600 font-bold">{collectionRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(collectionRate, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparison Table — all periods side by side */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800">مقارنة الفترات الزمنية</h3>
          <p className="text-xs text-slate-500 mt-0.5">إجمالي المبيعات والتحصيل لكل فترة</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">الفترة</th>
                <th className="px-6 py-3 text-center">عدد الفواتير</th>
                <th className="px-6 py-3 text-center">إجمالي المبيعات</th>
                <th className="px-6 py-3 text-center">المدفوع</th>
                <th className="px-6 py-3 text-center">المتبقي</th>
                <th className="px-6 py-3 text-center">نسبة التحصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERIODS.map((p) => {
                const row = data[p.key] || {};
                const rate = row.totalSales > 0
                  ? Math.round((row.totalPaid / row.totalSales) * 100)
                  : 0;
                const isActive = activePeriod === p.key;
                return (
                  <tr
                    key={p.key}
                    onClick={() => setActivePeriod(p.key)}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-emerald-50/50 border-r-4 border-r-emerald-500'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">
                        {p.icon} {p.label}
                      </span>
                      {isActive && (
                        <span className="mr-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                          محدد
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-slate-700 font-bold">{formatNumber(row.count || 0)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-emerald-600 font-bold">{formatCurrency(row.totalSales || 0)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-blue-600 font-semibold">{formatCurrency(row.totalPaid || 0)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-mono font-semibold ${(row.totalDue || 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {formatCurrency(row.totalDue || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-9 text-left ${
                          rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
