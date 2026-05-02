import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Users, FileText, Menu, X, Download, Smartphone } from 'lucide-react';
import useStore from '../store';

const NAV = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/products', label: 'المنتجات', icon: Package },
  { path: '/customers', label: 'العملاء', icon: Users },
  { path: '/invoices', label: 'الفواتير', icon: FileText },
];

// Detect iOS
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Detect if already installed as PWA
const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { products, logout } = useStore();

  // PWA install state
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  const lowStockCount = products.filter(p => (p.stock ?? 0) < 10).length;

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Listen for the beforeinstallprompt event (Android / Chrome)
  useEffect(() => {
    if (isInStandaloneMode()) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // On iOS, always show the button (manual guide)
    if (isIOS() && !isInStandaloneMode()) {
      setShowInstallBtn(true);
    }

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowInstallBtn(false);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS()) {
      // Show iOS manual instructions
      setShowIOSGuide(true);
      return;
    }
    if (!installPrompt) return;
    const result = await installPrompt.prompt();
    if (result?.outcome === 'accepted') {
      setShowInstallBtn(false);
      setInstallPrompt(null);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* iOS Install Guide Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[600] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 mb-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base">تثبيت التطبيق على iOS</h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3 text-sm text-slate-600 font-bold">
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                <span className="text-xl flex-shrink-0">1️⃣</span>
                <p>افتح الموقع في <span className="text-blue-600">Safari</span> (ليس Chrome)</p>
              </div>
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                <span className="text-xl flex-shrink-0">2️⃣</span>
                <p>اضغط على زر <span className="text-blue-600">المشاركة</span> (□↑) في أسفل الشاشة</p>
              </div>
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                <span className="text-xl flex-shrink-0">3️⃣</span>
                <p>اختر <span className="text-blue-600">"إضافة إلى الشاشة الرئيسية"</span> ثم اضغط إضافة</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-colors"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
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

          {/* PWA Install Button */}
          {!installed && showInstallBtn && (
            <button
              onClick={handleInstall}
              className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 w-full"
            >
              <Download className="w-5 h-5 flex-shrink-0 text-blue-500" />
              <span className="flex-1 text-right">تثبيت التطبيق</span>
              <span className="text-[10px] bg-blue-500 text-white rounded-full px-1.5 py-0.5 font-bold">جديد</span>
            </button>
          )}

          {/* Already installed indicator */}
          {installed && (
            <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100">
              <Smartphone className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span className="flex-1 text-right">التطبيق مثبّت ✓</span>
            </div>
          )}
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
