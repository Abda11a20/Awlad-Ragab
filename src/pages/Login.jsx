import { useState } from 'react';
import { authAPI } from '../api';
import useStore from '../store';
import toast from 'react-hot-toast';
import { Lock, KeyRound, LogIn } from 'lucide-react';

export default function Login() {
  const { login } = useStore();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !password.trim()) {
      return toast.error('يرجى إدخال الكود وكلمة المرور');
    }

    setLoading(true);

    // POST /auth/login  →  { success: true, token: "..." }
    const { data, error } = await authAPI.login({ code: code.trim(), password });

    setLoading(false);

    if (error || !data?.success) {
      toast.error(error || 'كود الموظف أو كلمة المرور غير صحيحة');
      return;
    }

    login(data.token); // يحفظ التوكن في localStorage
    toast.success('تم تسجيل الدخول بنجاح ✓');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-bold mb-4 shadow-lg shadow-emerald-500/10">
            م
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            مازن <span className="text-emerald-600">WMS</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-bold">نظام إدارة المستودعات</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-7 shadow-xl space-y-5"
        >
          <div className="text-center mb-2">
            <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">تسجيل الدخول</h2>
            <p className="text-xs text-slate-500 mt-1 font-bold">أدخل بيانات الاعتماد للوصول إلى النظام</p>
          </div>

          {/* Code field */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 text-right">
              كود الموظف
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="EMP..."
                required
                autoFocus
                dir="ltr"
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl px-4 py-2.5 pr-10 text-sm placeholder-slate-400
                           focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-sm"
              />
              <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 text-right">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                dir="ltr"
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl px-4 py-2.5 pr-10 text-sm placeholder-slate-400
                           focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-sm"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white py-3 rounded-xl
                       font-bold text-sm transition-all flex items-center justify-center gap-2
                       shadow-lg shadow-emerald-500/20 active:scale-[.98]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                دخول
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] font-bold text-slate-400 mt-6">
          © 2026 Mazen WMS — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
