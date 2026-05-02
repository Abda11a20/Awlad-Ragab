import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useStore from './store';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Invoices from './pages/Invoices';

function ProtectedLayout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 sidebar-offset p-4 pt-16 md:p-6 lg:p-8">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetails />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { isLoggedIn, initTheme } = useStore();

  useEffect(() => { initTheme(); }, [initTheme]);

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased transition-colors">
        <Routes>
          <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/*" element={isLoggedIn ? <ProtectedLayout /> : <Navigate to="/login" replace />} />
        </Routes>
      </div>
      <Toaster position="bottom-left" toastOptions={{ className: '!bg-white !text-slate-800 !border !border-slate-200' }} />
    </HashRouter>
  );
}
