import { useState } from 'react';
import useStore from '../store';
import toast from 'react-hot-toast';
import { dashboardAPI } from '../api';
import { LogOut } from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme, clearCache, logout } = useStore();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const isDark = theme === 'dark';

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    const t0 = Date.now();
    const { error } = await dashboardAPI.getStats();
    const ms = Date.now() - t0;
    setTesting(false);
    setTestResult(error ? { ok: false, t: '✕ لا يمكن الاتصال' } : { ok: true, t: `✓ متصل (${ms}ms)` });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">الإعدادات</h1>
        <p className="text-sm text-slate-500 mt-1">إعدادات النظام والبيئة</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Theme */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">🎨 المظهر</h3>
          <div className="flex items-center justify-between">
            <button onClick={() => { toggleTheme(); toast.success(isDark ? 'تم تفعيل الوضع الفاتح' : 'تم تفعيل الوضع المظلم'); }}
              className={`relative w-14 h-7 rounded-full transition-colors ${isDark ? 'bg-emerald-500' : 'bg-slate-600'}`}>
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all shadow ${isDark ? 'right-0.5' : 'right-[calc(100%-1.625rem)]'}`} />
            </button>
            <span className="text-sm text-slate-300">{isDark ? 'الوضع المظلم ✓' : 'الوضع الفاتح ☀'}</span>
          </div>
        </div>

        {/* Connection & Cache */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">🗄 النظام والاتصال</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { clearCache(); toast.success('تم مسح الذاكرة المؤقتة'); }}
              className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-semibold transition-all">
              مسح الذاكرة المؤقتة
            </button>
            <button onClick={handleTest} disabled={testing}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-semibold transition-all disabled:opacity-50">
              {testing ? '⟳ جاري الاختبار…' : '⚡ اختبار الاتصال'}
            </button>
            {testResult && <span className={`text-sm font-semibold self-center ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>{testResult.t}</span>}
          </div>
        </div>

        {/* About */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">ℹ️ عن النظام</h3>
          <div className="space-y-2 text-right">
            <div className="flex justify-between text-sm"><span className="text-slate-500">الإصدار</span><span className="text-slate-300 font-mono">1.0.0</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">المالك</span><span className="text-slate-300">ماذن رجب محمد</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">الهاتف</span><span className="text-slate-300 font-mono">01025210536</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">الهاتف 2</span><span className="text-slate-300 font-mono">01158325071</span></div>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">🚪 الحساب</h3>
          <button onClick={() => { logout(); toast.success('تم تسجيل الخروج'); }}
            className="w-fit px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold transition-all flex items-center gap-2">
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </button>
        </div>

      </div>
    </div>
  );
}
