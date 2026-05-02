import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Users, FileText, Settings, Menu, X } from 'lucide-react';
import useStore from '../store';
const NAV = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/products', label: 'المنتجات', icon: Package },
  { path: '/customers', label: 'العملاء', icon: Users },
  { path: '/invoices', label: 'الفواتير', icon: FileText },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { products, logout } = useStore();

  const lowStockCount = products.filter(p => (p.stock ?? 0) < 10).length;

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 right-0 bottom-0 w-[260px] bg-white border-l border-slate-200
        flex flex-col z-50 transform transition-transform duration-300 shadow-sm
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200">
          <img src="/logo.png" alt="شعار أولاد رجب" className="w-10 h-10 object-contain" />
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">أولاد رجب</p>
            <p className="text-[10px] text-slate-500">نظام إدارة المستودعات</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const isProducts = n.path === '/products';

            return (
              <NavLink
                key={n.path}
                to={n.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group
                  ${isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,.2)]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="flex-1 text-right">{n.label}</span>
                    {isProducts && lowStockCount > 0 && (
                      <span className="mr-auto text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5 py-0.5 badge-pulse">
                        {lowStockCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold">م</div>
            <div className="flex-1 text-right">
              <p className="text-xs font-bold text-slate-800">ماذن رجب فتحي</p>
              <p className="text-[10px] text-slate-500">مدير النظام</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-30 md:hidden w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </>
  );
}
