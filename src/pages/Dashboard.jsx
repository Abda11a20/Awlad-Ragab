/**
 * @file Dashboard.jsx
 * @description Main application dashboard.
 *              Displays key performance indicators (KPIs), sales analytics,
 *              and low stock alerts. Utilizes caching to prevent redundant API calls
 *              on subsequent visits.
 */

import { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';
import useStore from '../store';
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

const INVENTORY_CARDS = [
  { key: 'totalProducts', label: 'إجمالي المنتجات', icon: '📦', color: 'purple', currency: false },
  { key: 'totalStockQuantity', label: 'القطع بالمخزن', icon: '🔢', color: 'blue', currency: false },
  { key: 'totalStockCost', label: 'تكلفة المخزون', icon: '💵', color: 'amber', currency: true },
];

const colorMap = {
  emerald: { border: 'border-emerald-200', bg: 'from-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  blue:    { border: 'border-blue-200',    bg: 'from-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-500' },
  amber:   { border: 'border-amber-200',   bg: 'from-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500' },
  purple:  { border: 'border-purple-200',  bg: 'from-purple-50',  text: 'text-purple-700',  bar: 'bg-purple-500' },
};

export default function Dashboard() {
  const { dashboardData, setDashboardData } = useStore();
  const [data, setData]               = useState(dashboardData);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activePeriod, setActivePeriod] = useState('monthly');

  const loadData = async () => {
    if (dashboardData) {
      setData(dashboardData);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: resData, error: apiError } = await dashboardAPI.getStats();
    if (apiError || !resData?.success) {
      setError(apiError || 'فشل تحميل لوحة التحكم');
    } else {
      setData(resData.data);
      setDashboardData(resData.data);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {CARDS.map((c) => {
          const col = colorMap[c.color];
          const value = d[c.key] || 0;
          return (
            <div
              key={c.key}
              className={`relative bg-white border ${col.border} rounded-2xl p-4 flex flex-col justify-between overflow-hidden hover:-translate-y-1 transition-transform duration-200 shadow-sm`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                {/* Icon inside a rounded background */}
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${col.bg} to-white shadow-inner flex-shrink-0`}>
                  <span className="text-xl md:text-2xl">{c.icon}</span>
                </div>
                {/* Label and Value */}
                <div className="w-full min-w-0">
                  <p className={`text-[11px] md:text-sm font-bold ${col.text} mb-1 truncate`}>
                    {c.label}
                  </p>
                  <p className="text-sm md:text-xl font-extrabold text-slate-800 truncate">
                    {c.currency ? formatCurrency(value) : formatNumber(value)}
                  </p>
                </div>
              </div>

              {/* نسبة صغيرة تحت قيمة المدفوع */}
              {c.key === 'totalPaid' && d.totalSales > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 w-full">
                  <div className="flex justify-between text-[9px] md:text-[10px] text-slate-500 mb-1">
                    <span className="font-bold">التحصيل</span>
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

      {/* Inventory Stats Section */}
      {data.inventory && (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-slate-800">إحصائيات المخزون الحالية</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
            {INVENTORY_CARDS.map((c) => {
              const col = colorMap[c.color];
              const value = data.inventory[c.key] || 0;
              return (
                <div
                  key={c.key}
                  className={`relative bg-white border ${col.border} rounded-2xl p-4 flex flex-col justify-center items-center text-center overflow-hidden hover:-translate-y-1 transition-transform duration-200 shadow-sm`}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 mb-2 rounded-full flex items-center justify-center bg-gradient-to-br ${col.bg} to-white shadow-inner flex-shrink-0`}>
                    <span className="text-xl md:text-2xl">{c.icon}</span>
                  </div>
                  <div className="w-full min-w-0">
                    <p className={`text-[11px] md:text-sm font-bold ${col.text} mb-1 truncate`}>
                      {c.label}
                    </p>
                    <p className="text-sm md:text-xl font-extrabold text-slate-800 truncate">
                      {c.currency ? formatCurrency(value) : formatNumber(value)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Comparison Table — all periods side by side */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800">مقارنة الفترات الزمنية</h3>
          <p className="text-xs text-slate-500 mt-0.5">إجمالي المبيعات والتحصيل لكل فترة</p>
        </div>
        <div className="w-full overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-thin scrollbar-thumb-slate-300 pb-2">
          <table className="w-[800px] lg:w-full text-sm text-right whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">الفترة</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">عدد الفواتير</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">إجمالي المبيعات</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">المدفوع</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">المتبقي</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">نسبة التحصيل</th>
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
