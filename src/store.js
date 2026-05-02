import { create } from 'zustand';

const useStore = create((set) => ({
  // ── Auth ───────────────────────────────────────────────────
  isLoggedIn: !!localStorage.getItem('mz_token'),

  login: (token) => {
    localStorage.setItem('mz_token', token);
    localStorage.setItem('mz_logged', 'true');
    set({ isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem('mz_token');
    localStorage.removeItem('mz_logged');
    set({ isLoggedIn: false, products: [], customers: [], invoices: [] });
  },

  // ── Theme ───────────────────────────────────────────────────
  theme: localStorage.getItem('mz_theme') || 'dark',

  initTheme: () => {
    const saved = localStorage.getItem('mz_theme') || 'dark';
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ theme: saved });
  },

  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('mz_theme', next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return { theme: next };
  }),

  // ── Products ────────────────────────────────────────────────
  products: [],
  setProducts:   (p) => set({ products: p }),
  addProduct:    (p) => set((s) => ({ products: [p, ...s.products] })),
  updateProduct: (id, p) => set((s) => ({ products: s.products.map(x => x._id === id ? p : x) })),
  removeProduct: (id)    => set((s) => ({ products: s.products.filter(x => x._id !== id) })),

  // ── Customers ───────────────────────────────────────────────
  customers: [],
  setCustomers:   (c) => set({ customers: c }),
  addCustomer:    (c) => set((s) => ({ customers: [c, ...s.customers] })),
  updateCustomer: (id, c) => set((s) => ({ customers: s.customers.map(x => x._id === id ? c : x) })),
  removeCustomer: (id)    => set((s) => ({ customers: s.customers.filter(x => x._id !== id) })),

  // ── Invoices ────────────────────────────────────────────────
  invoices: [],
  setInvoices: (i) => set({ invoices: i }),

  // ── Cache ───────────────────────────────────────────────────
  clearCache: () => set({ products: [], customers: [], invoices: [] }),
}));

export default useStore;
